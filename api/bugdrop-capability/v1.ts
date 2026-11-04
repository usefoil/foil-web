import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { managedCapabilityEndpoint } from '../../lib/bugdrop/server.js';
import { failureReporter, type FailureObserver, type FailurePhase } from '../../lib/bugdrop/handler.js';

export const config = { api: { bodyParser: false } };
const ORIGIN = 'https://foil.neonwatty.com';
const ISSUER = 'https://managed.bugdrop.dev/v1/submission-capabilities';
const PATH = '/api/bugdrop-capability/v1/';
const failure = () => new Response('{"error":"unable_to_authorize_bugdrop"}', {
  status: 502, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
});
const configurationMatches = (env: Record<string, string | undefined>) => ({
  keyPresent: Boolean(env.BUGDROP_API_KEY), originMatches: env.BUGDROP_ORIGIN === ORIGIN,
  issuerMatches: env.BUGDROP_ISSUER === ISSUER,
});

/** Configuration is read per invocation, before constructing a client or consuming input. */
export function createEndpoint(env: Record<string, string | undefined>, transport: typeof fetch = fetch, deadlineMs = 8000, observer?: FailureObserver) {
  return async (request: Request): Promise<Response> => {
    const report = failureReporter(observer);
    const matches = configurationMatches(env);
    if (env.BUGDROP_ENABLED !== '1') {
      report({ phase: 'configuration', reason: 'disabled', issuerContacted: false });
      return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!matches.keyPresent || !matches.originMatches || !matches.issuerMatches) {
      report({ phase: 'configuration', reason: 'incomplete', issuerContacted: false, ...matches });
      return failure();
    }
    const controller = new AbortController();
    let issuerContacted = false;
    let httpStatus: number | undefined;
    const observedTransport: typeof fetch = async (...args) => {
      issuerContacted = true;
      const response = await transport(...args);
      try { if (Number.isInteger(response.status) && response.status >= 100 && response.status <= 599) httpStatus = response.status; } catch { /* Metadata is optional. */ }
      return response;
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: () => void = () => {};
    const ended = new Promise<Response>((resolve) => {
      const end = (phase: 'deadline' | 'cancelled', reason: 'expired' | 'aborted') => {
        if (controller.signal.aborted) return;
        report({ phase, reason, issuerContacted, httpStatus });
        controller.abort();
        resolve(failure());
      };
      abort = () => end('cancelled', 'aborted');
      timer = setTimeout(() => end('deadline', 'expired'), deadlineMs);
      request.signal.addEventListener('abort', abort, { once: true });
    });
    let phase: FailurePhase = 'sdk_init';
    try {
      if (request.signal.aborted) { abort(); return failure(); }
      const handler = managedCapabilityEndpoint({ enabled: true, apiKey: env.BUGDROP_API_KEY,
        origin: ORIGIN, endpoint: ISSUER, environment: 'production', fetch: observedTransport,
        timeoutMs: deadlineMs, observeFailure: report });
      phase = 'adaptation';
      const bounded = new Request(request, { signal: controller.signal });
      return await Promise.race([handler(bounded), ended]);
    } catch {
      report({ phase, reason: 'failed', issuerContacted, httpStatus });
      return failure();
    } finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); }
  };
}

/** Vercel Node function: preserve raw bytes; never trust forwarded host/origin selectors. */
export function createNodeHandler(env: Record<string, string | undefined>, transport: typeof fetch = fetch, deadlineMs = 8000, observer?: FailureObserver) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const report = failureReporter(observer);
    const controller = new AbortController();
    const abort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
        report({ phase: 'cancelled', reason: 'aborted', issuerContacted: false });
      }
    };
    req.once('aborted', abort);
    res.once('close', abort);
    let phase: FailurePhase = 'adaptation';
    try {
      const configuration = configurationMatches(env);
      const envelope = {
        hostMatches: req.headers.host === new URL(ORIGIN).host, pathMatches: req.url === PATH,
        methodMatches: req.method === 'POST', originMatches: req.headers.origin === ORIGIN,
        contentTypeMatches: req.headers['content-type'] === 'application/json',
        fetchSiteMatches: req.headers['sec-fetch-site'] === 'same-origin',
        encodingAllowed: req.headers['content-encoding'] === undefined,
      };
      let early: Response | undefined;
      if (env.BUGDROP_ENABLED !== '1') {
        report({ phase: 'configuration', reason: 'disabled', issuerContacted: false });
        early = new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      } else if (!configuration.keyPresent || !configuration.originMatches || !configuration.issuerMatches) {
        report({ phase: 'configuration', reason: 'incomplete', issuerContacted: false, ...configuration });
        early = failure();
      } else if (Object.values(envelope).some((match) => !match)) {
        report({ phase: 'node_envelope', reason: 'rejected', issuerContacted: false, ...envelope });
        early = failure();
      } else if (req.destroyed || req.readableEnded || Readable.isDisturbed(req)) {
        report({ phase: 'adaptation', reason: 'unavailable', issuerContacted: false, streamAvailable: false });
        early = failure();
      }
      if (early) {
        res.statusCode = early.status;
        early.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(Buffer.from(await early.arrayBuffer()));
        return;
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      }
      const target = req.headers.host === new URL(ORIGIN).host && req.url === PATH ? `${ORIGIN}${PATH}` : `${ORIGIN}/invalid`;
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req) as ReadableStream<Uint8Array>;
      const request = new Request(target, { method: req.method, headers, body, signal: controller.signal, ...({ duplex: 'half' } as object) });
      phase = 'issuer_exchange';
      const response = await createEndpoint(env, transport, deadlineMs, report)(request);
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      report({ phase, reason: 'failed', issuerContacted: false });
      res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); res.end('{"error":"unable_to_authorize_bugdrop"}');
    } finally { req.off('aborted', abort); res.off('close', abort); }
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return createNodeHandler(process.env)(req, res);
}
