import { BugDrop, type BugDropServerOptions } from '@bugdrop/server';

const PATH = '/api/bugdrop-capability/v1/';
const LIMIT = 1024;
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export type FailurePhase = 'configuration' | 'node_envelope' | 'adaptation' | 'body' | 'binding' | 'policy' | 'sdk_init' | 'issuer_exchange' | 'deadline' | 'cancelled';
type FailureReason = 'disabled' | 'incomplete' | 'rejected' | 'unavailable' | 'denied' | 'failed' | 'expired' | 'aborted';
export type FailureDiagnostic = Readonly<{
  phase: FailurePhase;
  reason: FailureReason;
  issuerContacted: boolean;
  httpStatus?: number;
  keyPresent?: boolean;
  originMatches?: boolean;
  issuerMatches?: boolean;
  hostMatches?: boolean;
  pathMatches?: boolean;
  methodMatches?: boolean;
  contentTypeMatches?: boolean;
  fetchSiteMatches?: boolean;
  encodingAllowed?: boolean;
  streamAvailable?: boolean;
}>;
export type FailureObserver = (event: FailureDiagnostic) => void | Promise<void>;

/** One sanitized event per invocation; telemetry must never affect authorization. */
export function failureReporter(observer: FailureObserver = (event) => console.warn('bugdrop_authorization_failure', event)) {
  let emitted = false;
  return (event: FailureDiagnostic): void => {
    if (emitted) return;
    emitted = true;
    const safe: FailureDiagnostic = Object.freeze({
      phase: (['configuration', 'node_envelope', 'adaptation', 'body', 'binding', 'policy', 'sdk_init', 'issuer_exchange', 'deadline', 'cancelled'] as const).includes(event.phase) ? event.phase : 'sdk_init',
      reason: (['disabled', 'incomplete', 'rejected', 'unavailable', 'denied', 'failed', 'expired', 'aborted'] as const).includes(event.reason) ? event.reason : 'failed',
      issuerContacted: event.issuerContacted === true,
      ...(Number.isInteger(event.httpStatus) && event.httpStatus! >= 100 && event.httpStatus! <= 599 ? { httpStatus: event.httpStatus } : {}),
      ...Object.fromEntries((['keyPresent', 'originMatches', 'issuerMatches', 'hostMatches', 'pathMatches', 'methodMatches', 'contentTypeMatches', 'fetchSiteMatches', 'encodingAllowed', 'streamAvailable'] as const)
        .filter((key) => typeof event[key] === 'boolean').map((key) => [key, event[key]])),
    });
    try { void Promise.resolve(observer(safe)).catch(() => {}); } catch { /* Diagnostics are best effort. */ }
  };
}

export interface V1BackendOptions extends BugDropServerOptions {
  origin: string;
  environment?: string;
  observeFailure?: FailureObserver;
}

// Enforce session, CSRF, authorization, rate limits and atomic ID-to-digest reuse here.
// Inspect request headers and the parsed binding; do not consume or log the body.
type CustomerBinding = Readonly<{ submissionId: string; payloadDigest: string }>;
export type CustomerPolicy = (
  request: Request,
  binding: CustomerBinding
) => boolean | Promise<boolean>;

function reject(): never {
  throw new Error('Unable to authorize BugDrop');
}

function canonicalOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('origin must be a canonical HTTPS origin');
  }
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    url.hostname.endsWith('.') ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
          url.hostname.endsWith('.localhost'))
      ))
  ) {
    throw new TypeError('origin must be a canonical HTTPS origin or HTTP loopback origin');
  }
  return value;
}

