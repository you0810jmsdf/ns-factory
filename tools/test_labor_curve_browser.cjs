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

    // Regression: curve selection must drive the quote even from an unselected structure/A5 Slim.
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.evaluate(() => { sel.brandId = null; sel.brand = null; sel.sizeId = 'a5slim'; sel.size = 'A5スリム'; updateSummary(); });
    await page.locator('#laborCurveEditor select').selectOption('simplist_kl');
    assert.equal(await page.evaluate(() => sel.brandId), 'simplist_kl');
    assert.deepEqual(await page.locator('#laborCurveEditor [data-point-label]').allTextContents(), await page.evaluate(() => NSFLaborCurves.data.curves.simplist_kl.map(p => p.label)));
    await page.locator('#laborCurveEditor svg').screenshot({path: path.join(os.tmpdir(), 'nsf-curve-point-labels.png')});
    const a5 = page.locator('#laborCurveEditor circle[data-point="7"]');
    await a5.scrollIntoViewIfNeeded(); const a5box = await a5.boundingBox();
    await page.mouse.move(a5box.x + 7, a5box.y + 7); await page.mouse.down();
    assert.equal(await page.evaluate(() => sel.sizeId), 'a5');
    const a5Price = await price(page);
    await page.mouse.move(a5box.x + 7, a5box.y - 20, { steps: 6 }); await page.mouse.up();
    assert.ok(await price(page) > a5Price, 'moving A5 up must increase the A5 quote');
    assert.ok((await page.locator('#laborCurveCurrent').innerText()).includes('A5'));

    const settingsDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '設定をダウンロード', exact: true }).click();
    const settingsDownload = await settingsDownloadPromise;
    const settingsFilename = settingsDownload.suggestedFilename();
    assert.match(settingsFilename, /^labor-curves_v2026\.09\.05\.2_[0-9a-f]{8}\.json$/);
    assert.equal(settingsFilename, await page.evaluate(() => NSFLaborCurves.settingsFilename()));
    assert.ok((await page.locator('#printDetail .quote-settings-file').textContent()).includes(settingsFilename));
    const settingsPath = path.join(os.tmpdir(), settingsFilename);
    await settingsDownload.saveAs(settingsPath);
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), await page.evaluate(() => NSFLaborCurves.data));
    await page.getByLabel('工数設定ファイルを読み込む').setInputFiles(settingsPath);
    assert.equal(await page.evaluate(() => NSFLaborCurves.settingsFilename()), settingsFilename);
    page.removeAllListeners('dialog'); page.on('dialog', d => d.accept('試験見積 <確認>'));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '見積書＋使用カーブを保存', exact: true }).click();
    const download = await downloadPromise;
    const archivePath = path.join(os.tmpdir(), 'nsf-quote-archive-test.html');
    await download.saveAs(archivePath);
    const archiveHtml = fs.readFileSync(archivePath, 'utf8');
    const snapshot = JSON.parse(archiveHtml.match(/id="quote-snapshot">([\s\S]*?)<\/script>/)[1]);
    assert.equal(snapshot.settingsFilename, settingsFilename);
    assert.equal(snapshot.selection.brandId, 'simplist_kl'); assert.equal(snapshot.selection.sizeId, 'a5');
    assert.equal(snapshot.calculation.total, await price(page));
    assert.equal(snapshot.curve[7].hours, snapshot.calculation.totalHours);
    assert.equal(snapshot.coefficients.length, 7);
    assert.ok(archiveHtml.includes('試験見積 &lt;確認&gt;'));
    const archivePage = await context.newPage(); await archivePage.setContent(archiveHtml);
    await archivePage.emulateMedia({ media: 'print' });
    assert.equal(await archivePage.locator('.internal').isVisible(), false);
    assert.equal(await archivePage.locator('h1').isVisible(), true);
    assert.equal(await archivePage.locator('.quote-settings-file').isVisible(), true);
    assert.ok((await archivePage.locator('.quote-settings-file').textContent()).includes(settingsFilename));
    await page.locator('#laborCurveEditor circle[data-point="7"]').press('ArrowUp');
    assert.equal(JSON.parse(await archivePage.locator('#quote-snapshot').textContent()).curve[7].hours, snapshot.curve[7].hours);
    assert.notEqual(await page.evaluate(() => NSFLaborCurves.settingsFilename()), settingsFilename);
    await page.evaluate(() => { refreshSidebarColorPreview(); });
    assert.equal(await page.locator('#sidebarColorPreview').isVisible(), false);
    assert.equal(await page.locator('#inlineColorPreview').isVisible(), false);
    assert.equal(await page.locator('#sidebarColorFrame').getAttribute('src'), null);
    await archivePage.emulateMedia({ media: 'screen' });
    await archivePage.screenshot({ path: path.join(os.tmpdir(), 'nsf-quote-archive-preview.png'), fullPage: true });
    const fulfillmentChecks = await page.evaluate(() => {
      sel.brandId='simplist_kl'; sel.brand='Simplist+クラウゼ'; sel.sizeId='mini6'; sel.size='mini 6';
      sel.leatherId='numer_25'; sel.leather='生成りヌメ革'; prices.leather=160; sel.liningId=null; prices.lining=null;
      sel.ringId='r15'; sel.ring='15mm'; sel.metalId='silver'; sel.metal='シルバー'; prices.ring=1000; prices.metal=0;
      sel.stitchColorId=null; leatherStockPctMap.numer_25=100;
      document.getElementById('qty').value=1; if(document.getElementById('discountRate')) document.getElementById('discountRate').value=0;
      const row = getSelectedRingRow(); row.stock_status='in_stock'; row.stock_qty=10; row.hard_to_source='FALSE';
      LINING_SKIVING_FEE=0; RING_ORDER_SHIPPING_FEE=500; updateSummary(); const base=window._quoteSnapshot.calculation.total;
      LINING_SKIVING_FEE=3000; updateSummary(); const same=window._quoteSnapshot.calculation.total;
      const ready=getFulfillment().lead;
      row.stock_status='out_of_stock'; row.stock_qty=0; updateSummary(); const order=window._quoteSnapshot.calculation.total;
      const lead=getFulfillment().lead, print=document.getElementById('printDetail').textContent, text=buildEstText();
      document.getElementById('qty').value=2; updateSummary(); const two=getFulfillment();
      row.hard_to_source='TRUE'; buildMetalGrid(); const hard=!!document.querySelector('#metalGrid [data-id="silver"][aria-disabled="true"]');
      const hardLead=getFulfillment().lead;
      row.stock_status='in_stock';row.stock_qty=10;buildMetalGrid();const stockedHard=!document.querySelector('#metalGrid [data-id="silver"][aria-disabled="true"]');
      sel.brandId='simplist'; updateSummary(); const noLining=getFulfillment().skiving;
      sel.brandId='simplist_kl';sel.liningId='ska08';prices.lining=160;updateSummary();const different=getFulfillment().skiving;
      row.hard_to_source='FALSE';row.stock_qty=0;row.stock_status='out_of_stock';buildRingGrids('mini6');buildMetalGrid();
      const orderSelectable=!!document.querySelector('#ringNormalGrid [data-id="r15"]') && !!document.querySelector('#metalGrid [data-id="silver"]:not([aria-disabled="true"])');
      return {base,same,order,ready,lead,print,text,two,hard,hardLead,stockedHard,noLining,different,orderSelectable};
    });
    assert.equal(fulfillmentChecks.same-fulfillmentChecks.base,3000);
    assert.equal(fulfillmentChecks.order-fulfillmentChecks.same,500);
    assert.match(fulfillmentChecks.ready,/7日/);assert.match(fulfillmentChecks.lead,/2〜4週間/);
    assert.match(fulfillmentChecks.print,/革漉き加工料/);assert.match(fulfillmentChecks.print,/取寄せ送料/);assert.match(fulfillmentChecks.text,/2〜4週間/);
    assert.equal(fulfillmentChecks.two.skiving,6000);assert.equal(fulfillmentChecks.two.ringShipping,500);
    assert.ok(fulfillmentChecks.hard);assert.ok(fulfillmentChecks.stockedHard);assert.match(fulfillmentChecks.hardLead,/個別/);
    assert.equal(fulfillmentChecks.noLining,0);assert.equal(fulfillmentChecks.different,0);assert.ok(fulfillmentChecks.orderSelectable);
    console.log(JSON.stringify({ beforeHours: before, afterHours: after, beforePrice, afterPrice, desktop: path.join(os.tmpdir(), 'nsf-labor-curve-desktop.png'), mobile: path.join(os.tmpdir(), 'nsf-labor-curve-mobile.png') }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
