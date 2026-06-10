import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const blogRoot = join(root, "blog");
const failures = [];
const htmlFiles = await findBlogPages(blogRoot);

assert(htmlFiles.length > 1, "blog must include index and article pages");

for (const file of htmlFiles) {
  const relativePath = relative(root, file);
  const html = await readFile(file, "utf8");
  const isIndex = relativePath === "blog/index.html";

  assert(hasOne(html, /<link rel="canonical" href="https:\/\/sayfoil\.com\/blog\/[^"]*">/g), `${relativePath} must have one blog canonical`);
  assert(hasOne(html, /<meta property="og:title" content="[^"]+">/g), `${relativePath} must have one og:title`);
  assert(hasOne(html, /<meta property="og:description" content="[^"]+">/g), `${relativePath} must have one og:description`);
  assert(hasOne(html, /<meta property="og:image" content="https:\/\/sayfoil\.com\/assets\/[^"]+">/g), `${relativePath} must have one absolute og:image`);
  assert(html.includes('data-analytics-event="blog_cta_click"'), `${relativePath} must include a blog CTA analytics hook`);
  assert(html.includes("#install"), `${relativePath} must link to install`);
  assert(html.includes("#privacy"), `${relativePath} must link to privacy`);
  assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(html), `${relativePath} has an unsupported bridge availability claim`);
  assert(!/local-only|local only/i.test(html), `${relativePath} should avoid local-only overclaims`);

  if (!isIndex) {
    assert(/Install Foil|Try Foil|View Foil/.test(html), `${relativePath} must include a Foil conversion CTA`);
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
