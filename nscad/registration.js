// 利用登録：印刷・ファイル保存・書き出しの前に、登録（メールの確認リンク）を求める。登録者の利用（いつ・どの機能か）だけを、運営者のサーバー（GAS のスプレッドシート）へ記録する（事業主指示 2026-10-14）。
// 送るのは、登録のときの「メール・ニックネーム・同意」と、利用のときの「機能名（短い英数字）」だけ。図形・文字・ファイル名・寸法は送らない。
// ⛔ ブラウザの中で動くので、プログラムを書き換えられる人は外せる。「普通の利用者に登録を促し、利用を数える」ための仕組み。
export const REG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx4nv5oEVFqb_kmamGFFEjqQwJs4Hl4h89TlzDJ0R_SaHp0AEdcX91ShU8E5Eo27slZbQ/exec';   /* 登録サーバー（GAS の /exec・ncad-registration）の URL。空にすると、登録を求めず誰でも使える（止めたいときはここを空にして公開する） */
const REG_KEY = 'leather-cad.reg', REG_QUEUE_KEY = 'leather-cad.reg.queue', REG_DAY = 24 * 3600 * 1000, REG_QUEUE_MAX = 50;
export const REG_FEATURE_RE = /^[a-z0-9_]{1,24}$/, REG_KIND_RE = /^[A-Za-z0-9_.-]{1,24}$/;
/** 有料版の機能のロック（パッチワーク・三つ折り・三面図）を外せる「オーナーのメール」の照合値。メールそのものは書かない（公開されるプログラムのため）。ブラウザの中だけの仕組みなので、書き換えられる人には外せる（利用の抑止が目的）。 */
export const OWNER_EMAIL_HASH = '1o98r71vhte';
export const regOwnerHash = email => { const str = String(email || '').trim().toLowerCase() + '|ncad-owner-2026'; let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
/** 登録の状態 {status, email} が、確認済みのオーナーのものか。 */
export const regIsOwner = state => !!state && state.status === 'ok' && regOwnerHash(state.email) === OWNER_EMAIL_HASH;
export const regIsEmail = s => typeof s === 'string' && s.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(s);

/** 登録の状態と通信をまとめた部品。storage は localStorage 相当、fetchFn は fetch 相当（どちらも差し替え可）。endpoint が空なら登録を求めない。
 *  状態 status：'none'（未登録）・'pending'（確認メール待ち）・'ok'（登録済み）。 */
export function createRegistration({ endpoint = REG_ENDPOINT, storage = null, fetchFn = null, now = () => Date.now(), rand = null, version = '' } = {}) {
  const read = key => { try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return null; } };
  const write = (key, value) => { try { storage?.setItem(key, JSON.stringify(value)); } catch { /* 保存できなくても今回の操作は続ける */ } };
  const token = () => { if (rand) return rand(); const a = new Uint8Array(16); (globalThis.crypto || { getRandomValues: v => v.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
  let st = read(REG_KEY) || { status: 'none' };
  const save = () => write(REG_KEY, st);
  const post = body => fetchFn(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), credentials: 'omit', keepalive: true });
  let chain = Promise.resolve();
  const flush = async () => {
    const queue = read(REG_QUEUE_KEY) || [], sent = new Set();
    for (const q of queue) { try { const res = await post(q), json = await res.json(); if (json && json.ok === true) sent.add(q.rid); } catch { /* 次の機会に送り直す */ } }
    write(REG_QUEUE_KEY, (read(REG_QUEUE_KEY) || []).filter(q => !sent.has(q.rid)));   /* 送っている間に積まれた分は残す */
  };
  const api = {
    enabled: () => !!endpoint && typeof fetchFn === 'function',
    state: () => ({ status: st.status, email: st.email || '', nick: st.nick || '' }),
    allowed: () => !api.enabled() || st.status === 'ok',
    /** 登録の申し込み。確認メールが送られ、状態は pending になる。 */
    async register({ email, nick = '', consent = false } = {}) {
      if (!regIsEmail(String(email || '').trim())) return { ok: false, error: 'email' };
      if (consent !== true) return { ok: false, error: 'consent' };
      const t = token(), cleanNick = String(nick || '').trim().slice(0, 30), mail = String(email).trim();
      try {
        const res = await post({ action: 'register', token: t, email: mail, nick: cleanNick, consent: true, v: version }), json = await res.json();
        if (!json || json.ok !== true) return { ok: false, error: json?.error === 'limit' ? 'limit' : 'server' };
        st = { status: 'pending', token: t, email: mail, nick: cleanNick, checkedAt: 0 }; save(); return { ok: true };
      } catch { return { ok: false, error: 'network' }; }
    },
    /** 確認メールのリンクを開いたか、サーバーに聞く。ok になれば登録済み。 */
    async check() {
      if (!st.token) return { status: 'none' };
      try {
        const res = await fetchFn(`${endpoint}?action=status&token=${encodeURIComponent(st.token)}`, { credentials: 'omit' }), json = await res.json(), s = json?.status;
        if (s === 'ok') { st = { ...st, status: 'ok', checkedAt: now() }; save(); return { status: 'ok' }; }
        if (s === 'pending') return { status: 'pending' };
        if (s === 'revoked' || s === 'none') { st = { status: 'none' }; save(); return { status: 'none' }; }
        return { status: 'error' };
      } catch { return { status: 'error' }; }
    },
    /** 登録済みのとき、1日に1回だけ、まだ有効かをサーバーに聞く（取り消されたら未登録に戻る）。通信できなくても今までどおり使える。 */
    async refresh() { if (api.enabled() && st.status === 'ok' && now() - (st.checkedAt || 0) > REG_DAY) await api.check(); },
    /** 利用の記録。登録済みのときだけ、機能名を送る。送れなかった分は端末に残して、次の記録のときにまとめて送り直す（番号 rid で、サーバーが二重に数えない）。送信は1本ずつ順番に行う。 */
    track(feature, kind = '') {
      if (!api.enabled() || st.status !== 'ok' || !REG_FEATURE_RE.test(String(feature))) return Promise.resolve();
      const item = { action: 'use', token: st.token, feature: String(feature), v: version, rid: token() }; if (REG_KIND_RE.test(String(kind))) item.kind = String(kind);
      write(REG_QUEUE_KEY, [...(read(REG_QUEUE_KEY) || []), item].slice(-REG_QUEUE_MAX));
      chain = chain.then(flush).catch(() => {}); return chain;
    },
    /** この端末の登録を消す（共用のパソコンなど）。サーバーの登録は消えない。 */
    signOut() { st = { status: 'none' }; save(); write(REG_QUEUE_KEY, []); },
  };
  return api;
}
