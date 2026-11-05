import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createAnonymousTokenProvider } from '@bugdrop/browser';
import type { FailureDiagnostic, FailureObserver } from '@bugdrop/server/adapter';
import nodeHandler, { config, createNodeHandler } from '../api/bugdrop-capability/v1.js';

// Public SDK credential/binding vectors, never real application credentials.
const root = 'bd_api_v1.AAECAwQFBgcICQoLDA0ODw.EBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8';
const authorization = 'Bearer bd_auth_v1.AAECAwQFBgcICQoLDA0ODw.mrJiVKhkJz8d7tNgPkSTl2tRDQ840gImsfUvb1q0ZPo';
const origin = 'https://foil.neonwatty.com';
const issuer = 'https://managed.bugdrop.dev/v1/submission-capabilities';
const path = '/api/bugdrop-capability/v1/';
const binding = { submissionId: '018f1f2e-7b4a-7c3d-9e10-4f5a6b7c8d90', payloadDigest: 'sPybYsPwrJsoR8G8LbuHwYw3y-QHlqrYOfI-8lbJbEQ' };
const settings = { BUGDROP_ENABLED: '1', BUGDROP_API_KEY: root, BUGDROP_ORIGIN: origin, BUGDROP_ISSUER: issuer };
const deny: typeof fetch = async () => assert.fail('Unexpected issuer exchange');
const quiet: FailureObserver = () => {};
const capability = () => Response.json({ schemaVersion: 1, token: 'synthetic-capability',
  expiresAt: new Date(Date.now() + 60000).toISOString(), admission: 'managed-v1' });
type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

async function native(handler: Handler, run: (send: (options?: { headers?: Record<string, string>; path?: string; body?: string }) => Promise<Response>, reads: number[]) => Promise<void>) {
  const reads: number[] = [];
  const server = createServer((req, res) => {
    let count = 0;
    const read = req.read.bind(req);
    req.read = (...args) => { count++; return read(...args); };
    // Snapshot at the application response boundary, before Node drains an unread
    // request internally after res.end(). Those housekeeping reads are not body parsing.
    const end = res.end.bind(res);
    res.end = ((...args: Parameters<typeof res.end>) => {
      reads.push(count);
      return end(...args);
    }) as typeof res.end;
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const send = (options: { headers?: Record<string, string>; path?: string; body?: string } = {}) => new Promise<Response>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: address.port, method: 'POST', path: options.path ?? path,
      headers: { host: 'foil.neonwatty.com', origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...options.headers } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers as Record<string, string> })));
    });
    req.on('error', reject);
    req.end(options.body ?? JSON.stringify(binding));
  });
  try { await run(send, reads); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}
async function rejected(response: Response, status = 502) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), status === 404 ? '' : '{"error":"unable_to_authorize_bugdrop"}');
}

