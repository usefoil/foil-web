const smokeUrl = normalizeBaseUrl(process.env.SMOKE_URL || process.env.VERCEL_URL || "");
const expectedCanonical = normalizeBaseUrl(process.env.SITE_URL || "https://sayfoil.com");
const expectPostHog = process.env.EXPECT_POSTHOG === "1";
const expectSentry = process.env.EXPECT_SENTRY === "1";
const expectedPostHogHost = normalizeBaseUrl(process.env.POSTHOG_HOST || "https://us.i.posthog.com");
const expectedAnalyticsEnv = process.env.EXPECTED_ANALYTICS_ENV || "";
const failures = [];
const fetchedAssets = new Set();
const seenEvents = new Set();
const canonicals = new Set();
const requiredEvents = [
  "install_click",
  "dmg_click",
  "ios_preview_click",
  "local_provider_guide_click",
  "bridge_interest_click",
  "blog_cta_click"
];
const requiredPages = [
  { path: "/", content: "Install Foil" },
  { path: "/privacy/", content: "Foil privacy notes" },
  { path: "/blog/", content: "Mac dictation notes" },
  { path: "/blog/superwhisper-alternative-for-mac/", content: "Superwhisper alternative" },
  { path: "/blog/wispr-flow-vs-superwhisper-vs-foil/", content: "Wispr Flow vs Superwhisper vs Foil" },
  { path: "/blog/wispr-flow-alternative-for-mac/", content: "Wispr Flow alternative" },
  { path: "/blog/does-wispr-flow-work-offline/", content: "Does Wispr Flow work offline" },
  { path: "/blog/wispr-flow-not-pasting-text/", content: "Wispr Flow Not Pasting Text" }
];

if (!smokeUrl) {
  console.log("Deployed smoke check skipped: set SMOKE_URL or VERCEL_URL to verify a preview/production deployment.");
  process.exit(0);
}

const pageBodies = [];
for (const page of requiredPages) {
  const { url, body } = await fetchText(page.path);
  assert(body.includes(page.content), `${url.href} missing expected launch content`);
  checkPageMetadata(page.path, body, url.href);
  collectAnalyticsEvents(body);
  await checkLocalReferences(page.path, body);
  pageBodies.push(body);
}

await checkRobots();
await checkSitemap();
checkLaunchSurface(pageBodies.join("\n"));

for (const eventName of requiredEvents) {
  assert(seenEvents.has(eventName), `deployed HTML missing analytics event hook: ${eventName}`);
}

if (expectPostHog || expectSentry) {
  const config = await readAnalyticsConfig();

  if (expectPostHog) {
    checkPostHogConfig(config);
  }

  if (expectSentry) {
    checkSentryConfig(config);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `Deployed smoke check passed for ${smokeUrl}: ${requiredPages.length} pages, ${fetchedAssets.size} local references, ${requiredEvents.length} conversion events${expectPostHog ? ", PostHog config" : ""}${expectSentry ? ", Sentry config" : ""}`
);

async function checkRobots() {
  const { url, body } = await fetchText("/robots.txt");
  assert(body.includes(`Sitemap: ${expectedCanonical}/sitemap.xml`), `${url.href} sitemap must use ${expectedCanonical}`);
}

async function checkSitemap() {
  const { url, body } = await fetchText("/sitemap.xml");
  assert(body.includes(`<loc>${expectedCanonical}/</loc>`), `${url.href} missing home loc`);

  for (const [, loc] of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert(canonicals.has(loc), `${url.href} loc has no matching fetched page canonical: ${loc}`);
  }

  for (const canonical of canonicals) {
    assert(body.includes(`<loc>${canonical}</loc>`), `deployed sitemap missing canonical: ${canonical}`);
  }
}

function checkPageMetadata(path, body, href) {
  const canonical = singleMatch(body, /<link rel="canonical" href="([^"]+)">/g, `${href} canonical`);
  const ogUrl = singleMatch(body, /<meta property="og:url" content="([^"]+)">/g, `${href} og:url`);
  const ogImage = singleMatch(body, /<meta property="og:image" content="([^"]+)">/g, `${href} og:image`);
  const expectedPageCanonical = `${expectedCanonical}${path}`;

  if (canonical) {
    canonicals.add(canonical);
    assert(canonical === expectedPageCanonical, `${href} canonical must be ${expectedPageCanonical}`);
  }

  if (canonical && ogUrl) {
    assert(ogUrl === canonical, `${href} og:url must match canonical`);
  }

  if (ogImage) {
    assert(ogImage.startsWith(`${expectedCanonical}/assets/`), `${href} og:image must use an absolute asset URL`);
  }
}

