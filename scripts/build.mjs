import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "https://foil.neonwatty.com");
const posthogHost = normalizeSiteUrl(process.env.POSTHOG_HOST || "https://us.i.posthog.com");

const excluded = new Set([".git", "dist", "node_modules"]);
const textExtensions = new Set([".html", ".css", ".js", ".json", ".md", ".txt", ".xml"]);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ["assets", "blog", "privacy", "index.html", "styles.css", "robots.txt", "sitemap.xml", "analytics.js", "observability.js"]) {
  await cp(join(root, entry), join(dist, entry), {
    recursive: true,
    filter: (source) => !excluded.has(source.split("/").at(-1))
  });
}

await replaceSiteUrl(dist);
await writeAnalyticsConfig();

async function replaceSiteUrl(path) {
  const { readdir, stat } = await import("node:fs/promises");
  const info = await stat(path);

  if (info.isDirectory()) {
    const entries = await readdir(path);
    await Promise.all(entries.map((entry) => replaceSiteUrl(join(path, entry))));
    return;
  }

  if (!textExtensions.has(extname(path))) {
    return;
  }

  const original = await readFile(path, "utf8");
  const next = original.replaceAll("https://foil.neonwatty.com", siteUrl);

  if (next !== original) {
    await writeFile(path, next);
  }
}

async function writeAnalyticsConfig() {
  const config = {
    posthogKey: process.env.POSTHOG_KEY || "",
    posthogHost,
    siteUrl,
    environment: process.env.FOIL_ANALYTICS_ENV || process.env.VERCEL_ENV || "production",
    sentryDsn: process.env.SENTRY_DSN || "",
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || "",
    sentryRelease: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || ""
  };

  const output = `window.FOIL_ANALYTICS_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
  const target = join(dist, "analytics-config.js");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output);
}

function normalizeSiteUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "https://foil.neonwatty.com";
  }

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

console.log(`Built ${relative(root, dist)} for ${siteUrl}`);
