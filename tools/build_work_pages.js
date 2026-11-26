#!/usr/bin/env node
/**
 * 作品ごとの「SNS案内ページ」works/<商品ID>.html を生成する。
 *
 * 背景（2026-08-12 事業主要望）:
 *   SNSで作品集へ誘導しても約650件から目当ての1点を探すのは大変。
 *   さらに works.html には OGP が無く、URLを貼っても写真プレビューが出ない。
 *   → 作品ごとに OGP 付きの軽量ページを置き、開いたら works.html?id=... へ送る。
 *
 * 【2026-11-26 事業主決定「B 今のまま入口を増やす」で方針変更】
 *   Google 検索に載る入口にするため、longDesc が300字以上の作品は「中身のある読めるページ」にする
 *   （noindex なし・転送なし・日本語の題名・写真・説明文・仕様・JSON-LD）。
 *   300字未満の作品、人名・連絡先の疑いがある作品は、従来どおり noindex＋転送の入口のまま。
 *   併せて 作品一覧の静的ページ（works-list.html）と sitemap.xml の WORKS 区間も生成する。
 *   ⛔ 検索ロボットにだけ中身を見せて人を転送する作り（クローキング）にしない。
 *      載せるページは人にも同じ中身を見せ、location.replace を出さない。
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
  const price = Number(w.price) > 0 && Number(w.price) < 999999 ? `${Number(w.price).toLocaleString('ja-JP')}円` : '';
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
 * OGP用の画像URLを作る。
 *
 * ⚠ drive.google.com/thumbnail?id=... は **302で lh3.googleusercontent.com へ転送する**。
 *   Metaのクローラは画像のリダイレクトを嫌い、Threadsでカードが出ない原因になった
 *   （2026-08-12 実測）。そこで転送先の形式を直接組み立てて渡す。
 *   `https://lh3.googleusercontent.com/d/<fileId>=w1200` はファイルIDから決め打ちで作れ、
 *   facebookexternalhit から転送なし・200 image/jpeg で取れることを実測済み。
 *
 * サイズを1200pxに揃えるのは、商品マスターのURLが w800/w1200 混在で、
 * 小さいとSNSの大判カードが粗くなるため。
 */
function ogImage(mainPhoto) {
  const url = String(mainPhoto || '');
  if (!url) return `${SITE}/assets/logo.png`; // index.html と同じ既定画像
  const m = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  return url.replace(/([?&]sz=)w\d+/, '$1w1200');
}

// ───────────────────────────────────────────────
// 「検索に載せる作品」の判定（2026-11-26 事業主決定・300字以上だけ載せる）
// ───────────────────────────────────────────────
const MIN_LONGDESC = 300;
const PLACEHOLDER_SIZE = '事前にお問い合わせください';

/** 全角英数記号を半角へ（カテゴリの「ＩＤ」など） */
function toHalf(s) {
  return String(s || '').replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/**
 * 人名・連絡先の混入が疑われる理由を返す（空配列なら疑いなし）。
 * 疑わしい作品は載せず、noindex＋転送の入口のままにする（勝手に書き換えない）。
 * ※「お客様」「仕様」「模様」「経年変化していく様」などの一般語は除外してから調べる。
 */
function suspicionReasons(w) {
  const reasons = [];
  const fields = ['name', 'category', 'material', 'color', 'size', 'shortDesc', 'longDesc'];
  const GENERIC = /お客様|お子様|皆様|皆さま|皆さん|仕様|模様|多様|文様|様々|様子|同様|様式|異様|各様|別様|宮殿|神殿|殿堂|氏名|たくさん|(?:好き|学生|ミニマリスト)さん|[いくるすたしてもり]様(?=[はをにがでもの、。と])/g;
  fields.forEach((f) => {
    const raw = String(w[f] == null ? '' : w[f]);
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(raw)) reasons.push(`${f}:メールアドレス`);
    if (/0\d{1,4}[-ー−]\d{1,4}[-ー−]\d{3,4}|(?<![\d.])0\d{9,10}(?![\d])/.test(raw)) reasons.push(`${f}:電話番号らしき数字`);
    const s = raw.replace(GENERIC, '■');
    const m = s.match(/.{0,6}(様|さん|さま|氏|殿).{0,4}/);
    if (m) reasons.push(`${f}:「${m[0].replace(/\s+/g, ' ')}」`);
    if (/(メルカリ|ラクマ|ヤフオク|minne|ミンネ|Creema|クリーマ|BASE)[「『]/.test(raw)) reasons.push(`${f}:販売サイト＋「名前」の形`);
  });
  // 「model <顧客名や取引先名>」形式の名前（NF2026_067 ゆうなみ・074/075 武蔵屋 など）
  if (/model[\s\u3000]+[^\x00-\x7f]/i.test(String(w.name || ''))) reasons.push('name:「model ＋ 相手先名」形式');
  return reasons;
}

