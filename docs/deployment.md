# Foil Web Deployment

Foil web deploys to Vercel from the GitHub repository `usefoil/foil-web`.

## Vercel Project

- Vercel project: `jermwatts-projects/foil-web`
- Canonical production domain: `https://foil.neonwatty.com`
- Redirect-only legacy domains: `https://sayfoil.com` and `https://www.sayfoil.com`
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

- `SITE_URL=https://foil.neonwatty.com`
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

The homepage Mac app screenshots should show the current Foil app shell. For
public landing-page assets, use seeded UI-test state from the installed app or a
deterministic renderer, then verify the image does not include private desktop
background, transcript text, API keys, or live credentials.

Current public assets live in `assets/screenshots/`:

- `foil-app-home.png`
- `foil-app-insights.png`
- `foil-app-cleanup-groups.png`
- `foil-app-cleanup-profile.png`
- `foil-app-transcription-provider.png`
- `receipt.json`

When using installed-app captures, launch Foil with seeded UI-test arguments and
record the installed version/build in `assets/screenshots/receipt.json`.

The older Debug renderer is still useful for menu/onboarding states from the
Foil app repo. From `usefoil/foil`, run:

```sh
SIGN_IDENTITY=- MARKETING_SCREENSHOT_OUTPUT_DIR=/tmp/foil-web-marketing-light make render-marketing-screenshots
```

Only use those generated assets when they match the current landing-page UX
story. Copy the generated PNGs and `receipt.json` from the output directory into
`assets/screenshots/`, then update any changed `width` or `height` attributes in
`index.html`. The receipt should report the capture source, color scheme where
applicable, and source views.

The homepage walkthrough video is generated from verified app assets with
Hyperframes. Source lives in `marketing/hero-animation/index.html`, and rendered
hero outputs live in `assets/videos/`:

- `foil-dictation-brain.mp4`
- `foil-dictation-brain.webm`
- `foil-dictation-brain-poster.png`
- `foil-dictation-brain-receipt.json`

After changing the walkthrough storyboard or source appshots, run:

```sh
npx --yes hyperframes@0.7.40 validate marketing/hero-animation
npx --yes hyperframes@0.7.40 snapshot marketing/hero-animation --at 0.5,3.6,6.6,9.8 --no-end --output /tmp/foil-hyperframes-snapshots
npx --yes hyperframes@0.7.40 render marketing/hero-animation --output assets/videos/foil-dictation-brain.mp4 --fps 30 --quality standard --crf 24 --workers 1
npx --yes hyperframes@0.7.40 render marketing/hero-animation --output assets/videos/foil-dictation-brain.webm --format webm --fps 30 --quality standard --crf 35 --workers 1
```

Update `assets/videos/foil-dictation-brain-receipt.json` with the new duration,
dimensions, codec, and SHA-256 values.

Run strict production smoke after a production deploy:

```sh
EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production SMOKE_URL=https://foil.neonwatty.com SITE_URL=https://foil.neonwatty.com npm run check:deployed
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

- `smoke_url=https://foil.neonwatty.com`
- `site_url=https://foil.neonwatty.com`
- `expect_posthog=true`
- `expected_analytics_env=production`
- `expect_sentry=false` unless production Sentry is intentionally configured
