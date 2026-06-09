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

## Deployment Notes

- Intended host: Vercel
- Analytics target: PostHog
- Production canonical default: `https://usefoil.com`
- Vercel build command: `npm run build`
- Vercel output directory: `dist`
- Set `SITE_URL` if production moves to another canonical domain.
- Set `POSTHOG_KEY` and optional `POSTHOG_HOST` to enable analytics. When
  `POSTHOG_KEY` is unset, the analytics script exits without loading PostHog.
- Sentry is intentionally deferred for the static launch until project access
  and a production DSN are available. See `docs/observability.md`.
- Blog conversion hygiene is covered by `npm run check:blog` and included in
  `npm run check:launch`.
