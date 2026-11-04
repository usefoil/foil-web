import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { createAnonymousTokenProvider } from '../lib/bugdrop/transport.js';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { createV1Handler, failureReporter, type FailureDiagnostic } from '../lib/bugdrop/handler.js';
import nodeHandler, { createEndpoint, createNodeHandler } from '../api/bugdrop-capability/v1.js';

// Shared SDK api-key-credential.v1 and submission-binding.v1 public vectors.
const root = 'bd_api_v1.AAECAwQFBgcICQoLDA0ODw.EBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8';
const authorization = 'Bearer bd_auth_v1.AAECAwQFBgcICQoLDA0ODw.mrJiVKhkJz8d7tNgPkSTl2tRDQ840gImsfUvb1q0ZPo';
const origin = 'https://foil.neonwatty.com';
const issuer = 'https://managed.bugdrop.dev/v1/submission-capabilities';
const binding = { submissionId: '018f1f2e-7b4a-7c3d-9e10-4f5a6b7c8d90', payloadDigest: 'sPybYsPwrJsoR8G8LbuHwYw3y-QHlqrYOfI-8lbJbEQ' };
const settings = { BUGDROP_ENABLED: '1', BUGDROP_API_KEY: root, BUGDROP_ORIGIN: origin, BUGDROP_ISSUER: issuer };
globalThis.fetch = async () => { throw new Error('UNEXPECTED EXTERNAL FETCH'); };
function request(body: BodyInit = JSON.stringify(binding), headers: Record<string,string> = {}, url = `${origin}/api/bugdrop-capability/v1/`, signal?: AbortSignal) {
  return new Request(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...headers }, body, signal, ...({ duplex: 'half' } as object) });
}
const deny = async () => { assert.fail('Unexpected exchange'); };
async function rejected(response: Response, status = 502) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const text = await response.text();
  for (const secret of [root, authorization, root.split('.')[2]]) assert.equal(text.includes(secret), false);
}
test('disabled and incomplete configuration consume no body and make zero calls', async () => {
  for (const env of [{}, { ...settings, BUGDROP_ENABLED: '0' }, { ...settings, BUGDROP_API_KEY: '' }, { ...settings, BUGDROP_ORIGIN: 'https://evil.example' }, { ...settings, BUGDROP_ISSUER: 'https://evil.example' }]) {
    const req = request();
    await rejected(await createEndpoint(env, deny)(req), env.BUGDROP_ENABLED === '1' ? 502 : 404);
    assert.equal(req.bodyUsed, false);
  }
});
test('old issuer endpoint fails closed before body consumption without credential exposure', async () => {
  const env = { ...settings, BUGDROP_ISSUER: 'https://api.bugdrop.dev/v1/submission-capabilities' };
  let calls = 0;
  const exchange: typeof fetch = async () => { calls++; throw new Error(root); };
  const req = request();
  await rejected(await createEndpoint(env, exchange)(req));
  assert.equal(req.bodyUsed, false);
  assert.equal(calls, 0);
  const disabledRequest = request();
  await rejected(await createEndpoint({ ...env, BUGDROP_ENABLED: '0' }, exchange)(disabledRequest), 404);
  assert.equal(disabledRequest.bodyUsed, false);
  assert.equal(calls, 0);
});
test('request boundary rejects origins, selectors, metadata, methods, paths and malformed bodies', async () => {
  const cases = [
    request(undefined, { Origin: 'https://sub.foil.neonwatty.com' }),
    request(undefined, { Origin: 'https://foil.neonwatty.com:444' }),
    request(undefined, { Origin: 'http://foil.neonwatty.com' }),
    request(undefined, { 'Sec-Fetch-Site': '' }), request(undefined, { 'Sec-Fetch-Site': 'cross-site' }),
    request(undefined, { 'Content-Type': 'text/plain' }), request(undefined, {}, `${origin}/wrong`),
    request(undefined, {}, `${origin}/api/bugdrop-capability/v1`),
    request(undefined, {}, `${origin}/api/bugdrop-capability/v1/?selector=evil`),
    new Request(`${origin}/api/bugdrop-capability/v1/`),
    request(JSON.stringify({ ...binding, applicationId: 'browser-selector' })),
    request(`{"submissionId":"first",${JSON.stringify(binding).slice(1)}`),
    request(`{"submi\\u0073sionId":"first",${JSON.stringify(binding).slice(1)}`),
    request(JSON.stringify({ ...binding, payloadDigest: 'bad' })),
    request(JSON.stringify({ ...binding, submissionId: '\ud800' })),
    request(new Uint8Array([255, 254])), request('x'.repeat(1025)),
    request(undefined, { 'Content-Length': '1025' }), request(undefined, { 'Content-Encoding': 'gzip' }),
  ];
  for (const req of cases) await rejected(await createEndpoint(settings, deny)(req));
});
test('managed exchange matches vectors and each explicit same-binding call exchanges once', async () => {
  let calls = 0;
  const mock: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, issuer);
    assert.equal(new Headers(init?.headers).get('Authorization'), authorization);
    assert.deepEqual(JSON.parse(String(init?.body)), { schemaVersion: 1, ...binding, origin, environment: 'production', admission: 'managed-v1' });
    assert.equal(String(init?.body).includes(root), false);
    return Response.json({ schemaVersion: 1, token: 'synthetic-capability', expiresAt: new Date(Date.now() + 60000).toISOString(), admission: 'managed-v1' });
  };
  const endpoint = createEndpoint(settings, mock);
  for (let i = 1; i <= 2; i++) {
    const response = await endpoint(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(Object.keys(await response.json()).sort(), ['expiresAt', 'schemaVersion', 'token']);
    assert.equal(calls, i);
  }
});
test('missing/wrong confirmation, denial, malformed and lost response fail without retry', async () => {
  for (const outcome of ['missing', 'wrong', 'denied', 'malformed', 'lost']) {
    let calls = 0;
    const mock: typeof fetch = async () => {
      calls++;
      if (outcome === 'lost') throw new Error(root);
      if (outcome === 'denied') return new Response(root, { status: 403 });
      if (outcome === 'malformed') return new Response('{');
      return Response.json({ schemaVersion: 1, token: 'synthetic-capability', expiresAt: new Date(Date.now() + 60000).toISOString(), ...(outcome === 'missing' ? {} : { admission: 'wrong' }) });
    };
    await rejected(await createEndpoint(settings, mock)(request()));
    assert.equal(calls, 1);
  }
});
test('overall deadline settles stalled body and exchange; cancellation propagates', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const started = Date.now();
  await rejected(await createEndpoint(settings, deny, 25)(request(body)));
  assert.ok(Date.now() - started < 1000);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(cancelled, true);
  let signal: AbortSignal | undefined;
  await rejected(await createEndpoint(settings, async (_url, init) => { signal = init?.signal as AbortSignal; return new Promise(() => {}); }, 25)(request()));
  assert.equal(signal?.aborted, true);
  const controller = new AbortController();
  const result = createEndpoint(settings, deny, 1000)(request(new ReadableStream(), {}, undefined, controller.signal));
  controller.abort();
  await rejected(await result);
});

