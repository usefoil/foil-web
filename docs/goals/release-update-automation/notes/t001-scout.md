# T001 Scout Receipt

Date: 2026-06-11

## Evidence Map

- `scripts/check-install.mjs` is an offline static source scan pinned to Foil `1.13.4`, `v1.13.4`, DMG size `2436639`, and SHA-256 `1390e585aec6f50c2f779103ad0136fa974caa64acca91f0e787d4438bec5e1c`.
- `docs/install-download.md`, `index.html`, `scripts/check-launch.mjs`, and `scripts/check-deployed.mjs` also contain release-specific trust copy.
- GitHub latest release for `usefoil/foil` is still `v1.13.4`, with DMG and `.sha256` assets.
- Homebrew cask `mean-weasel/homebrew-foil` is still version `1.13.4` with matching SHA-256 and a GitHub release URL that redirects to the current release artifact.
- `npm run check:install` is included in `npm run check:launch`, but no command currently compares the site against live latest release/cask data.

## Blockers

- No credentials, production access, or destructive permission needed.
- Network-dependent drift checks should stay out of `check:launch` to avoid making normal CI flaky.

## Largest Safe Useful Next Slice

Add a separate networked `check:release` command that compares the pinned website/check metadata against GitHub latest release, checksum asset, and Homebrew cask metadata, then fails with actionable drift details.

## Candidate Worker Package

- Objective: implement the networked release drift checker and document when to run it.
- Allowed files: `package.json`, `scripts/check-release-drift.mjs`, `docs/install-download.md`, `README.md`, `docs/goals/release-update-automation/state.yaml`, `docs/goals/release-update-automation/notes/`.
- Verify:
  - `npm run check:release`
  - `npm run check:install`
  - `npm run check:launch`
- Stop if:
  - GitHub or Homebrew responses are ambiguous.
  - Need credentials or destructive permission.
