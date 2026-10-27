import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

// Child environments contain public synthetic configuration only. No inherited credentials.
const baseEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
const sentinel = 'FOIL_SERVER_ONLY_SENTINEL_7a8d';
function build(enabled: boolean) {
  execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...baseEnv, BUGDROP_API_KEY: sentinel, FOIL_PRIVATE_SCAN_SENTINEL: sentinel, DATABASE_URL: 'SERVER_DB_SENTINEL_192a', BUGDROP_INTERNAL_APPLICATION_ID: 'SERVER_APP_SENTINEL_294b',
    ...(enabled ? { FOIL_FEEDBACK_ENABLED: '1', FOIL_FEEDBACK_APPLICATION_ID: 'public-synthetic-app', FOIL_FEEDBACK_WIDGET_URL: 'https://widget.bugdrop.dev/widget.v1.js' } : {}) } });
  execFileSync(process.execPath, ['scripts/check-bugdrop.mjs'], { env: { ...baseEnv, BUGDROP_API_KEY: sentinel, DATABASE_URL: 'SERVER_DB_SENTINEL_192a', BUGDROP_INTERNAL_APPLICATION_ID: 'SERVER_APP_SENTINEL_294b' } });
  return { source: readFileSync('dist/feedback.js', 'utf8'), config: readFileSync('dist/feedback-config.js', 'utf8') };
}
const disabled = build(false);
const enabled = build(true);
function page(url: string, config = enabled.config, mode = 'ready') {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url, runScripts: 'outside-only' });
  const { window } = dom;
  let requests = 0;
  let widgets = 0;
  window.fetch = async () => { requests++; throw new Error('UNEXPECTED NETWORK'); };
  const append = window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild = ((element: HTMLScriptElement) => {
    if (element.tagName === 'SCRIPT') {
      widgets++;
      assert.equal(element.src, 'https://widget.bugdrop.dev/widget.v1.js');
      assert.equal(element.dataset.applicationId, 'public-synthetic-app');
      assert.equal(Object.keys(element.dataset).some((key) => /apiKey|repository|origin|admission|secret/i.test(key)), false);
      append(element);
      queueMicrotask(() => {
        if (mode === 'error') element.dispatchEvent(new window.Event('error'));
        else {
          window.BugDrop = Object.fromEntries(['open', 'close', 'hide', 'show', 'isOpen', 'isButtonVisible', 'setTheme'].map((name) => [name, () => {}]));
          element.dispatchEvent(new window.Event('load'));
        }
      });
      return element;
    }
    return append(element);
  }) as typeof window.document.head.appendChild;
  window.eval(config);
  window.eval(enabled.source);
  return { dom, window, widgets: () => widgets, requests: () => requests };
}
test('actual default build is disabled and emitted config has only public allowlist', () => {
  const p = page('https://foil.neonwatty.com/', disabled.config);
  assert.equal(p.widgets(), 0); assert.equal(p.requests(), 0);
  assert.deepEqual(Object.keys(p.window.FOIL_FEEDBACK_CONFIG).sort(), ['applicationId', 'enabled', 'widgetUrl']);
  p.window.close();
});
test('wrong origins, nonhomepage and missing public settings never load widget or capability', () => {
  for (const url of ['http://foil.neonwatty.com/', 'https://sub.foil.neonwatty.com/', 'https://foil.neonwatty.com:444/', 'https://foil.neonwatty.com/blog/']) {
    const p = page(url); assert.equal(p.widgets(), 0); assert.equal(p.requests(), 0); p.window.close();
  }
  for (const config of ['window.FOIL_FEEDBACK_CONFIG={enabled:true,applicationId:"",widgetUrl:""}', 'window.FOIL_FEEDBACK_CONFIG={enabled:true,applicationId:"public-synthetic-app",widgetUrl:"https://evil.example/widget.js"}']) {
    const p = page('https://foil.neonwatty.com/', config); assert.equal(p.widgets(), 0); assert.equal(p.requests(), 0);
    assert.match(p.window.document.body.textContent || '', /temporarily unavailable/); p.window.close();
  }
});
test('emitted browser mounts at most once, accepts readiness and exposes no token storage', async () => {
  const p = page('https://foil.neonwatty.com/');
  p.window.eval(enabled.source);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(p.widgets(), 1); assert.equal(p.requests(), 0);
  assert.equal(p.window.document.getElementById('foil-feedback-error'), null);
  assert.equal(p.window.localStorage.length, 0); assert.equal(p.window.sessionStorage.length, 0);
  assert.equal(p.window.document.cookie, '');
  assert.equal(/bd_api_v1|bd_auth_v1|synthetic-capability/.test(p.window.document.documentElement.outerHTML), false);
  p.window.close();
});
test('hosted loader failure is visible and generic without a second launcher', async () => {
  const p = page('https://foil.neonwatty.com/', enabled.config, 'error');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(p.widgets(), 1); assert.equal(p.requests(), 0);
  assert.equal(p.window.document.querySelectorAll('[role="status"]').length, 1);
  assert.equal(p.window.document.getElementById('foil-feedback-error')?.textContent, 'Website feedback is temporarily unavailable.');
  p.window.close();
});
