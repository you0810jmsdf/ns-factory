// 自動保存：開いている全タブの図面を localStorage に入れ、次に開いたときに「前回の続き」として復元する。画像は imgstore（IndexedDB）に別にあるので、ここは図面の JSON だけ。
export const AUTOSAVE_KEY = 'leather-cad.autosave';
/** localStorage は 5MB 前後が上限（文字数）。余裕を見てこの文字数まで。超えたら保存しない（ほかの設定を巻き込んで壊さない）。 */
export const AUTOSAVE_MAX_CHARS = 3_500_000;

/** タブごとの「見ていた位置と拡大率」（中心の図面座標 cx・cy と倍率 scale）。有限の数で、倍率が 0.1〜100 のときだけ有効。 */
const cleanView = v => v && Number.isFinite(v.cx) && Number.isFinite(v.cy) && Number.isFinite(v.scale) && v.scale >= 0.1 && v.scale <= 100 ? { cx: v.cx, cy: v.cy, scale: v.scale } : undefined;
/** タブ（{ name, doc, view? } の配列）と開いているタブの番号から保存用の文字列を作る。{ status: 'ok', text } / { status: 'empty' }（図形が1つも無い）/ { status: 'tooLarge' }。 */
export function packAutosave(tabs, active, now = new Date()) {
  if (!tabs.some(t => t.doc.shapes.length)) return { status: 'empty' };
  const text = JSON.stringify({ v: 1, savedAt: now.toISOString(), active, tabs: tabs.map(t => ({ name: t.name, doc: t.doc, ...(cleanView(t.view) ? { view: cleanView(t.view) } : {}) })) });
  return text.length > AUTOSAVE_MAX_CHARS ? { status: 'tooLarge' } : { status: 'ok', text, savedAt: now.toISOString() };
}

/** 保存の文字列を読み戻す。壊れている・版が違う・図面が不正・空のときは null。validate(doc) は図面の検査（validateDoc）。 */
export function unpackAutosave(text, validate) {
  let j; try { j = JSON.parse(text); } catch { return null; }
  if (!j || j.v !== 1 || !Array.isArray(j.tabs) || !j.tabs.length || !Number.isInteger(j.active) || j.active < 0 || j.active >= j.tabs.length || typeof j.savedAt !== 'string') return null;
  if (!j.tabs.every(t => t && typeof t.name === 'string' && t.doc && validate(t.doc))) return null;
  const shapes = j.tabs.reduce((n, t) => n + t.doc.shapes.length, 0); if (!shapes) return null;
  return { tabs: j.tabs.map(t => ({ name: t.name, doc: t.doc, ...(cleanView(t.view) ? { view: cleanView(t.view) } : {}) })), active: j.active, savedAt: j.savedAt, shapes };
}

/** 世代（事業主 2026-11-07 14:40「消えたデータはどうすればよい？」「入れる」）：自動保存は 1 つを上書きするので、壊れた保存で上書きされると、前の保存が残らない。
 *  保存のたびに、いまの保存（key）を、「10 分以上あいたとき」だけ、1 つ前の世代（key.g1）へ回し、その前の世代を key.g2 へ回す。
 *  大きい保存（既定 150 万字超）は、世代にしない。世代の保存に失敗しても（容量）、世代を捨てるだけで、本体の保存には触らない。 */
export const GEN_GAP_MS = 10 * 60 * 1000, GEN_MAX_CHARS = 1_500_000;
export const genKeys = key => [key + '.g1', key + '.g2'];
const SAVED_AT = /^\{"v":1,"savedAt":"([^"]+)"/;
/** 保存の文字列の先頭から、保存した時刻（ミリ秒）だけを読む（数 MB を丸ごと解析しない）。読めなければ null。 */
export const savedAtOf = text => { const m = typeof text === 'string' ? SAVED_AT.exec(text) : null; const t = m ? Date.parse(m[1]) : NaN; return Number.isFinite(t) ? t : null; };
/** 本体の保存を上書きする直前に呼ぶ。回したら true。 */
export function rotateAutosaveGenerations(storage, key, { gapMs = GEN_GAP_MS, maxChars = GEN_MAX_CHARS } = {}) {
  try {
    const cur = storage.getItem(key), tCur = savedAtOf(cur); if (tCur === null || cur.length > maxChars) return false;
    const [k1, k2] = genKeys(key), g1 = storage.getItem(k1), t1 = savedAtOf(g1);
    if (t1 !== null && tCur - t1 < gapMs) return false;   /* 直前の世代から間がない */
    if (t1 !== null && g1.length <= maxChars) storage.setItem(k2, g1);
    storage.setItem(k1, cur); return true;
  } catch { try { for (const k of genKeys(key)) storage.removeItem(k); } catch { /* 無視 */ } return false; }   /* 容量などで失敗：世代を捨てて、本体の保存を通す */
}