test('actual Vercel Node adapter preserves raw bytes and rejects host/path spoofing offline', async () => {
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
  Object.assign(process.env, settings);
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.deepEqual(JSON.parse(String(init?.body)), { schemaVersion: 1, ...binding, origin, environment: 'production', admission: 'managed-v1' });
    return Response.json({ schemaVersion: 1, token: 'synthetic-capability', expiresAt: new Date(Date.now() + 60000).toISOString(), admission: 'managed-v1' });
  };
  try {
    for (const [host, path, body, expected] of [
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1/', JSON.stringify(binding), 200],
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1', JSON.stringify(binding), 502],
      ['evil.example', '/api/bugdrop-capability/v1/', JSON.stringify(binding), 502],
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1/?selector=evil', JSON.stringify(binding), 502],
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1/', new Uint8Array([255]), 502],
    ] as const) {
      const req = new PassThrough() as unknown as IncomingMessage;
      req.method = 'POST'; req.url = path;
      req.headers = { host, origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
      const headers = new Map();
      let bytes = '';
      const res = Object.assign(new EventEmitter(), { statusCode: 0, setHeader(name: string, value: string) { headers.set(name, value); }, end(value: Buffer) { bytes = String(value); } });
      const result = nodeHandler(req, res as unknown as ServerResponse);
      (req as unknown as PassThrough).end(body);
      await result;
      assert.equal(res.statusCode, expected);
      assert.equal(headers.get('cache-control') || headers.get('Cache-Control'), 'no-store');
      assert.equal(bytes.includes(root), false);
    }
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = async () => { throw new Error('UNEXPECTED EXTERNAL FETCH'); };
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});


test('browser token provider reaches the strict route without Vercel slash normalization', async () => {
  const routing = JSON.parse(readFileSync('vercel.json', 'utf8')) as { trailingSlash: boolean };
  assert.equal(routing.trailingSlash, true);
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const previousFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'location', { configurable: true, value: new URL(origin) });
  const paths: string[] = [];
  let issuerCalls = 0;
  const endpoint = createEndpoint(settings, async (url, init) => {
    issuerCalls++;
    assert.equal(url, issuer);
    assert.equal(new Headers(init?.headers).get('Authorization'), authorization);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      schemaVersion: 1, ...binding, origin, environment: 'production', admission: 'managed-v1',
    });
    return Response.json({ schemaVersion: 1, token: 'synthetic-capability',
      expiresAt: new Date(Date.now() + 60000).toISOString(), admission: 'managed-v1' });
  });
  // This narrow routing boundary reproduces the confirmed hosted 308 for an
  // extensionless slashless URL. It does not claim to emulate all Vercel routing.
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin);
    paths.push(url.pathname);
    if (routing.trailingSlash && /^\/((?:[^/]+\/)*[^/\.]+)$/.test(url.pathname)) {
      if (init?.redirect === 'error') throw new TypeError('Redirect disallowed');
      return new Response(null, { status: 308, headers: { Location: `${url.pathname}/` } });
    }
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.credentials, 'omit');
    const headers = new Headers(init?.headers);
    // Browsers supply these same-origin request headers on the wire.
    headers.set('Origin', origin);
    headers.set('Sec-Fetch-Site', 'same-origin');
    return endpoint(new Request(url, { ...init, headers }));
  };
  try {
    await assert.rejects(fetch(`${origin}/api/bugdrop-capability/v1`, {
      method: 'POST', body: JSON.stringify(binding), redirect: 'error',
    }), /Redirect disallowed/);
    assert.equal(issuerCalls, 0);
    const capability = await createAnonymousTokenProvider()(binding);
    assert.equal(capability.schemaVersion, 1);
    assert.equal(capability.token, 'synthetic-capability');
    assert.deepEqual(paths, ['/api/bugdrop-capability/v1', '/api/bugdrop-capability/v1/']);
    assert.equal(issuerCalls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation);
    else Reflect.deleteProperty(globalThis, 'location');
  }
});


