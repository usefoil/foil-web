import type { IncomingMessage, ServerResponse } from 'node:http';
import { createNodeCapabilityHandler } from '@bugdrop/server/node';
import type { FailureObserver } from '@bugdrop/server/adapter';

export const config = { api: { bodyParser: false } };
const ORIGIN = 'https://foil.neonwatty.com';
const ISSUER = 'https://managed.bugdrop.dev/v1/submission-capabilities';
const PATH = '/api/bugdrop-capability/v1/';
const consoleObserver: FailureObserver = (event) => console.warn('bugdrop_authorization_failure', event);

/** Read configuration before constructing the SDK handler or touching raw input. */
export function createNodeHandler(
  environment: () => Record<string, string | undefined> = () => process.env,
  transport?: typeof fetch,
  observer: FailureObserver = consoleObserver,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const env = environment();
    const enabled = env.BUGDROP_ENABLED === '1';
    const complete = Boolean(env.BUGDROP_API_KEY) && env.BUGDROP_ORIGIN === ORIGIN && env.BUGDROP_ISSUER === ISSUER;
    if (!enabled || !complete) {
      // Fixed safe metadata only; diagnostics must never affect authorization.
      try {
        void Promise.resolve(observer(Object.freeze({ phase: 'configuration',
          reason: enabled ? 'incomplete' : 'disabled', issuerContacted: false }))).catch(() => {});
      } catch { /* Diagnostics are best effort. */ }
      res.statusCode = enabled ? 502 : 404;
      res.setHeader('Cache-Control', 'no-store');
      if (enabled) res.setHeader('Content-Type', 'application/json');
      res.end(enabled ? '{"error":"unable_to_authorize_bugdrop"}' : undefined);
      return;
    }
    await createNodeCapabilityHandler({
      enabled: true, mode: 'anonymous', apiKey: env.BUGDROP_API_KEY,
      origin: ORIGIN, path: PATH, endpoint: ISSUER,
      fetch: transport, observeFailure: observer,
    })(req, res);
  };
}

export default createNodeHandler();
