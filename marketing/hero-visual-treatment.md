# Foil Hero Animation Visual Treatment

Working visual plan for the five-slide hero animation. This is intentionally a design artifact, not the rendered animation source.

## Overall Direction

- Treat the video as a quick product tour, not a second hero headline.
- Keep each slide to one feature claim and one real product surface or compact pair of surfaces.
- Use live Foil appshots as the dominant visual material.
- Show each appshot in full inside its frame; do not crop away the left or right edge of the app window.
- Use compact product cards and chips instead of landing-page headline composition; the video already sits beside the page hero copy.
- Use overlays only to clarify what to look at; avoid arrows unless the relationship is genuinely directional.
- Keep motion simple: spotlight, pan, scale, reveal, and card swaps. The app UI should feel stable and real.

## Reference Assets

- Reference sheet: `marketing/hero-visual-references/reference-sheet.png`
- Live appshots in the animation source:
  - `marketing/hero-animation/assets/screenshots/foil-app-cleanup-groups.png`
  - `marketing/hero-animation/assets/screenshots/foil-app-transcription-provider.png`
  - `marketing/hero-animation/assets/screenshots/foil-app-cleanup-profile.png`
  - `marketing/hero-animation/assets/screenshots/foil-app-home.png`
  - `marketing/hero-animation/assets/screenshots/foil-app-insights.png`
  - `marketing/hero-animation/assets/audio-ux/recording-floating-status.png`
- Earlier crop references remain in `marketing/hero-visual-references/` for visual comparison only.

## Slide 1: Basics

Copy: `Everything you need`

Body: `Record, paste, copy, retry, and recover from history.`

Visual:

- Dominant asset: live Home appshot.
- Overlay the live floating recording status.
- Keep the card copy short and instructional, not hero-like.

What this should communicate:

Foil records from the current app and keeps recording/transcription/delivery state visible.

Avoid:

- Do not repeat the hero title.

## Slide 2: Provider Routes

Copy: `Your models, your keys`

Body: `Bring your own API key, use hosted providers, or self-host transcription and cleanup.`

Visual:

- Show two panels: Transcription and Cleanup.
- Transcription panel uses the live Transcription Provider appshot.
- Cleanup panel uses the live Cleanup Profile appshot.
- Use chips for Local whisper.cpp, Groq, OpenAI, Custom endpoint, self-hosted cleanup, and raw fallback.

What this should communicate:

Foil lets the user choose cloud, local, or self-hosted routes for transcription and cleanup separately.

Avoid:

- Do not make this another cleanup-group slide.
- Do not imply all providers are configured in one settings pane.

## Slide 3: App Behavior

Copy: `Each app, its own style`

Body: `Set cleanup, tone, vocabulary, and raw output rules per app.`

Visual:

- Use the live Cleanup Groups screenshot once.
- Show two compact output cards:
  - `Message app`: `Could we move our sync to 3 PM?`
  - `Prompt-driven app`: `move sync 3pm; send notes`

What this should communicate:

The same speech can become a cleaned-up message or a direct agent prompt depending on how the user configured Foil.

Avoid:

- Do not make it look like Foil detects whether a human or agent is listening by itself.
- Do not overanimate the split; the point is the contrast.

## Slide 4: Recoverable History

Copy: `History, always there`

Body: `Find, edit, retry, copy, or export past dictations.`

Visual:

- Dominant asset: live Home appshot.
- Crop tightly around the `Recent transcripts` card.
- Use a subtle `Paste Last` or clipboard affordance only if it does not distract from the history card.
- If possible, replace seeded placeholder transcript text in a future capture with realistic public-safe examples.

What this should communicate:

When paste, clipboard, permissions, or target-app state gets awkward, recent dictations are still accessible.

Avoid:

- Do not overclaim full archival search unless the slide shows the History surface.
- Do not emphasize the words `Seeded transcript for UI testing` in the final animation.

## Slide 5: Usage Insights

Copy: `Usage, fully visible`

Body: `Understand which apps, sessions, and workflows use dictation most.`

Visual:

- Dominant asset: live Insights appshot.
- Crop to include the metrics cards, Daily Trend bars, and the start of Top Apps.
- Keep the supporting chips to three adjacent labels near the copy card: Words, Sessions, and Top apps.
- Keep the full right edge visible in the final crop; the quick reference crop clips some right-side text.
- Let the blue bars provide the motion cue with a simple reveal or count-up.

What this should communicate:

Foil gives local visibility into dictation volume, sessions, time saved, and app usage.

Avoid:

- Do not make Insights feel like cloud analytics or surveillance. Keep the framing local and matter-of-fact.

## Slide 3 Composition Decision

Provider routing moved to slide 2 and uses side-by-side compact panels. App behavior moved to slide 3 so cleanup groups appear once, not as the repeated core of the animation.
