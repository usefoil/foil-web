# Foil Hero Animation Storyboard

Working storyboard for the landing-page hero animation. Timing, transitions, and motion language are intentionally undecided; this records the slide content we agreed to before visual design.

## Goals

- Show the most important MVP features without over-explaining the product.
- Use real Foil app surfaces wherever possible.
- Avoid implying Foil autonomously chooses a destination app. The accurate claim is that Foil adapts dictation behavior based on configured app/context/provider routes.
- Keep the animation complementary to the page hero instead of repeating the full hero title.

## Slides

### 1. Basics

Copy: `Everything you need`

Body: `Record, paste, copy, retry, and recover from history.`

Visual direction: Use the live Home screenshot with the floating recording status over it. Keep the copy compact because the animation sits next to the landing page hero title.

Feature shown: Hold-to-record workflow, visible recording state, and delivery readiness.

Assets:

- `assets/screenshots/foil-app-home.png`
- `assets/audio-ux/recording-floating-status.png`

### 2. Provider Routes

Copy: `Your models, your keys`

Body: `Bring your own API key, use hosted providers, or self-host transcription and cleanup.`

Visual direction: Show Transcription and Cleanup as two compact route panels. The point is provider choice, not another cleanup-groups explainer.

Feature shown: Local whisper.cpp, Groq, OpenAI, custom OpenAI-compatible endpoints, hosted cleanup, self-hosted cleanup, and raw fallback.

Assets:

- `assets/screenshots/foil-app-transcription-provider.png`
- `assets/screenshots/foil-app-cleanup-profile.png`

### 3. App Behavior

Copy: `Each app, its own style`

Body: `Set cleanup, tone, vocabulary, and raw output rules per app.`

Visual direction: Use the real Cleanup Groups screenshot once, with two small output cards that contrast polished prose and raw command intent.

Example polished output: `Could we move our sync to 3 PM?`

Example raw output: `move sync 3pm; send notes`

Feature shown: App/context-specific cleanup, raw transcript mode, vocabulary, and preferred terms.

Asset: `assets/screenshots/foil-app-cleanup-groups.png`

### 4. Recoverable History

Copy: `History, always there`

Body: `Find, edit, retry, copy, or export past dictations.`

Visual direction: Use the Home screenshot, cropped or called out around recent transcripts.

Feature shown: Recovery after paste, clipboard, permissions, or target-app issues.

Asset: `assets/screenshots/foil-app-home.png`

### 5. Usage Insights

Copy: `Usage, fully visible`

Body: `Understand which apps, sessions, and workflows use dictation most.`

Visual direction: Use the real Insights screenshot.

Feature shown: Words, sessions, trends, and top apps. The overlay uses three adjacent chips: Words, Sessions, and Top apps.

Asset: `assets/screenshots/foil-app-insights.png`

## Open Visual Questions

- How aggressively to crop screenshots so each feature reads in a small hero video.
- Whether the final animation needs a separate end card, or whether the five feature slides are enough in the hero context.
