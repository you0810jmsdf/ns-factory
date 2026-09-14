#!/usr/bin/env node
/**
 * N's pattern（型紙PDF）のページ生成
 *
 *   node tools/build_pattern_pages.js
 *
 * patterns/patterns-data.json から次を作る（どちらも自動生成・⛔ 手で編集しない）:
 *   patterns/index.html          … 型紙の一覧
 *   patterns/<slug>.html         … 型紙ごとの詳細（カード購入ボタン・振込の申込）
 *
 * - カード購入は assets/pdf-checkout.js（配信GAS refill_sales の商品シートで「販売中」の商品だけボタンを出す）。
 *   data の code は商品シートのコードと一致させる。価格の正本は商品シート（ボタン内の金額はGASの値で書き換わる）。
 * - 振込の申込メールの件名は「型紙購入のお問合せ」（JHCSページと同じ。GAS pattern_sales がこの件名に振込先を自動返信する）。
 * - デザインは N's pattern 規約（黒背景＋金 #c9a96e・英語 eyebrow＋日本語見出し）。
 * - ⛔ 旧 patterns/horseshoe-coin-case.html（¥2,800版・販売しない）はこのスクリプトの対象外。上書き・削除しない。
 * - 写真は data の photo（assets/ からの相対パス）。空なら「写真は準備中」の枠を出す。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'patterns');
const DATA = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'patterns-data.json'), 'utf8'));
const SITE = 'https://you0810jmsdf.github.io/ns-factory/';
const MAIL = 'you0810jmsdf@gmail.com';
const MAIL_SUBJECT = '型紙購入のお問合せ';   // ⛔ pattern_sales の SUBJECT_KEY と一致させる
const PROTECTED = new Set(['horseshoe-coin-case']);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function yen(n) { return Number(n).toLocaleString('ja-JP'); }
function mailHref(it) {
  const body = it.lesson + ' ' + it.title + ' 型紙PDF（' + yen(it.price) + '円）を購入したいです。\n\nお名前：\n';
  return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(MAIL_SUBJECT) + '&body=' + encodeURIComponent(body);
}

// ── 検査 ────────────────────────────────────────
const seen = new Set();
DATA.items.forEach(it => {
  ['code', 'slug', 'lesson', 'title', 'price', 'summary'].forEach(k => {
    if (it[k] === undefined || it[k] === '') throw new Error(`patterns-data.json: ${it.code || '?'} の ${k} が空です`);
  });
  if (!/^[a-z0-9-]+$/.test(it.slug)) throw new Error(`slug は英小文字・数字・ハイフンのみ: ${it.slug}`);
  if (PROTECTED.has(it.slug)) throw new Error(`slug ${it.slug} は旧ページと同名のため使えません`);
  if (seen.has(it.slug)) throw new Error(`slug が重複: ${it.slug}`);
  seen.add(it.slug);
});

// ── 共通部品 ────────────────────────────────────
const CSS = `
:root{
  --bg:#0b0b0c;--bg-2:#111113;--panel:#151517;--line:#2a2724;--line-2:#3a352f;
  --fg:#efeae2;--fg-2:#b9b1a5;--fg-3:#7d766c;
  --accent:#c9a96e;--accent-2:#a8884f;--accent-soft:rgba(201,169,110,.12);
  --radius:14px;
  font-family:-apple-system,'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{color-scheme:dark;scroll-behavior:smooth}
body{background:var(--bg);color:var(--fg);line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
/* nav */
.nav{position:sticky;top:0;z-index:10;background:rgba(11,11,12,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:16px;height:56px}
.brand{font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:.04em;color:var(--accent)}
.brand small{font-family:inherit;font-size:11px;letter-spacing:.2em;color:var(--fg-3);margin-left:8px;text-transform:uppercase}
.nav-spacer{flex:1}
.nav a.link{font-size:13px;color:var(--fg-2);padding:6px 8px}
.nav a.link:hover{color:var(--fg)}
/* type */
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
h1{font-size:clamp(28px,4.4vw,44px);font-weight:700;line-height:1.3;letter-spacing:-.01em}
h2{font-size:20px;font-weight:700;margin-bottom:14px}
.lead{color:var(--fg-2);font-size:15px;margin-top:14px;max-width:640px}
.sec{padding:44px 0;border-top:1px solid var(--line)}
.sec:first-of-type{border-top:none}
/* photo placeholder */
.ph{aspect-ratio:4/3;border:1px solid var(--line-2);border-radius:var(--radius);background:radial-gradient(ellipse at 50% 30%,var(--accent-soft),transparent 70%),var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden}
.ph b{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(20px,3vw,28px);color:var(--accent);letter-spacing:.04em}
.ph span{font-size:12px;color:var(--fg-3)}
.ph img{width:100%;height:100%;object-fit:cover}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 26px;border-radius:999px;font-size:15px;font-weight:700;transition:opacity .2s,background .2s}
.btn:hover{opacity:.88}
.btn-gold{background:var(--accent);color:#1a140c}
.btn-line{background:transparent;color:var(--fg);border:1px solid var(--line-2)}
.buy{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:22px}
.buy .note{font-size:12px;color:var(--fg-3);line-height:1.8}
.price{font-size:30px;font-weight:700;margin-top:18px}
.price small{font-size:13px;color:var(--fg-3);font-weight:400;margin-left:6px}
/* list */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;margin-top:26px}
.card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-2);overflow:hidden;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--accent-2);transform:translateY(-2px)}
.card .ph{border:none;border-radius:0;border-bottom:1px solid var(--line)}
.card-body{padding:16px 16px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.card-no{font-size:11px;color:var(--accent);letter-spacing:.12em}
.card-title{font-size:16px;font-weight:700}
.card-sum{font-size:12.5px;color:var(--fg-2);line-height:1.7;flex:1}
.card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.card-price{font-weight:700}
.card-more{font-size:12px;color:var(--accent)}
/* detail */
.hero{display:grid;grid-template-columns:1.05fr 1fr;gap:36px;align-items:center;padding:44px 0}
.facts{width:100%;border-collapse:collapse;font-size:14px}
.facts th,.facts td{border-bottom:1px solid var(--line);padding:12px 8px;text-align:left;vertical-align:top}
.facts th{color:var(--fg-3);font-weight:500;width:9em}
.muted{color:var(--fg-2);font-size:14px}
.muted a{color:var(--accent);border-bottom:1px solid var(--accent-2)}
.crumb{font-size:12px;color:var(--fg-3);padding-top:18px}
.crumb a:hover{color:var(--fg)}
/* footer */
.foot{border-top:1px solid var(--line);padding:30px 0 40px;color:var(--fg-3);font-size:12px}
.foot .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between}
.foot a{color:var(--fg-2)}
.foot a:hover{color:var(--fg)}
.brand,.nav a.link{white-space:nowrap}
@media (max-width:760px){
  .hero{grid-template-columns:1fr;gap:22px;padding:28px 0}
  .nav a.link.opt{display:none}
  .nav .wrap{gap:6px}
  .brand small{display:none}   /* 390px で「BY N'S FACTORY」とメニューが2行に折り返したため（2026-09-14） */
  .btn{width:100%}
  .buy{align-items:stretch}
}
`;

function head(title, desc, canonicalPath) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 自動生成: tools/build_pattern_pages.js（patterns/patterns-data.json から）。⛔ 手で編集しない -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonicalPath}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonicalPath}">
<!-- Google tag (gtag.js) -->
<script>
// 作家自身の端末では計測しない（管理画面「作品ページアクセスログ」から設定）。
try { if (localStorage.getItem('nsf_ga_optout') === '1') { window['ga-disable-G-ND1T7H067Y'] = true; } } catch (e) {}
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ND1T7H067Y"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ND1T7H067Y');
</script>
<style>${CSS}</style>
</head>
<body>
<nav class="nav"><div class="wrap">
  <a class="brand" href="index.html">N's pattern<small>by N's factory</small></a>
  <span class="nav-spacer"></span>
  <a class="link" href="index.html">型紙一覧</a>
  <a class="link opt" href="../JHCS.html">レザークラフト講座</a>
  <a class="link" href="../index.html">N's factory</a>
</div></nav>
`;
}

