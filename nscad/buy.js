// 購入先のリンク（事業主 2026-11-08「それぞれのリングデータにどこで販売されていたものなのか、URLとリンクをセットで管理し、いつでも購入できるようにしたい。楽天であればアフィリエイトで誘導すること」）。純粋関数。
// リングごとに、店名（shopName）と商品ページの URL（shopUrl）を持ち、「買う」リンクを作る。楽天の商品ページの URL は、アフィリエイトのリンクに自動で直す。
//   楽天アフィリエイトの ID は、公開されるリンクの URL に必ず含まれる値（秘密の鍵ではない）。N's factory の楽天アフィリエイト（店舗名ごとのリンクではなく、アカウントの共通 ID）。
//   ⛔ ここに楽天の API キー・アクセスキーを書かない（それは保全部の .env だけ）。
export const RAKUTEN_AFFILIATE_ID = '1ce87d88.dc83ba0b.1ce87d89.6c18bd86';
const RAKUTEN_HOST = /(^|\.)rakuten\.co\.jp$/;
/** リンクに付いてきた計測用の値（検索結果から開いたときなど）は、アフィリエイトの邪魔なので外す。 */
const TRACKING = /^(scid|sc2id|rafcid|s-id|l-id|iasid|utm_[a-z]+)$/i;
/** 入力された URL を検算して、買うためのリンクにする。戻り値 { ok, href, shop: 'rakuten'|'other', affiliate, host }。ok=false は、http・https でない・URL でないもの。
 *  楽天（item.rakuten.co.jp など）→ https://hb.afl.rakuten.co.jp/hgc/<ID>/?pc=<商品URL>&m=<商品URL>。すでにアフィリエイトのリンク（hb.afl.rakuten.co.jp・a.r10.to）はそのまま。ID が空なら変換しない。 */
export function buyLinkOf(raw, id = RAKUTEN_AFFILIATE_ID) {
  let u; try { u = new URL(String(raw ?? '').trim()); } catch { return { ok: false }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false };
  const host = u.hostname.toLowerCase();
  if (host === 'hb.afl.rakuten.co.jp' || host === 'a.r10.to') return { ok: true, href: u.href, shop: 'rakuten', affiliate: true, host };
  if (RAKUTEN_HOST.test(host) && id) {
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    const enc = encodeURIComponent(u.href); return { ok: true, href: `https://hb.afl.rakuten.co.jp/hgc/${id}/?pc=${enc}&m=${enc}`, shop: 'rakuten', affiliate: true, host };
  }
  return { ok: true, href: u.href, shop: RAKUTEN_HOST.test(host) ? 'rakuten' : 'other', affiliate: false, host };
}
/** 保存する URL（正規の形）。空欄は ''、URL でないものは null。 */
export function cleanShopUrl(raw) { const s = String(raw ?? '').trim(); if (!s) return ''; if (s.length > 600) return null; const b = buyLinkOf(s, ''); return b.ok ? new URL(s).href : null; }
