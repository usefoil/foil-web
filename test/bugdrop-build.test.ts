import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
const { scanOutput } = await import("../scripts/check-bugdrop.mjs");

test("same output scanner rejects deliberate secret contamination", async () => {
  const directory = "node_modules/.foil-bugdrop-negative-control";
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(
      `${directory}/index.html`,
      '<script src="/feedback.js"></script>',
    );
    await writeFile(
      `${directory}/feedback-config.js`,
      'window.FOIL_FEEDBACK_CONFIG = Object.freeze({"enabled":false,"applicationId":"","widgetUrl":""});\n',
    );
    await writeFile(
      `${directory}/feedback.js`,
      'const origin = "https://foil.neonwatty.com"; const path = "/api/bugdrop-capability/v1";',
    );
    await scanOutput(directory);
    await writeFile(
      `${directory}/leak.js.map`,
      "bd_api_v1.DELIBERATE_CONTAMINATION",
    );
    await assert.rejects(
      scanOutput(directory),
      /Private material: leak.js.map/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("homepage source alone includes the browser entry; explicit builder excludes server assets", async () => {
  const homepage = await readFile("index.html", "utf8");
  const privacy = await readFile("privacy/index.html", "utf8");
  const blog = await readFile("blog/index.html", "utf8");
  assert.match(homepage, /src="\/feedback.js"/);
  assert.doesNotMatch(privacy + blog, /feedback.js|feedback-config.js/);
  const builder = await readFile("scripts/build.mjs", "utf8");
  assert.doesNotMatch(builder, /cp\(join\(root, ["'](?:api|vendor|lib)/);
});

// Every control has all required output files and valid public configuration.
// Only the JavaScript source varies, so rejection cannot hide another missing prerequisite.
async function withLiteralFixture(
  source: string,
  check: (directory: string) => Promise<void>,
) {
  const directory = "node_modules/.foil-bugdrop-literal-controls";
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(
      `${directory}/index.html`,
      '<script src="/feedback.js"></script>',
    );
    await writeFile(
      `${directory}/feedback-config.js`,
      'window.FOIL_FEEDBACK_CONFIG = Object.freeze({"enabled":false,"applicationId":"","widgetUrl":""});\n',
    );
    await writeFile(`${directory}/feedback.js`, source);
    await check(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("scanner accepts complete decoded literals independent of quote style and escaping", async () => {
  for (const source of [
    'const origin = "https://foil.neonwatty.com"; const path = "/api/bugdrop-capability/v1";',
    "const origin = 'https://foil.neonwatty.com'; const path = '/api/bugdrop-capability/v1';",
    String.raw`const origin = "https://\u0066oil.neonwatty.com"; const path = "\u002fapi/bugdrop-capability/v1";`,
    "const origin = `https://foil.neonwatty.com`; const path = `/api/bugdrop-capability/v1`;",
  ]) {
    await withLiteralFixture(source, async (directory) => {
      await scanOutput(directory);
    });
  }
});

test("scanner rejects canonical origin text embedded in different complete literals", async () => {
  for (const wrong of [
    "https://foil.neonwatty.com.attacker.example",
    "https://foil.neonwatty.com@attacker.example",
    "https://attacker.example/https://foil.neonwatty.com",
    "https://attacker.example/?next=https://foil.neonwatty.com",
    "prefix:https://foil.neonwatty.com",
    "https://foil.neonwatty.com/suffix",
    "https://foil.neonwatty.com?query=1",
  ]) {
    await withLiteralFixture(
      `const origin = ${JSON.stringify(wrong)}; const path = "/api/bugdrop-capability/v1";`,
      async (directory) => {
        await assert.rejects(
          scanOutput(directory),
          /^Error: Missing browser integration$/,
        );
      },
    );
  }
});

test("scanner rejects longer capability-path values with an independently valid origin", async () => {
  for (const wrong of [
    "/prefix/api/bugdrop-capability/v1",
    "/api/bugdrop-capability/v1/suffix",
    "/api/bugdrop-capability/v1?query=1",
  ]) {
    await withLiteralFixture(
      `const origin = "https://foil.neonwatty.com"; const path = ${JSON.stringify(wrong)};`,
      async (directory) => {
        await assert.rejects(
          scanOutput(directory),
          /^Error: Missing browser integration$/,
        );
      },
    );
  }
});

test("scanner rejects absent, comment-only and interpolated-template contract text", async () => {
  for (const source of [
    'const path = "/api/bugdrop-capability/v1";',
    'const origin = "https://foil.neonwatty.com";',
    '// https://foil.neonwatty.com\nconst path = "/api/bugdrop-capability/v1";',
    'const origin = "https://foil.neonwatty.com"; /* /api/bugdrop-capability/v1 */',
    "/* https://foil.neonwatty.com /api/bugdrop-capability/v1 */",
    'const origin = `https://foil.neonwatty.com${".attacker.example"}`; const path = "/api/bugdrop-capability/v1";',
  ]) {
    await withLiteralFixture(source, async (directory) => {
      await assert.rejects(
        scanOutput(directory),
        /^Error: Missing browser integration$/,
      );
    });
  }
});

test("scanner rejects malformed JavaScript and TS-only syntax without echoing contents", async () => {
  for (const source of [
    'const origin = "https://foil.neonwatty.com"; const path = "/api/bugdrop-capability/v1"; const BROKEN_DO_NOT_ECHO = ;',
    'const origin: string = "https://foil.neonwatty.com"; const path = "/api/bugdrop-capability/v1";',
  ]) {
    await withLiteralFixture(source, async (directory) => {
      await assert.rejects(scanOutput(directory), (error: Error) => {
        assert.equal(error.message, "Malformed browser integration JavaScript");
        assert.equal(error.message.includes("BROKEN_DO_NOT_ECHO"), false);
        assert.equal(error.message.includes(source), false);
        return true;
      });
    });
  }
});
