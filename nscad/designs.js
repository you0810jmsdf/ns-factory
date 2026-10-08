// 事業主の過去設計カタログ（designs/<id>.json・tools/import_lcc.js が生成）を読む。fetch はここだけ（app.js には置かない）。
// file:// で開いたときは fetch が使えないので null を返し、呼び元が「サーバー経由で開く」案内を出す。
export async function loadDesign(item, { base = 'designs/', transport = typeof fetch === 'function' ? fetch : null, protocol = typeof location !== 'undefined' ? location.protocol : 'http:' } = {}) {
  if (!item || !transport || protocol === 'file:') return null;
  const res = await transport(base + (item.file || item.id + '.json'), { cache: 'force-cache' });
  if (!res.ok) throw new Error('design ' + res.status);
  return res.json();
}
/** 索引を検索語で絞る（名前・フォルダ・タグの部分一致・空は全件）。 */
export function filterDesigns(items, query = '') {
  const q = String(query || '').toLowerCase().trim(); if (!q) return items;
  return items.filter(it => [it.name, it.folder, ...(it.tags || [])].some(v => String(v || '').toLowerCase().includes(q)));
}
