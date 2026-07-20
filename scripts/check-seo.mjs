import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pages = [
  "index.html",
  "privacy/index.html",
  "blog/index.html",
  "blog/superwhisper-alternative-for-mac/index.html",
  "blog/wispr-flow-vs-superwhisper-vs-foil/index.html",
  "blog/wispr-flow-alternative-for-mac/index.html",
  "blog/does-wispr-flow-work-offline/index.html",
  "blog/wispr-flow-not-pasting-text/index.html",
];
const failures = [];
const titles = new Set();
const descriptions = new Set();

for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  const title = one(html, /<title>([^<]+)<\/title>/g, page, "title");
  const description = one(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"\s*>/g,
    page,
    "description",
  );
  const canonical = one(
    html,
    /<link rel="canonical" href="([^"]+)">/g,
    page,
    "canonical",
  );

  assert(Boolean(title?.trim()), `${page} title must not be empty`);
  assert(
    Boolean(description?.trim()),
    `${page} description must not be empty`,
  );
  assert(
    canonical?.startsWith("https://sayfoil.com/"),
    `${page} canonical must use sayfoil.com`,
  );
  assert(count(html, /<h1\b/g) === 1, `${page} must contain exactly one h1`);

  for (const property of [
    "og:title",
    "og:description",
    "og:type",
    "og:url",
    "og:image",
  ]) {
    assert(
      count(html, new RegExp(`<meta property="${property}"`, "g")) === 1,
      `${page} must contain one ${property}`,
    );
  }

  assert(
    count(html, /<meta name="twitter:card" content="summary_large_image">/g) ===
      1,
    `${page} must contain one large Twitter card`,
  );
  assert(
    !/<img\b(?![^>]*\b(?:alt|role)=)[^>]*>/i.test(html),
    `${page} contains an image without alt text`,
  );

  if (title) assert(!titles.has(title), `${page} title must be unique`);
  if (description) {
    assert(!descriptions.has(description), `${page} description must be unique`);
  }
  titles.add(title);
  descriptions.add(description);
}

const homepage = await readFile(join(root, "index.html"), "utf8");
assert(
  homepage.includes('<meta name="robots" content="max-image-preview:large">'),
  "homepage must allow large image previews",
);
assert(
  homepage.includes("https://sayfoil.com/assets/foil-social-card.png"),
  "homepage must use the dedicated social card",
);
for (const name of [
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
]) {
  assert(
    count(homepage, new RegExp(`<meta name="${name}"`, "g")) === 1,
    `homepage must contain one ${name}`,
  );
}

const receipt = JSON.parse(
  await readFile(join(root, "assets/foil-social-card-receipt.json"), "utf8"),
);
assert(
  receipt.text.includes(
    "A dictation app that understands where your words are going.",
  ),
  "social card receipt must preserve the approved headline",
);
assert(
  homepage.includes(
    `<meta property="og:image:width" content="${receipt.pixelWidth}">`,
  ) &&
    homepage.includes(
      `<meta property="og:image:height" content="${receipt.pixelHeight}">`,
    ),
  "homepage social dimensions must match the asset receipt",
);

try {
  await stat(join(root, receipt.asset));
} catch {
  failures.push(`missing social card asset: ${receipt.asset}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`SEO check passed for ${pages.length} indexable pages.`);

function one(text, pattern, page, label) {
  const matches = [...text.matchAll(pattern)].map((match) => match[1]);
  assert(matches.length === 1, `${page} must contain exactly one ${label}`);
  return matches[0];
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
