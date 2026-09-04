'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

test('real curve UI: drag, quote, persistence, shared admin draft and public isolation', { timeout: 180000 }, async () => {
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
    await page.locator('#laborCurveEditor select').selectOption('simplist');
    const before = await page.evaluate(() => NSFLaborCurves.data.curves.simplist[0].hours);
    const beforePrice = await price(page);
    const first = page.locator('#laborCurveEditor circle[data-point="0"]');
    await first.scrollIntoViewIfNeeded();
    const box = await first.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 25, { steps: 8 });
    await page.mouse.up();
    const after = await page.evaluate(() => NSFLaborCurves.data.curves.simplist[0].hours);
    const afterPrice = await price(page);
    assert.ok(after > before, `drag must increase hours: ${before} -> ${after}`);
    assert.ok(afterPrice > beforePrice, `quote must increase: ${beforePrice} -> ${afterPrice}`);
    assert.equal(await page.evaluate(() => NSFLaborCurves.draft), true);
    await page.locator('#laborCurveEditor').screenshot({ path: path.join(os.tmpdir(), 'nsf-labor-curve-desktop.png') });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitEditor(page);
    assert.equal(await page.evaluate(() => NSFLaborCurves.data.curves.simplist[0].hours), after);
    await selectQuote(page);
    assert.equal(await price(page), afterPrice);

    const admin = await context.newPage();
    admin.on('dialog', d => d.dismiss());
    await admin.goto(origin + '/order_estimate/admin.html#tab=size', { waitUntil: 'domcontentloaded' });
    await waitEditor(admin);
    assert.equal(await admin.evaluate(() => NSFLaborCurves.data.curves.simplist[0].hours), after);
    assert.equal(await admin.evaluate(() => NSFLaborCurves.draft), true);
    assert.ok(await admin.locator('#laborCurveEditor').getByRole('button', { name: '工数曲線をGitHubへ反映', exact: true }).isVisible());

    const publicPage = await context.newPage();
    publicPage.on('dialog', d => d.dismiss());
    await publicPage.goto(url, { waitUntil: 'domcontentloaded' });
    await publicPage.waitForFunction(() => !!window.NSFLaborCurves?.data);
    assert.equal(await publicPage.evaluate(() => NSFLaborCurves.data.curves.simplist[0].hours), before);
    assert.equal(await publicPage.evaluate(() => NSFLaborCurves.draft), false);
    assert.equal(await publicPage.locator('#laborCurveEditor').isVisible(), false);
    await selectQuote(publicPage);
    assert.equal(await price(publicPage), beforePrice);

    // Structure owns lining area; swapping to Krause must not double labor/materials.
    const ringCheck = await publicPage.evaluate(() => {
      sel.brandId = 'simplist_kl'; sel.sizeId = 'a5slim'; sel.ringId = null; prices.ring = 0;
      updateSummary();
      const plain = document.getElementById('totalDisplay').textContent;
      sel.ringId = RINGS.find(r => r.isKlause).id;
      updateSummary();
      return { plain, krause: document.getElementById('totalDisplay').textContent, dimensions: SIZES.find(s => s.id === 'a5slim') };
    });
    assert.equal(ringCheck.plain, ringCheck.krause, 'ring mechanism alone must not change leather/labor cost');
    assert.equal(ringCheck.dimensions.w, 110);
    assert.equal(ringCheck.dimensions.h, 210);
    const matrix = await admin.evaluate(() => sizeBasePriceRows.flatMap(s => brandPriceRows.map(b => {
      const cell = calcMatrixCell(s, b), krause = calcMatrixCell(s, b, { klause: true });
      const area = Number(s.refill_w) * Number(s.refill_h) / 10000 * Number(b.area_mult);
      return { hours: cell.totalHours, expected: NSFLaborCurveModel.evaluate(NSFLaborCurves.data.curves[b.brand_id], area), total: cell.total, krause: krause.total };
    })));
    assert.equal(matrix.length, 64);
    for (const cell of matrix) { assert.equal(cell.hours, cell.expected); assert.equal(cell.total, cell.krause); }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#laborCurveEditor').scrollIntoViewIfNeeded();
    const geometry = await page.locator('#laborCurveEditor svg').boundingBox();
    assert.ok(geometry.x >= 0 && geometry.x + geometry.width <= 391, 'mobile chart must fit viewport');
    await page.locator('#laborCurveEditor').screenshot({ path: path.join(os.tmpdir(), 'nsf-labor-curve-mobile.png') });
    assert.deepEqual(errors, [], 'estimate page must have no uncaught JavaScript errors');
    // Exercise publication without sending any request to GitHub.
    let saved = null;
    const remoteText = fs.readFileSync(path.join(root, 'order_estimate/labor-curves.json'), 'utf8');
    await admin.route('https://api.github.com/repos/**/contents/order_estimate/labor-curves.json*', async route => {
      if (route.request().method() === 'PUT') {
        saved = JSON.parse(Buffer.from(route.request().postDataJSON().content, 'base64').toString('utf8'));
        await route.fulfill({ json: { content: { sha: 'test-new-sha' } } });
      } else await route.fulfill({ json: { sha: 'test-sha', content: Buffer.from(remoteText).toString('base64') } });
    });
    await admin.evaluate(() => NSFGitHubToken.set('local-mock-token', false));
    admin.removeAllListeners('dialog'); admin.on('dialog', d => d.accept());
    await admin.getByRole('button', { name: '工数曲線をGitHubへ反映', exact: true }).click();
    await admin.waitForFunction(() => !NSFLaborCurves.draft);
    assert.equal(saved.curves.simplist[0].hours, after);
    assert.equal(await admin.evaluate(() => localStorage.getItem('nsfactory-labor-curves-draft-v1')), null);
    console.log(JSON.stringify({ beforeHours: before, afterHours: after, beforePrice, afterPrice, desktop: path.join(os.tmpdir(), 'nsf-labor-curve-desktop.png'), mobile: path.join(os.tmpdir(), 'nsf-labor-curve-mobile.png') }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
