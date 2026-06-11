# Foil Web

Static landing page and SEO content for Foil.

This repo was split out of the macOS app repository so web hosting,
analytics, SEO, and marketing iteration can move independently from app
release work.

## Local Preview

Open `index.html` directly in a browser, or serve the directory with any static
file server:

```sh
python3 -m http.server 4173
```

For the Vercel build output and launch checks:

```sh
npm run check:launch
```

To audit release drift before updating install copy:

```sh
npm run check:release
```

To smoke test a deployed preview or production URL:

```sh
SMOKE_URL=https://your-preview.example npm run check:deployed
```

For production, include the analytics assertion:

```sh
EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed
```

The deployed smoke fetches the live launch page inventory, verifies
sitemap/canonical parity and deployed local assets, checks the six conversion
event hooks, scans for stale GitHub Pages canonicals and unsupported bridge
availability claims, and optionally asserts public PostHog/Sentry config.

Once production Sentry is configured, include the Sentry assertion too:

```sh
EXPECT_POSTHOG=1 EXPECT_SENTRY=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed
```

## Deployment Notes

- Intended host: Vercel
- Analytics target: PostHog project `BugDrop + Foil` (`422537`)
- Production canonical default: `https://sayfoil.com`
- Vercel build command: `npm run build`
- Vercel output directory: `dist`
- Set `SITE_URL` if production moves to another canonical domain.
- Set `POSTHOG_KEY` and optional `POSTHOG_HOST` to enable analytics. When
  `POSTHOG_KEY` is unset, the analytics script exits without loading PostHog.
  Production Vercel currently sets `POSTHOG_KEY`, `POSTHOG_HOST`,
  `SITE_URL=https://sayfoil.com`, and `FOIL_ANALYTICS_ENV=production`.
- Sentry is not enabled for the current web launch. Leave `SENTRY_DSN` unset
  unless browser error monitoring is deliberately activated later; without a
  DSN, the observability script exits without loading Sentry. See
  `docs/observability.md`.
- Vercel deployment setup and production smoke receipts are documented in
  `docs/deployment.md`.
- Search Console and indexing receipts are documented in `docs/seo.md`.
- Public privacy disclosure hygiene is covered by `npm run check:privacy` and
  documented in `docs/privacy-launch.md`.
- Install/download trust is covered by `npm run check:install` and documented
  in `docs/install-download.md`.
- Blog conversion hygiene is covered by `npm run check:blog` and included in
  `npm run check:launch`; the page inventory lives in
  `docs/blog-conversion.md`.
- Supabase capture is deferred until there is an approved capture use case,
  RLS design, retention plan, and privacy/legal approval. See `docs/capture.md`.
- `.github/workflows/launch-smoke.yml` runs local launch checks on pull
  requests and `main`; manual dispatch can also test a deployed URL.
