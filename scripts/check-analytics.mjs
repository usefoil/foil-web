import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const analyticsSource = await readFile(join(root, "analytics.js"), "utf8");
const requiredEvents = [
  "install_click",
  "dmg_click",
  "local_provider_guide_click",
  "bridge_interest_click",
  "blog_cta_click"
];
const allowedProperties = new Set(["product", "site_url", "location", "label", "destination", "page_path", "environment"]);
const failures = [];

function assertNoSdkLoadWithoutKey() {
  const harness = createHarness({ posthogKey: "" });
  runAnalytics(harness.context);
  assert(harness.appendedScripts.length === 0, "PostHog script must not load when POSTHOG_KEY is empty");
}

function assertPrivacyConfigAndEventsWithKey() {
  const captures = [];
  let initCall = null;
  const harness = createHarness({
    posthogKey: "ph_test_key",
    posthogHost: "https://us.i.posthog.com",
    siteUrl: "https://foil.neonwatty.com",
    environment: "preview"
  });

  harness.context.window.posthog = {
    init(key, options) {
      initCall = { key, options };
      options.loaded({
        capture(eventName, properties) {
          captures.push({ eventName, properties });
        }
      });
    }
  };

  runAnalytics(harness.context);

  const [script] = harness.appendedScripts;
  assert(script?.src === "https://us.i.posthog.com/static/array.js", "PostHog SDK URL must use configured host");
  script.onload();

  assert(initCall?.key === "ph_test_key", "PostHog init must use configured project key");
  assert(initCall?.options.api_host === "https://us.i.posthog.com", "PostHog api_host must use configured host");
  assert(initCall?.options.autocapture === false, "PostHog autocapture must be disabled");
  assert(initCall?.options.capture_pageview === false, "PostHog pageview capture must be disabled");
  assert(initCall?.options.capture_pageleave === false, "PostHog pageleave capture must be disabled");
  assert(initCall?.options.capture_dead_clicks === false, "PostHog dead-click capture must be disabled");
  assert(initCall?.options.disable_session_recording === true, "PostHog session recording must be disabled");
  assert(initCall?.options.mask_all_text === true, "PostHog must mask all text");
  assert(initCall?.options.mask_all_element_attributes === true, "PostHog must mask all element attributes");
  assert(initCall?.options.person_profiles === "identified_only", "PostHog person profiles must be identified_only");
  assert(initCall?.options.persistence === "memory", "PostHog persistence must be memory-only");

  for (const deniedProperty of ["$current_url", "$referrer", "$pathname"]) {
    assert(initCall?.options.property_denylist?.includes(deniedProperty), `PostHog denylist missing ${deniedProperty}`);
  }

  for (const element of harness.elements) {
    element.click();
  }

  for (const eventName of requiredEvents) {
    assert(
      captures.some((capture) => capture.eventName === eventName),
      `missing captured analytics event: ${eventName}`
    );
  }

  for (const capture of captures) {
    const propertyNames = Object.keys(capture.properties);
    assert(propertyNames.every((propertyName) => allowedProperties.has(propertyName)), `${capture.eventName} includes unexpected property`);
    assert(capture.properties.product === "foil", `${capture.eventName} must include product identifier`);
    assert(capture.properties.site_url === "https://foil.neonwatty.com", `${capture.eventName} must include configured site_url`);
    assert(capture.properties.page_path === "/launch-test", `${capture.eventName} must include page_path`);
    assert(capture.properties.environment === "preview", `${capture.eventName} must include configured environment`);
    assert(!JSON.stringify(capture.properties).match(/transcript|clipboard|api[_ -]?key|email|password/i), `${capture.eventName} includes sensitive-looking data`);
  }
}

function runAnalytics(context) {
  new Script(analyticsSource, { filename: "analytics.js" }).runInContext(context);
}

function createHarness(config) {
  const appendedScripts = [];
  const elements = requiredEvents.map((eventName, index) => {
    const location = eventName.replace(/_click$/, "") || "unknown";
    return new FakeAnchorElement(
      {
        analyticsEvent: eventName,
        analyticsLocation: location,
        analyticsLabel: `label-${index}`
      },
      `https://foil.neonwatty.com/test-${index}`
    );
  });

  const context = createContext({
    HTMLAnchorElement: FakeAnchorElement,
    window: {
      FOIL_ANALYTICS_CONFIG: config,
      location: { pathname: "/launch-test" }
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
          onload: null
        };
      },
      querySelectorAll(selector) {
        assert(selector === "[data-analytics-event]", "analytics script must bind only declared event hooks");
        return elements;
      }
    }
  });

  return { appendedScripts, context, elements };
}

class FakeAnchorElement {
  constructor(dataset, href) {
    this.dataset = dataset;
    this.href = href;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.();
  }
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

assertNoSdkLoadWithoutKey();
assertPrivacyConfigAndEventsWithKey();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Analytics check passed for ${requiredEvents.length} conversion events.`);
