// 記録の書き出し・読み込み（スマホを替えるとき用）。ファイルは本人の端末の中だけで作り、サーバーへは送らない。
import { stamps } from './stamps.js';
import { photos } from './photos.js';

const toDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
const toBlob = async (url) => (await fetch(url)).blob();

export async function exportAll() {
  const visits = [];
  for (const v of stamps.all()) {
    const o = { shrineId: v.shrineId, visitedAt: v.visitedAt, shareOk: !!v.shareOk };
    if (v.photoId) { try { const b = await photos.get(v.photoId); if (b) o.photo = await toDataURL(b); } catch (_) { /* 写真なしで書き出す */ } }
    visits.push(o);
  }
  const body = JSON.stringify({ app: 'shrine-note-stamps', v: 1, exportedAt: new Date().toISOString(), visits });
  const blob = new Blob([body], { type: 'application/json' });
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `御朱印スタンプ帳_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { count: visits.length, photos: visits.filter((x) => x.photo).length };
}

// 読み込み：いまの記録に足すだけ（同じ神社は、今のものを残す）。validIds は掲載中の神社 ID の集合
export async function importAll(file, validIds) {
  let j;
  try { j = JSON.parse(await file.text()); } catch (_) { throw new Error('読めないファイルです'); }
  if (!j || j.app !== 'shrine-note-stamps' || j.v !== 1 || !Array.isArray(j.visits)) throw new Error('このアプリの書き出しファイルではありません');
  let added = 0, skipped = 0;
  for (const o of j.visits) {
    if (!o || typeof o.shrineId !== 'string' || !validIds.has(o.shrineId) || !/^\d{4}-\d{2}-\d{2}$/.test(o.visitedAt || '')) { skipped++; continue; }
    if (stamps.has(o.shrineId)) { skipped++; continue; }
    let photoId = null;
    if (typeof o.photo === 'string' && o.photo.startsWith('data:image/')) { try { photoId = await photos.put(await toBlob(o.photo)); } catch (_) { photoId = null; } }
    stamps.addRecord({ shrineId: o.shrineId, visitedAt: o.visitedAt, photoId, shareOk: false });
    added++;
  }
  return { added, skipped };
}
