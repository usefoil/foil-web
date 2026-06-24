# Foil Blog Conversion

The launch blog exists to capture search intent around Mac dictation,
local/offline transcription, provider choice, and paste recovery, then route
readers toward either a deeper article or the install section.

## Blog Inventory

| Page | Search intent | Primary conversion path |
| --- | --- | --- |
| `/blog/` | Browse all Mac dictation guides | Article cards plus tracked install CTA |
| `/blog/superwhisper-alternative-for-mac/` | Compare Superwhisper alternatives | Related comparison plus install CTA |
| `/blog/wispr-flow-vs-superwhisper-vs-foil/` | Compare three dictation tools | Related Wispr articles plus install CTA |
| `/blog/wispr-flow-alternative-for-mac/` | Find a Wispr Flow alternative | Offline/paste follow-up articles plus install CTA |
| `/blog/does-wispr-flow-work-offline/` | Understand offline/local transcription | Wispr alternative article plus install CTA |
| `/blog/wispr-flow-not-pasting-text/` | Troubleshoot paste failures | Provider-choice article plus install CTA |

## Guardrails

- Every blog page must have canonical, OG, and Twitter metadata.
- Every article must include a visible `article-callout` with tracked
  `blog_cta_click` links.
- Every article callout must include a tracked install CTA.
- Blog index cards and index-level CTAs must use `blog_cta_click` with stable
  labels.
- Blog copy must not describe bridge reliability work as shipped.
- Claims about other products should stay sourced in each article's sources
  section.

## Verification

Run `npm run check:blog` for the blog conversion scan. It is also included in
`npm run check:launch`.
