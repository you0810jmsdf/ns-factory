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
export const TOOL_KEYS = { select: 'V', line: 'L', rect: 'R', circle: 'C', arc: 'A', bezier: 'B', path: 'P', text: 'T', dimension: 'D', ruler: 'S', fillet: 'F', chamfer: 'Shift+C', offset: 'O', trim: 'Shift+T', mirror: 'M', fold: 'Shift+F', koma: 'K', stitch: 'Shift+S', mark: 'Shift+M', patchfill: 'Shift+P' };
/** 左メニュー「選択中」の操作のキー（キー → 押すボタンの id）。コピー・グループ・削除は今までのキー（Ctrl+D・Ctrl+G・Delete）。
 *  2026-10-21 事業主指示「ショートカットがないメニューのショートカット割り当て」：1本に結合＝J（Join）・隙間を閉じる＝Shift+J・穴の点検＝I（Inspect）・菱目を消す＝Shift+E（Erase・消す操作なのでうっかり防止の Shift）・順目⇔逆目＝Shift+H（Hole の向き）・拡大縮小＝Shift+R（Resize）。 */
export const ACTION_KEYS = { mirrorX: 'H', mirrorY: 'Shift+V', rotate: 'Q', toPath: 'N', unroll: 'X', mergeLines: 'J', closeGaps: 'Shift+J', checkHoles: 'I', delHoles: 'Shift+E', flipHoleSlant: 'Shift+H', scaleOpen: 'Shift+R', attachLeft: 'Shift+A' };   /* 線に着ける＝Shift+A（Attach） */
/** すでに別の仕組みで動いているキー（ボタンの id → キー）。メニューの横に表示するためだけの一覧（判定は app.js のキー処理：isCopy・isShortcut(e,'g')・isDelete）。解除は Ctrl+Shift+G（Illustrator・Figma と同じ）。 */
export const FIXED_KEYS = { copy: 'Ctrl+D', group: 'Ctrl+G', ungroup: 'Ctrl+Shift+G', delete: 'Delete', deleteKeepHoles: 'Shift+Delete' };
/** 画面上部のチェック（キー → チェックの id）：G＝Grid（グリッド）・Shift+G＝スナップ。Ctrl+G のグループ化は別（今までどおり）。 */
export const TOGGLE_KEYS = { grid: 'G', snap: 'Shift+G' };
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
  for (const [toggle, key] of Object.entries(TOGGLE_KEYS)) if (key === k) return { toggle };
  return null;
}
/** ショートカット一覧に出す「名前: キー」の行（ツール → 選択中の操作 → 画面上部のチェック の順）。labelOf(id) は画面の言葉（言語に合わせる）を返す。 */
export function shortcutLines(labelOf) {
  return [TOOL_KEYS, ACTION_KEYS, TOGGLE_KEYS].flatMap(map => Object.entries(map).map(([id, k]) => `${labelOf(id)}: ${k}`));
}
