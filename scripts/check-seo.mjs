import { readFile } from "node:fs/promises";
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

  assert(
    title?.length >= 25 && title.length <= 65,
    `${page} title must be 25-65 characters`,
  );
  assert(
    description?.length >= 110 && description.length <= 170,
    `${page} description must be 110-170 characters`,
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
}

const homepage = await readFile(join(root, "index.html"), "utf8");
assert(
  homepage.includes("https://sayfoil.com/assets/foil-social-card.png"),
  "homepage must use the purpose-built landscape social card",
);
assert(
  homepage.includes('<meta property="og:image:width" content="1730">') &&
    homepage.includes('<meta property="og:image:height" content="909">'),
  "homepage social metadata must publish the generated card dimensions",
);
const jsonLdSource = one(
  homepage,
  /<script type="application\/ld\+json">([^<]+)<\/script>/g,
  "index.html",
  "JSON-LD",
);
if (jsonLdSource) {
  try {
    const data = JSON.parse(jsonLdSource);
    assert(
      data["@type"] === "SoftwareApplication",
      "homepage JSON-LD must describe a SoftwareApplication",
    );
    assert(
      data.operatingSystem === "macOS 14 or later",
      "homepage JSON-LD must state the supported macOS version",
    );
    assert(
      data.softwareVersion === "1.13.11",
      "homepage JSON-LD must match the current Foil release",
    );
    assert(
      data.offers?.price === "0",
      "homepage JSON-LD must represent the free public beta",
    );
  } catch (error) {
    failures.push(`index.html JSON-LD is invalid: ${error.message}`);
  }
}

const receipt = JSON.parse(
  await readFile(join(root, "assets/screenshots/receipt.json"), "utf8"),
);
assert(
  receipt.sourceApp.version === "1.13.11",
  "screenshot receipt must match homepage softwareVersion",
);
const socialReceipt = JSON.parse(
  await readFile(join(root, "assets/foil-social-card-receipt.json"), "utf8"),
);
assert(
  socialReceipt.text.includes("Voice dictation for every Mac app."),
  "social card receipt must preserve the exact homepage headline",
);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `SEO check passed for ${pages.length} indexable pages and the current-app product receipt.`,
);

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
