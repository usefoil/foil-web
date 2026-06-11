# Foil Web Observability

Foil web has an env-gated Sentry browser error-monitoring foundation for the
static launch. The SDK is not loaded unless `SENTRY_DSN` is configured at build
time.

## Current State

- The web repo is a static landing site with no API routes, authentication flow,
  checkout flow, or user-generated form submissions.
- `observability.js` loads the Sentry errors-only browser SDK only when the
  generated config includes `sentryDsn`.
- Session replay and tracing are disabled with zero sample rates, and the site
  does not load a replay or tracing Sentry bundle.
- The client sets `sendDefaultPii=false`, drops breadcrumbs, removes `user`, and
  strips request cookies, headers, body/data, query strings, transcript text,
  raw audio, clipboard contents, API keys, email addresses, and free-form user
  input before sending.
- `privacy/index.html` discloses that Sentry browser error monitoring is
  prepared behind production configuration.
- PostHog remains limited to manual conversion analytics and does not provide
  exception collection.
- CodeQL runs on pull requests and `npm run check:launch` covers build, SEO,
  privacy, analytics, install-trust, observability, and unsupported-claim checks.

## Configuration

Sentry setup needs operator-provided service access and project choices:

- `SENTRY_AUTH_TOKEN` with read-only scopes such as `org:read`, `project:read`,
  and `event:read` for health inspection.
- Project-write access is required to create the Sentry project when it does not
  already exist.
- `SENTRY_ORG` and `SENTRY_PROJECT` for API queries.
- `SENTRY_DSN` for browser error capture. Leave unset to disable Sentry loading.
- `SENTRY_ENVIRONMENT`, normally `preview` or `production`.
- `SENTRY_RELEASE`, normally the deployed git SHA or Vercel commit SHA.

Do not paste tokens into chat or commit them to the repo. Set secrets in the
local shell, Sentry, or Vercel environment configuration. The DSN is a public
client-side value, but it should still be managed through Vercel env so preview
and production can be controlled independently.

## Enablement Checklist

Before production collection is considered complete:

1. Create or confirm the Sentry project and DSN.
2. Set `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and `SENTRY_RELEASE` in the intended
   Vercel environment.
3. Send one controlled test error from a preview deployment.
4. Confirm the controlled test error appears in the expected Sentry project with
   the expected environment and release.
5. Query Sentry with read-only API access and record the project/org receipt.
6. Run deployed smoke with `EXPECT_SENTRY=1`.

## Service Access Receipt

Checked Sentry API access on June 10, 2026:

- Organization discovered: `mean-weasel-llc`.
- Existing projects did not include `foil-web`.
- Creating a `foil-web` browser project under team `mean-weasel-llc` returned
  HTTP 403 with the available token.
- Next operator action: create or grant access to the Sentry project, then set
  `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in Vercel.

Rechecked production activation on June 11, 2026:

- `npm run check:observability` passed, proving the local env-gated Sentry
  foundation and scrubber still work.
- Strict production smoke without Sentry expectation passed for
  `https://sayfoil.com` with PostHog config.
- Strict production smoke with `EXPECT_SENTRY=1` failed only because the
  deployed analytics config does not include a Sentry DSN.
- The deployed public config reports production environment metadata, but no
  Sentry DSN. Do not paste or commit DSNs; configure the value in Vercel after
  the Sentry project is created or access is granted.
- The Vercel CLI was not installed in the local workspace for this recheck, so
  service-side env names were not inspected from the CLI.

Current blocker: production Sentry activation still needs operator project/DSN
access. After the Sentry project and Vercel env are configured, send one
controlled preview error, confirm it lands in the expected project with the
expected environment/release and scrubbed payload, then run deployed smoke with
`EXPECT_SENTRY=1`.

## Verification

Run `npm run check:observability` to prove the repo stays in the documented
env-gated state. The check fails if product pages omit `observability.js`, if
the SDK is not gated by `SENTRY_DSN`, if replay/tracing are enabled, or if the
privacy page no longer matches the observability posture.
