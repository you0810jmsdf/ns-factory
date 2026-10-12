// 御朱印の写真。この端末の IndexedDB だけに保存し、サーバーへは送らない。
// 取り込み時に canvas へ描き直すので、撮影位置などの EXIF は残らない。
const DB = 'shrine-note-photos', STORE = 'p';
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), out = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(out && out.result); };
    t.onerror = () => { db.close(); rej(t.error); };
  });
}
// 長辺 1600px の JPEG にして返す
export async function shrink(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.86));
}
export const photos = {
  async put(blob) { const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await tx('readwrite', (s) => s.put(blob, id)); return id; },
  get: (id) => tx('readonly', (s) => s.get(id)),
  del: (id) => tx('readwrite', (s) => s.delete(id)),
};
