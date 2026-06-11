# T003 Worker Receipt

Date: 2026-06-11

## Changes

- Expanded `scripts/check-deployed.mjs` from a small page/config smoke into a deployed launch inventory check.
- Added live checks for all launch pages, canonical/`og:url` parity, sitemap/robots parity, internal local references, six conversion event hooks, install/privacy/blog/Supabase/Sentry launch surfaces, stale GitHub Pages canonicals, and unsupported bridge availability claims.
- Preserved env-gated PostHog and Sentry public config assertions.
- Added GitHub Actions manual dispatch inputs for expected canonical URL, PostHog assertion, expected analytics environment, and optional Sentry assertion.
- Updated `README.md` and `docs/deployment.md` with the stronger deployed smoke proof and manual workflow values.

## Verification

- `npm run check:launch` passed.
- `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed` passed.

Production smoke result:

```text
Deployed smoke check passed for https://sayfoil.com: 8 pages, 18 local references, 6 conversion events, PostHog config
```

## Deferred or Blocked

- `EXPECT_SENTRY=1` remains deferred until production Sentry DSN/environment/release are configured.
- No credentials, destructive permissions, production write access, or legal approval were required.
