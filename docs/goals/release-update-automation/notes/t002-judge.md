# T002 Judge Receipt

Date: 2026-06-11

Decision: approved.

## Worker Objective

Create a separate networked `check:release` command that compares current web install metadata against GitHub latest release, DMG/checksum assets, and Homebrew cask version/SHA/URL, while keeping normal launch checks offline and stable.

## Allowed Files

- `package.json`
- `scripts/check-release-drift.mjs`
- `docs/install-download.md`
- `README.md`
- `docs/goals/release-update-automation/state.yaml`
- `docs/goals/release-update-automation/notes/`

## Verification

- `npm run check:release`
- `npm run check:install`
- `npm run check:launch`

## Stop Conditions

- Need credentials, destructive permission, production access, or legal approval.
- Live release/cask data is ambiguous or unavailable after two attempts.
- Need to alter unrelated install copy or make bridge availability claims.