/** 検索に載せる作品か（longDesc 300字以上・ID妥当・人名等の疑いなし） */
// 300字の判定は、末尾の【革について】（革ごとの説明と注意点・登録時に自動で付く定型の文）を除いた長さで数える（2026-11-26）。
// 定型の文だけで300字を超えるため、除かないと説明の薄い作品まで検索掲載の対象になる。本文（renderLong）には出したまま。
function ownDescLength(w) {
  const t = String(w.longDesc || '');
  const i = t.indexOf('【革について】');
  return i < 0 ? t.length : t.slice(0, i).trim().length;   // 注意書きの無い作品は今までどおりの数え方
}
function classify(w) {
  const long = ownDescLength(w) >= MIN_LONGDESC;
  if (!long) return { index: false, why: 'short' };
  const reasons = suspicionReasons(w);
  if (reasons.length) return { index: false, why: 'suspect', reasons };
  return { index: true };
}

/** shortDesc の先頭の一区切り（題名の補助に使う） */
function leadOf(text, max = 28) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  let head = t.split(/[。！!？?\n]/)[0];
  if (head.length > max) {
    const c = head.split('、')[0];
    head = c.length >= 8 && c.length <= max ? c : head.slice(0, max - 1) + '…';
  }
  return head;
}

/** 日本語の題名（サフィックスなし）を項目から組み立てる。例：名刺入れ｜マルゴ フォグ ジラソーレ */
function baseHead(w) {
  const cat = toHalf(String(w.category || '').split('／').map((s) => s.trim()).filter(Boolean).join('・'));
  const spec = toHalf([w.material, w.color].map((s) => String(s || '').trim()).filter(Boolean).join(' '));
  const size = String(w.size || '').trim();
  const shortSize = size && size !== PLACEHOLDER_SIZE && size.length <= 16 ? toHalf(size) : '';
  // 「mini6」「Micro5」などの短いサイズ名は検索語として効くので、種類のあとに添える
  const catLabel = [cat || '革の作品', shortSize].filter(Boolean).join(' ');
  let tail = spec;
  if (!tail) tail = leadOf(w.shortDesc);
  return [catLabel, tail].filter(Boolean).join('｜');
}

/** 載せる作品全体の題名（重複する題名には型番を足す） */
function assignHeads(indexed) {
  const heads = new Map();
  const count = new Map();
  indexed.forEach((w) => {
    const h = baseHead(w);
    heads.set(String(w.id), h);
    count.set(h, (count.get(h) || 0) + 1);
  });
  let dupGroups = 0;
  count.forEach((n) => { if (n > 1) dupGroups++; });
  indexed.forEach((w) => {
    const id = String(w.id);
    const h = heads.get(id);
    if (count.get(h) > 1) heads.set(id, `${h}（${id}）`);
  });
  return { heads, dupGroups };
}