const capabilityResponse = () => Response.json({ schemaVersion: 1, token: 'synthetic-capability',
  expiresAt: new Date(Date.now() + 60000).toISOString(), admission: 'managed-v1' });
const immediate = () => new Promise<void>((resolve) => setImmediate(resolve));

for (const boundary of ['web', 'node'] as const) {
  test(`${boundary} default authorizes a valid 12-second exchange and remains bounded at 18 seconds`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const outcome of ['success', 'deadline', 'cancelled'] as const) {
      const events: FailureDiagnostic[] = [];
      let calls = 0; let aborts = 0; let contacted!: () => void;
      const started = new Promise<void>((resolve) => { contacted = resolve; });
      const exchange: typeof fetch = async (_url, init) => {
        calls++;
        return new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          const abort = () => { aborts++; clearTimeout(timer); reject(new Error('Synthetic cancellation')); };
          const timer = outcome === 'success' ? setTimeout(() => {
            signal?.removeEventListener('abort', abort); resolve(capabilityResponse());
          }, 12_000) : undefined;
          signal?.addEventListener('abort', abort, { once: true });
          contacted();
        });
      };
      const controller = new AbortController();
      const observe = (event: FailureDiagnostic) => { events.push(event); };
      let cancel = () => controller.abort();
      let result: Promise<Response>;
      if (boundary === 'web') {
        result = createEndpoint(settings, exchange, undefined, observe)(request(undefined, {}, undefined, controller.signal));
      } else {
        const req = new PassThrough() as unknown as IncomingMessage;
        req.method = 'POST'; req.url = '/api/bugdrop-capability/v1/';
        req.headers = { host: 'foil.neonwatty.com', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' };
        const headers = new Headers(); let body = '';
        const res = Object.assign(new EventEmitter(), { statusCode: 0,
          setHeader(name: string, value: string) { headers.set(name, value); },
          end(value: Buffer) { body = String(value); } });
        cancel = () => { req.emit('aborted'); };
        result = createNodeHandler(settings, exchange, undefined, observe)(req, res as unknown as ServerResponse)
          .then(() => new Response(body, { status: res.statusCode, headers }));
        (req as unknown as PassThrough).end(JSON.stringify(binding));
      }
      let settled = false;
      void result.then(() => { settled = true; });
      await started;
      t.mock.timers.tick(outcome === 'success' ? 11_999 : 17_999);
      await immediate();
      assert.equal(settled, false);
      assert.equal(aborts, 0);
      if (outcome === 'cancelled') cancel();
      else t.mock.timers.tick(1);
      const response = await result;
      assert.equal(calls, 1);
      if (outcome === 'success') {
        assert.equal(response.status, 200);
        assert.equal((await response.json()).token, 'synthetic-capability');
        assert.equal(aborts, 0); assert.deepEqual(events, []);
      } else {
        await rejected(response);
        assert.equal(aborts, 1); assert.equal(events.length, 1);
        assert.equal(events[0].phase, outcome);
        assert.equal(events[0].issuerContacted, true);
      }
    }
  });
}

