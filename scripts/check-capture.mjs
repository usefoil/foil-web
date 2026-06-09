import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const capture = await readText("docs/capture.md");
const privacy = await readText("privacy/index.html");
const productFiles = await Promise.all([
  "index.html",
  "analytics.js",
  "analytics-config.js",
  ".env.example"
].map(readText));

for (const requiredText of [
  "Supabase capture is deferred for launch",
  "No launch-critical capture use case",
  "Row Level Security",
  "RLS",
  "retention",
  "spam protection",
  "privacy/legal approval",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY"
]) {
  assert(capture.includes(requiredText), `capture decision missing ${requiredText}`);
}

assert(
  privacy.includes("Supabase capture is not used by this static site"),
  "privacy page must match current Supabase capture decision"
);

for (const productText of productFiles) {
  assert(!/createClient|supabase\.from|SUPABASE_URL|SUPABASE_ANON_KEY/.test(productText), "product code must not half-wire Supabase while deferred");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Capture check passed for deferred Supabase launch state.");

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