/** 本文（longDesc）を段落・見出し・箇条書きにする。改行は段落として保つ */
function renderLong(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);
  let html = '';
  let list = [];
  const flush = () => {
    if (list.length) { html += '<ul>' + list.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'; list = []; }
  };
  lines.forEach((ln) => {
    if (/^[・･•]/.test(ln)) { list.push(ln.replace(/^[・･•]\s*/, '')); return; }
    flush();
    if (/^【[^】]{1,30}】$/.test(ln)) html += `<h2 class="sub">${esc(ln.slice(1, -1))}</h2>`;
    else html += `<p>${esc(ln)}</p>`;
  });
  flush();
  return html;
}

function validPrice(w) {
  const p = Number(w.price);
  return p > 0 && p < 999999 ? p : 0;
}
function isAvailable(w) {
  return !w.soldout && !w.noRestock && validPrice(w) > 0;
}

/** JSON-LD は </script> を壊さないよう < をエスケープ */
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

const CONSULT = (id) => `../order_estimate/hearing-ai.html?work=${encodeURIComponent(id)}`;

const PAGE_CSS = `
:root{--ink:#1f2933;--muted:#667085;--line:#d8dee8;--paper:#f7f8fa;--white:#fff;--accent:#2f6f73;--accent-dark:#234f52;--warm:#9a6a43;--radius:8px}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);line-height:1.8;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}
a{color:var(--accent-dark)}
.nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:12px 16px;background:var(--white);border-bottom:1px solid var(--line)}
.nav .brand{font-weight:800;text-decoration:none;color:var(--ink);margin-right:auto}
.nav a.link{font-size:14px;text-decoration:none;color:var(--muted)}
.wrap{max-width:860px;margin:0 auto;padding:18px 16px 56px}
.crumb{font-size:12px;color:var(--muted);margin:0 0 14px}
.crumb a{color:var(--muted)}
.eyebrow{color:var(--warm);font-size:12px;font-weight:800;letter-spacing:.1em;margin:0 0 6px}
h1{font-size:clamp(22px,5vw,32px);line-height:1.35;margin:0 0 6px;letter-spacing:0;overflow-wrap:anywhere}
.en{font-size:12px;color:var(--muted);margin:0 0 16px;font-family:ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.hero{margin:0 0 18px}
.hero img{display:block;width:100%;height:auto;max-height:78vh;object-fit:contain;background:#222;border-radius:var(--radius)}
.lead{font-size:16px;font-weight:600;margin:0 0 18px}
.badge{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid var(--line);background:var(--white);color:var(--muted);margin:0 0 14px}
.badge.on{border-color:var(--accent);color:var(--accent-dark)}
.card{background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;margin:0 0 18px}
.card h2{font-size:16px;margin:0 0 10px}
dl{margin:0;display:grid;grid-template-columns:7em 1fr;gap:6px 12px;font-size:14px}
dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}
.body p{margin:0 0 .9em}
.body ul{margin:0 0 .9em;padding-left:1.4em}
.body h2.sub{font-size:15px;margin:1.4em 0 .5em;padding-left:10px;border-left:3px solid var(--accent)}
.note{font-size:14px;background:#fff8ee;border:1px solid rgba(154,106,67,.25);border-radius:var(--radius);padding:12px 14px;margin:0 0 18px;color:#5a3d1e}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}
.btn{display:inline-block;padding:12px 20px;border-radius:var(--radius);text-decoration:none;font-weight:700;font-size:15px;background:var(--accent);color:#fff}
.btn.sub{background:var(--white);color:var(--accent-dark);border:1px solid var(--accent)}
.more{font-size:14px}
.footer{border-top:1px solid var(--line);background:var(--white);padding:20px 16px;text-align:center;color:var(--muted);font-size:12px}
.list h2{font-size:18px;margin:26px 0 8px;padding-left:10px;border-left:3px solid var(--accent)}
.list ul{list-style:none;margin:0;padding:0;columns:2 300px;column-gap:28px}
.list li{break-inside:avoid;margin:0 0 6px;font-size:14px;line-height:1.6}
.toc{font-size:13px;line-height:2}
.toc a{margin-right:14px;white-space:nowrap}
@media(max-width:560px){dl{grid-template-columns:5.5em 1fr}.btn{width:100%;text-align:center}}
`.trim();

