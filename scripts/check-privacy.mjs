import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const privacy = await readText("privacy/index.html");
const privacyChecklist = await readText("docs/privacy-launch.md");
const supportingDocs = await Promise.all([
  "docs/analytics.md",
  "docs/observability.md",
  "docs/capture.md"
].map(readText));
const publicText = normalizeText(privacy);

for (const requiredText of [
  "Last updated June 10, 2026",
  "static site hosted for launch on Vercel",
  "account signup",
  "checkout",
  "contact forms",
  "newsletter signup",
  "email capture",
  "PostHog analytics are intentionally narrow",
  "Autocapture",
  "pageview capture",
  "pageleave capture",
  "dead-click capture",
  "heatmaps",
  "session recording are disabled",
  "dictated text",
  "typed text",
  "transcript contents",
  "clipboard contents",
  "raw audio",
  "API keys",
  "email addresses",
  "free-form user input",
  "Sentry browser error monitoring is prepared behind production configuration",
  "only loads when a Sentry DSN is configured",
  "browser errors, not session replay",
  "performance tracing",
  "product analytics",
  "GitHub Releases",
  "Homebrew",
  "Supabase capture is not used by this static site",
  "no launch waitlist",
  "Mac app data",
  "macOS Keychain",
  "Transcription history is local to the Mac",
  "bridge reliability work linked from the landing page is future-facing"
]) {
  assert(publicText.includes(requiredText), `privacy page missing ${requiredText}`);
}

for (const requiredText of [
  "Vercel hosts the static site",
  "PostHog is limited to manual conversion analytics",
  "Sentry browser error monitoring is env-gated",
  "Supabase capture is not used",
  "Bridge reliability work is future-facing",
  "npm run check:privacy"
]) {
  assert(privacyChecklist.includes(requiredText), `privacy checklist missing ${requiredText}`);
}

for (const docText of supportingDocs) {
  assert(docText.includes("privacy") || docText.includes("Privacy"), "supporting service doc must mention privacy posture");
}

assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(publicText), "privacy page must not imply bridge availability");
assert(!/Sentry[^.]{0,120}\b(session replay|performance tracing)\b[^.]{0,80}\b(enabled|on|captured)\b/i.test(publicText), "privacy page must not imply replay/tracing is enabled");
assert(!/Supabase[^.]{0,120}\b(writes|stores|captures|collects)\b/i.test(publicText), "privacy page must not imply Supabase capture is active");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Privacy launch check passed for public service disclosures.");

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
