#!/usr/bin/env node
/**
 * N's refill（システム手帳リフィルPDF）シリーズのページ生成
 *
 *   node tools/build_refill_pages.js
 *
 * refill-pdf/refills-data.json から次を作る（⛔ どれも自動生成・手で編集しない）:
 *   refill-pdf/index.html        … シリーズ一覧（商品ごとに「見出し画像＋見出し」のカード）
 *   refill-pdf/<slug>.html       … 商品ごとの販売ページ（見出し画像・特徴・判型・プレビュー・手順・仕様・購入）
 *   tools/index.html             … <!-- REFILL_PRODUCTS:start/end --> の間の商品行だけ差し替え
 *   sitemap.xml                  … <!-- REFILL:start/end --> の間の <url> だけ差し替え
 *
 * 決まりごと（2026-09-16 事業主決定「リフィルは色んなパターンで出す。見出しにイメージを必ず添付する構成に」）:
 * - 商品ごとに hero.img（見出し画像）が必須。ファイルが無い・空なら生成を止める（画像なしの商品を公開しない）。
 * - 画像は assets/ からの相対パス（例 refill-pdf/monthly-undated/spread.jpg）。商品ごとにフォルダを分ける。
 * - code は配信GAS refill_sales の商品シートのコードと一致させる。価格の正本は商品シート（ボタンの金額はGASの値で書き換わる）。
 * - カード購入は assets/pdf-checkout.js（販売中のときだけカードボタン、使えない間はメール申込）。
 * - 振込の申込メール件名は「リフィルPDF購入のお問合せ」。
 * - status: "sale"（販売中）／"soon"（準備中：一覧に画像と見出しだけ出し、ページは作らない）。
 * - デザインは旧 monthly-undated.html（白地＋ブラウン #A0785A・N's pattern と同じトークン）を引き継ぐ。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'refill-pdf');
const DATA = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'refills-data.json'), 'utf8'));
const SITE = 'https://you0810jmsdf.github.io/ns-factory/';
const MAIL = 'you0810jmsdf@gmail.com';
const MAIL_SUBJECT = 'リフィルPDF購入のお問合せ';
const SERIES = DATA.series || {};
const SIZES = DATA.sizes || {};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function yen(n) { return Number(n).toLocaleString('ja-JP'); }
function assetExists(rel) { return !!rel && fs.existsSync(path.join(ROOT, 'assets', rel)); }
function today() { return new Date().toISOString().slice(0, 10); }

// ── 検査 ────────────────────────────────────────
const seen = new Set();
DATA.items.forEach(it => {
  const id = it.code || it.slug || '?';
  ['code', 'slug', 'title', 'price', 'summary', 'status'].forEach(k => {
    if (it[k] === undefined || it[k] === '') throw new Error(`refills-data.json: ${id} の ${k} が空です`);
  });
  if (!/^[a-z0-9-]+$/.test(it.slug)) throw new Error(`slug は英小文字・数字・ハイフンのみ: ${it.slug}`);
  if (seen.has(it.slug)) throw new Error(`slug が重複: ${it.slug}`);
  seen.add(it.slug);
  if (!['sale', 'soon'].includes(it.status)) throw new Error(`${id}: status は sale か soon: ${it.status}`);
  // 見出し画像は必須（事業主決定）
  if (!it.hero || !it.hero.img) throw new Error(`${id}: hero.img（見出し画像）がありません。画像なしの商品は公開しません`);
  if (!assetExists(it.hero.img)) throw new Error(`${id}: 見出し画像が見つかりません: assets/${it.hero.img}`);
  if (!it.hero.alt) throw new Error(`${id}: hero.alt（見出し画像の説明）が空です`);
  (it.previews || []).forEach(p => { if (!assetExists(p.img)) throw new Error(`${id}: プレビュー画像が見つかりません: assets/${p.img}`); });
  (it.steps || []).forEach(s => { if (s.img && !assetExists(s.img)) throw new Error(`${id}: 手順画像が見つかりません: assets/${s.img}`); });
  (it.sizes || []).forEach(k => { if (!SIZES[k]) throw new Error(`${id}: sizes の ${k} が sizes 表にありません`); });
});

// ── 共通部品 ────────────────────────────────────
const CSS = `
:root {
  --color-primary:#1D1D1F;--color-accent:#A0785A;--color-accent-light:#F3ECE4;--color-accent-dark:#7A5540;
  --color-bg:#FFFFFF;--color-bg-sub:#F5F5F7;--color-border:#E8E8ED;--color-text:#1D1D1F;--color-text-sub:#636366;--color-text-mute:#AEAEB2;
  --radius-sm:8px;--radius-md:12px;--radius-full:9999px;--transition-base:.2s ease;
  font-family:-apple-system,'SF Pro Display','SF Pro Text','Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--color-bg);color:var(--color-text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
/* nav */
.nav{position:sticky;top:0;z-index:100;height:56px;background:rgba(255,255,255,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--color-border);display:flex;align-items:center;padding:0 24px;gap:16px}
.nav-brand{display:flex;align-items:center;gap:10px;flex-shrink:0}
.nav-brand img{height:40px;width:auto;display:block}
.nav-series{font-size:15px;font-weight:700;letter-spacing:.02em;color:var(--color-accent-dark);white-space:nowrap}
.nav-series small{font-size:11px;font-weight:500;color:var(--color-text-mute);margin-left:6px;letter-spacing:.12em;text-transform:uppercase}
.nav-spacer{flex:1}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{font-size:13px;color:var(--color-text-sub);padding:6px 10px;border-radius:var(--radius-sm);transition:background var(--transition-base),color var(--transition-base);white-space:nowrap}
.nav-link:hover{background:var(--color-bg-sub);color:var(--color-text)}
.nav-link.active{color:var(--color-accent);font-weight:600}
.nav-cta{font-size:13px;font-weight:600;padding:7px 14px;border-radius:var(--radius-full);background:var(--color-accent);color:#fff;transition:opacity var(--transition-base);white-space:nowrap}
.nav-cta:hover{opacity:.85}
/* hero（商品ページ） */
.hero{position:relative;min-height:520px;background:#111;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;align-items:stretch}
.hero-content{position:relative;z-index:2;padding:80px 56px 80px 64px;display:flex;flex-direction:column;justify-content:center}
.hero-eyebrow{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-accent);margin-bottom:16px}
.hero-title{font-size:clamp(28px,3.5vw,46px);font-weight:700;line-height:1.25;letter-spacing:-.03em;color:#fff;margin-bottom:24px}
.hero-title .sub{font-size:.6em;font-weight:600;opacity:.85}
.hero-desc{font-size:15px;line-height:1.75;color:rgba(255,255,255,.65);max-width:400px;margin-bottom:36px}
.hero-price{font-size:24px;font-weight:700;color:#fff;margin-bottom:28px;letter-spacing:-.01em}
.hero-price small{font-size:13px;font-weight:400;opacity:.6;margin-left:4px}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px}
.btn{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;padding:13px 24px;border-radius:var(--radius-sm);transition:opacity var(--transition-base),transform var(--transition-base)}
.btn:hover{opacity:.85;transform:translateY(-1px)}
.btn-primary{background:var(--color-accent);color:#fff}
.btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}
.btn-ghost:hover{background:rgba(255,255,255,.18)}
.hero-photo{position:relative;overflow:hidden;background:#fff}
.hero-photo img{width:100%;height:100%;min-height:520px;object-fit:cover;object-position:center top}
/* series hero（一覧） */
.series-hero{background:#111;color:#fff;padding:72px 24px 56px}
.series-hero-inner{max-width:960px;margin:0 auto}
.series-hero h1{font-size:clamp(28px,3.5vw,44px);font-weight:700;line-height:1.25;letter-spacing:-.03em;margin-bottom:18px}
.series-hero p{font-size:15px;line-height:1.8;color:rgba(255,255,255,.65);max-width:600px}
/* section */
.section{padding:72px 24px}
.section-inner{max-width:960px;margin:0 auto}
.section-header{margin-bottom:40px}
.section-label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--color-accent);margin-bottom:8px}
.section-title{font-size:clamp(20px,2.5vw,26px);font-weight:700;letter-spacing:-.02em;line-height:1.3}
.section-divider{border:none;border-top:1px solid var(--color-border);margin:0}
.lead{font-size:15px;line-height:1.85;color:var(--color-text-sub);max-width:680px;margin-top:-16px}
.note{font-size:13px;color:var(--color-text-sub);margin-top:16px;line-height:1.8}
.note a,.lead a{color:var(--color-accent)}
/* 商品カード（一覧） */
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-top:8px}
.product-card{display:flex;flex-direction:column;background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;transition:border-color var(--transition-base),transform var(--transition-base),box-shadow var(--transition-base)}
a.product-card:hover{border-color:var(--color-accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
.product-img{aspect-ratio:4/3;background:#fff;border-bottom:1px solid var(--color-border);overflow:hidden}
.product-img img{width:100%;height:100%;object-fit:cover;object-position:center top}
.product-body{padding:18px 18px 20px;display:flex;flex-direction:column;gap:6px;flex:1}
.product-kicker{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--color-accent)}
.product-title{font-size:17px;font-weight:700;line-height:1.35}
.product-sub{font-size:13px;color:var(--color-accent-dark);font-weight:600}
.product-sum{font-size:13px;color:var(--color-text-sub);line-height:1.7;flex:1}
.product-foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.product-price{font-size:18px;font-weight:700}
.product-price small{font-size:12px;font-weight:400;color:var(--color-text-sub);margin-left:4px}
.product-more{font-size:13px;color:var(--color-accent);font-weight:600}
.product-card.soon{opacity:.85}
.product-card.soon .product-more{color:var(--color-text-mute)}
/* 特徴カード */
.contents-box{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:32px}
.contents-card{background:var(--color-bg-sub);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px}
.contents-card-icon{font-size:28px;margin-bottom:12px}
.contents-card-title{font-size:15px;font-weight:700;margin-bottom:6px}
.contents-card-desc{font-size:13px;color:var(--color-text-sub);line-height:1.7}
/* 仕様表 */
.spec-table{width:100%;border-collapse:collapse;margin-top:24px}
.spec-table th,.spec-table td{padding:14px 16px;border-bottom:1px solid var(--color-border);font-size:14px;text-align:left}
.spec-table th{width:38%;color:var(--color-text-sub);font-weight:500;background:var(--color-bg-sub)}
.spec-table td{font-weight:600}
.badge{display:inline-flex;padding:4px 10px;border-radius:var(--radius-full);background:var(--color-accent-light);color:var(--color-accent-dark);font-size:12px;font-weight:600}
/* 判型 */
.size-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}
.size-card{background:var(--color-bg-sub);border:1px solid var(--color-accent);border-radius:var(--radius-md);padding:20px;text-align:center}
.size-name{font-size:15px;font-weight:700;margin-bottom:4px}
.size-mm{font-size:13px;color:var(--color-text-sub)}
.size-note{font-size:12px;color:var(--color-text-mute);margin-top:6px}
/* プレビュー */
.preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px}
.preview-card{display:block;background:var(--color-bg-sub);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;transition:border-color var(--transition-base),transform var(--transition-base)}
.preview-card:hover{border-color:var(--color-accent);transform:translateY(-2px)}
.preview-card img{width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center top;display:block;background:#fff}
.preview-name{display:block;padding:10px 14px;font-size:14px;font-weight:700}
.preview-name small{font-weight:400;color:var(--color-text-sub);margin-left:6px;font-size:12px}
/* 手順 */
.step-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:32px}
.step-photo{aspect-ratio:4/3;border-radius:var(--radius-md);overflow:hidden;background:var(--color-bg-sub);border:1px solid var(--color-border);margin-bottom:12px}
.step-photo img{width:100%;height:100%;object-fit:cover;object-position:center top}
.step-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-accent);margin-bottom:4px}
.step-title{font-size:15px;font-weight:700;margin-bottom:4px}
.step-caption{font-size:13px;line-height:1.7;color:var(--color-text-sub)}
/* ライセンス */
.license-box{background:var(--color-bg-sub);border:1px solid var(--color-border);border-left:3px solid var(--color-accent);border-radius:var(--radius-md);padding:24px 28px;margin-top:24px}
.license-box h3{font-size:15px;font-weight:700;margin-bottom:12px}
.license-list{list-style:none;display:flex;flex-direction:column;gap:8px}
.license-list li{font-size:14px;line-height:1.6;padding-left:20px;position:relative}
.license-list li::before{content:'✓';position:absolute;left:0;color:var(--color-accent);font-weight:700}
.license-list li.no::before{content:'✕';color:#FF3B30}
/* CTA */
.cta-section{background:var(--color-primary);padding:72px 24px;text-align:center}
.cta-inner{max-width:600px;margin:0 auto}
.cta-label{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-accent);margin-bottom:16px}
.cta-title{font-size:clamp(22px,3vw,30px);font-weight:700;color:#fff;margin-bottom:14px;letter-spacing:-.02em}
.cta-desc{font-size:14px;color:rgba(255,255,255,.6);margin-bottom:32px;line-height:1.75}
.cta-price-block{margin-bottom:32px}
.cta-price{font-size:32px;font-weight:700;color:#fff;letter-spacing:-.02em}
.cta-price small{font-size:14px;font-weight:400;opacity:.6;margin-left:4px}
.cta-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.cta-actions p{width:100%}
.btn-large{font-size:16px;padding:15px 32px;border-radius:var(--radius-sm)}
.btn-outline-w{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}
/* footer */
.footer{background:var(--color-primary);color:rgba(255,255,255,.6);padding:48px 24px 32px}
.footer-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:1fr auto;gap:32px;align-items:start}
.footer-brand{font-size:17px;font-weight:700;color:#fff;margin-bottom:8px}
.footer-tagline{font-size:13px;line-height:1.6}
.footer-links{display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.footer-link{font-size:13px;color:rgba(255,255,255,.55);transition:color var(--transition-base)}
.footer-link:hover{color:#fff}
.footer-bottom{max-width:960px;margin:24px auto 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.3);flex-wrap:wrap;gap:8px}
.crumb{font-size:12px;color:var(--color-text-mute);padding:14px 24px;max-width:1008px;margin:0 auto}
.crumb a:hover{color:var(--color-text)}
/* responsive */
@media(max-width:768px){
  .hero{grid-template-columns:1fr}
  .hero-photo img{min-height:0;max-height:320px}
  .hero-content{padding:48px 24px}
  .size-grid{grid-template-columns:repeat(2,1fr)}
  .step-grid{grid-template-columns:1fr;max-width:420px}
  .preview-grid{grid-template-columns:repeat(2,1fr)}
  .nav-links{display:none}
  .nav-series small{display:none}
  .footer-inner{grid-template-columns:1fr}
  .footer-links{align-items:flex-start}
}
@media(max-width:480px){
  .section{padding:52px 16px}
  .contents-box{grid-template-columns:1fr}
  .preview-grid{grid-template-columns:1fr}
  .series-hero{padding:52px 16px 40px}
  .nav{padding:0 14px}
}
`;

function head(title, desc, canonicalPath, ogImage, extraHead) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 自動生成: tools/build_refill_pages.js（refill-pdf/refills-data.json から）。⛔ 手で編集しない。
     ⛔ このリポジトリは public。販売するPDFの実体をリポジトリ内に置かない（受け渡しは Stripe 決済確認 → GAS が Drive の限定リンクを発行）。 -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonicalPath}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonicalPath}">
${ogImage ? `<meta property="og:image" content="${SITE}assets/${esc(ogImage)}">` : ''}
${extraHead || ''}
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
`;
}

function nav(active, ctaHref) {
  return `<nav class="nav">
  <a href="../index.html" class="nav-brand"><img src="../assets/logo.png" alt="N's factory"></a>
  <a href="index.html" class="nav-series">${esc(SERIES.name || "N's refill")}<small>${esc(SERIES.en || 'Planner Refill PDF')}</small></a>
  <span class="nav-spacer"></span>
  <div class="nav-links">
    <a href="index.html" class="nav-link${active === 'index' ? ' active' : ''}">リフィル一覧</a>
    <a href="../tools/" class="nav-link">無料の印刷ツール</a>
    <a href="../patterns/" class="nav-link">N's pattern</a>
    <a href="../works.html" class="nav-link">作品紹介</a>
  </div>
  <a href="${esc(ctaHref)}" class="nav-cta">${active === 'index' ? 'N\'s factory' : '購入する'}</a>
</nav>
`;
}

const FOOT = `
<footer class="footer">
  <div class="footer-inner">
    <div>
      <div class="footer-brand">N's factory</div>
      <p class="footer-tagline">世界にひとつだけのオリジナルを<br>千葉県印西市 中司 祐樹</p>
    </div>
    <div class="footer-links">
      <a href="index.html" class="footer-link">N's refill 一覧</a>
      <a href="../tools/" class="footer-link">無料の印刷ツール</a>
      <a href="../index.html" class="footer-link">N's factory トップ</a>
      <a href="../terms.html" class="footer-link">デジタルデータの利用条件</a>
      <a href="https://lin.ee/qsmtY2N" class="footer-link" target="_blank" rel="noopener">LINE 公式アカウント</a>
      <a href="mailto:${MAIL}" class="footer-link">メール</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2025–2026 N's factory 中司 祐樹</span>
    <span>個人利用ライセンス / データ転売不可 / 印刷物の販売不可</span>
  </div>
</footer>

<script src="../assets/access-counter.js"></script>
<script src="../assets/pdf-checkout.js"></script>
<!-- 様式の改善意見（2026-09-17 事業主指示）: ツールの「改善要望」と同じ部品・同じ送り先（GAS→事業主メール・写真添付可）。文言だけ data-* で差し替え -->
<script src="../assets/bug-report.js" data-label="💬 様式の改善意見" data-title="様式の改善意見・不具合を送る" data-placeholder="例：メモ欄をもう少し広く／曜日は日本語がいい／◯◯判型の△△リフィルがほしい"></script>
</body>
</html>
`;

function mailBody(it) {
  return (it.mail && it.mail.body) || `${it.title}${it.subtitle ? ' ' + it.subtitle : ''}（${yen(it.price)}円）を購入したいです。\n\nお名前：\n`;
}
function mailHrefJs(it) {
  // ページ内スクリプトで href を組む（旧ページと同じ作法・mailto をHTMLに直書きしない）
  return `<script>
      (function () {
        var href = 'mailto:${MAIL}?subject=' + encodeURIComponent(${JSON.stringify(MAIL_SUBJECT)}) + '&body=' + encodeURIComponent(${JSON.stringify(mailBody(it))});
        Array.prototype.forEach.call(document.querySelectorAll('.js-refill-mail'), function (a) { a.href = href; });
      })();
      </script>`;
}

// ── 商品ページの各セクション ───────────────────
function heroSection(it) {
  const price = `¥${yen(it.price)} <small>${esc(it.priceNote || '税込')}</small>`;
  return `<section class="hero">
  <div class="hero-content">
    <p class="hero-eyebrow">${esc(SERIES.name || "N's refill")} — ${esc(it.en || 'Planner Refill PDF')}</p>
    <h1 class="hero-title">${it.titleHtml || esc(it.title)}${it.subtitle ? `<br><span class="sub">${esc(it.subtitle)}</span>` : ''}</h1>
    <p class="hero-desc">${esc(it.lead || it.summary)}</p>
    <div class="hero-price">${price}</div>
    <div class="hero-actions">
      <a href="#buy" class="btn btn-primary">購入する（¥${yen(it.price)}）</a>
      <a href="../tools/" class="btn btn-ghost">無料の印刷ツールを見る</a>
    </div>
  </div>
  <div class="hero-photo">
    <img src="../assets/${esc(it.hero.img)}" alt="${esc(it.hero.alt)}">
  </div>
</section>
`;
}

function featuresSection(it) {
  if (!it.why) return '';
  const cards = (it.why.features || []).map(f => `
      <div class="contents-card">
        <div class="contents-card-icon">${esc(f.icon || '✔')}</div>
        <div class="contents-card-title">${esc(f.title)}</div>
        <div class="contents-card-desc">${esc(f.desc)}</div>
      </div>`).join('');
  return `<hr class="section-divider">
<section class="section">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">${esc(it.why.label || 'Features')}</p>
      <h2 class="section-title">${esc(it.why.title)}</h2>
    </div>
    ${it.why.lead ? `<p class="lead">${esc(it.why.lead)}</p>` : ''}
    <div class="contents-box">${cards}
    </div>
  </div>
</section>
`;
}

function sizesSection(it) {
  if (!it.sizes || !it.sizes.length) return '';
  const cards = it.sizes.map(k => { const s = Object.assign({}, SIZES[k], { pages: (it.sizePages && it.sizePages[k]) || SIZES[k].pages }); return `
      <div class="size-card">
        <div class="size-name">${esc(s.name)}</div>
        <div class="size-mm">${esc(s.mm)}</div>
        <div class="size-note">${esc(s.note)}${s.pages ? `・${s.pages}ページ` : ''}</div>
      </div>`; }).join('');
  return `<hr class="section-divider">
<section class="section" style="background:var(--color-bg-sub)">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">Sizes</p>
      <h2 class="section-title">${esc(it.sizesTitle || `${it.sizes.length}判型すべて収録。手帳を替えても買い直し不要です`)}</h2>
    </div>
    ${it.sizesLead ? `<p class="lead">${esc(it.sizesLead)}</p>` : ''}
    <div class="size-grid">${cards}
    </div>
    <p class="note">寸法と穴位置は当工房のリング規格表（<a href="../kouhou-room/ring-standards.html">リング規格図鑑</a>）に合わせています。
      A5スリムとA5は高さがA4の短辺と同じなので、上下6mmを余白にしてあります（一般的なプリンターの印刷できない範囲）。</p>
  </div>
</section>
`;
}

function previewSection(it) {
  if (!it.previews || !it.previews.length) return '';
  const cards = it.previews.map(p => { const s = SIZES[p.size] || { name: p.name || p.size, mm: '' }; return `
      <a class="preview-card" href="../assets/${esc(p.img)}" target="_blank" rel="noopener"><img src="../assets/${esc(p.img)}" alt="${esc(p.alt || s.name + 'の見開き')}" loading="lazy"><span class="preview-name">${esc(s.name)}${s.mm ? ` <small>${esc(s.mm.replace(/ /g, ''))}</small>` : ''}</span></a>`; }).join('');
  return `<hr class="section-divider">
<section class="section" id="preview">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">Preview</p>
      <h2 class="section-title">購入前に、中身を判型ごとに見られます</h2>
    </div>
    <p class="lead">${esc(it.previewLead || '実際にお渡しするPDFから切り出した見開きです。画像をクリックすると大きく表示します。')}</p>
    <div class="preview-grid">${cards}
    </div>
    <p class="note">同じ書式は<a href="../tools/">無料の印刷ツール</a>でも画面で確認できます（日付なしモード）。</p>
  </div>
</section>
`;
}

function stepsSection(it) {
  if (!it.steps || !it.steps.length) return '';
  const cards = it.steps.map((s, i) => `
      <div>
        <div class="step-photo">${s.img ? `<img src="../assets/${esc(s.img)}" alt="${esc(s.alt || s.title)}" loading="lazy"${s.pos ? ` style="object-position:${esc(s.pos)}"` : ''}>` : ''}</div>
        <p class="step-label">Step ${String(i + 1).padStart(2, '0')}</p>
        <p class="step-title">${esc(s.title)}</p>
        <p class="step-caption">${esc(s.caption)}</p>
      </div>`).join('');
  return `<hr class="section-divider">
<section class="section">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">How to use</p>
      <h2 class="section-title">使い始めるまでの${it.steps.length}手順</h2>
    </div>
    <div class="step-grid">${cards}
    </div>
  </div>
</section>
`;
}

function specSection(it) {
  if (!it.spec || !it.spec.length) return '';
  const rows = it.spec.map(r => `
      <tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('');
  return `<hr class="section-divider">
<section class="section" style="background:var(--color-bg-sub)">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">Specification</p>
      <h2 class="section-title">商品仕様</h2>
    </div>
    <table class="spec-table">${rows}
      <tr><th>お届け方法</th><td>カード決済（Stripe）はお支払い直後にダウンロードリンクを表示し、メールでもお送りします。銀行振込はご入金確認後にメールでお送りします</td></tr>
    </table>
  </div>
</section>
`;
}

const LICENSE = `<hr class="section-divider">
<section class="section">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">License</p>
      <h2 class="section-title">ご利用規約</h2>
    </div>
    <div class="license-box">
      <h3>このデータでできること・できないこと</h3>
      <ul class="license-list">
        <li>ご自身の手帳用に、何枚でも印刷すること</li>
        <li>ご家族がお使いになる分を印刷すること</li>
        <li class="no">PDFデータそのものの転売・配布・再頒布</li>
        <li class="no">データを改変して販売・配布すること</li>
        <li class="no">印刷したリフィルを販売すること</li>
      </ul>
    </div>
    <p class="note">購入後のキャンセル・返金はデジタルコンテンツの性質上お受けできません。
      くわしくは <a href="../terms.html">デジタルデータの利用条件</a>、販売者情報は <a href="../index.html">特定商取引法に基づく表記（トップページ下部）</a> をご覧ください。
      ご不明な点は購入前に <a href="mailto:${MAIL}">メール</a> または <a href="https://lin.ee/qsmtY2N" target="_blank" rel="noopener">LINE公式</a> にお問い合わせください。</p>
  </div>
</section>
`;

function freeToolsSection(it) {
  return `<hr class="section-divider">
<section class="section" style="background:var(--color-bg-sub)">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">Free tools</p>
      <h2 class="section-title">無料の印刷ツールもあります</h2>
    </div>
    <p class="lead">ブラウザ上で自分でレイアウトを調整して印刷できる無料ツールを公開しています。
      Micro5・ミニ6・バイブル・A6・A5スリム・A5の6判型それぞれに週間・月間・日次があり、どれも日付入りと日付なしを出力できます。会員登録もパスワードも不要です。
      ${esc(it.freeToolsNote || '')}</p>
    <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:12px">
      <a href="../tools/" class="btn btn-primary">ツール一覧を見る</a>
      ${it.toolLink ? `<a href="../${esc(it.toolLink.href)}" class="btn" style="background:var(--color-bg);color:var(--color-text);border:1px solid var(--color-border)">${esc(it.toolLink.label)}</a>` : ''}
    </div>
  </div>
</section>
`;
}

function ctaSection(it) {
  const code = esc(it.code);
  return `<section class="cta-section" id="buy">
  <div class="cta-inner">
    <p class="cta-label">Buy now</p>
    <h2 class="cta-title">${esc(it.title)}${it.subtitle ? `<br>${esc(it.subtitle)}` : ''}を手に入れる</h2>
    <p class="cta-desc">${esc(it.ctaDesc || it.summary)}<br>ご購入後、ダウンロードリンクをメールでお送りします。</p>
    <div class="cta-price-block"><span class="cta-price">¥${yen(it.price)} <small>${esc(it.priceNote || '税込')}</small></span></div>
    <div class="cta-actions">
      <!-- カード決済は assets/pdf-checkout.js が配信GAS（商品シート）に販売可否を問い合わせて出す。使えない間はメール申込だけが見える。 -->
      <a href="#" data-checkout="${code}" class="btn btn-primary btn-large" style="display:none">カードで購入する（¥<span data-price>${yen(it.price)}</span>）</a>
      <a href="#" data-checkout-off="${code}" class="btn btn-primary btn-large js-refill-mail">メールで購入を申し込む（銀行振込）</a>
      <p data-checkout-on="${code}" style="display:none;margin-top:12px;font-size:12px;color:rgba(255,255,255,.55)">Stripe の安全な決済画面に移動します。お支払い後、ダウンロードリンクが表示され、メールでも届きます。</p>
      <div data-checkout-on="${code}" style="display:none;margin-top:14px;width:100%">
        <a href="#" class="btn btn-large btn-outline-w js-refill-mail">銀行振込で申し込む（メール）</a>
      </div>
      <p data-checkout-off="${code}" style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.55)">いまカード決済がご利用いただけない状態です。メールをいただければ、振込先をご案内し、ご入金確認後にPDFをお送りします。</p>
      ${mailHrefJs(it)}
    </div>
  </div>
</section>
`;
}

function detail(it) {
  const title = `${it.title}${it.subtitle ? ' ' + it.subtitle : ''} — N's refill | N's factory`;
  const desc = it.metaDesc || it.summary;
  return head(title, desc, `refill-pdf/${it.slug}.html`, it.hero.img)
    + nav(it.slug, '#buy')
    + heroSection(it)
    + featuresSection(it)
    + sizesSection(it)
    + previewSection(it)
    + stepsSection(it)
    + specSection(it)
    + LICENSE
    + freeToolsSection(it)
    + ctaSection(it)
    + FOOT;
}

// ── 一覧ページ ──────────────────────────────────
function productCard(it) {
  const inner = `
      <div class="product-img"><img src="../assets/${esc(it.hero.img)}" alt="${esc(it.hero.alt)}" loading="lazy"></div>
      <div class="product-body">
        <div class="product-kicker">${esc(it.kind || it.en || 'Refill PDF')}</div>
        <div class="product-title">${esc(it.title)}</div>
        ${it.subtitle ? `<div class="product-sub">${esc(it.subtitle)}</div>` : ''}
        <div class="product-sum">${esc(it.summary)}</div>
        <div class="product-foot">
          ${it.status === 'sale' ? `<span class="product-price">¥${yen(it.price)}<small>${esc(it.priceNote || '税込')}</small></span><span class="product-more">詳しく見る →</span>` : `<span class="product-price"><small>準備中</small></span><span class="product-more">近日公開</span>`}
        </div>
      </div>`;
  return it.status === 'sale'
    ? `\n    <a class="product-card" href="${esc(it.slug)}.html">${inner}\n    </a>`
    : `\n    <div class="product-card soon">${inner}\n    </div>`;
}

function index() {
  const title = "N's refill システム手帳リフィル PDF | N's factory";
  const desc = SERIES.desc || 'システム手帳のリフィルを、印刷するだけのPDFでお届けします。Micro5・ミニ6・バイブル・A6・A5スリム・A5に対応。';
  const cards = DATA.items.map(productCard).join('');
  return head(title, desc, 'refill-pdf/', DATA.items[0] && DATA.items[0].hero.img)
    + nav('index', '../index.html')
    + `<section class="series-hero">
  <div class="series-hero-inner">
    <p class="hero-eyebrow">${esc(SERIES.name || "N's refill")} — ${esc(SERIES.en || 'Planner Refill PDF')}</p>
    <h1>${esc(SERIES.title || 'システム手帳リフィル PDF')}</h1>
    <p>${esc(desc)}</p>
  </div>
</section>
<section class="section" style="background:var(--color-bg-sub)">
  <div class="section-inner">
    <div class="section-header">
      <p class="section-label">Lineup</p>
      <h2 class="section-title">リフィル一覧</h2>
    </div>
    <div class="product-grid">${cards}
    </div>
    <p class="note">価格は税込。カード決済（Stripe）または銀行振込でお求めいただけます。
      自分でレイアウトを調整したい方は<a href="../tools/">無料の印刷ツール</a>をどうぞ。</p>
  </div>
</section>
` + LICENSE + FOOT;
}

// ── tools/index.html の商品行 ───────────────────
function toolsRows() {
  return DATA.items.filter(it => it.status === 'sale').map(it => {
    const code = esc(it.code);
    return `      <a class="tool" href="../refill-pdf/${esc(it.slug)}.html"><span class="k">Buy</span><span><span class="t">${esc(it.title)}${it.subtitle ? ' ' + esc(it.subtitle) : ''}</span><span class="d">${esc(it.short || it.summary)} <span data-checkout-off="${code}">いまはメール申込（銀行振込）</span><span data-checkout-on="${code}" style="display:none">カード決済ですぐダウンロード（銀行振込も可）</span></span></span><span class="arrow">→</span></a>`;
  }).join('\n');
}
function replaceBetween(file, startMark, endMark, body) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, 'utf8');
  const a = src.indexOf(startMark), b = src.indexOf(endMark);
  if (a < 0 || b < 0 || b < a) throw new Error(`${file}: ${startMark} / ${endMark} の印が見つかりません`);
  const out = src.slice(0, a + startMark.length) + '\n' + body + '\n' + src.slice(b);
  if (out !== src) { fs.writeFileSync(p, out, 'utf8'); return true; }
  return false;
}

// ── sitemap ─────────────────────────────────────
function sitemapUrls() {
  const d = today();
  const urls = [`  <url>\n    <loc>${SITE}refill-pdf/</loc>\n    <lastmod>${d}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`];
  DATA.items.filter(it => it.status === 'sale').forEach(it => {
    urls.push(`  <url>\n    <loc>${SITE}refill-pdf/${it.slug}.html</loc>\n    <lastmod>${d}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  });
  return urls.join('\n');
}

// ── 書き出し ────────────────────────────────────
const written = [];
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), index(), 'utf8');
written.push('refill-pdf/index.html');
DATA.items.filter(it => it.status === 'sale').forEach(it => {
  fs.writeFileSync(path.join(OUT_DIR, it.slug + '.html'), detail(it), 'utf8');
  written.push('refill-pdf/' + it.slug + '.html');
});
if (replaceBetween('tools/index.html', '<!-- REFILL_PRODUCTS:start -->', '<!-- REFILL_PRODUCTS:end -->', toolsRows())) written.push('tools/index.html（商品行）');
if (replaceBetween('sitemap.xml', '<!-- REFILL:start -->', '<!-- REFILL:end -->', sitemapUrls())) written.push('sitemap.xml（refill-pdf の url）');
console.log('生成しました（' + written.length + '件）:\n  ' + written.join('\n  '));