/** 検索に載せる「読める作品ページ」 */
function buildIndexedHtml(w, head) {
  const id = String(w.id);
  const title = `${head} | N's factory 作品集`;
  const desc = buildDescription(w);
  const ogTitle = w.name || id;
  const image = ogImage(w.mainPhoto);
  const canonical = `${SITE}/works/${id}.html`;
  const target = `../works.html?id=${encodeURIComponent(id)}`;
  const price = validPrice(w);
  const available = isAvailable(w);
  const lead = String(w.shortDesc || '').trim();
  const size = String(w.size || '').trim();

  const rows = [];
  const add = (k, v) => { if (v) rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`); };
  add('種類', String(w.category || '').split('／').map((s) => s.trim()).filter(Boolean).join('・'));
  add('革・素材', w.material);
  add('色', w.color);
  add('サイズ', size);
  if (available) add('価格', `${price.toLocaleString('ja-JP')}円`);
  add('型番', id);

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: head,
    sku: id,
    url: canonical,
    image: [image],
    description: lead || desc,
    brand: { '@type': 'Brand', name: "N's factory" },
  };
  // category は入れない（2026-11-26 Search Console「項目 category の値が無効です」。
  //   Google は決まった分類体系の値を求めるため、自由な日本語の種類名は無効になる）。
  if (w.material) product.material = String(w.material).trim();
  if (w.color) product.color = String(w.color).trim();
  if (available) {
    product.offers = {
      '@type': 'Offer',
      url: canonical,
      price: String(price),
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    };
  }

  const status = available
    ? '<span class="badge on">販売中</span>'
    : '<span class="badge">販売済み・オーダー可</span>';
  const orderNote = available ? '' : '<p class="note">この作品は販売済みです。<strong>同じ仕様でオーダーできます。</strong>サイズや革・色の変更もご相談ください。</p>';

  // ⛔ ここに location.replace / meta refresh を足さない（人にも検索ロボットにも同じ中身を見せる）。
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="N's factory">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(ogTitle)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${jsonLd(product)}</script>
<style>${PAGE_CSS}</style>
</head>
<body>
<nav class="nav">
  <a class="brand" href="../">N's factory</a>
  <a class="link" href="../works.html">作品集</a>
  <a class="link" href="../works-list.html">作品一覧</a>
  <a class="link" href="../">トップ</a>
</nav>
<main class="wrap">
  <p class="crumb"><a href="../">トップ</a> › <a href="../works.html">作品集</a> › <a href="../works-list.html">作品一覧</a></p>
  <article>
    <p class="eyebrow">${esc(toHalf(String(w.category || '').split('／').map((s) => s.trim()).filter(Boolean).join('・')) || 'LEATHER WORKS')}</p>
    <h1>${esc(head)}</h1>
    <p class="en">${esc(w.name || id)}</p>
    <figure class="hero"><img src="${esc(image)}" alt="${esc(head)}" width="1200" height="900" fetchpriority="high"></figure>
    ${status}
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
    ${orderNote}
    <section class="card"><h2>作品の仕様</h2><dl>${rows.join('')}</dl></section>
    <section class="body">${renderLong(w.longDesc)}</section>
    <div class="cta">
      <a class="btn" href="${esc(target)}">作品集で写真をすべて見る</a>
      <a class="btn sub" href="${esc(CONSULT(id))}">この作品をもとに相談する</a>
    </div>
    <p class="more"><a href="../works-list.html">作品一覧へ</a> ／ <a href="../">N's factory トップへ</a></p>
  </article>
</main>
<footer class="footer">© N's factory</footer>
</body>
</html>
`;
}

/** 作品一覧の静的ページ（works-list.html）。載せる作品へ HTML のリンクを張る */
function buildListHtml(indexed, heads) {
  const groups = new Map();
  indexed.forEach((w) => {
    const first = toHalf(String(w.category || '').split('／')[0].trim()) || 'その他';
    if (!groups.has(first)) groups.set(first, []);
    groups.get(first).push(w);
  });
  const order = [...groups.keys()].sort((a, b) => {
    if (a === 'その他') return 1;
    if (b === 'その他') return -1;
    return groups.get(b).length - groups.get(a).length || a.localeCompare(b, 'ja');
  });
  const canonical = `${SITE}/works-list.html`;
  const title = `作品一覧 | N's factory 作品集（${indexed.length}点）`;
  const desc = `N's factory が制作したシステム手帳・名刺入れ・財布・キーケースなどの革製品を種類ごとに${indexed.length}点掲載。写真と説明つきの各作品ページから、同じ仕様のオーダー相談もできます。`;
  const toc = order.map((c, i) => `<a href="#c${i}">${esc(c)}（${groups.get(c).length}）</a>`).join('');
  const sections = order.map((c, i) => {
    const items = groups.get(c).slice().sort((a, b) => String(b.id).localeCompare(String(a.id)));
    return `<section id="c${i}"><h2>${esc(c)}（${items.length}点）</h2><ul>${items
      .map((w) => `<li><a href="works/${esc(w.id)}.html">${esc(heads.get(String(w.id)))}</a></li>`).join('')}</ul></section>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="N's factory">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/assets/logo.png">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
<style>${PAGE_CSS}</style>
</head>
<body>
<nav class="nav">
  <a class="brand" href="./">N's factory</a>
  <a class="link" href="works.html">作品集（写真で見る）</a>
  <a class="link" href="./">トップ</a>
</nav>
<main class="wrap list">
  <p class="crumb"><a href="./">トップ</a> › 作品一覧</p>
  <p class="eyebrow">LEATHER WORKS INDEX</p>
  <h1>作品一覧</h1>
  <p class="lead">千葉県印西市の革職人・N's factory が制作した作品を、種類ごとに${indexed.length}点まとめました。気になる作品のページでは、写真・説明・仕様をご覧いただけます。</p>
  <p class="toc">${toc}</p>
  ${sections}
  <p class="more" style="margin-top:28px"><a href="works.html">写真でさがす作品集はこちら</a> ／ <a href="order_estimate/hearing-ai.html">オーダー相談</a></p>
</main>
<footer class="footer">© N's factory</footer>
</body>
</html>
`;
}

// ───────────────────────────────────────────────
// sitemap.xml の WORKS 区間だけを差し替える（refill / course と同じ方式）
// ───────────────────────────────────────────────
const WORKS_SM_START = '<!-- WORKS:start -->';
const WORKS_SM_END = '<!-- WORKS:end -->';

function workLastmod(w) {
  const m = String(w.date || '').match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : '';
}

function sitemapBody(indexed) {
  const lines = [`  <url><loc>${SITE}/works-list.html</loc></url>`];
  indexed.slice().sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach((w) => {
    const lm = workLastmod(w);
    lines.push(`  <url><loc>${SITE}/works/${w.id}.html</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`);
  });
  return lines.join('\n');
}

/** 印が無ければ </urlset> の直前に印ごと挿入し、あれば間だけ差し替える。変わらなければ書かない */
function updateSitemap(indexed) {
  const file = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(file)) return 'sitemap.xml なし（スキップ）';
  const src = fs.readFileSync(file, 'utf8');
  const body = sitemapBody(indexed);
  const block = `${WORKS_SM_START}\n${body}\n  ${WORKS_SM_END}`;
  let out;
  const a = src.indexOf(WORKS_SM_START);
  const b = src.indexOf(WORKS_SM_END);
  if (a >= 0 && b > a) {
    out = src.slice(0, a) + block + src.slice(b + WORKS_SM_END.length);
  } else {
    const z = src.lastIndexOf('</urlset>');
    if (z < 0) return 'sitemap.xml に </urlset> が無い（スキップ）';
    out = src.slice(0, z) + `  <!-- 作品ページ（tools/build_work_pages.js が差し替える・2026-11-26 事業主決定で 300字以上の作品だけ載せる） -->\n  ${block}\n` + src.slice(z);
  }
  if (out === src) return 'sitemap.xml 変更なし';
  fs.writeFileSync(file, out, 'utf8');
  return 'sitemap.xml 更新';
}

/** 転送だけの入口ページ（300字未満・人名等の疑いのある作品。従来どおり noindex） */
function buildRedirectHtml(w) {
  const id = String(w.id);
  const title = `${w.name || id} | N's factory 作品集`;
  const desc = buildDescription(w);
  const image = ogImage(w.mainPhoto);
  const canonical = `${SITE}/works/${id}.html`;
  const target = `${SITE}/works.html?id=${encodeURIComponent(id)}`;

  // このページは検索結果に載せない（noindex）。対象は longDesc が300字未満の作品と、人名等の疑いで
  //    保留した作品だけ。300字以上の作品は buildIndexedHtml が中身のあるページを作る。
  //    （2026-10-16 は全作品を noindex にしていたが、2026-11-26 事業主決定「B 今のまま入口を増やす」で
  //     300字以上だけ載せる方針に変更。OGP を読む SNS クローラーは noindex の影響を受けない。）
  //    ⛔ 300字未満まで noindex を外さないこと（中身の薄いページを索引へ大量に入れない）。
  // ⛔ meta refresh は使わない。
  //    Metaのクローラは refresh を追ってしまい、OGPを持たない works.html を読んで
  //    「プレビューなし」になる（2026-08-12 Threadsで実際に発生）。
  //    クローラはJavaScriptを実行しないので、転送を location.replace だけにすれば
  //    クローラはこのページのOGPを読んで止まり、人間だけが詳細へ進む。
  //    replace を使うのは、戻るボタンでこの中継ページに戻ってループしないようにするため。
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="noindex,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="N's factory">
<meta property="og:title" content="${esc(w.name || id)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(w.name || id)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(w.name || id)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
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

  // 仕分け：載せる（読めるページ）／転送のまま
  const plan = valid.map((w) => ({ w, c: classify(w) }));
  const indexed = plan.filter((p) => p.c.index).map((p) => p.w);
  const { heads, dupGroups } = assignHeads(indexed);

  let written = 0;
  const writeIfChanged = (file, html) => {
    // 内容が同じならファイルを触らない（gitの差分と再デプロイを無駄に増やさない）
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === html) return;
    fs.writeFileSync(file, html);
    written++;
  };
  plan.forEach(({ w, c }) => {
    const file = path.join(OUT_DIR, `${w.id}.html`);
    writeIfChanged(file, c.index ? buildIndexedHtml(w, heads.get(String(w.id))) : buildRedirectHtml(w));
  });

  // 作品一覧（works/ の外に置く。works/ 内の .html は下の掃除で消えるため）
  writeIfChanged(path.join(ROOT, 'works-list.html'), buildListHtml(indexed, heads));
  const sm = updateSitemap(indexed);

  // 掲載を取り下げた作品のページは消す（SNSに貼った旧URLは404になるが、
  // 削除済み商品の詳細が開けてしまうよりよい）
  let removed = 0;
  fs.readdirSync(OUT_DIR).forEach((f) => {
    if (f.endsWith('.html') && !keep.has(f)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      removed++;
    }
  });

  const held = plan.filter((p) => p.c.why === 'suspect');
  const shorts = plan.filter((p) => p.c.why === 'short');
  console.log(`作品ページ: ${valid.length}件（更新 ${written} / 削除 ${removed}${skipped ? ` / ID不正でスキップ ${skipped}` : ''}）`);
  console.log(`  検索に載せる ${indexed.length} / 転送のまま ${shorts.length + held.length}（300字未満 ${shorts.length}・人名等の疑いで保留 ${held.length}）/ 題名の重複グループ ${dupGroups} / ${sm}`);
  held.forEach((p) => console.log(`  保留 ${p.w.id}: ${p.c.reasons.join(' | ')}`));
}

main();
