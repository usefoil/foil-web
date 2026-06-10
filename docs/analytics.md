# Foil Web Analytics Plan

Foil web analytics are intentionally narrow. The landing page should measure conversion intent without capturing transcript content, typed text, clipboard content, session replay, heatmaps, or broad autocapture.

## Configuration

- `POSTHOG_KEY`: required to enable PostHog. When unset, `analytics.js` exits without loading the SDK.
- `POSTHOG_HOST`: optional, defaults to `https://us.i.posthog.com`.
- `SITE_URL`: canonical production URL, defaults to `https://sayfoil.com`.
- `FOIL_ANALYTICS_ENV`: optional event environment label.

Production is wired to the shared PostHog project `BugDrop + Foil` (`422537`)
because the PostHog organization is at its current project limit. Keep Foil
traffic distinguishable by filtering on `product=foil`, `site_url`,
`page_path`, and the Foil conversion event names below. Do not commit `POSTHOG_KEY`; set it through
Vercel or local shell configuration.

The PostHog client is initialized with manual capture only, no pageview capture, no pageleave capture, no dead-click capture, no session recording, text and element-attribute masking, and memory persistence.

## PostHog Dashboard

Launch conversion tracking lives in the shared PostHog project dashboard
`Foil Launch Conversion`:

- Dashboard URL: `https://us.posthog.com/project/422537/dashboard/1696677`
- Dashboard ID: `1696677`
- Required Foil filters: `product=foil`, `site_url=https://sayfoil.com`, and
  `environment=production`
- Primary breakdowns: event name, `page_path`, `location`, `label`, and
  `destination`

The dashboard was created on June 10, 2026 with a description documenting the
production filters and conversion events. Do not seed it with fake conversion
events. After real production traffic arrives, add these initial insights:

| Insight | Query shape |
| --- | --- |
| Conversion clicks over time | Trend of `install_click`, `dmg_click`, `ios_preview_click`, `local_provider_guide_click`, `bridge_interest_click`, and `blog_cta_click` filtered to Foil production traffic |
| Install/download intent | Trend of `install_click` and `dmg_click`, broken down by `location` and `destination` |
| iOS and provider-guide interest | Trend of `ios_preview_click` and `local_provider_guide_click`, broken down by `page_path` |
| Bridge interest | Trend of `bridge_interest_click`, broken down by `location`; this measures interest only and must not be described as shipped bridge usage |
| Blog CTA conversion | Trend of `blog_cta_click`, broken down by `label`, `page_path`, and `destination` |

## Conversion Events

| Event | Trigger | Key properties |
| --- | --- | --- |
| `install_click` | Hero install CTA and Homebrew copy button | `product`, `site_url`, `location`, `destination`, `page_path`, `environment` |
| `dmg_click` | GitHub Releases DMG links | `product`, `site_url`, `location`, `destination`, `page_path`, `environment` |
| `ios_preview_click` | iOS preview follow-up CTA | `product`, `site_url`, `location`, `destination`, `page_path`, `environment` |
| `local_provider_guide_click` | Local whisper.cpp setup guide CTA | `product`, `site_url`, `location`, `destination`, `page_path`, `environment` |
| `bridge_interest_click` | Future-facing bridge reliability interest CTA | `product`, `site_url`, `location`, `destination`, `page_path`, `environment` |
| `blog_cta_click` | Blog preview, blog index, and article callout CTAs | `product`, `site_url`, `location`, `label`, `destination`, `page_path`, `environment` |

Do not add event properties that include dictated text, clipboard contents, API keys, email addresses, or free-form user input.

## Verification

Run `npm run check:analytics` to simulate the PostHog loader locally without sending events. The check proves that analytics stay disabled without `POSTHOG_KEY`, the SDK initializes with privacy-conscious options when configured, and the intended conversion events capture only the documented properties.

Production wiring receipt from June 10, 2026:

- PostHog project display name: `BugDrop + Foil`.
- PostHog project ID: `422537`.
- Vercel production env includes `POSTHOG_KEY`, `POSTHOG_HOST`, `SITE_URL`, and `FOIL_ANALYTICS_ENV`.
- `https://sayfoil.com/analytics-config.js` served `posthogHost=https://us.i.posthog.com`, `siteUrl=https://sayfoil.com`, and `environment=production`.
- `SMOKE_URL=https://sayfoil.com SITE_URL=https://sayfoil.com npm run check:deployed` passed.
