# Foil website feedback readiness

This source integration is disabled by default and applies only to
usefoil/foil-web, repository 1264283880, at https://foil.neonwatty.com.
Foil reporting activation and delivery acceptance remain pending. Repository
selection is not an access grant. The native macOS app is outside this slice.

## Private pinned artifacts

The active file dependencies are @bugdrop/browser 0.2.0 and @bugdrop/server 0.2.1.
The browser artifact is unchanged from SDK source
`9f7982a0c05d4723c56ed13c1da57f3d6d5fcf59`, packed with npm 11.19.1.
The repaired server artifact was packed with npm 10.9.8 from SDK source
`fe29f52da22e1e2517672abb802a8acee11f0ad2`, tree
`ad31e11018fd42e683060fcc47362c75a0c3d4a3`.
The portable `vendor/sdk/PROVENANCE.json` records per-package source identity,
artifact paths, SHA256 and npm SHA512 integrity. Its top-level source identity
refers to the server patch. The lockfile pins those same tarballs. These remain
unpublished private candidates; no registry publication or remote qualification
is implied.

Browser SHA256: `2890fcf9e74af8d33f21d18c093164ffcb0ae3735c3efb8681f0ee5fa7d4f987`.
Server SHA256: `649063111dc7dc412303343be1709637df9cdbb87ec4d2affe172d38fdcea018`.
The previous server bytes remain in Git history; this patch does not change the
browser package or any deployed release.

## Two independent switches

`FOIL_FEEDBACK_ENABLED=0` controls build-time public configuration.
`BUGDROP_ENABLED=0` controls the server-only Vercel function. Production and
preview reporting flags are untouched. Both remain off unless a separately
approved rollout enables them; preview stays off.
The only browser configuration is enabled, public Application ID, and exact
hosted-widget URL https://delivery.bugdrop.dev/widget.managed.v1.js. The homepage
alone mounts the SDK, once, at the exact approved origin. Readiness failure
shows a generic notice. Blog and privacy pages never mount it. Build output
excludes API sources, server wrappers, vendor tarballs and provenance.

After authorization, server configuration requires BUGDROP_API_KEY (root),
BUGDROP_ORIGIN=https://foil.neonwatty.com and
BUGDROP_ISSUER=https://managed.bugdrop.dev/v1/submission-capabilities.
The thin Foil wrapper reads configuration on every invocation. Disabled
requests return 404 before input or client construction; incomplete enabled
configuration, including the old issuer URL, returns generic no-store 502
before body reads or issuer contact. A fixed safe configuration diagnostic
contains no environment values. No local secret file is needed for offline tests.

## SDK-owned admission and failures

POST /api/bugdrop-capability/v1/ is a Vercel Node function with
`bodyParser: false`. The canonical trailing slash matches existing Vercel
routing; the packaged browser provider requests it directly with redirects
rejected and cookies omitted. The packaged Node handler enforces exact host,
origin, path and same-origin Fetch Metadata. Forwarded selectors cannot choose
an authority. The standard Python static preview cannot execute this route.

`createNodeCapabilityHandler` owns raw Node adaptation, bounded canonical
binding parsing, managed-v1 confirmation, cancellation and the 18-second
overall server deadline. The browser provider owns its 25-second deadline.
There is no copied Foil parser, transport, deadline or Web endpoint wrapper.
The route omits the optional authorization environment because its managed
authority has a null environment. A production deployment does not imply a
`production` authorization constraint. The repaired SDK preserves omission and
still requests managed admission with no automatic retry or alternate issuer. Uncertain responses fail closed. Explicit retries
remain separate calls requiring durable service admission.

Foil explicitly supplies a console observer because the SDK default is a no-op.
SDK diagnostics are sanitized metadata only; configuration diagnostics are
fixed literals. Neither observer throws nor rejected promises affect responses.
Do not log bindings, roots, headers or raw errors.

## Offline evidence and coverage ownership

Run `npm run quality`. Consumer route tests import the installed tarballs and
use real native Node HTTP requests on a loopback fixture, with a synthetic
public credential vector and injected managed issuer responses. They cover
per-invocation configuration, zero body reads/exchanges at configuration gates,
exact Foil wiring, omitted environment against the null-authority contract,
the derived vector bearer and SDK version, safe observer
wiring, and the packaged browser provider reaching the canonical Node route.
Artifact tests check installed versions, tarball hashes and lock integrity.
Existing emitted-browser DOM guards and build-output secret contamination
negative controls remain in place.

Algorithm regression coverage belongs to the SDK source suites:

| Previous Foil algorithm coverage | SDK test suite |
| --- | --- |
| Binding parser and request boundary | `test/server-adapter-boundary.test.ts`, `test/server-adapter.test.ts` |
| Raw Node stream/envelope handling | `test/server-node-adapter.test.ts` |
| Deadline and cancellation | `test/server-adapter-deadline.test.ts` |
| Managed response bounds/confirmation | `test/server-adapter-response.test.ts` |
| Sanitization and observer isolation | `test/server-adapter-diagnostics.test.ts` |
| Browser provider and deadline | `test/browser-token-provider.test.ts`, `test/browser-token-provider-deadline.test.ts` |

These tests establish local consumer wiring, not hosted raw-body behavior or
durable production admission. No live report, provider write, activation,
deployment or deployed smoke is part of this slice. After quality, rebuild
with `FOIL_FEEDBACK_ENABLED=0 npm run build`, then run `npm run check:bugdrop`;
browser tests otherwise leave synthetic enabled output. A local disabled
build is not an approved deployment artifact.

Existing development-tooling dependency advisories remain unresolved. No
unrelated upgrades or audit threshold changes are authorized by this adoption.
Historical counts and exhausted repair receipts are retained in Git/history;
consult current audit output rather than treating older counts as current.

## Before enablement

Exact owner/repository, destination and origin approvals, production App grants
and scoped activation authorization are still required. Verify deployed
managed-v1 configuration and durable namespace, exact response confirmation,
current setup fences, release identity and shared owner budget headroom.
Never reset, copy or refund the shared owner ledger. Complete actual-base
review and final-head CI, approve deployment, inspect the preview/build route
mapping and prove hosting raw-body handling. Review the public feedback
disclosure, then prove correlated delivery, scope isolation, independent
revocation and replacement through the normal product flow. These gates remain
unqualified by this local adoption. Do not reset neonwatty.
