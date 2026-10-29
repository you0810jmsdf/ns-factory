// 「元に戻す」の履歴を残す：自動保存と同じ時に IndexedDB へ（再起動しても戻れる）・保存ファイルにも入れられる（別のPCでも戻れる）。
// 履歴は「操作前の図面の JSON」の並び（最大100）。まるごと圧縮（gzip）して文字列にする。圧縮が使えない環境では、そのままの JSON 文字列（r1:）。
export const UNDO_KEEP_MAX = 100;
const UST_DB = 'leather-cad-undo', UST_STORE = 'stacks', UST_KEY = 'current', UST_FILES_KEY = 'files';
/** 副のタブ（別のブラウザタブが主）の履歴の置き場。主の置き場（current）を上書き・削除しないための別の項目（2026-10-29 事業主「もっと前にさかのぼりたい」：副のタブは履歴を保管しておらず、再読み込みで空になった）。 */
export const UST_SUB_KEY = 'sub';
const ustMemory = () => (globalThis.__lcUndoMem ??= new Map());
/** 履歴の1件は、図面の JSON 文字列（{ で始まる・5000万文字未満）だけを通す。壊れたファイルで「元に戻す」が落ちないように。 */
const ustValid = a => Array.isArray(a) && a.every(s => typeof s === 'string' && s.charCodeAt(0) === 123 && s.length < 50_000_000);
const ustBytesToB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const ustB64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const ustCanGzip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function' && typeof btoa === 'function' && typeof atob === 'function';
const ustPipe = async (input, stream) => new Uint8Array(await new Response(new Blob([input]).stream().pipeThrough(stream)).arrayBuffer());

/** { undo: [JSON文字列…], redo: [...] } を、後ろ（新しいほう）から keep 件だけ残して、文字列にする。gzip が使えれば 'g1:' + base64、なければ 'r1:' + JSON。 */
export async function encodeStacks(stacks, { keep = UNDO_KEEP_MAX, gzip = true } = {}) {
  const n = Math.max(0, Math.min(UNDO_KEEP_MAX, Math.floor(keep))), cut = a => (a || []).slice(a && a.length > n ? a.length - n : 0);
  const json = JSON.stringify({ v: 1, undo: n ? cut(stacks.undo) : [], redo: n ? cut(stacks.redo) : [] });
  if (!gzip || !ustCanGzip()) return 'r1:' + json;
  return 'g1:' + ustBytesToB64(await ustPipe(json, new CompressionStream('gzip')));
}
/** encodeStacks の文字列を戻す。壊れている・読めない・履歴が図面の形でないときは null。 */
export async function decodeStacks(text) {
  try {
    if (typeof text !== 'string') return null;
    let json; if (text.startsWith('r1:')) json = text.slice(3); else if (text.startsWith('g1:') && ustCanGzip()) json = new TextDecoder().decode(await ustPipe(ustB64ToBytes(text.slice(3)), new DecompressionStream('gzip'))); else return null;
    const j = JSON.parse(json); if (!j || j.v !== 1 || !ustValid(j.undo) || !ustValid(j.redo)) return null;
    return { undo: j.undo.slice(-UNDO_KEEP_MAX), redo: j.redo.slice(-UNDO_KEEP_MAX) };
  } catch { return null; }
}

function ustOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(UST_DB, 1); req.onupgradeneeded = () => { req.result.createObjectStore(UST_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
/** ブラウザ内の保管（自動保存の1回分）：{ savedAt, tabs: [encodeStacks の文字列 | null, …] }。IndexedDB が無い環境ではメモリに置く。 */
export async function saveUndoRecord(record, key = UST_KEY) {
  const db = await ustOpen().catch(() => null); if (!db) { ustMemory().set(key, record); return; }
  await new Promise((resolve, reject) => { const tx = db.transaction(UST_STORE, 'readwrite'); tx.objectStore(UST_STORE).put(record, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }).catch(() => {}); db.close();
}
export async function loadUndoRecord(key = UST_KEY) {
  const db = await ustOpen().catch(() => null); if (!db) return ustMemory().get(key) || null;
  const r = await new Promise(resolve => { const req = db.transaction(UST_STORE, 'readonly').objectStore(UST_STORE).get(key); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); }); db.close(); return r;
}
/** key を渡さない（主）ときは、主の履歴とファイルの行き先を消す（今までどおり）。副の置き場（UST_SUB_KEY）を渡したときは、その置き場だけ消す（主のものは残す）。 */
export async function clearUndoRecord(key = UST_KEY) {
  const keys = key === UST_KEY ? [UST_KEY, UST_FILES_KEY] : [key];
  const db = await ustOpen().catch(() => null); if (!db) { for (const k of keys) ustMemory().delete(k); return; }
  await new Promise(resolve => { const tx = db.transaction(UST_STORE, 'readwrite'); for (const k of keys) tx.objectStore(UST_STORE).delete(k); tx.oncomplete = resolve; tx.onerror = resolve; }); db.close();
}
/** 保存したファイルの行き先（FileSystemFileHandle）の保管（事業主指示 2026-10-21「上書き保存機能はないのか？」：再読み込みで行き先を忘れ、毎回「名前を付けて保存」になっていた）：{ savedAt, handles: [ハンドル | null, …] }（タブの順）。
 *  履歴とは別の項目にする：ハンドルを保管できない環境でも、履歴の保管は巻き込まない。自動保存と同じ時刻（savedAt）が合うときだけ使う。 */
export async function saveFilesRecord(record) {
  const db = await ustOpen().catch(() => null); if (!db) { ustMemory().set(UST_FILES_KEY, record); return; }
  await new Promise((resolve, reject) => { const tx = db.transaction(UST_STORE, 'readwrite'); tx.objectStore(UST_STORE).put(record, UST_FILES_KEY); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }).catch(() => {}); db.close();
}
export async function loadFilesRecord() {
  const db = await ustOpen().catch(() => null); if (!db) return ustMemory().get(UST_FILES_KEY) || null;
  const r = await new Promise(resolve => { const req = db.transaction(UST_STORE, 'readonly').objectStore(UST_STORE).get(UST_FILES_KEY); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); }); db.close(); return r;
}
