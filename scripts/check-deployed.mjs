const smokeUrl = normalizeBaseUrl(process.env.SMOKE_URL || process.env.VERCEL_URL || "");
const expectedCanonical = normalizeBaseUrl(process.env.SITE_URL || "https://sayfoil.com");
const expectPostHog = process.env.EXPECT_POSTHOG === "1";
const expectedPostHogHost = normalizeBaseUrl(process.env.POSTHOG_HOST || "https://us.i.posthog.com");
const expectedAnalyticsEnv = process.env.EXPECTED_ANALYTICS_ENV || "";
const failures = [];

if (!smokeUrl) {
  console.log("Deployed smoke check skipped: set SMOKE_URL or VERCEL_URL to verify a preview/production deployment.");
  process.exit(0);
}

const pages = [
  { path: "/", content: "Install Foil" },
  { path: "/privacy/", content: "Foil privacy notes" },
  { path: "/blog/", content: "Mac dictation notes" },
  { path: "/robots.txt", content: `Sitemap: ${expectedCanonical}/sitemap.xml` },
  { path: "/sitemap.xml", content: `<loc>${expectedCanonical}/</loc>` }
];

for (const page of pages) {
  const url = new URL(page.path, `${smokeUrl}/`);
  const response = await fetch(url, { redirect: "follow" });
  const body = await response.text();

  assert(response.ok, `${url.href} returned HTTP ${response.status}`);
  assert(body.includes(page.content), `${url.href} missing expected launch content`);

  if (page.path.endsWith("/")) {
    assert(body.includes(`rel="canonical" href="${expectedCanonical}${page.path}"`), `${url.href} has wrong canonical`);
    assert(body.includes(`property="og:url" content="${expectedCanonical}${page.path}"`), `${url.href} has wrong og:url`);
  }
}

if (expectPostHog) {
  await checkPostHogConfig();
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Deployed smoke check passed for ${smokeUrl}${expectPostHog ? " with PostHog config" : ""}`);

async function checkPostHogConfig() {
  const url = new URL("/analytics-config.js", `${smokeUrl}/`);
  const response = await fetch(url, { redirect: "follow" });
  const body = await response.text();

  assert(response.ok, `${url.href} returned HTTP ${response.status}`);

  const match = body.match(/window\.FOIL_ANALYTICS_CONFIG = Object\.freeze\(([\s\S]*?)\);\s*$/);
  assert(match, `${url.href} does not expose FOIL_ANALYTICS_CONFIG`);

  if (!match) {
    return;
  }

  let config;

  try {
    config = JSON.parse(match[1]);
  } catch (error) {
    assert(false, `${url.href} has unparsable analytics config JSON: ${error.message}`);
    return;
  }

  assert(typeof config.posthogKey === "string" && config.posthogKey.startsWith("phc_"), "PostHog key is missing from deployed analytics config");
  assert(normalizeBaseUrl(config.posthogHost) === expectedPostHogHost, `PostHog host must be ${expectedPostHogHost}`);
  assert(normalizeBaseUrl(config.siteUrl) === expectedCanonical, `analytics siteUrl must be ${expectedCanonical}`);

  if (expectedAnalyticsEnv) {
    assert(config.environment === expectedAnalyticsEnv, `analytics environment must be ${expectedAnalyticsEnv}`);
  }
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
