# T003 Worker Receipt

Date: 2026-06-11

## Changes

- Added `scripts/check-release-drift.mjs`.
- Added `npm run check:release`.
- Documented the release drift command in `README.md` and `docs/install-download.md`.
- Kept `check:launch` offline/stable; the networked release drift check is operator-run when preparing or auditing release copy.

## Verification

- `npm run check:release` passed.
- `npm run check:install` passed.
- `npm run check:launch` passed.

## Deferred or Blocked

- No blockers.
