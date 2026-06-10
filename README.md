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

To smoke test a deployed preview or production URL:

```sh
SMOKE_URL=https://your-preview.example npm run check:deployed
```

For production, include the analytics assertion:

```sh
EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed
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
- Sentry is intentionally deferred for the static launch until project access
  and a production DSN are available. See `docs/observability.md`.
- Vercel deployment setup and production smoke receipts are documented in
  `docs/deployment.md`.
- Blog conversion hygiene is covered by `npm run check:blog` and included in
  `npm run check:launch`.
- Supabase capture is deferred until there is an approved capture use case,
  RLS design, retention plan, and privacy/legal approval. See `docs/capture.md`.
- `.github/workflows/launch-smoke.yml` runs local launch checks on pull
  requests and `main`; manual dispatch can also test a deployed URL.
