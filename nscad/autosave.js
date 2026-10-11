// 自動保存：開いている全タブの図面を localStorage に入れ、次に開いたときに「前回の続き」として復元する。画像は imgstore（IndexedDB）に別にあるので、ここは図面の JSON だけ。
export const AUTOSAVE_KEY = 'leather-cad.autosave';
/** localStorage は 5MB 前後が上限（文字数）。余裕を見てこの文字数まで。超えたら保存しない（ほかの設定を巻き込んで壊さない）。 */
export const AUTOSAVE_MAX_CHARS = 3_500_000;

/** タブ（{ name, doc } の配列）と開いているタブの番号から保存用の文字列を作る。{ status: 'ok', text } / { status: 'empty' }（図形が1つも無い）/ { status: 'tooLarge' }。 */
export function packAutosave(tabs, active, now = new Date()) {
  if (!tabs.some(t => t.doc.shapes.length)) return { status: 'empty' };
  const text = JSON.stringify({ v: 1, savedAt: now.toISOString(), active, tabs: tabs.map(t => ({ name: t.name, doc: t.doc })) });
  return text.length > AUTOSAVE_MAX_CHARS ? { status: 'tooLarge' } : { status: 'ok', text };
}

/** 保存の文字列を読み戻す。壊れている・版が違う・図面が不正・空のときは null。validate(doc) は図面の検査（validateDoc）。 */
export function unpackAutosave(text, validate) {
  let j; try { j = JSON.parse(text); } catch { return null; }
  if (!j || j.v !== 1 || !Array.isArray(j.tabs) || !j.tabs.length || !Number.isInteger(j.active) || j.active < 0 || j.active >= j.tabs.length || typeof j.savedAt !== 'string') return null;
  if (!j.tabs.every(t => t && typeof t.name === 'string' && t.doc && validate(t.doc))) return null;
  const shapes = j.tabs.reduce((n, t) => n + t.doc.shapes.length, 0); if (!shapes) return null;
  return { tabs: j.tabs.map(t => ({ name: t.name, doc: t.doc })), active: j.active, savedAt: j.savedAt, shapes };
}