test('failure phases distinguish configuration, body, binding, policy, SDK and issuer without disclosure', async () => {
  const events: FailureDiagnostic[] = [];
  const observe = (event: FailureDiagnostic) => { events.push(event); };
  const cases = [
    { env: {}, req: request(), transport: deny, phase: 'configuration' },
    { env: settings, req: request('x'.repeat(1025)), transport: deny, phase: 'body' },
    { env: settings, req: request('{'), transport: deny, phase: 'binding' },
    { env: settings, req: request(undefined, { 'Sec-Fetch-Site': 'cross-site' }), transport: deny, phase: 'policy' },
    { env: { ...settings, BUGDROP_API_KEY: 'invalid-secret-root' }, req: request(), transport: deny, phase: 'sdk_init' },
    { env: settings, req: request(), transport: async () => new Response(root, { status: 403 }), phase: 'issuer_exchange' },
  ];
  for (const item of cases) {
    events.length = 0;
    const response = await createEndpoint(item.env, item.transport, 1000, observe)(item.req);
    await rejected(response, item.phase === 'configuration' ? 404 : 502);
    assert.equal(events.length, 1); assert.equal(events[0].phase, item.phase);
    assert.equal(events[0].issuerContacted, item.phase === 'issuer_exchange');
    if (item.phase === 'issuer_exchange') assert.equal(events[0].httpStatus, 403);
    for (const secret of [root, authorization, binding.submissionId, binding.payloadDigest, 'invalid-secret-root']) assert.equal(JSON.stringify(events).includes(secret), false);
  }
  const policyEvents: FailureDiagnostic[] = [];
  const handler = createV1Handler({ apiKey: root, origin, endpoint: issuer, fetch: deny,
    observeFailure: (event) => { policyEvents.push(event); } }, () => { throw new Error(`${root} ${authorization}`); });
  await rejected(await handler(request())); assert.equal(policyEvents.length, 1); assert.equal(policyEvents[0].phase, 'policy');
});

test('transport diagnostics neither consume nor clone the issuer response body', async () => {
  let calls = 0;
  const events: FailureDiagnostic[] = [];
  const exchange: typeof fetch = async () => {
    calls++;
    const response = capabilityResponse();
    Object.defineProperty(response, 'body', { get() { assert.fail('Observer consumed response body'); } });
    response.clone = () => { assert.fail('Observer cloned response body'); };
    return response;
  };
  assert.equal((await createEndpoint(settings, exchange, 1000, (event) => { events.push(event); })(request())).status, 200);
  assert.equal(calls, 1); assert.equal(events.length, 0);
});