test('installed private SDK versions, tarball digests and lock integrity match portable provenance', () => {
  const provenance = JSON.parse(readFileSync('vendor/sdk/PROVENANCE.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(provenance.sourceCommit, 'fe29f52da22e1e2517672abb802a8acee11f0ad2');
  assert.equal(provenance.sourceTree, 'ad31e11018fd42e683060fcc47362c75a0c3d4a3');
  assert.equal(provenance.npm, '10.9.8');
  assert.equal(provenance.published, false);
  assert.equal(provenance.remoteQualificationTransferred, false);
  for (const name of ['browser', 'server']) {
    const artifact = provenance.packages[name];
    assert.equal(artifact.version, name === 'server' ? '0.2.1' : '0.2.0');
    assert.match(artifact.sourceCommit, /^[a-f0-9]{40}$/);
    assert.match(artifact.sourceTree, /^[a-f0-9]{40}$/);
    assert.equal(JSON.parse(readFileSync(`node_modules/@bugdrop/${name}/package.json`, 'utf8')).version, artifact.version);
    assert.equal(createHash('sha256').update(readFileSync(artifact.path)).digest('hex'), artifact.sha256);
    assert.equal(lock.packages[`node_modules/@bugdrop/${name}`].integrity, artifact.integrity);
    assert.equal(lock.packages[`node_modules/@bugdrop/${name}`].resolved, `file:${artifact.path}`);
  }
});

test('default entry preserves raw parsing and reads current process.env on each invocation', async (t) => {
  assert.deepEqual(config, { api: { bodyParser: false } });
  t.mock.method(globalThis, 'fetch', deny);
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, settings, { BUGDROP_ENABLED: '0' });
    await native(nodeHandler, async (send, reads) => {
      await rejected(await send(), 404);
      process.env.BUGDROP_ENABLED = '1';
      process.env.BUGDROP_ISSUER = 'https://api.bugdrop.dev/v1/submission-capabilities';
      await rejected(await send());
      assert.deepEqual(reads, [0, 0]);
    });
    assert.deepEqual(logs, [
      ['bugdrop_authorization_failure', { phase: 'configuration', reason: 'disabled', issuerContacted: false }],
      ['bugdrop_authorization_failure', { phase: 'configuration', reason: 'incomplete', issuerContacted: false }],
    ]);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('disabled/incomplete environment matrix rejects before body reads or issuer calls', async () => {
  for (const env of [{}, { ...settings, BUGDROP_ENABLED: 'true' }, { ...settings, BUGDROP_ENABLED: '0' },
    { ...settings, BUGDROP_API_KEY: '' }, { ...settings, BUGDROP_ORIGIN: 'https://evil.example' },
    { ...settings, BUGDROP_ISSUER: 'https://api.bugdrop.dev/v1/submission-capabilities' }]) {
    const events: FailureDiagnostic[] = [];
    await native(createNodeHandler(() => env, deny, (event) => { events.push(event); }), async (send, reads) => {
      await rejected(await send({ body: 'UNTRUSTED_BODY' }), env.BUGDROP_ENABLED === '1' ? 502 : 404);
      assert.deepEqual(reads, [0]);
    });
    assert.deepEqual(events, [{ phase: 'configuration', reason: env.BUGDROP_ENABLED === '1' ? 'incomplete' : 'disabled', issuerContacted: false }]);
  }
});

test('packaged native adapter enforces exact Foil host, origin and canonical path', async () => {
  await native(createNodeHandler(() => settings, deny, quiet), async (send) => {
    for (const options of [
      { headers: { host: 'evil.example', 'x-forwarded-host': 'foil.neonwatty.com' } },
      { headers: { origin: 'https://sub.foil.neonwatty.com' } },
      { headers: { origin: 'http://foil.neonwatty.com' } },
      { headers: { origin: 'https://foil.neonwatty.com:444' } },
      { path: path.slice(0, -1) }, { path: `${path}?selector=evil` },
      { body: 'x'.repeat(1025) },
    ]) await rejected(await send(options));
  });
});

test('actual packaged managed exchange derives vector bearer and omits an unassigned environment', async () => {
  let calls = 0;
  const exchange: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, issuer);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Authorization'), authorization);
    assert.equal(headers.get('X-BugDrop-SDK-Version'), '0.2.1');
    assert.equal(JSON.stringify([...headers]).includes(root), false);
    assert.equal(String(init?.body).includes(root), false);
    assert.deepEqual(JSON.parse(String(init?.body)), { schemaVersion: 1, ...binding, origin, admission: 'managed-v1' });
    return capability();
  };
  await native(createNodeHandler(() => settings, exchange, quiet), async (send) => {
    const response = await send();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(await response.json()).sort(), ['expiresAt', 'schemaVersion', 'token']);
  });
  assert.equal(calls, 1);
});

test('null-environment issuer contract accepts the packaged Foil route without inferring production', async () => {
  let calls = 0;
  const exchange: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    if (Object.hasOwn(body, 'environment') && body.environment !== null) {
      return Response.json({ schemaVersion: 1, error: { code: 'invalid_capability', retryable: false } }, { status: 401 });
    }
    return capability();
  };
  await native(createNodeHandler(() => settings, exchange, quiet), async (send) => {
    assert.equal((await send()).status, 200);
  });
  assert.equal(calls, 1);
});

test('console observer receives sanitized SDK failures and observer throw/reject cannot alter denial', async (t) => {
  const events: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => events.push(args));
  const lost: typeof fetch = async () => { throw new Error(`${root} ${JSON.stringify(binding)}`); };
  await native(createNodeHandler(() => settings, lost), async (send) => rejected(await send()));
  assert.deepEqual(events, [['bugdrop_authorization_failure', { phase: 'issuer_exchange', reason: 'failed', issuerContacted: true }]]);
  for (const observe of [() => { throw new Error(root); }, async () => { throw new Error(root); }]) {
    await native(createNodeHandler(() => settings, lost, observe), async (send) => rejected(await send()));
    await native(createNodeHandler(() => ({}), deny, observe), async (send) => rejected(await send(), 404));
  }
});

test('packaged browser provider reaches native SDK route directly without redirects', async (t) => {
  assert.equal(JSON.parse(readFileSync('vercel.json', 'utf8')).trailingSlash, true);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: new URL(origin) });
  let calls = 0;
  try {
    await native(createNodeHandler(() => settings, async () => { calls++; return capability(); }, quiet), async (send) => {
      t.mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
        assert.equal(input, `${origin}${path}`);
        assert.equal(init?.redirect, 'error');
        assert.equal(init?.credentials, 'omit');
        assert.equal(init?.cache, 'no-store');
        return send({ path: new URL(String(input)).pathname, body: String(init?.body) });
      });
      const response = await createAnonymousTokenProvider()(binding);
      assert.equal(response.token, 'synthetic-capability');
    });
  } finally {
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else Reflect.deleteProperty(globalThis, 'location');
  }
  assert.equal(calls, 1);
});