function collectAnalyticsEvents(body) {
  for (const [, eventName] of body.matchAll(/data-analytics-event="([^"]+)"/g)) {
    seenEvents.add(eventName);
  }
}

async function checkLocalReferences(pagePath, body) {
  const pageUrl = new URL(pagePath, `${smokeUrl}/`);

  for (const [, rawValue] of body.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = rawValue.split("#")[0].split("?")[0];

    if (!value || value === "/" || /^(https?:|mailto:|tel:)/.test(value)) {
      continue;
    }

    const target = new URL(value, pageUrl);

    if (target.origin !== new URL(smokeUrl).origin) {
      continue;
    }

    const assetPath = `${target.pathname}${target.pathname.endsWith("/") ? "" : ""}`;
    if (fetchedAssets.has(assetPath)) {
      continue;
    }

    fetchedAssets.add(assetPath);
    const response = await fetch(target, { redirect: "follow" });
    assert(response.ok, `${pageUrl.href} references ${rawValue}, but ${target.href} returned HTTP ${response.status}`);
  }
}

function checkLaunchSurface(allHtml) {
  assert(!/mean-weasel\.github\.io\/foil|usefoil\.github\.io\/foil/i.test(allHtml), "deployed HTML contains a stale GitHub Pages canonical URL");
  assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(allHtml), "deployed HTML contains possible unsupported bridge availability claim");
  assert(allHtml.includes("Foil 1.13.4"), "deployed install trust copy must mention current release Foil 1.13.4");
  assert(allHtml.includes("Foil downloads are hosted on GitHub Releases"), "deployed privacy page must disclose GitHub Releases downloads");
  assert(allHtml.includes("PostHog analytics are intentionally narrow"), "deployed privacy page must disclose narrow PostHog analytics");
  assert(allHtml.includes("Supabase capture is not used by this static site"), "deployed privacy page must disclose current Supabase capture status");
  assert(allHtml.includes("Sentry browser error monitoring is prepared behind production configuration"), "deployed privacy page must disclose env-gated Sentry status");
  assert(allHtml.includes("session recording") && allHtml.includes("disabled"), "deployed privacy surface must disclose disabled session recording");
}

async function readAnalyticsConfig() {
  const { url, body } = await fetchText("/analytics-config.js");
  const match = body.match(/window\.FOIL_ANALYTICS_CONFIG = Object\.freeze\(([\s\S]*?)\);\s*$/);
  assert(match, `${url.href} does not expose FOIL_ANALYTICS_CONFIG`);

  if (!match) {
    return {};
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    assert(false, `${url.href} has unparsable analytics config JSON: ${error.message}`);
    return {};
  }
}

function checkPostHogConfig(config) {
  assert(typeof config.posthogKey === "string" && config.posthogKey.startsWith("phc_"), "PostHog key is missing from deployed analytics config");
  assert(normalizeBaseUrl(config.posthogHost) === expectedPostHogHost, `PostHog host must be ${expectedPostHogHost}`);
  assert(normalizeBaseUrl(config.siteUrl) === expectedCanonical, `analytics siteUrl must be ${expectedCanonical}`);

  if (expectedAnalyticsEnv) {
    assert(config.environment === expectedAnalyticsEnv, `analytics environment must be ${expectedAnalyticsEnv}`);
  }
}

function checkSentryConfig(config) {
  assert(typeof config.sentryDsn === "string" && /^https:\/\/[^@]+@[^/]+\/\d+/.test(config.sentryDsn), "Sentry DSN is missing from deployed analytics config");
  assert(typeof config.sentryEnvironment === "string" && config.sentryEnvironment.length > 0, "Sentry environment is missing from deployed analytics config");
  assert(typeof config.sentryRelease === "string" && config.sentryRelease.length > 0, "Sentry release is missing from deployed analytics config");
}

async function fetchText(path) {
  const url = new URL(path, `${smokeUrl}/`);
  const response = await fetch(url, { redirect: "follow" });
  const body = await response.text();

  assert(response.ok, `${url.href} returned HTTP ${response.status}`);
  return { url, body };
}

function singleMatch(text, pattern, label) {
  const matches = [...text.matchAll(pattern)].map((match) => match[1]);
  assert(matches.length === 1, `${label} must appear exactly once`);
  return matches[0];
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
