# Foil Install And Download Trust

This document records the launch install surface that `foil.neonwatty.com`
points people toward. The legacy `sayfoil.com` domain redirects to the same
path on the canonical subdomain.

## Current Public Release

Verified on July 24, 2026:

- Release repo: `usefoil/foil`
- Latest release: `v1.13.13`
- Release name: `Foil 1.13.13`
- Published: July 22, 2026
- DMG asset: `Foil-1.13.13-macos.dmg`
- DMG size from GitHub API: `3425824` bytes
- DMG SHA-256: `33f682b44b558f84f26622536fe7b162fece6053afb5fe4c38f01e58451d2e79`
- Checksum asset:
  `https://github.com/usefoil/foil/releases/download/v1.13.13/Foil-1.13.13-macos.dmg.sha256`

The landing page links users to GitHub Releases for manual downloads and shows
the shortened SHA-256 fingerprint `33f682b4...51d2e79`.

## Homebrew Cask

Verified on July 24, 2026:

- Tap repo: `mean-weasel/homebrew-foil`
- Cask path: `Casks/foil.rb`
- Install command:

```sh
brew tap mean-weasel/foil https://github.com/mean-weasel/homebrew-foil
brew install --cask foil
```

- Cask version: `1.13.13`
- Cask SHA-256:
  `33f682b44b558f84f26622536fe7b162fece6053afb5fe4c38f01e58451d2e79`
- Cask URL:
  `https://github.com/usefoil/foil/releases/download/v1.13.13/Foil-1.13.13-macos.dmg`.

The download was verified with `curl -ILs` and the final response returned
HTTP 200 with `content-disposition: attachment; filename=Foil-1.13.13-macos.dmg`
and `content-length: 3425824`.

## Copy Guardrails

- Keep Homebrew as the primary install path while the cask is current.
- Keep the manual DMG path available for users who prefer direct GitHub
  downloads.
- Keep bridge reliability work described only as future-facing.
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