const FOOT = `
<footer class="foot"><div class="wrap">
  <div>N's pattern — N's factory（千葉県印西市 中司 祐樹）</div>
  <div style="display:flex;gap:18px;flex-wrap:wrap">
    <a href="index.html">型紙一覧</a>
    <a href="../JHCS.html">レザークラフト講座</a>
    <a href="../index.html">特定商取引法に基づく表記（トップページ下部）</a>
  </div>
</div></footer>
<script src="../assets/access-counter.js"></script>
<script src="../assets/pdf-checkout.js"></script>
</body>
</html>
`;

function photo(it) {
  return it.photo
    ? `<div class="ph"><img src="../assets/${esc(it.photo)}" alt="${esc(it.title)}" loading="lazy"></div>`
    : `<div class="ph" aria-label="写真は準備中です"><b>N's pattern</b><span>写真は準備中です</span></div>`;
}

function buyBlock(it) {
  const code = esc(it.code);
  return `<div class="buy">
      <!-- カード購入: pdf-checkout.js が商品シートで販売中のときだけ表示（テスト鍵の間は ?stripe_test=1 のときだけ） -->
      <a href="#" class="btn btn-gold" data-checkout="${code}" style="display:none"><span>カードで購入する（¥<span data-price>${yen(it.price)}</span>）</span></a><!-- 文字を1つの span に包む（.btn の gap が金額の前後に空きを作ったため・2026-09-14） -->
      <p class="note" data-checkout-on="${code}" style="display:none">Stripe の安全な決済画面に移動します。お支払い後すぐにダウンロードでき、同じリンクをメールでもお送りします。</p>
      <a href="${esc(mailHref(it))}" class="btn btn-line" data-checkout-on="${code}" style="display:none">銀行振込で申し込む（メール）</a>
      <!-- カード決済が使えないとき（鍵未設定・販売停止・通信失敗）はメール申込だけ -->
      <a href="${esc(mailHref(it))}" class="btn btn-gold" data-checkout-off="${code}">メールで購入を申し込む（銀行振込）</a>
      <p class="note" data-checkout-off="${code}">メールをいただければ振込先をご案内し、ご入金確認後に型紙PDFをお送りします。</p>
    </div>`;
}

