import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const observability = await readText("docs/observability.md");
const privacy = await readText("privacy/index.html");
const productFiles = await Promise.all(["index.html", "analytics.js", "analytics-config.js"].map(readText));

for (const requiredText of [
  "Sentry is deferred for launch",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_RELEASE",
  "controlled test error",
  "session replay",
  "transcript text",
  "API keys"
]) {
  assert(observability.includes(requiredText), `observability decision missing ${requiredText}`);
}

assert(
  privacy.includes("Sentry is not currently wired into this static website"),
  "privacy page must match current Sentry defer state"
);

for (const productText of productFiles) {
  assert(!/Sentry\.init|browser\.sentry-cdn\.com|SENTRY_DSN/.test(productText), "product code must not half-wire Sentry while deferred");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Observability check passed for deferred Sentry launch state.");

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
