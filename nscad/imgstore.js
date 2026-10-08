// 下絵画像の置き場（IndexedDB・依存なし）。localStorage には入れない。無い環境ではメモリに置く。
const DB = 'leather-cad', STORE = 'images', memory = new Map();
function open() { return new Promise((resolve, reject) => { if (typeof indexedDB === 'undefined') return resolve(null); const req = indexedDB.open(DB, 1); req.onupgradeneeded = () => { req.result.createObjectStore(STORE); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
/** 画像（data URL）を保存して id を返す。 */
export async function putImage(dataUrl, id = 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) {
  const db = await open().catch(() => null); if (!db) { memory.set(id, dataUrl); return id; }
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(dataUrl, id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); return id;
}
export async function getImage(id) {
  if (memory.has(id)) return memory.get(id);
  const db = await open().catch(() => null); if (!db) return null;
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readonly'), req = tx.objectStore(STORE).get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
}
export async function deleteImage(id) { memory.delete(id); const db = await open().catch(() => null); if (!db) return; await new Promise(resolve => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = resolve; tx.onerror = resolve; }); }
/** 画像を長辺 maxPx に縮小した data URL を返す（Canvas が無い環境ではそのまま）。 */
export function shrinkDataUrl(dataUrl, maxPx = 3000, { createImage = null, createCanvas = null } = {}) {
  return new Promise(resolve => {
    const mkImg = createImage || (typeof Image === 'function' ? () => new Image() : null), mkCanvas = createCanvas || (typeof document !== 'undefined' && document.createElement ? () => document.createElement('canvas') : null);
    if (!mkImg || !mkCanvas) return resolve({ dataUrl, width: null, height: null });
    const img = mkImg(); img.onload = () => { const k = Math.min(1, maxPx / Math.max(img.width, img.height)); if (k >= 1) return resolve({ dataUrl, width: img.width, height: img.height }); const c = mkCanvas(); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve({ dataUrl: c.toDataURL('image/jpeg', 0.9), width: c.width, height: c.height }); }; img.onerror = () => resolve({ dataUrl, width: null, height: null }); img.src = dataUrl;
  });
}
