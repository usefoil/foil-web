# Foil Web Privacy Launch Checklist

This checklist keeps the public privacy surface aligned with the current static
launch architecture. It is not a substitute for formal legal review.

## Public Disclosures

`privacy/index.html` must disclose:

- Vercel hosts the static site.
- PostHog is limited to manual conversion analytics when configured.
- PostHog autocapture, pageviews, pageleave capture, dead-click capture,
  heatmaps, and session recording are disabled.
- Sentry browser error monitoring is not enabled for launch; the dormant hook is
  env-gated behind `SENTRY_DSN`.
- Sentry session replay, tracing, breadcrumbs, and default personally
  identifiable information are disabled or dropped.
- GitHub Releases and Homebrew are used for install/download flows.
- Supabase capture is not used by the static site.
- The site does not have account signup, checkout, comments, contact forms,
  newsletter signup, or email capture.
- The site code should not intentionally send dictated text, typed text,
  transcript contents, clipboard contents, raw audio, API keys, email addresses,
  cookies, request bodies, or free-form user input to analytics or observability
  services.
- Bridge reliability work is future-facing and must not be described as a
  shipped capability.

## Change Control

Before adding a new capture surface, update the relevant docs and checks:

- PostHog event shape: `docs/analytics.md` and `scripts/check-analytics.mjs`.
- Sentry collection behavior: `docs/observability.md` and
  `scripts/check-observability.mjs`.
- Supabase or any identifiable capture: `docs/capture.md`,
  `scripts/check-capture.mjs`, RLS tests, retention plan, and reviewed public
  copy.
- Public privacy copy: `privacy/index.html` and `scripts/check-privacy.mjs`.

## Verification

Run `npm run check:privacy` for the privacy-specific disclosure scan. It is also
included in `npm run check:launch`.
