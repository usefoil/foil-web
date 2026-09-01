import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const observability = await readText("docs/observability.md");
const privacy = await readText("privacy/index.html");
const observabilitySource = await readText("observability.js");
const htmlFiles = [
  "index.html",
  "privacy/index.html",
  "blog/index.html",
  "blog/superwhisper-alternative-for-mac/index.html",
  "blog/wispr-flow-vs-superwhisper-vs-foil/index.html",
  "blog/wispr-flow-alternative-for-mac/index.html",
  "blog/does-wispr-flow-work-offline/index.html",
  "blog/wispr-flow-not-pasting-text/index.html"
];
const failures = [];

for (const requiredText of [
  "dormant, env-gated Sentry browser error-monitoring foundation",
  "Sentry is not enabled for the current static launch",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_RELEASE",
  "controlled test error",
  "Session replay",
  "transcript text",
  "raw audio",
  "clipboard contents",
  "API keys",
  "free-form user",
  "input before sending",
  "EXPECT_SENTRY=1"
]) {
  assert(observability.includes(requiredText), `observability decision missing ${requiredText}`);
}

assert(
  privacy.includes("Sentry browser error monitoring is not enabled for launch") &&
    privacy.includes("exits unless a Sentry DSN is configured"),
  "privacy page must match current dormant Sentry env-gated state"
);
assert(
  privacy.includes("Sentry session replay, tracing, breadcrumbs") &&
    privacy.includes("raw audio") &&
    privacy.includes("API keys") &&
    privacy.includes("request bodies"),
  "privacy page must disclose Sentry safeguards"
);

for (const relativePath of htmlFiles) {
  const html = await readText(relativePath);
  assert(html.includes('<script defer src="/analytics-config.js"></script>'), `${relativePath} must load generated config before observability`);
  assert(html.includes('<script defer src="/observability.js"></script>'), `${relativePath} must load observability script`);
  assert(html.indexOf("/analytics-config.js") < html.indexOf("/observability.js"), `${relativePath} must load config before observability`);
}

assertNoSdkLoadWithoutDsn();
assertSentryPrivacyConfigWithDsn();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Observability check passed for dormant env-gated Sentry launch state.");

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

function assertNoSdkLoadWithoutDsn() {
  const harness = createHarness({ sentryDsn: "" });
  runObservability(harness.context);
  assert(harness.appendedScripts.length === 0, "Sentry SDK must not load when SENTRY_DSN is empty");
}

function assertSentryPrivacyConfigWithDsn() {
  let initOptions = null;
  const tags = new Map();
  const harness = createHarness({
    sentryDsn: "https://public@example.ingest.sentry.io/123456",
    sentryEnvironment: "preview",
    sentryRelease: "abc123",
    siteUrl: "https://foil.neonwatty.com"
  });

  harness.context.window.Sentry = {
    init(options) {
      initOptions = options;
    },
    setTag(key, value) {
      tags.set(key, value);
    }
  };

  runObservability(harness.context);

  const [script] = harness.appendedScripts;
  assert(script?.src === "https://browser.sentry-cdn.com/10.42.0/bundle.min.js", "Sentry SDK URL must use the errors-only CDN bundle");
  assert(script?.integrity?.startsWith("sha384-"), "Sentry SDK must pin an integrity hash");
  assert(script?.crossOrigin === "anonymous", "Sentry SDK must set crossOrigin=anonymous");
  script.onload();

  assert(initOptions?.dsn === "https://public@example.ingest.sentry.io/123456", "Sentry init must use configured DSN");
  assert(initOptions?.environment === "preview", "Sentry environment must use configured environment");
  assert(initOptions?.release === "abc123", "Sentry release must use configured release");
  assert(initOptions?.sendDefaultPii === false, "Sentry must not send default PII");
  assert(initOptions?.tracesSampleRate === 0, "Sentry tracing must be disabled");
  assert(initOptions?.replaysSessionSampleRate === 0, "Sentry session replay must be disabled");
  assert(initOptions?.replaysOnErrorSampleRate === 0, "Sentry error replay must be disabled");
  assert(typeof initOptions?.beforeBreadcrumb === "function" && initOptions.beforeBreadcrumb({}) === null, "Sentry breadcrumbs must be dropped");
  assert(typeof initOptions?.beforeSend === "function", "Sentry must configure beforeSend scrubbing");
  assert(tags.get("product") === "foil", "Sentry events must be tagged with product=foil");
  assert(tags.get("site_url") === "https://foil.neonwatty.com", "Sentry events must be tagged with configured site_url");

  const scrubbed = initOptions.beforeSend({
    user: { email: "person@example.com" },
    request: {
      url: "https://foil.neonwatty.com/?token=secret#fragment",
      headers: { authorization: "Bearer secret" },
      cookies: "secret",
      data: { transcript: "sensitive dictated text" }
    },
    contexts: {
      trace: { trace_id: "abc" },
      device: { model: "Mac" }
    },
    extra: {
      transcriptText: "sensitive dictated text",
      apiKey: "sk_secret_value",
      safe: "support@example.com"
    },
    breadcrumbs: [{ message: "clicked" }]
  });

  const serialized = JSON.stringify(scrubbed);
  assert(!serialized.match(/person@example|support@example|secret|sensitive dictated|authorization|cookie|trace_id/i), "Sentry scrubber must remove sensitive values");
  assert(scrubbed.request.url === "https://foil.neonwatty.com/", "Sentry scrubber must strip query strings and fragments");
  assert(Array.isArray(scrubbed.breadcrumbs) && scrubbed.breadcrumbs.length === 0, "Sentry scrubber must drop breadcrumbs");
  assert(scrubbed.contexts.device.model === "Mac", "Sentry scrubber should preserve non-sensitive context");
}

function runObservability(context) {
  new Script(observabilitySource, { filename: "observability.js" }).runInContext(context);
}

function createHarness(config) {
  const appendedScripts = [];
  const context = createContext({
    URL,
    window: {
      FOIL_ANALYTICS_CONFIG: config,
      location: { origin: "https://foil.neonwatty.com" }
    },
    document: {
      head: {
        appendChild(script) {
          appendedScripts.push(script);
        }
      },
      createElement(tagName) {
        return {
          tagName: String(tagName).toUpperCase(),
          async: false,
          src: "",
          integrity: "",
          crossOrigin: "",
          onload: null
        };
      }
    }
  });

  return { appendedScripts, context };
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
