const { chromium } = require('playwright');

const OUT_DIR = process.argv[2];
const URL = 'http://localhost:8099/works.html';
const W = 1080, H = 1920; // 9:16 vertical for SNS

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Force all images to load eagerly (defeat lazy-loading) and wait for them
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.loading = 'eager';
      if (img.dataset.src) img.src = img.dataset.src;
    });
  });
  // Warm-up: quick full scroll to trigger any lazy loads, then back to top
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  // Wait for all images to finish decoding
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve()
      : new Promise(res => { img.onload = img.onerror = res; })));
  });
  await page.waitForTimeout(1200); // hold on hero at start

  // Smooth vertical scroll to the bottom
  await page.evaluate(async () => {
    const maxY = () => document.body.scrollHeight - window.innerHeight;
    const step = 6;      // px per frame
    const frameMs = 16;  // ~60fps
    let y = 0;
    while (y < maxY()) {
      y = Math.min(y + step, maxY());
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, frameMs));
    }
  });
  await page.waitForTimeout(1200); // hold on footer

  await context.close(); // finalizes the video file
  await browser.close();

  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
