#!/usr/bin/env node
/**
 * 講座「AIで作る 作家の道具」（ハンドメイド作家向け・AIで自分の業務ツールを作る）のページ生成
 *
 *   node tools/build_course_pages.js
 *
 * ai-course/courses-data.json から次を作る（どちらも自動生成・⛔ 手で編集しない）:
 *   ai-course/index.html         … シリーズ一覧（無料の動画3本＋有料の教材）
 *   ai-course/<slug>.html        … 有料教材ごとの販売ページ（カード購入ボタン・振込の申込）
 *   sitemap.xml                  … <!-- COURSE:start/end --> の間の <url> だけ差し替え（印が無ければ何もしない）
 *
 * - カード購入は assets/pdf-checkout.js（配信GAS refill_sales の商品シートで「販売中」の商品だけボタンを出す）。
 *   data の code は商品シートのコードと一致させる。価格の正本は商品シート（ボタン内の金額はGASの値で書き換わる）。
 * - 購入後のページは refill-pdf/thanks.html を共用（商品シートの「商品ページ」列に ai-course/<slug>.html を入れる）。
 * - デザインは N's pattern と同じ黒×金（#c9a96e）・英語 eyebrow＋日本語見出し。CTAは「カードで購入する」主・銀行振込（メール）従。
 * - セット販売（2026-09-17）: sets[]（id・code・name・range・price・status）に、教材の set で所属させる。セットの教材は単品で売らず、
 *   購入ボタンはセットの code（商品シートにはセット1行・配信ファイルは教材ごとのダウンロード先をまとめた案内PDF）。カードとページは教材ごとに別々。
 * - 見出し画像（hero.img・assets/ からの相対）は必須。status: "sale"（販売中）／"soon"（準備中: 一覧にだけ出し、ページは作らない）。
 * - ⛔ 教材の実体（動画・テンプレート・PDF）は公開リポジトリに置かない。配信は Drive の非公開フォルダ。
 * - ⛔ 視聴回数・売上などの数字をページに書かない。
 * - 出力先は環境変数 NSF_SITE_ROOT で変えられる（承認前の下見用。既定はこのリポジトリ）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.NSF_SITE_ROOT ? path.resolve(process.env.NSF_SITE_ROOT) : path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'ai-course');
const DATA = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'courses-data.json'), 'utf8'));
const SITE = 'https://you0810jmsdf.github.io/ns-factory/';
const MAIL = 'you0810jmsdf@gmail.com';
const MAIL_SUBJECT = 'AI講座の教材購入のお問合せ';
const SERIES = DATA.series || {};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function yen(n) { return Number(n).toLocaleString('ja-JP'); }
function today() { return new Date().toISOString().slice(0, 10); }
// セット販売（2026-09-17 事業主決定: 第4〜9弾は「第1セット」980円。単品では売らない。ページとカードは弾ごとに別々）
const SETS = {};
(DATA.sets || []).forEach(s => { SETS[s.id] = s; });
function setOf(it) { return it.set ? SETS[it.set] : null; }
function mailHref(it) {
  const s = setOf(it);
  const what = s ? `「${s.name}（${s.range}）」` : `「${it.no} ${it.title}」の教材`;
  const body = `${what}を購入したいです。\n\nお名前：\n\n（振込先をご案内します。ご入金の確認後、ダウンロードリンクをメールでお送りします）`;
  return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(MAIL_SUBJECT) + '&body=' + encodeURIComponent(body);
}

// ── 検査 ────────────────────────────────────────
(DATA.sets || []).forEach(s => {
  ['id', 'code', 'name', 'range', 'status'].forEach(k => { if (!s[k]) throw new Error(`courses-data.json: sets ${s.id || '?'} の ${k} が空です`); });
  if (!['sale', 'soon'].includes(s.status)) throw new Error(`sets ${s.id}: status は sale か soon`);
  if (s.status === 'sale' && !(s.price > 0)) throw new Error(`sets ${s.id}: 販売中のセットには price が必要です`);
});
const seen = new Set();
(DATA.items || []).forEach(it => {
  const id = it.code || it.slug || '?';
  if (it.set && !SETS[it.set]) throw new Error(`${id}: set「${it.set}」が sets にありません`);
  if (it.set && it.status === 'sale' && SETS[it.set].status !== 'sale') throw new Error(`${id}: セットが販売前なので status は soon にします`);
  ['code', 'slug', 'no', 'title', 'summary', 'status'].concat(it.set ? [] : ['price']).forEach(k => {
    if (it[k] === undefined || it[k] === '') throw new Error(`courses-data.json: ${id} の ${k} が空です`);
  });
  if (!/^[a-z0-9-]+$/.test(it.slug)) throw new Error(`slug は英小文字・数字・ハイフンのみ: ${it.slug}`);
  if (seen.has(it.slug)) throw new Error(`slug が重複: ${it.slug}`);
  seen.add(it.slug);
  if (!['sale', 'soon'].includes(it.status)) throw new Error(`${id}: status は sale か soon`);
  if (!it.hero || !it.hero.img || !it.hero.alt) throw new Error(`${id}: hero.img と hero.alt（見出し画像）は必須です`);
  if (!fs.existsSync(path.join(ROOT, 'assets', it.hero.img))) throw new Error(`${id}: 見出し画像が見つかりません: assets/${it.hero.img}`);
  if (it.teaser && !/^[A-Za-z0-9_-]{11}$/.test(it.teaser)) throw new Error(`${id}: teaser は YouTube の動画ID（11文字）`);
});
(DATA.free || []).forEach(f => { if (!/^[A-Za-z0-9_-]{11}$/.test(f.youtube || '')) throw new Error(`free: youtube は動画ID（11文字）: ${f.title}`); });

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
.nav{position:sticky;top:0;z-index:10;background:rgba(11,11,12,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:16px;height:56px}
.brand{font-size:16px;font-weight:700;letter-spacing:.04em;color:var(--accent)}
.brand small{font-size:11px;letter-spacing:.2em;color:var(--fg-3);margin-left:8px;text-transform:uppercase;font-weight:400}
.nav-spacer{flex:1}
.nav a.link{font-size:13px;color:var(--fg-2);padding:6px 8px}
.nav a.link:hover{color:var(--fg)}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
h1{font-size:clamp(26px,4.2vw,42px);font-weight:700;line-height:1.35;letter-spacing:-.01em}
h2{font-size:20px;font-weight:700;margin-bottom:14px}
.lead{color:var(--fg-2);font-size:15px;margin-top:14px;max-width:680px}
.sec{padding:44px 0;border-top:1px solid var(--line)}
.sec:first-of-type{border-top:none}
.ph{aspect-ratio:16/9;border:1px solid var(--line-2);border-radius:var(--radius);background:var(--panel);overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 26px;border-radius:999px;font-size:15px;font-weight:700;transition:opacity .2s,background .2s}
.btn:hover{opacity:.88}
.btn-gold{background:var(--accent);color:#1a140c}
.btn-line{background:transparent;color:var(--fg);border:1px solid var(--line-2)}
.buy{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:22px}
.buy .note{font-size:12px;color:var(--fg-3);line-height:1.8}
.price{font-size:30px;font-weight:700;margin-top:18px}
.price small{font-size:13px;color:var(--fg-3);font-weight:400;margin-left:6px}
.set-tag{display:inline-block;font-size:12px;font-weight:700;color:#0b0b0c;background:var(--accent);border-radius:999px;padding:2px 10px;margin-right:10px;vertical-align:middle}
.set-head{margin:26px 0 14px;padding:14px 16px;border:1px solid var(--line-2);border-radius:var(--radius);background:var(--accent-soft)}
.set-head b{font-size:15px}
.set-price{font-size:20px;font-weight:700;margin-left:14px;white-space:nowrap}
.set-price small{font-size:12px;color:var(--fg-3);font-weight:400;margin-left:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;margin-top:26px}
.card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg-2);overflow:hidden;transition:border-color .2s,transform .2s}
a.card:hover{border-color:var(--accent-2);transform:translateY(-2px)}
.card .ph{border:none;border-radius:0;border-bottom:1px solid var(--line)}
.card-body{padding:16px 16px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.card-no{font-size:11px;color:var(--accent);letter-spacing:.12em}
.card-title{font-size:16px;font-weight:700;line-height:1.5}
.card-sum{font-size:12.5px;color:var(--fg-2);line-height:1.7;flex:1}
.card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.card-price{font-weight:700}
.card-more{font-size:12px;color:var(--accent)}
.badge{display:inline-block;font-size:11px;border:1px solid var(--line-2);border-radius:999px;padding:2px 10px;color:var(--fg-2)}
.badge.free{color:#9fd8a5;border-color:#3e6b44}
.badge.soon{color:var(--fg-3)}
.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:36px;align-items:center;padding:44px 0}
.facts{width:100%;border-collapse:collapse;font-size:14px}
.facts th,.facts td{border-bottom:1px solid var(--line);padding:12px 8px;text-align:left;vertical-align:top}
.facts th{color:var(--fg-3);font-weight:500;width:9em}
.checks{list-style:none;display:grid;gap:10px;margin-top:6px}
.checks li{position:relative;padding-left:30px;font-size:15px;color:var(--fg)}
.checks li:before{content:"";position:absolute;left:4px;top:.55em;width:12px;height:7px;border-left:2px solid var(--accent);border-bottom:2px solid var(--accent);transform:rotate(-45deg)}
.video{position:relative;aspect-ratio:16/9;border:1px solid var(--line-2);border-radius:var(--radius);overflow:hidden;background:#000;max-width:760px}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.muted{color:var(--fg-2);font-size:14px}
.muted a{color:var(--accent);border-bottom:1px solid var(--accent-2)}
.crumb{font-size:12px;color:var(--fg-3);padding-top:18px}
.crumb a:hover{color:var(--fg)}
.foot{border-top:1px solid var(--line);padding:30px 0 40px;color:var(--fg-3);font-size:12px}
.foot .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between}
.foot a{color:var(--fg-2)}
.foot a:hover{color:var(--fg)}
.brand,.nav a.link{white-space:nowrap}
@media (max-width:760px){
  .hero{grid-template-columns:1fr;gap:22px;padding:28px 0}
  .nav a.link.opt{display:none}
  .nav .wrap{gap:6px}
  .brand small{display:none}
  .btn{width:100%}
  .buy{align-items:stretch}
}
`;

function head(title, desc, canonicalPath, ogImage) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 自動生成: tools/build_course_pages.js（ai-course/courses-data.json から）。⛔ 手で編集しない -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonicalPath}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonicalPath}">
${ogImage ? `<meta property="og:image" content="${SITE}assets/${esc(ogImage)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
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
  <a class="brand" href="index.html">AIで作る 作家の道具<small>by N's factory</small></a>
  <span class="nav-spacer"></span>
  <a class="link" href="index.html">講座一覧</a>
  <a class="link opt" href="../tools/">無料の印刷ツール</a>
  <a class="link" href="../index.html">N's factory</a>
</div></nav>
`;
}

const FOOT = `
<footer class="foot"><div class="wrap">
  <div>AIで作る 作家の道具 — N's factory（千葉県印西市 中司 祐樹）</div>
  <div style="display:flex;gap:18px;flex-wrap:wrap">
    <a href="index.html">講座一覧</a>
    <a href="../terms.html">デジタルデータの利用条件</a>
    <a href="../index.html">特定商取引法に基づく表記（トップページ下部）</a>
  </div>
</div></footer>
<script src="../assets/access-counter.js"></script>
<script src="../assets/pdf-checkout.js"></script>
</body>
</html>
`;

function priceOf(it) { const s = setOf(it); return s ? s.price : it.price; }
function priceBlock(it) {
  const s = setOf(it);
  if (!s) return `<div class="price">¥${yen(it.price)}<small>税込</small></div>`;
  return `<div class="price"><span class="set-tag">${esc(s.name)}</span>¥${yen(s.price)}<small>税込（${esc(s.range)}）</small></div>
      <p class="note">この教材は、${esc(s.name)}（${esc(s.range)}）に収録しています。1回のご購入で、セットの教材をすべてお届けします。単品での販売はしていません。</p>`;
}
function buyBlock(it) {
  const s = setOf(it);
  const code = esc(s ? s.code : it.code);
  return `<div class="buy">
      <!-- カード購入: pdf-checkout.js が商品シートで販売中のときだけ表示（テスト鍵の間は ?stripe_test=1 のときだけ） -->
      <a href="#" class="btn btn-gold" data-checkout="${code}" style="display:none"><span>カードで購入する（${s ? esc(s.name) + '・' : ''}¥<span data-price>${yen(priceOf(it))}</span>）</span></a>
      <p class="note" data-checkout-on="${code}" style="display:none">Stripe の安全な決済画面に移動します。お支払い後すぐにダウンロードでき、同じリンクをメールでもお送りします。</p>
      <a href="${esc(mailHref(it))}" class="btn btn-line" data-checkout-on="${code}" style="display:none">銀行振込で申し込む（メール）</a>
      <!-- カード決済が使えないとき（鍵未設定・販売停止・通信失敗）はメール申込だけ -->
      <a href="${esc(mailHref(it))}" class="btn btn-gold" data-checkout-off="${code}">メールで購入を申し込む（銀行振込）</a>
      <p class="note" data-checkout-off="${code}">メールをいただければ振込先をご案内し、ご入金確認後にダウンロードリンクをお送りします。</p>
    </div>`;
}

// ── 教材の販売ページ ────────────────────────────
function detail(it) {
  const title = `${it.no} ${it.title} — AIで作る 作家の道具 | N's factory`;
  const s = setOf(it);
  const desc = s ? `${it.title}（${s.name}〔${s.range}〕${yen(s.price)}円・税込に収録）。${it.summary}` : `${it.title}（${yen(it.price)}円・税込）。${it.summary}`;
  const li = a => (a || []).map(x => `<li>${esc(x)}</li>`).join('\n      ');
  return head(title, desc, `ai-course/${it.slug}.html`, it.hero.img) + `
<main class="wrap">
  <p class="crumb"><a href="index.html">講座一覧</a> ／ ${esc(it.no)} ${esc(it.title)}</p>

  <section class="hero">
    <div class="ph"><img src="../assets/${esc(it.hero.img)}" alt="${esc(it.hero.alt)}"></div>
    <div>
      <p class="eyebrow">Handmade × AI — ${esc(it.en || 'Course')}</p>
      <h1>${esc(it.no)}<br>${esc(it.title)}</h1>
      <p class="lead">${esc(it.lead || it.summary)}</p>
      ${priceBlock(it)}
      ${buyBlock(it)}
    </div>
  </section>
${it.teaser ? `
  <section class="sec">
    <p class="eyebrow">Preview</p>
    <h2>予告を見る（約1分）</h2>
    <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(it.teaser)}" title="${esc(it.title)} 予告" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
  </section>` : ''}

  <section class="sec">
    <p class="eyebrow">What you can do</p>
    <h2>この教材でできるようになること</h2>
    <ul class="checks">
      ${li(it.can)}
    </ul>
  </section>

  <section class="sec">
    <p class="eyebrow">Included</p>
    <h2>含まれるもの</h2>
    <table class="facts">
      ${(it.includes || []).map(x => `<tr><th>${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('\n      ')}
      <tr><th>動作環境</th><td>${esc(it.env || '')}</td></tr>
      <tr><th>お届け</th><td>${s ? `${esc(s.name)}（${esc(s.range)}）をまとめてお届けします。カード決済：お支払い後すぐに、教材ごとのダウンロード先（ZIPファイル）をまとめた案内PDFを画面から開けます。同じリンクをメールでもお送りします。` : 'カード決済：お支払い後すぐに画面からダウンロードでき、同じリンクをメールでもお送りします（ZIPファイル）。'}<br>銀行振込：ご入金を確認してから、メールでお送りします。</td></tr>
    </table>
  </section>

  <section class="sec">
    <p class="eyebrow">Notes</p>
    <h2>ご購入の前に</h2>
    <ul class="muted" style="padding-left:1.2em;display:grid;gap:6px">
      ${li(it.notes)}
    </ul>
    <p class="muted" style="margin-top:14px">ご自身の仕事でお使いいただくための教材です。<b>データの再配布・転売</b>はご遠慮いただいています（テンプレートをご自身の仕事用に書き換えて使うのは自由です）。詳しくは <a href="../terms.html">デジタルデータの利用条件</a> をご覧ください。</p>
    <p class="muted" style="margin-top:8px">購入後のキャンセル・返金はデジタルコンテンツの性質上お受けできません（ファイルが開けないなどの不具合はお取り替えします）。販売者情報は <a href="../index.html">特定商取引法に基づく表記（トップページ下部）</a> をご覧ください。</p>
  </section>

  <section class="sec" id="buy">
    <p class="eyebrow">Buy now</p>
    <h2>${s ? `${esc(s.name)}（${esc(s.range)}）を手に入れる` : `${esc(it.no)} ${esc(it.title)} を手に入れる`}</h2>
    ${priceBlock(it)}
    ${buyBlock(it)}
  </section>
</main>
` + FOOT;
}

// ── 一覧ページ ──────────────────────────────────
function index() {
  const title = "AIで作る 作家の道具 — ハンドメイド作家向け講座 | N's factory";
  const desc = SERIES.desc || 'ハンドメイド作家さん向け。AIチャットに日本語で頼んで、自分の仕事に合った表や道具を作る方法を、動画と教材でお届けします。';
  const free = (DATA.free || []).map(f => `
    <a class="card" href="https://youtu.be/${esc(f.youtube)}" target="_blank" rel="noopener">
      <div class="ph"><img src="https://i.ytimg.com/vi/${esc(f.youtube)}/hqdefault.jpg" alt="${esc(f.title)}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-no">${esc(f.no)}　<span class="badge free">無料・YouTube</span></div>
        <div class="card-title">${esc(f.title)}</div>
        <div class="card-sum">${esc(f.summary)}</div>
        <div class="card-foot"><span class="card-price">無料</span><span class="card-more">YouTube で見る →</span></div>
      </div>
    </a>`).join('');
  const cardPrice = it => { const s = setOf(it); return s ? `${esc(s.name)}に収録` : `¥${yen(it.price)}`; };
  const cards = list => list.map(it => it.status === 'sale' ? `
    <a class="card" href="${esc(it.slug)}.html">
      <div class="ph"><img src="../assets/${esc(it.hero.img)}" alt="${esc(it.hero.alt)}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-no">${esc(it.no)}</div>
        <div class="card-title">${esc(it.title)}</div>
        <div class="card-sum">${esc(it.summary)}</div>
        <div class="card-foot"><span class="card-price">${cardPrice(it)}</span><span class="card-more">詳しく見る →</span></div>
      </div>
    </a>` : `
    <div class="card">
      <div class="ph"><img src="../assets/${esc(it.hero.img)}" alt="${esc(it.hero.alt)}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-no">${esc(it.no)}　<span class="badge soon">準備中</span></div>
        <div class="card-title">${esc(it.title)}</div>
        <div class="card-sum">${esc(it.summary)}</div>
      </div>
    </div>`).join('');
  // セットごとに見出しを付けて並べる（セットに入っていない教材は最後にまとめる）
  const groups = (DATA.sets || []).map(s => ({ s, list: (DATA.items || []).filter(it => it.set === s.id) }))
    .concat([{ s: null, list: (DATA.items || []).filter(it => !it.set) }]).filter(g => g.list.length);
  const paid = groups.map(g => g.s ? `
    <div class="set-head" id="${esc(g.s.id)}">
      <div><span class="set-tag">${esc(g.s.name)}</span><b>${esc(g.s.range)}</b>${g.s.status === 'sale' ? `<span class="set-price">¥${yen(g.s.price)}<small>税込・${g.list.length}本まとめて</small></span>` : '<span class="badge soon">準備中</span>'}</div>
      <p class="muted">${esc(g.s.desc || '')}</p>
    </div>
    <div class="grid">${cards(g.list)}
    </div>` : `
    <div class="grid">${cards(g.list)}
    </div>`).join('');
  return head(title, desc, 'ai-course/', (DATA.items[0] || {}).hero ? DATA.items[0].hero.img : '') + `
<main class="wrap">
  <section class="sec" style="padding-top:56px">
    <p class="eyebrow">Handmade × AI</p>
    <h1>AIで作る 作家の道具</h1>
    <p class="lead">${esc(desc)}</p>
    <p class="lead" style="font-size:13.5px">主役は表そのものではなく「AIへの頼み方」です。コードは書きません。表計算ソフトとAIチャットの、無料で使える範囲だけで作れます。</p>
  </section>

  <section class="sec">
    <p class="eyebrow">Free on YouTube</p>
    <h2>まずは無料の3本から</h2>
    <div class="grid">${free}
    </div>
  </section>

  <section class="sec">
    <p class="eyebrow">Course materials</p>
    <h2>教材（動画＋完成テンプレート＋依頼文集PDF）</h2>
    <p class="muted">無料の3本で身につけた頼み方を使って、日々の仕事でそのまま使える表を作ります。${(DATA.sets || []).length ? '教材はセットでお求めいただけます。' : '1本ずつお求めいただけます。'}</p>
${paid}
  </section>
${SERIES.form ? `
  <section class="sec">
    <p class="eyebrow">Newsletter</p>
    <h2>新しい教材のお知らせを受け取る</h2>
    <p class="muted">続編ができたときだけ、メールでお知らせします（無料・メールアドレスのみ）。</p>
    <div class="buy"><a class="btn btn-line" href="${esc(SERIES.form)}" target="_blank" rel="noopener">お知らせ登録フォームを開く</a></div>
  </section>` : ''}
</main>
` + FOOT;
}

function replaceBetween(file, startMark, endMark, body) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return false;
  const s = fs.readFileSync(p, 'utf8');
  const a = s.indexOf(startMark), b = s.indexOf(endMark);
  if (a < 0 || b < 0 || b < a) return false;
  fs.writeFileSync(p, s.slice(0, a + startMark.length) + '\n' + body + '\n  ' + s.slice(b), 'utf8');
  return true;
}
function sitemapUrls() {
  const u = p => `  <url><loc>${SITE}${p}</loc><lastmod>${today()}</lastmod></url>`;
  return [u('ai-course/')].concat((DATA.items || []).filter(it => it.status === 'sale').map(it => u(`ai-course/${it.slug}.html`))).join('\n');
}

// ── 書き出し ────────────────────────────────────
const written = [];
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), index(), 'utf8'); written.push('ai-course/index.html');
(DATA.items || []).filter(it => it.status === 'sale').forEach(it => {
  fs.writeFileSync(path.join(OUT_DIR, it.slug + '.html'), detail(it), 'utf8'); written.push('ai-course/' + it.slug + '.html');
});
if (replaceBetween('sitemap.xml', '<!-- COURSE:start -->', '<!-- COURSE:end -->', sitemapUrls())) written.push('sitemap.xml（COURSE 区間）');
console.log('生成しました（' + written.length + '件）:\n  ' + written.join('\n  '));