test('hostile errors and observer failures never expose secrets or reject authorization handling', async () => {
  const canary = `${root} ${authorization} cookie-secret ${binding.submissionId} ${binding.payloadDigest}`;
  const events: unknown[] = [];
  const warn = console.warn;
  console.warn = (...args) => { events.push(args); };
  try { await rejected(await createEndpoint(settings, async () => { throw new Error(canary); })(request())); }
  finally { console.warn = warn; }
  assert.equal(events.length, 1);
  for (const secret of canary.split(' ')) assert.equal(JSON.stringify(events).includes(secret), false);
  const unhandled: unknown[] = [];
  const listener = (error: unknown) => { unhandled.push(error); };
  process.on('unhandledRejection', listener);
  try {
    for (const observer of [() => { throw new Error(canary); }, async () => { throw new Error(canary); }]) {
      let calls = 0;
      await rejected(await createEndpoint(settings, async () => { calls++; return new Response(canary, { status: 403 }); }, 1000, observer)(request()));
      assert.equal(calls, 1);
    }
    await immediate(); await immediate(); assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', listener); }
  const projected: FailureDiagnostic[] = [];
  const report = failureReporter((event) => { projected.push(event); });
  report({ phase: canary, reason: canary, issuerContacted: canary, httpStatus: canary,
    originMatches: canary, headers: canary } as unknown as FailureDiagnostic);
  assert.equal(JSON.stringify(projected).includes(root), false);
  assert.deepEqual(projected, [{ phase: 'sdk_init', reason: 'failed', issuerContacted: false }]);
});

test('deadline and request cancellation emit once with correct issuer contact and one abort', async () => {
  for (const cancellation of [false, true]) {
    const events: FailureDiagnostic[] = [];
    let calls = 0; let aborts = 0;
    const controller = new AbortController();
    let started!: () => void; const contacted = new Promise<void>((resolve) => { started = resolve; });
    const endpoint = createEndpoint(settings, async (_url, init) => {
      calls++; started();
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => { aborts++; reject(new Error(root)); }, { once: true }));
    }, cancellation ? 1000 : 30, (event) => { events.push(event); });
    const result = endpoint(request(undefined, {}, undefined, controller.signal));
    await contacted; if (cancellation) controller.abort();
    await rejected(await result); await immediate();
    assert.equal(calls, 1); assert.equal(aborts, 1); assert.equal(events.length, 1);
    assert.equal(events[0].phase, cancellation ? 'cancelled' : 'deadline'); assert.equal(events[0].issuerContacted, true);
  }
});

