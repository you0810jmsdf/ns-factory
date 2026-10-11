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
