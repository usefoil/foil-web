# T001 Scout Receipt

Date: 2026-06-11

## Evidence Map

- Domain/DNS/Vercel: production smoke against `https://sayfoil.com` passes for 8 pages, 18 local references, 6 conversion events, and PostHog config. Live `analytics-config.js` reports `siteUrl: https://sayfoil.com` and `environment: production`.
- SEO/Search Console: live `robots.txt` returns 200 and points to `https://sayfoil.com/sitemap.xml`; live sitemap returns 200 with 8 URLs; live homepage canonical is `https://sayfoil.com/`. Search Console authenticated inspection remains outside local access.
- PostHog: production analytics config contains a PostHog key and `https://us.i.posthog.com`. Docs record the `Foil Launch Conversion` dashboard and the no-real-traffic insight activation blocker.
- Sentry: local observability check passes for env-gated Sentry wiring. Production strict deployed smoke with `EXPECT_SENTRY=1` exits 1 only because the deployed config lacks a Sentry DSN.
- Privacy/legal: privacy launch check passes for public service disclosures. Formal legal approval remains outside repo authority if required.
- Install/download trust: install trust and release drift checks pass for Foil `1.13.4`, `Foil-1.13.4-macos.dmg`, checksum metadata, and Homebrew cask `1.13.4`.
- Blog/content conversion: launch check includes blog conversion hooks and the blog check passes.
- Supabase capture decision: capture check passes for the deferred Supabase launch state.
- Launch smoke automation: launch and deployed smoke checks pass after the release drift check merged.
- Unsupported claims/stale canonicals: public-copy scan found only guardrail/blocker documentation, not stale GitHub Pages canonicals or public bridge-shipped claims.

## Commands

```sh
npm run check:launch
npm run check:release
SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed
SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com EXPECT_POSTHOG=1 EXPECT_SENTRY=1 EXPECTED_ANALYTICS_ENV=production npm run check:deployed
node <live-url-config-check>
rg -n "bridge[^.]{0,90}\\b(shipped|released|available|download|install)\\b|github\\.io/foil|mean-weasel\\.github\\.io/foil|usefoil\\.github\\.io/foil" index.html privacy blog docs/*.md README.md scripts .github || true
```

## Blockers

- Sentry production activation needs project/DSN access and Vercel env configuration.
- Google Search Console authenticated inspection needs operator access.
- Formal legal approval, if required, remains outside code.
- PostHog saved insight creation remains best deferred until real Foil event volume exists.

## Largest Safe Slice

Record a final audit receipt and close the board with explicit blockers. No product-file changes are required by the fresh checks.
