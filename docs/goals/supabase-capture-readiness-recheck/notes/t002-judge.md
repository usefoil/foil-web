# T002 Judge Receipt

Date: 2026-06-11

Decision: approved.

## Worker Objective

Refresh the Supabase defer decision after the post-launch foundation work and strengthen `check:capture` so it proves the full static web surface has no Supabase client wiring, Supabase environment-variable half-wiring, or form-based capture surface.

## Allowed Files

- `docs/capture.md`
- `scripts/check-capture.mjs`
- `docs/goals/supabase-capture-readiness-recheck/state.yaml`
- `docs/goals/supabase-capture-readiness-recheck/notes/`

## Verification

- `npm run check:capture`
- `npm run check:privacy`
- `npm run check:launch`

## Stop Conditions

- Need credentials, production access, destructive permission, or legal approval.
- Need public copy that implies bridge availability or an active Supabase-backed capture flow.
- Need files outside the allowed list.
- Verification fails twice with the same unexplained failure.

## Deferred Follow-Ups

- Supabase remains deferred until an approved identifiable capture purpose exists with fields, RLS, retention, abuse controls, and privacy/legal approval.
