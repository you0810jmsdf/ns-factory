'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

test('plateau drag updates hours and quote while keeping structure', { timeout: 600000 }, async () => {
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
    const url = origin + '/order_estimate/leather-order-estimate-v2.html';
    const waitEditor = async p => {
      await p.waitForFunction(() => !!window.NSFLaborCurves?.data);
      await p.locator('#laborCurveEditor circle[data-point="0"]').waitFor({ state: 'visible' });
    };
    const selectQuote = async p => {
      await p.locator('#brandGrid .brand-card[data-id="simplist"]').click();
      await p.locator('#sizeGrid [data-key="size"][data-id="micro5"]').click();
    };
    const price = async p => Number((await p.locator('#totalDisplay').innerText()).replace(/[^0-9]/g, ''));
    await page.goto(url + '?admin', { waitUntil: 'domcontentloaded' });
    await waitEditor(page);
    await selectQuote(page);

    await page.locator('#brandGrid [data-id="simplist_klpad"]').click();
    for (const i of [1, 2, 3]) {
      const input = page.locator('#laborCurveEditor [data-hours="' + i + '"]');
      await input.fill('3'); await input.dispatchEvent('change');
    }
    const label = page.locator('#laborCurveEditor [data-point-label="2"]');
    await label.scrollIntoViewIfNeeded(); const box = await label.boundingBox();
    await page.mouse.move(box.x+box.width/2, box.y+box.height/2); await page.mouse.down();
    const before = await price(page);
    await page.mouse.move(box.x+box.width/2, box.y+box.height/2-20, {steps:5}); await page.mouse.up();
    const after = await price(page);
    const result = await page.evaluate(() => ({brand:sel.brandId,size:sel.sizeId,hours:NSFLaborCurves.data.curves.simplist_klpad.map(p=>p.hours)}));
    assert.equal(result.brand,'simplist_klpad');assert.equal(result.size,'micro5sq');
    assert.ok(result.hours[2]>3);assert.equal(result.hours[2],result.hours[3]);assert.ok(after>before);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({before,after,...result}));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
