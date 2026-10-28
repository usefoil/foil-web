import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { managedCapabilityEndpoint } from '../../lib/bugdrop/server.js';

export const config = { api: { bodyParser: false } };
const ORIGIN = 'https://foil.neonwatty.com';
const ISSUER = 'https://api.bugdrop.dev/v1/submission-capabilities';
const PATH = '/api/bugdrop-capability/v1';
const failure = () => new Response('{"error":"unable_to_authorize_bugdrop"}', {
  status: 502, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
});

/** Configuration is read per invocation, before constructing a client or consuming input. */
export function createEndpoint(env: Record<string, string | undefined>, transport: typeof fetch = fetch, deadlineMs = 8000) {
  return async (request: Request): Promise<Response> => {
    if (env.BUGDROP_ENABLED !== '1') return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    if (!env.BUGDROP_API_KEY || env.BUGDROP_ORIGIN !== ORIGIN || env.BUGDROP_ISSUER !== ISSUER) return failure();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: () => void = () => {};
    const ended = new Promise<Response>((resolve) => {
      abort = () => { controller.abort(); resolve(failure()); };
      timer = setTimeout(abort, deadlineMs);
      request.signal.addEventListener('abort', abort, { once: true });
    });
    try {
      if (request.signal.aborted) return failure();
      const handler = managedCapabilityEndpoint({ enabled: true, apiKey: env.BUGDROP_API_KEY,
        origin: ORIGIN, endpoint: ISSUER, environment: 'production', fetch: transport, timeoutMs: deadlineMs });
      const bounded = new Request(request, { signal: controller.signal });
      return await Promise.race([handler(bounded), ended]);
    } catch { return failure(); }
    finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); }
  };
}

/** Vercel Node function: preserve raw bytes; never trust forwarded host/origin selectors. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  req.once('aborted', abort);
  res.once('close', abort);
  try {
    // Reject disabled/incomplete or invalid envelope before adapting/reading a Node stream.
    const early = process.env.BUGDROP_ENABLED !== '1'
      ? new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
      : !process.env.BUGDROP_API_KEY || process.env.BUGDROP_ORIGIN !== ORIGIN || process.env.BUGDROP_ISSUER !== ISSUER ||
        req.headers.host !== new URL(ORIGIN).host || req.url !== PATH || req.method !== 'POST' ||
        req.headers.origin !== ORIGIN || req.headers['content-type'] !== 'application/json' ||
        req.headers['sec-fetch-site'] !== 'same-origin' || req.headers['content-encoding'] !== undefined
        ? failure() : undefined;
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
    const response = await createEndpoint(process.env)(request);
    res.statusCode = response.status;
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); res.end('{"error":"unable_to_authorize_bugdrop"}'); }
  finally { req.off('aborted', abort); res.off('close', abort); }
}
