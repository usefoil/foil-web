# T001 Scout Receipt

Date: 2026-06-11

## Evidence Map

- `observability.js` is env-gated and exits unless `SENTRY_DSN` is present in the generated analytics config.
- `scripts/check-observability.mjs` proves the Sentry SDK does not load without a DSN and, with a test DSN, uses the errors-only bundle with replay/tracing disabled, breadcrumbs dropped, PII disabled, and payload scrubbing.
- `docs/observability.md`, `docs/deployment.md`, `README.md`, and `.env.example` already document `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and `SENTRY_RELEASE`.
- `npm run check:observability` passed.
- Normal production deployed smoke passed with PostHog config.
- Strict production deployed smoke with `EXPECT_SENTRY=1` failed because the deployed analytics config has no Sentry DSN.
- Sanitized public config check for `https://sayfoil.com/analytics-config.js` reported:
  - `hasSentryDsn: false`
  - `hasSentryEnvironment: true`
  - `hasSentryRelease: true`
  - `environment: production`
- `vercel` CLI is not installed in this workspace, so Vercel environment names could not be checked locally.
- Existing docs record that Sentry project creation previously failed with HTTP 403 using the available token.

## Blockers

- Sentry project-write/DSN access is still required before production activation can be proven.
- A controlled preview error cannot be sent and verified in the expected Sentry project until that DSN/project exists and is configured.

## Largest Safe Useful Next Slice

Document the June 11 production activation recheck and exact blocker in `docs/observability.md`, keeping the local env-gated Sentry foundation unchanged.

## Candidate Worker Package

- Objective: update the Sentry activation receipt with current production smoke/config evidence and blocked operator action.
- Allowed files: `docs/observability.md`, `docs/goals/sentry-production-activation/state.yaml`, `docs/goals/sentry-production-activation/notes/`.
- Verify:
  - `npm run check:observability`
  - `npm run check:launch`
  - `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed`
  - `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECT_SENTRY=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed` fails only because the deployed Sentry DSN is missing.
- Stop if:
  - Need credentials, production access, destructive permission, legal approval, or secret exposure.
