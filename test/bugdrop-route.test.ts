import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import nodeHandler, { createEndpoint } from '../api/bugdrop-capability/v1.js';

// Shared SDK api-key-credential.v1 and submission-binding.v1 public vectors.
const root = 'bd_api_v1.AAECAwQFBgcICQoLDA0ODw.EBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8';
const authorization = 'Bearer bd_auth_v1.AAECAwQFBgcICQoLDA0ODw.mrJiVKhkJz8d7tNgPkSTl2tRDQ840gImsfUvb1q0ZPo';
const origin = 'https://foil.neonwatty.com';
const issuer = 'https://api.bugdrop.dev/v1/submission-capabilities';
const binding = { submissionId: '018f1f2e-7b4a-7c3d-9e10-4f5a6b7c8d90', payloadDigest: 'sPybYsPwrJsoR8G8LbuHwYw3y-QHlqrYOfI-8lbJbEQ' };
const settings = { BUGDROP_ENABLED: '1', BUGDROP_API_KEY: root, BUGDROP_ORIGIN: origin, BUGDROP_ISSUER: issuer };
globalThis.fetch = async () => { throw new Error('UNEXPECTED EXTERNAL FETCH'); };
function request(body: BodyInit = JSON.stringify(binding), headers: Record<string,string> = {}, url = `${origin}/api/bugdrop-capability/v1`, signal?: AbortSignal) {
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
test('request boundary rejects origins, selectors, metadata, methods, paths and malformed bodies', async () => {
  const cases = [
    request(undefined, { Origin: 'https://sub.foil.neonwatty.com' }),
    request(undefined, { Origin: 'https://foil.neonwatty.com:444' }),
    request(undefined, { Origin: 'http://foil.neonwatty.com' }),
    request(undefined, { 'Sec-Fetch-Site': '' }), request(undefined, { 'Sec-Fetch-Site': 'cross-site' }),
    request(undefined, { 'Content-Type': 'text/plain' }), request(undefined, {}, `${origin}/wrong`),
    new Request(`${origin}/api/bugdrop-capability/v1`),
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
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1', JSON.stringify(binding), 200],
      ['evil.example', '/api/bugdrop-capability/v1', JSON.stringify(binding), 502],
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1?selector=evil', JSON.stringify(binding), 502],
      ['foil.neonwatty.com', '/api/bugdrop-capability/v1', new Uint8Array([255]), 502],
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
