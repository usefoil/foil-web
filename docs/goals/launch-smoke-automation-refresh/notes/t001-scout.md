# T001 Scout Receipt

Date: 2026-06-11

## Evidence Map

- `package.json` runs `npm run check:launch` as the full local launch suite: build, launch, analytics, blog, capture, install, observability, and privacy checks.
- `scripts/check-launch.mjs` verifies built page canonicals, OG URLs/images, sitemap/robots, local asset references, six conversion event hooks, install trust copy, privacy/Supabase/Sentry disclosures, and unsupported bridge availability claims.
- `scripts/check-deployed.mjs` verifies deployed home, privacy, blog index, robots, sitemap, canonical/OG basics, and optional PostHog/Sentry public config.
- `.github/workflows/launch-smoke.yml` runs local launch checks on pull requests/main. Deployed smoke is manual-dispatch only and currently passes no strict PostHog/Sentry expectations unless supplied outside the workflow.
- `docs/deployment.md` and `README.md` document local and production deployed smoke commands, including strict PostHog and optional Sentry expectations.

## Verification Run

- `npm run check:launch` passed.
- `EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed` passed.

## Blockers

- No credentials, destructive permission, production write access, or legal approval needed for the safe local automation refresh.
- Sentry strict deployed smoke remains optional because production `SENTRY_DSN` is not configured yet.

## Largest Safe Useful Next Slice

Strengthen deployed smoke so the same documented production command proves the live launch surface more completely: every launch/blog/privacy page is fetched, deployed canonical/OG URLs are checked, local assets referenced from deployed HTML return success, required conversion hooks are present in live HTML, sitemap and canonical inventory agree, unsupported bridge availability claims are scanned live, and optional PostHog/Sentry config checks remain env-gated.

## Candidate Worker Package

- Objective: expand deployed launch smoke coverage and update workflow/docs so local, CI/manual dispatch, and production smoke expectations are clear.
- Allowed files: `scripts/check-deployed.mjs`, `.github/workflows/launch-smoke.yml`, `docs/deployment.md`, `README.md`, `docs/goals/launch-smoke-automation-refresh/state.yaml`, `docs/goals/launch-smoke-automation-refresh/notes/`.
- Verify:
  - `npm run check:launch`
  - `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed`
- Stop if:
  - The implementation needs credentials, production write access, destructive permission, or legal approval.
  - The deployed surface makes an ambiguous public claim about bridge availability.
  - Verification fails twice with the same unexplained failure.
