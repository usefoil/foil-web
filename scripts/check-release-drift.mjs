import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const timeoutMs = Number(process.env.RELEASE_DRIFT_TIMEOUT_MS || 10000);
const failures = [];
const release = {
  version: "1.13.5",
  tag: "v1.13.5",
  name: "Foil 1.13.5",
  publishedDate: "2026-06-12",
  dmgName: "Foil-1.13.5-macos.dmg",
  dmgSize: 2632125,
  sha256: "20ee96db3f064ed204fa492e0a8971cc29c79bd12833d4fec9214de49757aa6f",
  releaseRepo: "https://github.com/usefoil/foil"
};

const latestRelease = await fetchJson("https://api.github.com/repos/usefoil/foil/releases/latest");
const cask = await fetchText("https://raw.githubusercontent.com/mean-weasel/homebrew-foil/main/Casks/foil.rb");
const checksum = await fetchText(`${release.releaseRepo}/releases/download/${release.tag}/${release.dmgName}.sha256`);
const docsAndChecks = await readDocsAndChecks();

checkGitHubRelease(latestRelease);
checkChecksumAsset(checksum);
checkHomebrewCask(cask);
checkLocalReleaseSurfaces(docsAndChecks);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Release drift check passed for ${release.tag}, ${release.dmgName}, and Homebrew cask ${release.version}.`);

function checkGitHubRelease(latest) {
  assert(latest.tag_name === release.tag, `GitHub latest release is ${latest.tag_name}; update web install copy/checks from ${release.tag}`);
  assert(latest.name === release.name, `GitHub latest release name is ${latest.name}; expected ${release.name}`);
  assert(String(latest.published_at || "").startsWith(release.publishedDate), `GitHub release published_at is ${latest.published_at}; expected ${release.publishedDate}`);

  const dmg = latest.assets?.find((asset) => asset.name === release.dmgName);
  const checksumAsset = latest.assets?.find((asset) => asset.name === `${release.dmgName}.sha256`);

  assert(Boolean(dmg), `GitHub latest release is missing DMG asset ${release.dmgName}`);
  assert(Boolean(checksumAsset), `GitHub latest release is missing checksum asset ${release.dmgName}.sha256`);

  if (dmg) {
    assert(dmg.size === release.dmgSize, `GitHub DMG size is ${dmg.size}; expected ${release.dmgSize}`);
    assert(dmg.browser_download_url === `${release.releaseRepo}/releases/download/${release.tag}/${release.dmgName}`, `GitHub DMG URL changed: ${dmg.browser_download_url}`);
  }
}

function checkChecksumAsset(text) {
  assert(text.includes(release.sha256), "GitHub checksum asset does not include the pinned DMG SHA-256");
  assert(text.includes(release.dmgName), "GitHub checksum asset does not name the pinned DMG");
}

function checkHomebrewCask(text) {
  const version = matchOne(text, /version "([^"]+)"/, "Homebrew cask version");
  const sha256 = matchOne(text, /sha256 "([^"]+)"/, "Homebrew cask sha256");
  const url = matchOne(text, /url "([^"]+)"/, "Homebrew cask URL");

  assert(version === release.version, `Homebrew cask version is ${version}; expected ${release.version}`);
  assert(sha256 === release.sha256, `Homebrew cask SHA-256 is ${sha256}; expected ${release.sha256}`);
  assert(url.endsWith(`/releases/download/${release.tag}/${release.dmgName}`), `Homebrew cask URL does not point at ${release.tag}/${release.dmgName}`);
}

function checkLocalReleaseSurfaces(text) {
  for (const requiredText of [
    release.version,
    release.tag,
    release.name,
    release.dmgName,
    String(release.dmgSize),
    release.sha256,
    `${release.sha256.slice(0, 8)}...${release.sha256.slice(-7)}`,
    `${release.releaseRepo}/releases/download/${release.tag}/${release.dmgName}.sha256`
  ]) {
    assert(text.includes(requiredText), `local install surface missing ${requiredText}`);
  }
}

async function readDocsAndChecks() {
  const paths = [
    "index.html",
    "docs/install-download.md",
    "scripts/check-install.mjs",
    "scripts/check-launch.mjs",
    "scripts/check-deployed.mjs"
  ];
  const values = await Promise.all(paths.map((path) => readFile(join(root, path), "utf8")));
  return values.join("\n");
}

async function fetchJson(url) {
  const body = await fetchText(url, { accept: "application/vnd.github+json" });
  return JSON.parse(body);
}

async function fetchText(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "foil-web-release-drift-check",
        ...headers
      },
      redirect: "follow",
      signal: controller.signal
    });

    const body = await response.text();
    assert(response.ok, `${url} returned HTTP ${response.status}`);
    return body;
  } catch (error) {
    assert(false, `${url} fetch failed: ${error.message}`);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function matchOne(text, pattern, label) {
  const match = text.match(pattern);
  assert(Boolean(match), `${label} not found`);
  return match?.[1] || "";
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
