# Supabase Capture Readiness Recheck

## Objective

Supabase remains explicitly deferred, or a concrete approved capture use case becomes a minimal verified RLS-backed plan.

## Original Request

Plan the next conveyor of GoalBuddy prep boards for Foil web launch follow-up work, using local live boards, recommended defaults, and no /goal execution yet.

## Intake Summary

- Input shape: `existing_plan`
- Audience: Foil maintainers continuing the web launch conveyor.
- Authority: `approved`
- Proof type: `decision`
- Completion proof: A fresh decision receipt says whether any launch/post-launch flow now needs Supabase; if yes, it defines minimal fields, RLS, retention, abuse controls, privacy copy, and tests; if no, defer rationale and revisit triggers remain verified.
- Goal oracle: A fresh decision receipt says whether any launch/post-launch flow now needs Supabase; if yes, it defines minimal fields, RLS, retention, abuse controls, privacy copy, and tests; if no, defer rationale and revisit triggers remain verified.
- Likely misfire: Creating Supabase infrastructure because Supabase is selected, without an approved data collection purpose.
- Blind spots considered:
  - PostHog conversion intent may still be enough.
  - Identifiable capture would change privacy/legal scope.
  - Bridge interest may need opt-in contact later but currently only anonymous intent is tracked.
- Existing plan facts:
  - Vercel, PostHog, SEO, install/download trust, Sentry foundation, privacy/legal, and blog conversion foundations have recent merged receipts.
  - Sentry production activation remains blocked on project-write/DSN access unless credentials are granted.
  - Supabase capture remains deferred unless a concrete approved capture use case appears.
  - Do not start /goal runs during prep.

## Goal Oracle

The oracle for this goal is:

`A fresh decision receipt says whether any launch/post-launch flow now needs Supabase; if yes, it defines minimal fields, RLS, retention, abuse controls, privacy copy, and tests; if no, defer rationale and revisit triggers remain verified.`

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Supabase remains explicitly deferred, or a concrete approved capture use case becomes a minimal verified RLS-backed plan.

## Non-Negotiable Constraints

- Do not start /goal execution from prep.
- Do not collect or expose secrets.
- Do not make public copy claim the bridge is shipped yet.
- Preserve privacy-conscious analytics and observability defaults.
- Treat missing service credentials, production access, destructive permissions, or legal approval as task blockers, not whole-goal completion.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if safe local Worker work can continue.

Do not stop after a single verified Worker package when the broader owner outcome still has safe local follow-up work. Advance the board to the next highest-leverage safe Worker package and continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review is due.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice.

## Canonical Board

Machine truth lives at:

`docs/goals/supabase-capture-readiness-recheck/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/supabase-capture-readiness-recheck/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Run the bundled GoalBuddy update checker when available and mention a newer version without blocking.
4. Re-check the intake: original request, input shape, authority, proof, blind spots, existing plan facts, and likely misfire.
5. Work only on the active board task.
6. Assign Scout, Judge, Worker, or PM according to the task.
7. Write a compact task receipt.
8. Update the board.
9. If safe local work remains, choose the next largest reversible Worker package and continue unless blocked.
10. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
