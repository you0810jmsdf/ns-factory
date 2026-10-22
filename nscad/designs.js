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
import { parseLcc, lccToDoc, lccStats, aggregateStyle } from './lcc.js';
import { validateDoc, migrateDoc } from './geometry.js';

/** Local-only retrieval. No remote inference or network request is made here. */
const DESIGN_TERMS = [
  ['wallet', /財布|ウォレット|wallet/i], ['notebook', /手帳|ノート|notebook|planner|binder/i],
  ['cardcase', /名刺|カード|card.?case/i], ['passcase', /パスケース|定期|pass.?case/i],
  ['coincase', /小銭|コイン|coin/i], ['bifold', /2つ折|２つ折|二つ折|2折|bifold|bi-fold/i],
  ['trifold', /3つ折|３つ折|三つ折|trifold|tri-fold/i], ['m5', /micro\s*5|m5|マイクロ5|マイクロファイブ/i],
  ['mini6', /mini\s*6|ミニ6|ミニ６/i], ['bible', /聖書|バイブル|bible/i], ['a5', /a5|Ａ５/i], ['a6', /a6|Ａ６/i],
  ['flap', /フラップ|flap/i], ['round', /ラウンド|丸|round/i]
];
export function designTerms(text) { return DESIGN_TERMS.filter(([, re]) => re.test(String(text))).map(([k]) => k); }
export function rankLocalDesigns(items, query, limit = 5) {
  const terms = designTerms(query), words = String(query).toLowerCase().split(/[\s、。]+/).filter(w => w.length > 1);
  if (!terms.length && !words.length) return [];
  return items.map(item => {
    const text = [item.name, item.folder, ...(item.tags || [])].join(' ').toLowerCase(), tags = designTerms(text);
    const score = terms.reduce((n, k) => n + (tags.includes(k) ? (['m5','mini6','a5','a6','bible'].includes(k) ? 6 : 4) : 0), 0) + words.reduce((n, w) => n + (text.includes(w) ? 2 : 0), 0);
    return { item, score };
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id))).slice(0, limit);
}
/** Dimensions are explicit mm only; omitted dimensions stay unset, never inferred from reference bounding boxes. */
export function localDesignRequest(text) {
  const q = String(text).normalize('NFKC'), terms = designTerms(q);
  const num = words => { const m = q.match(new RegExp('(?:'+words+')\\s*(?:は|を|が|:)?\\s*(\\d+(?:\\.\\d+)?)\\s*(cm|センチ|mm|ミリ)?','i')); return m ? Number(m[1]) * (/cm|センチ/.test(m[2] || '') ? 10 : 1) : undefined; };
  const request = { text: q, terms, bifold: terms.includes('bifold'), width: num('幅|横|width'), height: num('高さ|縦|height'), radius: num('内半径|半径|radius'), pitch: num('ピッチ|pitch'), thickness: num('革厚|革の厚み|thickness'), ringD: num('リング径|リング直径|ring diameter') };
  request.refill = ['m5','mini6','bible','a5','a6'].find(k => terms.includes(k));
  request.kind = ['notebook','passcase','cardcase','coincase'].find(k => terms.includes(k));
  request.invalid = ['width','height','radius','pitch','thickness','ringD'].some(k => request[k] !== undefined && (!Number.isFinite(request[k]) || request[k] <= 0 || request[k] > 2000));
  return request;
}
/** Keep source files on this browser only. Parse statistics now, convert full geometry only when used. */
export async function learnLocalFiles(files) {
  const items = [], stats = [], failed = []; let packStyle = null;
  for (const file of files) {
    if (/\.nscadlearn$/i.test(file.name)) {
      try {
        if (file.size > 256 * 1024 * 1024) throw new Error('pack-too-large');
        const pack=JSON.parse(await file.text()); if(pack.version!==1 || !Array.isArray(pack.items) || pack.items.length>5000) throw new Error('invalid-pack');
        const nested=await learnLocalFiles(pack.items.map((it,i)=>{if(!['lcc','json'].includes(it.format)||typeof it.raw!=='string')throw new Error('invalid-pack-item');return {name:(it.name||String(i))+'.'+it.format,webkitRelativePath:String(it.id||i),size:it.raw.length*2,text:async()=>it.raw};}));
        items.push(...nested.items); if(pack.style?.files) packStyle=pack.style; else if(nested.style.files) stats.push(...nested.items.filter(it=>it.format==='lcc').map(it=>lccStats(parseLcc(it.raw)))); failed.push(...nested.failed, ...(Array.isArray(pack.failed) ? pack.failed : []));
      } catch(error){failed.push({name:file.name,error:error.message});}
      continue;
    }
    if (!/\.(lcc|json)$/i.test(file.name)) continue;
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('file-too-large');
      const raw = await file.text(), name = file.name.replace(/\.(lcc|json)$/i,''), id = file.webkitRelativePath || file.name;
      if (/\.lcc$/i.test(file.name)) { const parsed = parseLcc(raw); if (!parsed) throw new Error('invalid-lcc'); const st = lccStats(parsed); stats.push(st); items.push({ id, name, folder: id, raw, format:'lcc', pitch: Object.entries(st.pitch).sort((a,b)=>b[1]-a[1])[0]?.[0] }); }
      else { const doc = migrateDoc(JSON.parse(raw)); if (!validateDoc(doc)) throw new Error('invalid-doc'); items.push({ id, name, folder:id, raw, format:'json', pitch: doc.tools?.[0]?.pitch }); }
    } catch (error) { failed.push({ name:file.name, error:error.message }); }
  }
  return { version:1, items, style: packStyle && stats.length === 0 ? packStyle : aggregateStyle(stats), failed, learnedAt:new Date().toISOString() };
}
export function localReferenceDoc(item) {
  const doc = item.format === 'lcc' ? lccToDoc(parseLcc(item.raw), { name:item.name }).doc : migrateDoc(JSON.parse(item.raw));
  if (!validateDoc(doc)) throw new Error('invalid-doc'); return doc;
}
/** IndexedDB stores the private corpus, never localStorage or a public asset. */
export function localDesignStore(value) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    const req = indexedDB.open('nscad-private-designs', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('corpus');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { const db=req.result, tx=db.transaction('corpus', value === undefined ? 'readonly':'readwrite'), store=tx.objectStore('corpus'); let result=null;
      const op = value === undefined ? store.get('owner') : value === null ? store.delete('owner') : store.put(value,'owner');
      op.onsuccess=()=>{ result=op.result; }; tx.oncomplete=()=>{db.close();resolve(result);}; tx.onerror=()=>{db.close();reject(tx.error);}; tx.onabort=()=>{db.close();reject(tx.error || new Error('storage-aborted'));};
    };
  });
}
