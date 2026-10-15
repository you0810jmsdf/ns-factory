// 不具合記録の保存先（共有フォルダ）。Chrome・Edge の「フォルダを選ぶ」で、OneDrive の中のフォルダをいちど選ぶと、次からそこへ直接保存する（ほかの PC からも同じフォルダを見られる）。
// 選んだフォルダは IndexedDB に覚える（ほかのデータとは別の入れ物）。使えない環境（Firefox・Safari など）では、呼び出し側が通常のダウンロードにもどす。
const BUGDIR_DB = 'leather-cad-bugdir', BUGDIR_STORE = 'handles', BUGDIR_KEY = 'dir';
let bugdirMemory = null; /* IndexedDB が無い環境では、ページを開いている間だけ覚える */
function openBugdirDb() { return new Promise(resolve => { if (typeof indexedDB === 'undefined') return resolve(null); const req = indexedDB.open(BUGDIR_DB, 1); req.onupgradeneeded = () => req.result.createObjectStore(BUGDIR_STORE); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); }
/** 覚えているフォルダ（なければ null）。 */
export async function getSavedDir() {
  const db = await openBugdirDb(); if (!db) return bugdirMemory;
  return new Promise(resolve => { const tx = db.transaction(BUGDIR_STORE, 'readonly'), req = tx.objectStore(BUGDIR_STORE).get(BUGDIR_KEY); req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); });
}
export async function setSavedDir(handle) {
  bugdirMemory = handle; const db = await openBugdirDb(); if (!db) return;
  await new Promise(resolve => { const tx = db.transaction(BUGDIR_STORE, 'readwrite'); tx.objectStore(BUGDIR_STORE).put(handle, BUGDIR_KEY); tx.oncomplete = resolve; tx.onerror = resolve; });
}
export async function clearSavedDir() { bugdirMemory = null; const db = await openBugdirDb(); if (!db) return; await new Promise(resolve => { const tx = db.transaction(BUGDIR_STORE, 'readwrite'); tx.objectStore(BUGDIR_STORE).delete(BUGDIR_KEY); tx.oncomplete = resolve; tx.onerror = resolve; }); }
/** このブラウザで、フォルダを選んで直接保存できるか。 */
export const canPickDir = (win = globalThis) => typeof win.showDirectoryPicker === 'function';
/** ファイルを共有フォルダへ保存する。フォルダを覚えていなければ（または repick のとき）選んでもらう（クリックの中で呼ぶこと）。
 *  戻り値 { status: 'saved', dir } / 'cancelled'（選ぶのをやめた）/ 'unsupported'（このブラウザでは使えない）/ 'error'（message つき）。 */
export async function saveToSharedDir(name, text, { repick = false, win = globalThis } = {}) {
  if (!canPickDir(win)) return { status: 'unsupported' };
  let dir = repick ? null : await getSavedDir();
  if (dir) { try { let perm = await dir.queryPermission({ mode: 'readwrite' }); if (perm !== 'granted') perm = await dir.requestPermission({ mode: 'readwrite' }); if (perm !== 'granted') dir = null; } catch { dir = null; } }
  if (!dir) {
    try { dir = await win.showDirectoryPicker({ id: 'nscad-bugreports', mode: 'readwrite', startIn: 'documents' }); }
    catch (e) { return { status: e?.name === 'AbortError' ? 'cancelled' : 'error', message: e?.message || String(e) }; }
    await setSavedDir(dir);
  }
  try { const file = await dir.getFileHandle(name, { create: true }), w = await file.createWritable(); await w.write(text); await w.close(); return { status: 'saved', dir: dir.name }; }
  catch (e) { await clearSavedDir(); return { status: 'error', message: e?.message || String(e) }; }
}
