# Foil website feedback readiness

This source integration is disabled by default and has not been deployed or
accepted in production. It applies only to usefoil/foil-web, repository
1264283880, at candidate origin https://foil.neonwatty.com. It does not modify
the native macOS app. Repository selection is not an access grant.

## Pinned artifacts

The private anonymous SDK bundle source is
`f2bc49002784048b0c0e3996530f01300efb1dff`. Original bundle manifest is preserved
at `vendor/sdk/PROVENANCE.json`; its paths refer to the original bundle, not
this integration. `src/{browser,server,handler,transport}.ts` map to
`lib/bugdrop/`. The integration adapts handler body cancellation for the
Vercel overall deadline, and trims unused customer-policy/CSRF wrapper exports
for this managed anonymous integration. The SDK tarballs remain byte-for-byte unchanged.

Browser SHA256: `1517e5501c86d44f9957a9c7705da87c757ac4e327aabed16f8fd774d1d1cc83`.
Server SHA256: `965ef2bcee173501859880b6358bfa4bee6bd12985d7802f5591f171f3d7482d`.
These are private file dependencies, not an npm publication or deployed proof.

## Two independent switches

`FOIL_FEEDBACK_ENABLED=0` controls build-time public configuration.
`BUGDROP_ENABLED=0` controls the server-only Vercel function. Leave both off.
The only browser configuration is enabled, public Application ID, and exact
hosted-widget URL https://widget.bugdrop.dev/widget.v1.js. The homepage alone
loads the bundled SDK and requires the exact approved origin. Blog and privacy
pages never mount it. Build output excludes API sources, server wrappers,
vendor tarballs and provenance.

After authorization, server configuration requires BUGDROP_API_KEY (root),
BUGDROP_ORIGIN=https://foil.neonwatty.com and
BUGDROP_ISSUER=https://api.bugdrop.dev/v1/submission-capabilities. Never put
roots in public variables, source, screenshots, logs, or browser inputs.
No local secret environment file is required for the offline proofs.

## Admission and failures

POST /api/bugdrop-capability/v1 is a Vercel Node function with raw body parsing.
The standard Python static preview cannot execute this route. The SDK canonical
parser rejects extra/duplicate keys, invalid binding bytes, wrong origin,
method, media type and path. Same-origin Fetch Metadata is mandatory.
The server explicitly requests managed-v1 admission and requires its exact
confirmation; there is no customer database adapter, in-memory fallback,
automatic retry, or alternate issuer. An eight-second overall deadline covers
body read and exchange, with cancellation propagation. Uncertain responses
fail closed with a generic no-store response. Explicit same-binding retries
are separate calls and still require durable service admission.

## Offline gates

Run npm run test:bugdrop, npm run typecheck:bugdrop, npm run build,
npm run check:bugdrop, npm run quality and npm audit --audit-level=moderate.
Tests use only public synthetic vectors, injected exchange mocks and a mocked
DOM; they do not establish durable production behavior. The output scanner has
a deliberate secret-contamination negative control. No deployed/release smoke
is part of these gates.

## Before any enablement

Obtain exact owner/repository, destination and origin approvals, production
App grants and scoped activation authorization. Verify deployed managed-v1
flag and durable namespace, exact response confirmation, current setup fences,
release identity and shared owner budget headroom. Never reset, copy or refund
the shared owner ledger. Complete actual-base review and final-head CI,
approve deployment and inspect the preview/build route mapping. Review the
public optional-feedback disclosure. Then prove correlated delivery, scope
isolation, independent revocation and replacement through the normal product
flow. Do not reset neonwatty. These are unresolved production prerequisites.

## Local candidate status (2026-10-27)

The T086 candidate passed 12 offline route/browser/build tests, standalone
typing, format, output-boundary scan and existing launch checks. Its original
verification remained blocked after two corrections: Knip found an unused
exported type, and quality reproduced four unchanged base homepage HTML errors.
T090 explicitly authorized one terminal mechanical cleanup of those exact
causes with zero corrective retries. Original T086 failures and its exhausted
counter remain historical records; this is not a fresh repair allowance.
The terminal verification receipt records the current outcome.

The full dependency audit has 10 unchanged baseline findings: seven high and
three moderate advisories in the development/tooling graph. Their identities
and paths were independently compared with the exact base package/lock audit.
They remain unresolved security work, even if a production-only graph check
finds no advisory. No package upgrade, audit threshold reduction or blanket
security acceptance is authorized here. This source remains uncommitted and
unpublished pending refreshed actual-base review and final-head CI.

Terminal cleanup results: Knip, full quality (including the 12 offline tests and
typing) and the output scanner pass. The full audit still reports the same 10
baseline findings; the production-only dependency audit reports zero findings.
This narrows the dependency-graph result without clearing tooling or production
security. Original failures remain recorded.

The local footer-browser comparison did not complete: the quality tests leave
a synthetically enabled public config in generated dist, while the comparison
expected the default-disabled build. The first config assertion stopped it
before desktop/mobile style equality was established. External requests were
intercepted and blocked. No corrective retry was authorized. Do not treat that
generated test output as an approved deployment artifact. Source defaults are
unchanged, and footer equivalence still needs independent verification.
