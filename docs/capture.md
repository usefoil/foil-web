# Foil Web Capture Decision

Supabase capture is deferred for launch.

## Decision

No launch-critical capture use case currently requires Supabase in the static web repo.

Rechecked on June 11, 2026 after the Vercel, PostHog, privacy, install trust,
blog conversion, Sentry foundation, and launch smoke follow-up work. The
decision is unchanged: Supabase remains deferred because the current site still
has no waitlist, newsletter, contact, support, install diagnostics, or
identified bridge-interest capture flow.

The current launch funnel uses:

- GitHub Releases and Homebrew for install/download intent.
- PostHog manual conversion events for install, DMG, local provider guide, bridge interest, and blog CTA intent.
- GitHub issues for public follow-up and product questions.

Adding Supabase now would introduce database storage, abuse controls, retention obligations, and privacy/legal approval requirements without a concrete launch-critical capture flow.

## Required Before Enabling

Before Supabase is added to this repo, decide the exact data flow and minimum table/API surface:

- Capture purpose: waitlist, newsletter, bridge interest, provider guide follow-up, install support, or another approved use.
- Data fields and retention period.
- Row Level Security policy and RLS tests.
- spam protection and rate limiting.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` Vercel environment variables.
- Server-side or edge route ownership if secrets or privileged writes are needed.
- Privacy/legal approval for collection, storage, deletion, and disclosure copy.

Do not add Supabase writes directly to static pages without a reviewed RLS policy and abuse plan.

## Revisit Triggers

Revisit this decision when one of these becomes true:

- PostHog intent events are not enough because the launch needs identifiable follow-up.
- There is an approved waitlist or email capture flow.
- Bridge interest needs opt-in contact collection instead of anonymous click intent.
- Support or install diagnostics require structured user-submitted data.

## Verification

Run `npm run check:capture` to prove the repo is still in the documented
deferred state. The check fails if static pages introduce form-based capture,
if product code half-wires Supabase, or if the privacy page no longer matches
the decision.
