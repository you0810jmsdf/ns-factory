// 新しい版のお知らせ：公開された最新の版（version.json）を取りにいき、開いている画面の版より新しいかを調べる。通信（fetch）はここに置く（app.js には書かない決まり）。
/** 画面の左上の「版 2026-10-22 11:00 · 159e2b2」から、日時と識別番号を読む。手元の開発版（「開発版」）や読めない文字は null。 */
export const parseBuild = text => { const m = /^版 (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) · ([0-9a-f]{7})$/.exec(String(text ?? '').trim()); return m ? { jst: m[1], id: m[2] } : null; };
/** 公開された最新の版（{ id, jst }）。fetchFn は fetch 相当。キャッシュを避けて取り、取れない・形が違うときは null。 */
export async function latestBuild(fetchFn, now = Date.now()) {
  try {
    const res = await fetchFn('version.json?t=' + now, { cache: 'no-store' }), v = await res.json();
    return v && /^[0-9a-f]{7}$/.test(String(v.id)) && typeof v.jst === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v.jst) ? { id: v.id, jst: v.jst } : null;
  } catch { return null; }
}
/** 公開された版 remote が、開いている画面の版 mine より新しいか：識別番号が違い、公開日時が同じか新しい（古い版が出回っているときは出さない）。 */
export const isNewerBuild = (mine, remote) => !!mine && !!remote && remote.id !== mine.id && remote.jst >= mine.jst;
