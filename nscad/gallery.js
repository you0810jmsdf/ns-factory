// 型紙ギャラリー：「ギャラリーに登録」ボタン1つで、タイトル・著作権表示・説明・利用条件を自動で整え、個人情報の疑いを調べる（事業主 2026-11-02）。
// この部品は、整える計算だけ（画面にも通信にも触れない）。保存先・公開・審査はまだ無い：いまは「整形のプレビュー」まで。
export const GALLERY_LICENSES = ['personal', 'commercial'];   /* personal＝個人で楽しむ用（作った物の販売はしない）・commercial＝作った革製品の販売まで可（型紙そのものの再配布はしない） */
export const GALLERY_LIMITS = { title: 60, author: 30, description: 400, url: 200 };
/** 登録の受け口（Cloudflare Worker leather-cad-gallery・保存先は D1。gallery-worker/README.md）。承認待ちで受け、運営者が承認すると公開される。 */
export const GALLERY_ENDPOINT = 'https://leather-cad-gallery.bouncy-xenoposeidon.workers.dev';

/** 図面タブの名前（ファイル名のことが多い）から、ギャラリーのタイトルの初期値を作る：拡張子と日付の頭（20261101_）を外し、_ を空白にする。空なら ''。 */
export function galleryTitleFrom(name) {
  let s = String(name ?? '').trim().replace(/\.(lcc|json|svg|dxf|ncad)$/i, '');
  s = s.replace(/^\d{8}[_\-\s]+/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.slice(0, GALLERY_LIMITS.title);
}
/** 著作権表示：「© 2026 作者名」。作者名が空なら ''。 */
export function galleryCopyright(author, year) {
  const a = String(author ?? '').trim();
  return a ? `© ${year} ${a}` : '';
}
/** 登録する図面の数え方（説明文と画面の「出るもの」で使う）。shapes は登録する図形、holes は縫い穴。外接矩形が無ければ null。 */
export function galleryStats(shapes, holes, bbox) {
  if (!bbox) return null;
  return { shapes: shapes.length, holes: holes.length, w: +(bbox.maxX - bbox.minX).toFixed(1), h: +(bbox.maxY - bbox.minY).toFixed(1) };
}
/** https:// で始まる 1 行の宛先だけ通す（作者のページ＝販売先のリンク）。空は「なし」で通す。 */
export function galleryUrlOk(s) {
  const u = String(s ?? '').trim();
  if (!u) return true;
  return u.length <= GALLERY_LIMITS.url && /^https:\/\/[^\s<>"']+$/.test(u);
}

/* 個人情報の疑い：図面の文字・計算メモ・タブ名・タイトル・説明の中から、メール・電話・郵便番号・住所・リンクらしき文字を探す。人名は見分けられない（画面でそう断る）。 */
const PII_PATTERNS = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['url', /https?:\/\/[^\s<>"']+/g],
  ['postal', /(?<![\d\-ー−‐])〒?\s?\d{3}[-ー−‐]\d{4}(?![\d\-ー−‐])/g],   /* 電話番号の後ろ 123-4567 を郵便番号と取り違えない */
  ['phone', /(?<![\d.])0\d{1,4}[-ー−‐ ]\d{1,4}[-ー−‐ ]\d{3,4}(?![\d.])|(?<![\d.])0[5789]0\d{8}(?!\d)/g],
  ['address', /(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)[一-龥ぁ-んァ-ヶー0-9０-９]{1,10}[市区町村郡]/g],
];
/** texts：[{ where: 'text'|'memo'|'name'|'title'|'desc', text }]。返すのは [{ kind, where, text }]（同じ場所・同じ文字は1件）。 */
export function galleryPiiScan(texts) {
  const out = [], seen = new Set();
  for (const { where, text } of texts) {
    const src = String(text ?? '').normalize('NFKC');
    if (!src) continue;
    for (const [kind, re] of PII_PATTERNS) {
      for (const m of src.matchAll(re)) {
        const key = `${kind}|${where}|${m[0]}`;
        if (seen.has(key)) continue;
        seen.add(key); out.push({ kind, where, text: m[0].slice(0, 40) });
      }
    }
  }
  return out;
}
/** 図面の中の文字（文字図形・計算メモ）を、個人情報の調べ用にまとめる。 */
export function galleryDocTexts(doc) {
  const list = [];
  for (const s of doc.shapes ?? []) if (s.type === 'text' && s.text) list.push({ where: 'text', text: s.text });
  for (const m of doc.calcMemos ?? []) { if (m.note) list.push({ where: 'memo', text: m.note }); if (m.expr) list.push({ where: 'memo', text: m.expr }); }
  return list;
}

/** 送る図面：図面の全部から、写真（画像の図形）と計算メモ（本人のメモ）を除いたもの。もとの図面は変えない。 */
export function galleryPayloadDoc(doc) {
  const { calcMemos, ...rest } = doc;
  return { ...rest, shapes: (doc.shapes ?? []).filter(s => s.type !== 'image') };
}

/** 入力の点検。返すのは { ok, errors:[コード] }：title / author / license / url / description / empty（登録する図形が無い）。 */
export function galleryCheck({ title, author, license, url, description, stats }) {
  const errors = [];
  if (!stats) errors.push('empty');
  if (!String(title ?? '').trim()) errors.push('title');
  else if (String(title).trim().length > GALLERY_LIMITS.title) errors.push('title');
  if (!String(author ?? '').trim() || String(author).trim().length > GALLERY_LIMITS.author) errors.push('author');
  if (!GALLERY_LICENSES.includes(license)) errors.push('license');
  if (!galleryUrlOk(url)) errors.push('url');
  if (String(description ?? '').length > GALLERY_LIMITS.description) errors.push('description');
  return { ok: !errors.length, errors };
}
/** 整形の結果（登録する中身のひな形）。保存先ができたら、これをそのまま送る。 */
export function galleryEntry({ title, author, license, url, description, stats, year }) {
  return { title: String(title).trim(), author: String(author).trim(), copyright: galleryCopyright(author, year), license, authorUrl: String(url ?? '').trim(), description: String(description ?? '').trim(), stats };
}