function parse(body: string): { submissionId: string; payloadDigest: string } {
  const value: unknown = JSON.parse(body);
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject();
  // JSON.parse alone silently accepts duplicate names, including escaped aliases.
  const seen = new Set<string>();
  for (const match of body.matchAll(/"(?:\\[\s\S]|[^"\\])*"/g)) {
    if (!/^\s*:/.test(body.slice(match.index + match[0].length))) continue;
    const name: string = JSON.parse(match[0]);
    if (seen.has(name)) reject();
    seen.add(name);
  }
  const fields = value as Record<string, unknown>;
  if (
    Object.keys(fields).length !== 2 ||
    !Object.keys(fields).every((key) => ['submissionId', 'payloadDigest'].includes(key)) ||
    typeof fields.submissionId !== 'string' ||
    typeof fields.payloadDigest !== 'string' ||
    !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(fields.payloadDigest) ||
    !validUtf8Id(fields.submissionId)
  )
    reject();
  return { submissionId: fields.submissionId, payloadDigest: fields.payloadDigest };
}

function validUtf8Id(value: string): boolean {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x7f) bytes += 1;
    else if (unit <= 0x7ff) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      bytes += 4;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    else bytes += 3;
    if (bytes > 200) return false;
  }
  return bytes > 0;
}

async function read(request: Request): Promise<string> {
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^(0|[1-9][0-9]*)$/.test(length) || Number(length) > LIMIT)) reject();
  const reader = request.body?.getReader();
  if (!reader) reject();
  const bytes = new Uint8Array(LIMIT);
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  request.signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (request.signal.aborted || size + chunk.value.byteLength > LIMIT) reject();
      bytes.set(chunk.value, size);
      size += chunk.value.byteLength;
    }
    if (length !== null && Number(length) !== size) reject();
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(0, size)
    );
  } finally {
    request.signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function createV1Handler(options: V1BackendOptions, customerPolicy: CustomerPolicy) {
  if (typeof customerPolicy !== 'function') {
    throw new TypeError('A customer access/CSRF/rate policy is required');
  }
  const origin = canonicalOrigin(options.origin);
  const { environment, observeFailure, ...sdkOptions } = options;
  const endpoint = `${origin}${PATH}`;
  return async (request: Request): Promise<Response> => {
    const report = failureReporter(observeFailure);
    let phase: FailurePhase = 'sdk_init';
    let reason: FailureReason = 'failed';
    let issuerContacted = false;
    let httpStatus: number | undefined;
    try {
      const transport = sdkOptions.fetch ?? globalThis.fetch;
      const observedTransport: typeof fetch = async (...args) => {
        issuerContacted = true;
        const response = await transport(...args);
        // Observe only metadata; the SDK alone owns the response body.
        try { if (Number.isInteger(response.status) && response.status >= 100 && response.status <= 599) httpStatus = response.status; } catch { /* Ignore unusable metadata. */ }
        return response;
      };
      const client = new BugDrop({ ...sdkOptions, fetch: typeof transport === 'function' ? observedTransport : transport });
      phase = 'node_envelope'; reason = 'rejected';
      if (
        request.method !== 'POST' ||
        request.url !== endpoint ||
        request.headers.get('Origin') !== origin ||
        request.headers.get('Content-Type') !== 'application/json' ||
        request.headers.has('Content-Encoding') ||
        request.signal.aborted
      )
        reject();
      phase = 'body'; reason = 'failed';
      const body = await read(request);
      phase = 'binding'; reason = 'rejected';
      const binding = Object.freeze(parse(body));
      phase = 'policy'; reason = 'denied';
      if ((await customerPolicy(request, binding)) !== true) reject();
      if (request.signal.aborted) reject();
      phase = 'issuer_exchange'; reason = 'failed';
      const capability = await client.createSubmissionToken({
        ...binding,
        origin,
        ...(environment === undefined ? {} : { environment }),
        signal: request.signal,
      });
      return new Response(JSON.stringify(capability), { status: 200, headers: HEADERS });
    } catch {
      report({ phase: request.signal.aborted ? 'cancelled' : phase,
        reason: request.signal.aborted ? 'aborted' : reason, issuerContacted, httpStatus });
      if (!request.body?.locked) void request.body?.cancel().catch(() => {});
      return new Response('{"error":"unable_to_authorize_bugdrop"}', {
        status: 502,
        headers: HEADERS,
      });
    }
  };
}
