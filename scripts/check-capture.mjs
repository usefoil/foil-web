import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const capture = await readText("docs/capture.md");
const privacy = await readText("privacy/index.html");
const productFilePaths = [
  "index.html",
  "privacy/index.html",
  ...await findHtmlPages(join(root, "blog")),
  "analytics.js",
  "analytics-config.js",
  ".env.example"
];
const productFiles = await Promise.all(productFilePaths.map(async (relativePath) => ({
  relativePath,
  text: await readText(relativePath)
})));

for (const requiredText of [
  "Supabase capture is deferred for launch",
  "Rechecked on June 11, 2026",
  "No launch-critical capture use case",
  "no waitlist, newsletter, contact, support, install diagnostics, or",
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

for (const { relativePath, text } of productFiles) {
  assert(!/createClient|supabase\.from|SUPABASE_URL|SUPABASE_ANON_KEY/.test(text), `${relativePath} must not half-wire Supabase while deferred`);

  if (relativePath.endsWith(".html")) {
    assert(!/<form\b/i.test(text), `${relativePath} must not add form-based capture while Supabase is deferred`);
    assert(!/\b(?:type|name|id)=["']email["']/i.test(text), `${relativePath} must not add email capture while Supabase is deferred`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Capture check passed for deferred Supabase launch state.");

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

async function findHtmlPages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      pages.push(...await findHtmlPages(path));
      continue;
    }

    if (entry.name === "index.html") {
      pages.push(relative(root, path));
    }
  }

  return pages.sort();
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
