# Foil Install And Download Trust

This document records the launch install surface that `sayfoil.com` points
people toward.

## Current Public Release

Verified on June 10, 2026:

- Release repo: `usefoil/foil`
- Latest release: `v1.13.4`
- Release name: `Foil 1.13.4`
- Published: May 31, 2026
- DMG asset: `Foil-1.13.4-macos.dmg`
- DMG size from GitHub API: `2436639` bytes
- DMG SHA-256: `1390e585aec6f50c2f779103ad0136fa974caa64acca91f0e787d4438bec5e1c`
- Checksum asset:
  `https://github.com/usefoil/foil/releases/download/v1.13.4/Foil-1.13.4-macos.dmg.sha256`

The landing page links users to GitHub Releases for manual downloads and shows
the shortened SHA-256 fingerprint `1390e585...bec5e1c`.

## Homebrew Cask

Verified on June 10, 2026:

- Tap repo: `mean-weasel/homebrew-foil`
- Cask path: `Casks/foil.rb`
- Install command:

```sh
brew tap mean-weasel/foil https://github.com/mean-weasel/homebrew-foil
brew install --cask foil
```

- Cask version: `1.13.4`
- Cask SHA-256:
  `1390e585aec6f50c2f779103ad0136fa974caa64acca91f0e787d4438bec5e1c`
- Cask URL currently uses
  `https://github.com/mean-weasel/foil/releases/download/v1.13.4/Foil-1.13.4-macos.dmg`,
  which GitHub redirects to
  `https://github.com/usefoil/foil/releases/download/v1.13.4/Foil-1.13.4-macos.dmg`.

The redirect was verified with `curl -ILs` and the final response returned
HTTP 200 with `content-disposition: attachment; filename=Foil-1.13.4-macos.dmg`
and `content-length: 2436639`.

## Copy Guardrails

- Keep Homebrew as the primary install path while the cask is current.
- Keep the manual DMG path available for users who prefer direct GitHub
  downloads.
- Keep bridge reliability work described only as future-facing.
- Keep iOS wording separate from the macOS public beta; the iPhone preview is
  not a public iOS release.
- Update this document and `scripts/check-install.mjs` before changing release
  version, checksum, tap URL, or install command copy.

## Verification

Run `npm run check:install` for the install/download source scan. It is also
included in `npm run check:launch`.

Run `npm run check:release` when preparing or auditing a Foil app release. This
networked check compares the pinned website release metadata against GitHub's
latest `usefoil/foil` release, the published `.sha256` asset, and the Homebrew
cask version/SHA/URL. Keep it separate from normal launch CI so transient
GitHub or Homebrew network issues do not make offline launch checks flaky.
