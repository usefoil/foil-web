export function collectAnalyticsEvents(body, seenEvents) {
  for (const [, eventName] of body.matchAll(
    /data-analytics-event="([^"]+)"/g,
  )) {
    seenEvents.add(eventName);
  }
}

export async function checkRequiredAssets({ paths, smokeUrl, assert }) {
  for (const path of paths) {
    const target = new URL(path, `${smokeUrl}/`);
    const response = await fetch(target, { redirect: "follow" });
    assert(response.ok, `${target.href} returned HTTP ${response.status}`);
  }
}

export async function readAnalyticsConfig({ fetchText, assert }) {
  const { url, body } = await fetchText("/analytics-config.js");
  const match = body.match(
    /window\.FOIL_ANALYTICS_CONFIG = Object\.freeze\(([\s\S]*?)\);\s*$/,
  );
  assert(match, `${url.href} does not expose FOIL_ANALYTICS_CONFIG`);

  if (!match) return {};

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    assert(
      false,
      `${url.href} has unparsable analytics config JSON: ${error.message}`,
    );
    return {};
  }
}

export function checkPostHogConfig({
  config,
  expectedAnalyticsEnv,
  expectedCanonical,
  expectedPostHogHost,
  assert,
}) {
  assert(
    typeof config.posthogKey === "string" &&
      config.posthogKey.startsWith("phc_"),
    "PostHog key is missing from deployed analytics config",
  );
  assert(
    normalizeBaseUrl(config.posthogHost) === expectedPostHogHost,
    `PostHog host must be ${expectedPostHogHost}`,
  );
  assert(
    normalizeBaseUrl(config.siteUrl) === expectedCanonical,
    `analytics siteUrl must be ${expectedCanonical}`,
  );

  if (expectedAnalyticsEnv) {
    assert(
      config.environment === expectedAnalyticsEnv,
      `analytics environment must be ${expectedAnalyticsEnv}`,
    );
  }
}

export function checkSentryConfig({ config, assert }) {
  assert(
    typeof config.sentryDsn === "string" &&
      /^https:\/\/[^@]+@[^/]+\/\d+/.test(config.sentryDsn),
    "Sentry DSN is missing from deployed analytics config",
  );
  assert(
    typeof config.sentryEnvironment === "string" &&
      config.sentryEnvironment.length > 0,
    "Sentry environment is missing from deployed analytics config",
  );
  assert(
    typeof config.sentryRelease === "string" && config.sentryRelease.length > 0,
    "Sentry release is missing from deployed analytics config",
  );
}

export function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}
