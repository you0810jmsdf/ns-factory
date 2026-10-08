/** KeyboardEvent 相当から Ctrl / Command ショートカットを判定する。 */
export function isShortcut(e, key) { return !!(e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === key; }
export function isUndo(e) { return isShortcut(e, 'z') && !e.shiftKey; }
export function isRedo(e) { return isShortcut(e, 'y') || (isShortcut(e, 'z') && !!e.shiftKey); }
export function isCopy(e) { return isShortcut(e, 'd'); }
/** KeyboardEvent 相当から Delete / Mac Backspace を判定する。 */
export function isDelete(e) { return !e.ctrlKey && !e.metaKey && !e.altKey && ['Delete', 'Backspace'].includes(e.key); }
