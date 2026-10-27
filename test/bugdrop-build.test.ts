import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
const { scanOutput } = await import('../scripts/check-bugdrop.mjs');

test('same output scanner rejects deliberate secret contamination', async () => {
  const directory = 'node_modules/.foil-bugdrop-negative-control';
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(`${directory}/index.html`, '<script src="/feedback.js"></script>');
    await writeFile(`${directory}/feedback-config.js`, 'window.FOIL_FEEDBACK_CONFIG = Object.freeze({"enabled":false,"applicationId":"","widgetUrl":""});\n');
    await writeFile(`${directory}/feedback.js`, 'https://foil.neonwatty.com /api/bugdrop-capability/v1');
    await scanOutput(directory);
    await writeFile(`${directory}/leak.js.map`, 'bd_api_v1.DELIBERATE_CONTAMINATION');
    await assert.rejects(scanOutput(directory), /Private material: leak.js.map/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('homepage source alone includes the browser entry; explicit builder excludes server assets', async () => {
  const homepage = await readFile('index.html', 'utf8');
  const privacy = await readFile('privacy/index.html', 'utf8');
  const blog = await readFile('blog/index.html', 'utf8');
  assert.match(homepage, /src="\/feedback.js"/);
  assert.doesNotMatch(privacy + blog, /feedback.js|feedback-config.js/);
  const builder = await readFile('scripts/build.mjs', 'utf8');
  assert.doesNotMatch(builder, /cp\(join\(root, ["'](?:api|vendor|lib)/);
});
