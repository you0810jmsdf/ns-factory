'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

test('ring sourcing flags and skiving settings: browser edit and CSV roundtrip', { timeout: 180000 }, async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.css': 'text/css' };
    fs.readFile(target, (error, data) => {
      if (error) res.writeHead(404).end();
      else { res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' }); res.end(data); }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    // Dummy local-only session unlocks the client UI; no real password/token or external service is used.
    await context.addInitScript(() => {
      sessionStorage.setItem('nsfactory-ring-admin-auth', 'ok');
      sessionStorage.setItem('nsf_admin_key', 'local-browser-test-only');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.dismiss());
    await page.goto(origin + '/order_estimate/admin.html#tab=ring', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof rows !== 'undefined' && rows.length > 0);
    const baseline = await page.evaluate(() => JSON.parse(JSON.stringify(rows)));
    const firstLabel = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label$=" 入手困難"]');
      return input?.getAttribute('aria-label');
    });
    assert.ok(firstLabel, 'matrix must expose a per-color checkbox');
    const target = page.getByRole('checkbox', { name: firstLabel, exact: true }).first();
    await target.check();
    const changed = await page.evaluate(() => rows.map((r,i) => r.hard_to_source === 'TRUE' ? i : -1).filter(i => i >= 0));
    assert.equal(changed.length, 1, 'exactly one ring color must be flagged');
    const index = changed[0];
    const saved = await page.evaluate(() => toCsv());
    await page.evaluate(csv => loadFromText(csv, 'local test roundtrip'), saved);
    assert.equal(await page.evaluate(i => rows[i].hard_to_source, index), 'TRUE');
    assert.equal(await target.isChecked(), true);
    const after = await page.evaluate(() => JSON.parse(JSON.stringify(rows)));
    for (let i=0;i<baseline.length;i++) {
      const expected = {...baseline[i], hard_to_source: i === index ? 'TRUE' : baseline[i].hard_to_source};
      assert.deepEqual(after[i], expected, 'other stock, price, monitoring and source values must remain unchanged');
    }
    await target.uncheck();
    const cleared = await page.evaluate(() => toCsv());
    await page.evaluate(csv => loadFromText(csv, 'local test roundtrip'), cleared);
    assert.equal(await page.evaluate(i => rows[i].hard_to_source, index), 'FALSE');
    await page.locator('#ringMatrixBody').screenshot({path: path.join(os.tmpdir(),'nsf-ring-sourcing.png')}).catch(async () => {
      await page.screenshot({path: path.join(os.tmpdir(),'nsf-ring-sourcing.png')});
    });
    await page.locator('.admin-cat-btn[data-admin-cat="price"]').click();
    await page.locator('[data-admin-tab="settings"]').click();
    await page.waitForFunction(() => typeof settingsRows !== 'undefined' && settingsRows.some(r => r.key === 'lining_skiving_fee'));
    const settingsBaseline = await page.evaluate(() => JSON.parse(JSON.stringify(settingsRows)));
    const settingsIndex = settingsBaseline.findIndex(r => r.key === 'lining_skiving_fee');
    const field = page.locator(`[data-settings-edit="value"][data-row="${settingsIndex}"]`);
    await field.fill('3500');
    await field.dispatchEvent('change');
    assert.equal(await page.evaluate(i => Number(settingsRows[i].value),settingsIndex), 3500);
    const settingCsv = await page.evaluate(() => settingsToCsv());
    await page.route('**/order_estimate/settings.csv*', route => route.fulfill({ status:200, contentType:'text/csv',body:settingCsv }));
    await page.evaluate(() => loadSettingsCsv());
    assert.equal(await field.inputValue(), '3500');
    const settingsAfter = await page.evaluate(() => JSON.parse(JSON.stringify(settingsRows)));
    settingsAfter.forEach((row,i) => assert.deepEqual(row, i === settingsIndex ? {...settingsBaseline[i],value:'3500'} : settingsBaseline[i]));
    assert.deepEqual(errors, [], 'admin must have no uncaught JavaScript errors');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
