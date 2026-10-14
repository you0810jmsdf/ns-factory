/** KeyboardEvent 相当から Ctrl / Command ショートカットを判定する。 */
export function isShortcut(e, key) { return !!(e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === key; }
export function isUndo(e) { return isShortcut(e, 'z') && !e.shiftKey; }
export function isRedo(e) { return isShortcut(e, 'y') || (isShortcut(e, 'z') && !!e.shiftKey); }
export function isCopy(e) { return isShortcut(e, 'd'); }
/** Windows 標準の Ctrl（Mac は ⌘）+ A（全選択）。Shift 付きはブラウザに任せる。 */
export function isSelectAll(e) { return isShortcut(e, 'a') && !e.shiftKey; }
/** KeyboardEvent 相当から Delete / Mac Backspace を判定する。 */
export function isDelete(e) { return !e.ctrlKey && !e.metaKey && !e.altKey && ['Delete', 'Backspace'].includes(e.key); }
/** 矢印キーの移動量（mm）。既定 1・Shift 10・Ctrl 0.1。上矢印は y が減る（画面の上）。Alt（ブラウザの戻る・進む）・⌘ つきと矢印以外は null。 */
export function arrowNudge(e) {
  if (e.altKey || e.metaKey) return null;
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]; if (!dir) return null;
  const step = e.shiftKey ? 10 : e.ctrlKey ? 0.1 : 1;
  return { dx: dir[0] * step, dy: dir[1] * step };
}
/** 左メニューのツールのキー：英語名の頭文字（重なるものは Shift＋文字）。Ctrl・Alt・⌘ つきは使わない（Windows・ブラウザの標準と重ならない）。 */
export const TOOL_KEYS = { select: 'S', line: 'L', rect: 'R', circle: 'C', arc: 'A', bezier: 'B', path: 'P', text: 'T', dimension: 'D', ruler: 'Shift+R', fillet: 'F', chamfer: 'Shift+C', offset: 'O', trim: 'Shift+T', mirror: 'M', fold: 'Shift+F', koma: 'K', stitch: 'Shift+S', mark: 'Shift+M', patchfill: 'Shift+P' };
/** 左メニュー「選択中」の操作のキー（キー → 押すボタンの id）。コピー・グループ・削除は今までのキー（Ctrl+D・Ctrl+G・Delete）。 */
export const ACTION_KEYS = { mirrorX: 'H', mirrorY: 'V', rotate: 'Q', toPath: 'N', unroll: 'X' };
/** 修飾キー無し（Shift だけ可）の文字キーを「S」「Shift+S」の形にする。物理キーの位置（e.code）で見るので、日本語入力のままでも同じ。 */
export function plainKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const m = /^Key([A-Z])$/.exec(e.code || ''); return m ? (e.shiftKey ? 'Shift+' : '') + m[1] : null;
}
/** キーに割り当てた操作：{ tool }（ツール切替）／{ action }（押すボタンの id）／null。 */
export function keyTarget(e) {
  const k = plainKey(e); if (!k) return null;
  for (const [tool, key] of Object.entries(TOOL_KEYS)) if (key === k) return { tool };
  for (const [action, key] of Object.entries(ACTION_KEYS)) if (key === k) return { action };
  return null;
}