// ── 詳細ページ ──────────────────────────────────
function detail(it) {
  const title = `${it.title} 型紙PDF — N's pattern | N's factory`;
  const desc = `${it.title}の型紙PDF（${yen(it.price)}円・税込）。${it.summary}`;
  return head(title, desc, `patterns/${it.slug}.html`) + `
<main class="wrap">
  <p class="crumb"><a href="index.html">型紙一覧</a> ／ ${esc(it.title)}</p>

  <section class="hero">
    ${photo(it)}
    <div>
      <p class="eyebrow">N's pattern — ${esc(it.en || 'Leather Craft Pattern')}</p>
      <h1>${esc(it.title)}<br>型紙 PDF</h1>
      <p class="lead">${esc(it.summary)}</p>
      <div class="price">¥${yen(it.price)}<small>税込</small></div>
      ${buyBlock(it)}
    </div>
  </section>

  <section class="sec">
    <p class="eyebrow">Details</p>
    <h2>内容とお届け</h2>
    <table class="facts">
      <tr><th>商品</th><td>${esc(it.title)} の型紙（PDFデータ）</td></tr>
      <tr><th>印刷</th><td>印刷するときは「実際のサイズ（100%）」を選んでください（拡大・縮小しない）。</td></tr>
      <tr><th>お届け</th><td>カード決済：お支払い後すぐに画面からダウンロードでき、同じリンクをメールでもお送りします。<br>銀行振込：ご入金を確認してから、メールでお送りします。</td></tr>
      <tr><th>講座</th><td>レザークラフト講座（JHCS）${esc(it.lesson)}で使う型紙です。<a href="../JHCS.html" style="color:var(--accent)">講座のご案内</a></td></tr>
    </table>
  </section>

  <section class="sec">
    <p class="eyebrow">Terms</p>
    <h2>ご利用について</h2>
    <p class="muted">PDFデータの転売・再配布はご遠慮ください。購入後のキャンセル・返金はデジタルコンテンツの性質上お受けできません。
    販売者情報は <a href="../index.html">特定商取引法に基づく表記（トップページ下部）</a> をご覧ください。</p>
  </section>

  <section class="sec" id="buy">
    <p class="eyebrow">Buy now</p>
    <h2>${esc(it.title)} 型紙PDF を手に入れる</h2>
    <div class="price">¥${yen(it.price)}<small>税込</small></div>
    ${buyBlock(it)}
  </section>
</main>
` + FOOT;
}

// ── 一覧ページ ──────────────────────────────────
function index() {
  const title = "N's pattern 型紙PDF | N's factory";
  const desc = 'レザークラフト講座で実際に使っている型紙を、PDFでお届けします。お支払い後すぐにダウンロードできます。';
  const cards = DATA.items.map(it => `
    <a class="card" href="${esc(it.slug)}.html">
      ${photo(it)}
      <div class="card-body">
        <div class="card-no">${esc(it.lesson)}</div>
        <div class="card-title">${esc(it.title)}</div>
        <div class="card-sum">${esc(it.summary)}</div>
        <div class="card-foot"><span class="card-price">¥${yen(it.price)}</span><span class="card-more">詳しく見る →</span></div>
      </div>
    </a>`).join('');
  return head(title, desc, 'patterns/') + `
<main class="wrap">
  <section class="sec" style="padding-top:56px">
    <p class="eyebrow">N's pattern — Leather Craft Pattern PDF</p>
    <h1>型紙 PDF</h1>
    <p class="lead">${esc(desc)}銀行振込でもお求めいただけます。</p>
    <div class="grid">${cards}
    </div>
  </section>
</main>
` + FOOT;
}

// ── 書き出し ────────────────────────────────────
const written = [];
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), index(), 'utf8');
written.push('patterns/index.html');
DATA.items.forEach(it => {
  fs.writeFileSync(path.join(OUT_DIR, it.slug + '.html'), detail(it), 'utf8');
  written.push('patterns/' + it.slug + '.html');
});
console.log('生成しました（' + written.length + 'ページ）:\n  ' + written.join('\n  '));
