import { access, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || "https://sayfoil.com");
const requiredEvents = [
  "install_click",
  "dmg_click",
  "ios_preview_click",
  "local_provider_guide_click",
  "bridge_interest_click",
  "blog_cta_click"
];
const currentRelease = {
  version: "1.13.4",
  tag: "v1.13.4",
  dmgSha256: "1390e585aec6f50c2f779103ad0136fa974caa64acca91f0e787d4438bec5e1c"
};

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
const seenEvents = new Set();
const canonicals = new Set();

await assertFileExists(join(dist, "robots.txt"));
await assertFileExists(join(dist, "sitemap.xml"));
await assertFileExists(join(dist, "analytics.js"));
await assertFileExists(join(dist, "analytics-config.js"));

for (const relativePath of htmlFiles) {
  const file = join(dist, relativePath);
  const html = await readFile(file, "utf8");
  const canonical = singleMatch(html, /<link rel="canonical" href="([^"]+)">/g, `${relativePath} canonical`);
  const ogUrl = singleMatch(html, /<meta property="og:url" content="([^"]+)">/g, `${relativePath} og:url`);
  const ogImage = singleMatch(html, /<meta property="og:image" content="([^"]+)">/g, `${relativePath} og:image`);

  if (canonical) {
    canonicals.add(canonical);
    assert(canonical.startsWith(siteUrl), `${relativePath} canonical must use ${siteUrl}`);
  }

  if (canonical && ogUrl) {
    assert(ogUrl === canonical, `${relativePath} og:url must match canonical`);
  }

  if (ogImage) {
    assert(ogImage.startsWith(`${siteUrl}/assets/`), `${relativePath} og:image must use an absolute asset URL`);
  }

  for (const [, eventName] of html.matchAll(/data-analytics-event="([^"]+)"/g)) {
    seenEvents.add(eventName);
  }

  await checkLocalReferences(relativePath, html);
}

const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const robots = await readFile(join(dist, "robots.txt"), "utf8");
const allText = `${sitemap}\n${robots}\n${await Promise.all(htmlFiles.map((file) => readFile(join(dist, file), "utf8"))).then((values) => values.join("\n"))}`;

assert(!/mean-weasel\.github\.io\/foil|usefoil\.github\.io\/foil/i.test(allText), "stale GitHub Pages canonical URL found");
assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(allText), "possible unsupported bridge availability claim found");
assert(allText.includes(`Foil ${currentRelease.version}`), `install trust copy must mention current release ${currentRelease.version}`);
assert(allText.includes(`/releases/download/${currentRelease.tag}/Foil-${currentRelease.version}-macos.dmg.sha256`), "install trust copy must link the current DMG checksum");
assert(allText.includes(`${currentRelease.dmgSha256.slice(0, 8)}...${currentRelease.dmgSha256.slice(-7)}`), "install trust copy must show the current DMG checksum fingerprint");
assert(htmlFiles.includes("privacy/index.html"), "privacy page must be part of launch checks");
assert(allText.includes('href="privacy/"'), "home page must link the privacy page");
for (const serviceName of ["Vercel", "PostHog", "GitHub", "Sentry", "Supabase"]) {
  assert(allText.includes(serviceName), `privacy surface must disclose ${serviceName}`);
}
assert(allText.includes("session recording") && allText.includes("disabled"), "privacy surface must disclose disabled session recording");
assert(allText.includes("Supabase capture is not used by this static site"), "privacy surface must disclose current Supabase capture status");
assert(allText.includes("no launch waitlist"), "privacy surface must disclose absent launch capture forms");
assert(allText.includes("browser errors, not session replay"), "privacy surface must disclose Sentry scope");
assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), "robots.txt sitemap must use SITE_URL");

for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  assert(canonicals.has(loc), `sitemap loc has no matching page canonical: ${loc}`);
}

for (const canonical of canonicals) {
  assert(sitemap.includes(`<loc>${canonical}</loc>`), `canonical missing from sitemap: ${canonical}`);
}

for (const eventName of requiredEvents) {
  assert(seenEvents.has(eventName), `missing analytics event hook: ${eventName}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Launch check passed for ${htmlFiles.length} pages and ${requiredEvents.length} conversion events.`);

async function checkLocalReferences(relativePath, html) {
  const baseDir = dirname(join(dist, relativePath));
  const attributes = html.matchAll(/\b(?:href|src)="([^"]+)"/g);

  for (const [, rawValue] of attributes) {
    const value = rawValue.split("#")[0].split("?")[0];

    if (!value || /^(https?:|mailto:|tel:)/.test(value)) {
      continue;
    }

    if (value.startsWith("/")) {
      await assertFileExists(resolve(dist, `.${value}`), `${relativePath} references ${rawValue}`);
      continue;
    }

    await assertFileExists(resolve(baseDir, value), `${relativePath} references ${rawValue}`);
  }
}

function singleMatch(text, pattern, label) {
  const matches = [...text.matchAll(pattern)].map((match) => match[1]);
  assert(matches.length === 1, `${label} must appear exactly once`);
  return matches[0];
}

async function assertFileExists(path, label = path) {
  try {
    const info = await stat(path);
    if (info.isDirectory()) {
      await access(join(path, "index.html"));
    }
  } catch {
    failures.push(`missing local asset or page: ${label}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function normalizeSiteUrl(value) {
  return String(value || "https://sayfoil.com").replace(/\/$/, "");
}
