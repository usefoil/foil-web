# Foil Web Deployment

Foil web deploys to Vercel from the GitHub repository `usefoil/foil-web`.

## Vercel Project

- Vercel project: `jermwatts-projects/foil-web`
- Production domains: `https://sayfoil.com` and `https://www.sayfoil.com`
- Build command: `npm run build`
- Output directory: `dist`
- Git repository: `usefoil/foil-web`

The project is connected to GitHub through the Vercel GitHub app with access to
the `usefoil/foil-web` repository.

Pull requests should receive Vercel preview deployments through the Git
connection. If preview deployment protection is enabled, unauthenticated smoke
checks against the preview URL can return HTTP 401 even when the Vercel status is
ready. In that case, use the Vercel check status and build logs as the preview
receipt, or configure an approved preview bypass before running external smoke.

## Production Environment

Production Vercel environment variables currently include:

- `SITE_URL=https://sayfoil.com`
- `FOIL_ANALYTICS_ENV=production`
- `POSTHOG_HOST=https://us.i.posthog.com`
- `POSTHOG_KEY`, set in Vercel and not committed to the repo

Sentry browser error monitoring is intentionally deferred for the current web
launch. It remains disabled unless these values are configured in the desired
Vercel environment during a future deliberate activation:

- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`

## Verification

Run local launch checks before merging:

```sh
npm run check:launch
```

## Marketing Screenshot Refresh

The homepage Mac app screenshots should be refreshed from the Foil app repo
instead of hand-edited. From `usefoil/foil`, run:

```sh
SIGN_IDENTITY=- MARKETING_SCREENSHOT_OUTPUT_DIR=/tmp/foil-web-marketing-light make render-marketing-screenshots
```

Copy the generated PNGs and `receipt.json` from the output directory into
`assets/screenshots/`, then update any changed `width` or `height` attributes in
`index.html`. The receipt should report `colorScheme` as `light` and source
views from production SwiftUI views.

Run strict production smoke after a production deploy:

```sh
EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed
```

The strict production smoke proves the live launch page inventory, canonical
URLs, `og:url` values, sitemap/robots parity, local asset references,
conversion event hooks, install/privacy/blog/Supabase launch surfaces, the
absence of stale GitHub Pages canonicals or unsupported bridge availability
claims, and deployed PostHog analytics config. After Sentry is intentionally
configured, add `EXPECT_SENTRY=1` to the same command to assert the deployed
public Sentry config and privacy disclosure.

The `Launch Smoke` GitHub Actions workflow also supports a manual dispatch for
deployed smoke. Use:

- `smoke_url=https://sayfoil.com`
- `site_url=https://sayfoil.com`
- `expect_posthog=true`
- `expected_analytics_env=production`
- `expect_sentry=false` unless production Sentry is intentionally configured