async function nativeRoundTrip(options: {
  env?: Record<string, string | undefined>; headers?: Record<string, string>; path?: string;
  transport?: typeof fetch; deadlineMs?: number; consumeFirst?: boolean;
}) {
  const events: FailureDiagnostic[] = [];
  let reads = 0; let native = false; let completed!: () => void;
  const completion = new Promise<void>((resolve) => { completed = resolve; });
  const server = createServer(async (req, res) => {
    native = req.constructor.name === 'IncomingMessage' && res.constructor.name === 'ServerResponse';
    if (options.consumeFirst) for await (const chunk of req) { void chunk; }
    const original = req.read;
    req.read = function (size?: number) { reads++; return original.call(this, size); };
    try {
      await createNodeHandler(options.env ?? settings, options.transport ?? deny, options.deadlineMs ?? 1000,
        (event) => { events.push(event); })(req, res);
    } finally { req.read = original; completed(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  try {
    const response = await new Promise<{ status: number; body: string; cache: string | undefined }>((resolve, reject) => {
      const client = httpRequest({ hostname: '127.0.0.1', port: address.port, method: 'POST', path: options.path ?? '/api/bugdrop-capability/v1/', agent: false,
        headers: { host: 'foil.neonwatty.com', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...options.headers } }, (res) => {
        let body = ''; res.setEncoding('utf8'); res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode!, body, cache: res.headers['cache-control'] }));
      });
      client.on('error', reject); client.end(JSON.stringify(binding));
    });
    await completion;
    return { ...response, events, reads, native };
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('real IncomingMessage envelopes deny without reading input or contacting issuer', async () => {
  for (const options of [{ env: {} }, { headers: { host: 'evil.example' } }, { path: '/api/bugdrop-capability/v1' },
    { headers: { origin: 'https://evil.example' } }, { headers: { 'content-encoding': 'gzip' } }]) {
    const result = await nativeRoundTrip(options);
    assert.equal(result.native, true); assert.equal(result.status, options.env ? 404 : 502);
    assert.equal(result.cache, 'no-store'); assert.equal(result.reads, 0); assert.equal(result.events.length, 1);
    assert.equal(result.events[0].issuerContacted, false);
  }
});

test('real IncomingMessage valid exchange, consumed stream and issuer deadline remain bounded', async () => {
  let calls = 0;
  const valid = await nativeRoundTrip({ transport: async () => { calls++; return capabilityResponse(); } });
  assert.equal(valid.status, 200); assert.equal(calls, 1); assert.deepEqual(valid.events, []); assert.equal(valid.native, true);
  const consumed = await nativeRoundTrip({ consumeFirst: true });
  assert.equal(consumed.status, 502); assert.equal(consumed.reads, 0); assert.equal(consumed.events.length, 1);
  assert.equal(consumed.events[0].phase, 'adaptation'); assert.equal(consumed.events[0].reason, 'unavailable');
  let aborts = 0;
  const timeout = await nativeRoundTrip({ deadlineMs: 30, transport: async (_url, init) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => { aborts++; reject(new Error(root)); }, { once: true }));
  } });
  assert.equal(timeout.status, 502); assert.equal(calls, 2); assert.equal(aborts, 1);
  assert.equal(timeout.events.length, 1); assert.equal(timeout.events[0].phase, 'deadline'); assert.equal(timeout.events[0].issuerContacted, true);
});


test('real native client disconnect cancels a contacted issuer once and records one failure', async () => {
  let calls = 0; let aborts = 0; let started!: () => void; let finished!: () => void;
  const contacted = new Promise<void>((resolve) => { started = resolve; });
  const completion = new Promise<void>((resolve) => { finished = resolve; });
  const events: FailureDiagnostic[] = [];
  const server = createServer(async (req, res) => {
    res.on('error', () => {});
    try {
      await createNodeHandler(settings, async (_url, init) => {
        calls++; started();
        return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => { aborts++; reject(new Error(root)); }, { once: true }));
      }, 1000, (event) => { events.push(event); })(req, res);
    } finally { finished(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address !== 'string');
  const client = httpRequest({ hostname: '127.0.0.1', port: address.port, method: 'POST', path: '/api/bugdrop-capability/v1/', agent: false,
    headers: { host: 'foil.neonwatty.com', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' } });
  client.on('error', () => {});
  try {
    client.end(JSON.stringify(binding)); await contacted; client.destroy(); await completion; await immediate();
    assert.equal(calls, 1); assert.equal(aborts, 1); assert.equal(events.length, 1);
    assert.equal(events[0].phase, 'cancelled'); assert.equal(events[0].issuerContacted, true);
  } finally { client.destroy(); server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('concurrent invocations keep issuer-contact diagnostics separate', async () => {
  const events: FailureDiagnostic[] = [];
  let release!: () => void; let contacted!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { contacted = resolve; });
  let calls = 0;
  const handler = createV1Handler({ apiKey: root, origin, endpoint: issuer, fetch: async () => {
    calls++; contacted(); await gate; return new Response(null, { status: 403 });
  }, observeFailure: (event) => { events.push(event); } }, (req) => req.headers.get('X-Test-Deny') !== '1');
  const first = handler(request()); await started;
  await rejected(await handler(request(undefined, { 'X-Test-Deny': '1' })));
  release(); await rejected(await first);
  assert.equal(calls, 1);
  assert.deepEqual(events.map(({ phase, issuerContacted }) => ({ phase, issuerContacted })), [
    { phase: 'policy', issuerContacted: false }, { phase: 'issuer_exchange', issuerContacted: true },
  ]);
});
