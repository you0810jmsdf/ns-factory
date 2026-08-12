#!/usr/bin/env node
/**
 * 作品ごとの「SNS案内ページ」works/<商品ID>.html を生成する。
 *
 * 背景（2026-08-12 事業主要望）:
 *   SNSで作品集へ誘導しても約650件から目当ての1点を探すのは大変。
 *   さらに works.html には OGP が無く、URLを貼っても写真プレビューが出ない。
 *   → 作品ごとに OGP 付きの軽量ページを置き、開いたら works.html?id=... へ送る。
 *
 * このページ自体は「SNSに貼るための入口」であり、閲覧の本体ではない。
 * OGPを読むのはSNSのクローラなので、中身は最小限でよい。
 *
 * ⛔ 公開してよいのは商品マスター由来のデータだけ。顧客名などを混ぜないこと
 *    （旧 mini6-photos.json がお客様のお名前をキーにしていた事故がある）。
 *
 * 使い方: node tools/build_work_pages.js
 *   works-data.json（build_works_data.js が生成）を入力にする。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'works-data.json');
const OUT_DIR = path.join(ROOT, 'works');
const SITE = 'https://you0810jmsdf.github.io/ns-factory';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** OGPのdescriptionは長すぎると各SNSで切られるので詰める */
function buildDescription(w) {
  const specs = [w.category, w.material, w.color, w.size].filter(Boolean).join(' / ');
  const price = Number(w.price) > 0 ? `${Number(w.price).toLocaleString('ja-JP')}円` : '';
  const head = [specs, price].filter(Boolean).join(' ');
  const body = String(w.shortDesc || w.longDesc || '').replace(/\s+/g, ' ').trim();
  const text = [head, body].filter(Boolean).join(' — ');
  return text.length > 110 ? text.slice(0, 109) + '…' : text;
}

/**
 * 商品IDはファイル名になるので、想定形式（NF+英数字・アンダースコア）だけ通す。
 * パス区切りや「..」が混じったIDでディレクトリ外に書き出すのを防ぐ。
 */
function isSafeId(id) {
  return /^[A-Za-z0-9_-]{3,60}$/.test(String(id || ''));
}

/**
 * OGP用に画像を大きめのサイズへ揃える。
 * 商品マスター由来のURLは sz=w800 と w1200 が混在しており、
 * 小さいままだとSNSのカードが粗くなる（Xの大判カードは1200px推奨）。
 * Driveのサムネイルは sz を変えても同じ画像を返す（クローラからの取得も実測済み）。
 */
function ogImage(mainPhoto) {
  const url = String(mainPhoto || '');
  if (!url) return `${SITE}/assets/ogp-default.png`;
  return url.replace(/([?&]sz=)w\d+/, '$1w1200');
}

function buildHtml(w) {
  const id = String(w.id);
  const title = `${w.name || id} | N's factory 作品集`;
  const desc = buildDescription(w);
  const image = ogImage(w.mainPhoto);
  const canonical = `${SITE}/works/${id}.html`;
  const target = `${SITE}/works.html?id=${encodeURIComponent(id)}`;

  // 転送は meta refresh（0秒）と location.replace の二段構え。
  // replace を使うのは、戻るボタンでこの中継ページに戻ってループしないようにするため。
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="N's factory">
<meta property="og:title" content="${esc(w.name || id)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(w.name || id)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#F5EFE6;color:#3A2410;font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;text-align:center}
.box{padding:32px 24px}.name{font-size:16px;font-weight:700;margin-bottom:14px}
a{display:inline-block;background:#5C3D2E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px}
</style>
</head>
<body>
<div class="box">
  <div class="name">${esc(w.name || id)}</div>
  <p>作品ページへ移動しています…</p>
  <a href="${esc(target)}">開かない場合はこちら</a>
</div>
<script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('works-data.json がありません。先に build_works_data.js を実行してください。');
    process.exit(1);
  }
  const works = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  if (!Array.isArray(works) || !works.length) {
    console.error('works-data.json が空です。生成を中止します（既存ページは残します）。');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const valid = works.filter((w) => isSafeId(w.id));
  const skipped = works.length - valid.length;
  const keep = new Set(valid.map((w) => `${w.id}.html`));

  let written = 0;
  valid.forEach((w) => {
    const file = path.join(OUT_DIR, `${w.id}.html`);
    const html = buildHtml(w);
    // 内容が同じならファイルを触らない（gitの差分と再デプロイを無駄に増やさない）
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === html) return;
    fs.writeFileSync(file, html);
    written++;
  });

  // 掲載を取り下げた作品のページは消す（SNSに貼った旧URLは404になるが、
  // 削除済み商品の詳細が開けてしまうよりよい）
  let removed = 0;
  fs.readdirSync(OUT_DIR).forEach((f) => {
    if (f.endsWith('.html') && !keep.has(f)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      removed++;
    }
  });

  console.log(`作品ページ: ${valid.length}件（更新 ${written} / 削除 ${removed}${skipped ? ` / ID不正でスキップ ${skipped}` : ''}）`);
}

main();
