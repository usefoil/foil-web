# T001 Scout Receipt

Date: 2026-06-11

## Evidence Map

- `docs/capture.md` currently defers Supabase because no launch-critical capture flow requires database storage.
- `privacy/index.html` states the static site has no account signup, checkout, comments, contact forms, newsletter signup, email capture, launch waitlist, newsletter, support form, or Supabase writes.
- `analytics.js` captures only manual PostHog conversion events and does not collect contact details or free-form input.
- Source scan found no `createClient`, `supabase.from`, `SUPABASE_URL`, or `SUPABASE_ANON_KEY` usage in product code.
- Current launch flows use GitHub Releases/Homebrew for installs, PostHog for anonymous intent, and GitHub issues for public follow-up.
- Verification passed:
  - `npm run check:capture`
  - `npm run check:privacy`
  - `npm run check:launch`

## Blockers

- No credentials or production Supabase access are needed because no approved capture use case exists.
- Any identifiable capture flow would require purpose, fields, RLS policy/tests, retention, abuse controls, and privacy/legal approval before implementation.

## Largest Safe Useful Next Slice

Keep Supabase deferred, refresh the decision with the June 11 recheck, and strengthen `check:capture` so it scans the full static page surface for accidental forms, Supabase wiring, or environment-variable half-wiring.

## Candidate Worker Package

- Objective: update capture defer docs/checks after the launch follow-up recheck without adding Supabase or collecting data.
- Allowed files: `docs/capture.md`, `scripts/check-capture.mjs`, `docs/goals/supabase-capture-readiness-recheck/state.yaml`, `docs/goals/supabase-capture-readiness-recheck/notes/`.
- Verify:
  - `npm run check:capture`
  - `npm run check:privacy`
  - `npm run check:launch`
- Stop if:
  - Need credentials, production Supabase access, destructive permission, legal approval, or public-copy ambiguity.
