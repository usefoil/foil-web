import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const release = {
  version: "1.13.11",
  tag: "v1.13.11",
  published: "July 6, 2026",
  dmgName: "Foil-1.13.11-macos.dmg",
  dmgSize: "3336613",
  sha256: "4805e6ca60d7bc8597673dbbee89289997363a8c4fe2e0b6c428c6d245fecd57",
  tapRepo: "https://github.com/mean-weasel/homebrew-foil",
  tapCommand: "brew tap mean-weasel/foil https://github.com/mean-weasel/homebrew-foil",
  caskCommand: "brew install --cask foil",
  releaseRepo: "https://github.com/usefoil/foil"
};
const homepage = await readText("index.html");
const privacy = await readText("privacy/index.html");
const installDoc = await readText("docs/install-download.md");
const launchCheck = await readText("scripts/check-launch.mjs");
const allText = `${homepage}\n${privacy}\n${installDoc}\n${launchCheck}`;
const checksumUrl = `${release.releaseRepo}/releases/download/${release.tag}/${release.dmgName}.sha256`;
const dmgUrl = `${release.releaseRepo}/releases/download/${release.tag}/${release.dmgName}`;
const shortenedSha = `${release.sha256.slice(0, 8)}...${release.sha256.slice(-7)}`;

for (const requiredText of [
  release.tapCommand,
  release.caskCommand,
  `Foil ${release.version}`,
  release.tag,
  release.published,
  release.dmgName,
  release.dmgSize,
  release.sha256,
  shortenedSha,
  checksumUrl,
  release.tapRepo,
  "GitHub Releases",
  "Homebrew",
  "signed, notarized, Sparkle update-signed macOS DMG",
  "public beta",
  "manual DMG",
  "mean-weasel/foil",
  "usefoil/foil",
  "HTTP 200",
  "content-length: 3336613"
]) {
  assert(allText.includes(requiredText), `install trust surface missing ${requiredText}`);
}

assert(homepage.includes(`href="${release.releaseRepo}/releases/latest"`), "homepage must link manual DMG CTA to latest release");
assert(homepage.includes(`href="${release.releaseRepo}/releases"`), "homepage must link all releases");
assert(homepage.includes(`href="${checksumUrl}"`), "homepage must link checksum asset");
assert(!homepage.includes(`href="${dmgUrl}"`), "homepage should keep manual CTA on latest release rather than pinning the DMG button");
assert(homepage.includes('data-analytics-event="install_click"'), "homepage must track Homebrew install intent");
assert(homepage.includes('data-analytics-event="dmg_click"'), "homepage must track DMG intent");
assert(privacy.includes("Foil downloads are hosted on GitHub Releases"), "privacy page must disclose GitHub Releases downloads");
assert(privacy.includes("Homebrew cask points to the same release artifact"), "privacy page must disclose Homebrew cask");
assert(!/bridge[^.]{0,90}\b(shipped|released|available|download|install)\b/i.test(allText), "install trust surface must not imply bridge availability");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Install check passed for Foil ${release.version} and Homebrew cask trust copy.`);

async function readText(relativePath) {
  return readFile(join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
