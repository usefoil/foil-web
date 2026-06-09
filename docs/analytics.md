# Foil Web Analytics Plan

Foil web analytics are intentionally narrow. The landing page should measure conversion intent without capturing transcript content, typed text, clipboard content, session replay, heatmaps, or broad autocapture.

## Configuration

- `POSTHOG_KEY`: required to enable PostHog. When unset, `analytics.js` exits without loading the SDK.
- `POSTHOG_HOST`: optional, defaults to `https://us.i.posthog.com`.
- `SITE_URL`: canonical production URL, defaults to `https://usefoil.com`.
- `FOIL_ANALYTICS_ENV`: optional event environment label.

The PostHog client is initialized with manual capture only, no pageview capture, no pageleave capture, no dead-click capture, no session recording, text and element-attribute masking, and memory persistence.

## Conversion Events

| Event | Trigger | Key properties |
| --- | --- | --- |
| `install_click` | Hero install CTA and Homebrew copy button | `location`, `destination`, `page_path`, `environment` |
| `dmg_click` | GitHub Releases DMG links | `location`, `destination`, `page_path`, `environment` |
| `ios_preview_click` | iOS preview follow-up CTA | `location`, `destination`, `page_path`, `environment` |
| `local_provider_guide_click` | Local whisper.cpp setup guide CTA | `location`, `destination`, `page_path`, `environment` |
| `bridge_interest_click` | Future-facing bridge reliability interest CTA | `location`, `destination`, `page_path`, `environment` |
| `blog_cta_click` | Blog preview, blog index, and article callout CTAs | `location`, `label`, `destination`, `page_path`, `environment` |

Do not add event properties that include dictated text, clipboard contents, API keys, email addresses, or free-form user input.

## Verification

Run `npm run check:analytics` to simulate the PostHog loader locally without sending events. The check proves that analytics stay disabled without `POSTHOG_KEY`, the SDK initializes with privacy-conscious options when configured, and the intended conversion events capture only the documented properties.
