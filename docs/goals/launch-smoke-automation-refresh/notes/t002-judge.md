# T002 Judge Receipt

Date: 2026-06-11

Decision: approved.

## Worker Objective

Expand deployed launch smoke coverage and update the workflow/docs so one repeatable deployed command proves live page inventory, sitemap/canonical parity, deployed asset availability, conversion hooks, privacy/install/blog/Supabase/Sentry launch surfaces, PostHog config, optional Sentry config, and unsupported bridge-claim absence.

## Allowed Files

- `scripts/check-deployed.mjs`
- `.github/workflows/launch-smoke.yml`
- `docs/deployment.md`
- `README.md`
- `docs/goals/launch-smoke-automation-refresh/state.yaml`
- `docs/goals/launch-smoke-automation-refresh/notes/`

## Verification

- `npm run check:launch`
- `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed`

## Stop Conditions

- Need credentials, production write access, destructive permission, or legal approval.
- Need public copy claims that the bridge is shipped, available, downloadable, or installable.
- Need files outside the allowed list.
- Verification fails twice with the same unexplained failure.

## Deferred Follow-Ups

- `EXPECT_SENTRY=1` remains deferred until production Sentry DSN/environment/release are configured.
- Preview smoke can remain manual because protected Vercel previews may return HTTP 401 without an approved bypass.
