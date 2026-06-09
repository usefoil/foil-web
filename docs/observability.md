# Foil Web Observability Decision

Sentry is deferred for launch until the production Sentry project, DSN, and read-only API access are available.

## Current State

- The web repo is a static landing site with no API routes, authentication flow, checkout flow, or user-generated form submissions.
- `privacy/index.html` truthfully states that Sentry is not currently wired into this static website.
- PostHog is limited to manual conversion analytics and does not provide exception collection.
- CodeQL runs on pull requests and `npm run check:launch` covers build, SEO, privacy, analytics, install-trust, and unsupported-claim checks.

## Blocked Inputs

Sentry setup needs operator-provided service access and project choices:

- `SENTRY_AUTH_TOKEN` with read-only scopes such as `org:read`, `project:read`, and `event:read` for health inspection.
- `SENTRY_ORG` and `SENTRY_PROJECT` for API queries.
- `SENTRY_DSN` for browser error capture if client instrumentation is approved.
- `SENTRY_ENVIRONMENT`, normally `preview` or `production`.
- `SENTRY_RELEASE`, normally the deployed git SHA or Vercel commit SHA.

Do not paste tokens into chat or commit them to the repo. Set them in the local shell, Sentry, or Vercel environment configuration.

## Future Enablement Checklist

When Sentry is enabled, the first implementation should be env-gated and verified on preview before production:

1. Load Sentry only when `SENTRY_DSN` is configured.
2. Set `environment` from `SENTRY_ENVIRONMENT` or Vercel environment.
3. Set `release` from `SENTRY_RELEASE` or the deployed commit SHA.
4. Disable session replay unless a separate privacy review approves it.
5. Sanitize event payloads so transcript text, raw audio, clipboard contents, API keys, email addresses, and free-form user input are not sent.
6. Send one controlled test error from a preview deployment.
7. Confirm the controlled test error appears in the expected Sentry project with the expected environment and release.
8. Update `privacy/index.html` before production collection begins.

## Verification

Run `npm run check:observability` to prove the repo is still in the documented deferred state. The check fails if product code half-wires Sentry or if the privacy page no longer matches the decision.
