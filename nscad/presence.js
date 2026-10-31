// いま開いている人数（右下の隅に小さく出す）：公開版（https の GitHub Pages）でだけ動く。
// 画面を開いている間、約30秒ごとに「開いています」という匿名の印を送り、返ってきた人数を onCount に渡す。
// 送るのは、画面を開くたびに作り直すランダムな英数字24字だけ（端末には保存しない）。氏名・図形・文字・ファイル名・寸法は送らない。
// 数えるのが目的なので、通信が遅い・止まっても CAD は待たない（3秒で諦め、2回続けて失敗したら数字を消す）。
export const PRESENCE_URL = 'https://leather-cad-presence.bouncy-xenoposeidon.workers.dev';
const PRES_HOST = 'you0810jmsdf.github.io', PRES_BASE_KEY = 'ncad_presence_base', PRES_TIMEOUT_MS = 3000, PRES_MIN_SEC = 20, PRES_MAX_SEC = 300;
const PRES_LOCAL_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const USE_FLUSH_MS = 2000, USE_MAX_QUEUE = 40, USE_KIND_RE = /^[A-Za-z0-9_.:-]{1,32}$/;   /* 利用モニタ：機能の名前は英数字と . _ : - の32字まで（それ以外は送らない） */

/** env（既定は window）で動く人数係。{ start(), stop(), id() }。公開版以外では start() が false を返し、何もしない。 */
export function createPresence({ env = globalThis, onCount = () => {}, fetchFn = null, rand = Math.random } = {}) {
  let id = '', timer = null, started = false, fails = 0, inFlight = false, queue = [], useTimer = null;
  const base = () => {
    try {
      const loc = env.location; if (!loc) return '';
      if (loc.protocol === 'https:' && loc.hostname === PRES_HOST) return PRESENCE_URL;
      if (/^(localhost|127\.0\.0\.1)$/.test(loc.hostname)) { const b = env.localStorage?.getItem(PRES_BASE_KEY) || ''; return (b === PRESENCE_URL || PRES_LOCAL_RE.test(b)) ? b : ''; }   /* 手元の確認用：localStorage で接続先を指定したときだけ */
    } catch { /* 読めない環境では送らない */ }
    return '';
  };
  const makeId = () => {
    try { const a = new Uint8Array(12); env.crypto.getRandomValues(a); return Array.from(a, v => v.toString(36).padStart(2, '0')).join(''); }
    catch { let s = ''; while (s.length < 24) s += Math.floor(rand() * 36).toString(36); return s; }
  };
  const isOwner = () => { try { return env.localStorage?.getItem('nsf_ga_optout') === '1'; } catch { return false; } };   /* 作家の端末（管理画面で印をつけた端末・analytics.js と同じ印）：人数には入るが、「開いた」の数には入れない（?o=1） */
  const visible = () => env.document?.visibilityState !== 'hidden';
  const wait = sec => Math.round(Math.min(PRES_MAX_SEC, Math.max(PRES_MIN_SEC, sec)) * (0.9 + rand() * 0.2) * 1000);   /* 全員が同じ瞬間に送らないよう ±10% ばらす */
  const clear = () => { if (timer != null) { env.clearTimeout(timer); timer = null; } };
  const schedule = sec => { clear(); if (started && visible()) timer = env.setTimeout(beat, wait(sec)); };
  async function beat() {
    timer = null; if (!started || inFlight || !visible()) return;   /* 見えていない間は送らない（見えたら visibilitychange で再開） */
    inFlight = true; let next = 30;
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? env.setTimeout(() => ctl.abort(), PRES_TIMEOUT_MS) : null;
      let r; try { r = await (fetchFn || env.fetch.bind(env))(base() + '/beat' + (isOwner() ? '?o=1' : ''), { method: 'POST', headers: { 'content-type': 'text/plain' }, body: id, cache: 'no-store', signal: ctl?.signal }); } finally { if (to != null) env.clearTimeout(to); }
      if (!r?.ok) throw new Error('http');
      const j = await r.json(); if (!Number.isFinite(j?.n)) throw new Error('shape');
      fails = 0; next = Number(j.next) || 30; onCount(Math.max(1, Math.floor(j.n)));
    } catch { fails++; next = Math.min(30 * 2 ** fails, PRES_MAX_SEC); if (fails >= 2) onCount(null); }   /* 失敗は静かに：間隔を延ばして、2回続いたら数字を消すだけ */
    inFlight = false; schedule(next);
  }
  /** 利用モニタ（2026-10-28 事業主「他人がどの機能をよく使うかリアルタイムモニタしたい」）：機能の名前を2秒ためて、まとめて /use へ送る。ncad_use は kind、書き出しなどは 'export:svg' の形。失敗しても CAD は待たず・黙って捨てる */
  const toKind = (name, kind) => { const n = String(name || ''), k = typeof kind === 'string' ? kind : ''; if (!/^ncad_[a-z0-9_]{1,30}$/.test(n)) return ''; const s = n === 'ncad_use' ? k : n.replace(/^ncad_/, '') + (k ? ':' + k : ''); return USE_KIND_RE.test(s) ? s : ''; };
  const flushUse = (viaBeacon = false) => {
    if (useTimer != null) { env.clearTimeout(useTimer); useTimer = null; } if (!queue.length || !started || !id) { queue = []; return; }
    const b = base(), body = JSON.stringify({ id, ks: queue.splice(0, 20) }); if (!b) return;
    try { if (viaBeacon && env.navigator?.sendBeacon) env.navigator.sendBeacon(b + '/use', new Blob([body], { type: 'text/plain' })); else (fetchFn || env.fetch.bind(env))(b + '/use', { method: 'POST', headers: { 'content-type': 'text/plain' }, body, cache: 'no-store', keepalive: true }).catch(() => {}); } catch { /* 送れなくても止めない */ }
    if (queue.length) useTimer = env.setTimeout(() => flushUse(), USE_FLUSH_MS);
  };
  const bye = () => {
    flushUse(true); try { const b = base(); if (b && id) env.navigator?.sendBeacon?.(b + '/bye', new Blob([id], { type: 'text/plain' })); } catch { /* 閉じるときの知らせが届かなくても、90秒で数えなくなる */ } };
  const onVisibility = () => { if (!started) return; if (visible()) { clear(); beat(); } else clear(); };
  return {
    start() {
      if (started || !base()) return false;
      started = true; id = makeId(); fails = 0;
      env.document?.addEventListener?.('visibilitychange', onVisibility); env.addEventListener?.('pagehide', bye);
      beat(); return true;
    },
    stop() { if (!started) return; started = false; clear(); env.document?.removeEventListener?.('visibilitychange', onVisibility); env.removeEventListener?.('pagehide', bye); bye(); onCount(null); },
    use(name, kind) { if (!started || !id) return; const k = toKind(name, kind); if (!k) return; if (queue.length < USE_MAX_QUEUE) queue.push(k); if (useTimer == null) useTimer = env.setTimeout(() => flushUse(), USE_FLUSH_MS); },
    id: () => id,
  };
}
