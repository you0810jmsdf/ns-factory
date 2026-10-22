// 同じブラウザの別のタブでも N's CAD が開いているときの、自動保存の取り合いを防ぐ（事業主 2026-10-23「複数のブラウザを立ち上げたときに警告はでないが、うっかり作業して不具合が出ないか？」→「警告＋保存を守る」）。
// 自動保存・元に戻す履歴・ファイルの行き先の保管は、置き場が1つ（localStorage の1つのキー・IndexedDB の1件）なので、2つのタブが動かすと、あとから保存したほうが上書きし、空のタブが保存を消すおそれがある。
// → 保存してよい「主のタブ」を1つだけ決める。主のタブは、自分の印（id と時刻）を書き続ける。あとから開いたタブは「副」になり、保存も削除もしない（警告を出し、「このタブで続ける」で主を替えられる）。
export const TAB_LOCK_KEY = 'leather-cad.activeTab';
/** この時間、印が更新されなければ、主のタブは閉じた（落ちた）とみなす。裏のタブはブラウザが時計を間引く（最悪1分に1回）ので、長めに。 */
export const TAB_LOCK_STALE_MS = 150000;

/** storage は localStorage 相当（getItem・setItem・removeItem）。読み書きできない環境では、判断できないので、いつも主（今までどおり保存する）。 */
export function createTabLock({ storage, now = () => Date.now(), id = null } = {}) {
  const myId = id || (Math.random().toString(36).slice(2) + now().toString(36));
  let primary = false;
  const read = () => { try { const v = JSON.parse(storage.getItem(TAB_LOCK_KEY) || 'null'); return v && typeof v.id === 'string' && Number.isFinite(v.at) ? v : null; } catch { return null; } };
  const write = () => { try { storage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: myId, at: now() })); return true; } catch { return false; } };
  const fresh = cur => now() - cur.at <= TAB_LOCK_STALE_MS;
  return {
    id: myId,
    /** 起動時・定期に呼ぶ：ほかのタブが生きていなければ主になる（主なら印の時刻を更新）。ほかのタブが主なら副。戻り値：主か。 */
    check() {
      if (!storage) { primary = true; return true; }
      const cur = read();
      if (!cur || cur.id === myId || !fresh(cur)) { write(); primary = true; } else primary = false;   /* 書けない環境でも、主として動く */
      return primary;
    },
    /** 「このタブで続ける」：印を書き換えて主になる（もう一方のタブは、次に確かめたとき副になる）。 */
    takeOver() { if (storage) write(); primary = true; return true; },
    /** タブを閉じるとき：主なら印を消して、次のタブがすぐ主になれるようにする。 */
    release() { if (storage && primary) { const cur = read(); if (cur && cur.id === myId) { try { storage.removeItem(TAB_LOCK_KEY); } catch { /* 消せなくても、時間切れで譲れる */ } } } primary = false; },
    isPrimary() { return primary; },
    /** 別のタブが生きて主になっているか。 */
    otherAlive() { if (!storage) return false; const cur = read(); return !!cur && cur.id !== myId && fresh(cur); },
  };
}
