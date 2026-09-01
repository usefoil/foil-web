import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const blogRoot = join(root, "blog");
const failures = [];
const htmlFiles = await findBlogPages(blogRoot);
const conversionDoc = await readFile(join(root, "docs/blog-conversion.md"), "utf8");
const expectedArticleSlugs = [
  "superwhisper-alternative-for-mac",
  "wispr-flow-vs-superwhisper-vs-foil",
  "wispr-flow-alternative-for-mac",
  "does-wispr-flow-work-offline",
  "wispr-flow-not-pasting-text"
];

assert(htmlFiles.length > 1, "blog must include index and article pages");
assert(conversionDoc.includes("Blog Inventory"), "blog conversion doc must include inventory");
assert(conversionDoc.includes("tracked install CTA"), "blog conversion doc must document install CTA requirement");

for (const file of htmlFiles) {
  const relativePath = relative(root, file);
  const html = await readFile(file, "utf8");
  const isIndex = relativePath === "blog/index.html";
  const ctaLinks = [...html.matchAll(/<a\b[^>]*data-analytics-event="blog_cta_click"[^>]*>/g)].map((match) => match[0]);

  assert(hasOne(html, /<link rel="canonical" href="https:\/\/foil\.neonwatty\.com\/blog\/[^"]*">/g), `${relativePath} must have one blog canonical`);
  assert(hasOne(html, /<meta\s+name="description"\s+content="[^"]+"\s*>/g), `${relativePath} must have one meta description`);
  assert(hasOne(html, /<meta property="og:title" content="[^"]+">/g), `${relativePath} must have one og:title`);
  assert(hasOne(html, /<meta property="og:description" content="[^"]+">/g), `${relativePath} must have one og:description`);
  assert(hasOne(html, /<meta property="og:url" content="https:\/\/foil\.neonwatty\.com\/blog\/[^"]*">/g), `${relativePath} must have one og:url`);
  assert(hasOne(html, /<meta property="og:image" content="https:\/\/foil\.neonwatty\.com\/assets\/[^"]+">/g), `${relativePath} must have one absolute og:image`);
  assert(hasOne(html, /<meta name="twitter:card" content="summary_large_image">/g), `${relativePath} must have one Twitter card`);
  assert(html.includes('data-analytics-event="blog_cta_click"'), `${relativePath} must include a blog CTA analytics hook`);
  assert(ctaLinks.every((link) => link.includes('data-analytics-label="')), `${relativePath} blog CTA links must have stable labels`);
  assert(html.includes("#install"), `${relativePath} must link to install`);
  assert(html.includes("privacy/"), `${relativePath} must link to privacy`);
  assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(html), `${relativePath} has an unsupported bridge availability claim`);
  assert(!/local-only|local only/i.test(html), `${relativePath} should avoid local-only overclaims`);
  assert(!/Foil[^.]{0,90}\bpublic iOS app\b/i.test(html), `${relativePath} must not describe Foil iOS as public`);

  if (!isIndex) {
    assert(html.includes('class="article-callout"'), `${relativePath} must include an article callout`);
    assert(html.includes('data-analytics-location="article_callout"'), `${relativePath} must track article callout CTAs`);
    assert(html.includes('href="../../#install"'), `${relativePath} must include a tracked install CTA`);
    assert(html.includes('data-analytics-label="install"'), `${relativePath} install CTA must use stable install label`);
    assert(hasOne(html, /<h2>Sources and further reading<\/h2>/g), `${relativePath} must include sources and further reading`);
    assert(ctaLinks.some((link) => !link.includes('data-analytics-label="install"')), `${relativePath} must include a non-install follow-up CTA`);
  } else {
    for (const slug of expectedArticleSlugs) {
      assert(html.includes(`href="${slug}/"`), `blog index must link ${slug}`);
      assert(html.includes(`data-analytics-label="${slug}"`), `blog index must track ${slug}`);
      assert(conversionDoc.includes(`/${slug}/`), `blog conversion doc must inventory ${slug}`);
    }
    assert(html.includes('data-analytics-label="install"'), "blog index must include tracked install CTA");
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Blog check passed for ${htmlFiles.length} pages.`);

async function findBlogPages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      pages.push(...await findBlogPages(path));
      continue;
    }

    if (entry.name === "index.html") {
      pages.push(path);
    }
  }

  return pages.sort();
}

function hasOne(text, pattern) {
  return [...text.matchAll(pattern)].length === 1;
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
