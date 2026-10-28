import { createV1Handler, type V1BackendOptions } from './handler.js';

/** Managed admission needs only the app's server API key; no database adapter. */
export function managedCapabilityEndpoint(options: V1BackendOptions & { enabled: boolean }) {
  const handler = createV1Handler(
    { ...options, admission: 'managed-v1' },
    (request) => request.headers.get('Sec-Fetch-Site') === 'same-origin'
  );
  return (request: Request): Promise<Response> =>
    options.enabled === true
      ? handler(request)
      : Promise.resolve(
          new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
        );
}
