// アクセス計測（GA4）：公開版（https の GitHub Pages）でだけ動く。本体サイトと同じ測定 ID・同じ「作家の端末では計測しない」設定を使う。
// 送るのは「ページを開いた」と「機能を使った回数（イベント名＋短い英数字の kind）」だけ。図形・文字・ファイル名・寸法は送らない。
export const GA_ID = 'G-ND1T7H067Y';
const HOST = 'you0810jmsdf.github.io', OPTOUT_KEY = 'nsf_ga_optout';
const NAME_RE = /^ncad_[a-z0-9_]{1,30}$/, KIND_RE = /^[A-Za-z0-9_.-]{1,24}$/;

/** env（既定は window）から計測器を作る。{ pageview(), event(name, { kind }) }。送れない環境では何もしない。 */
export function createTracker(env = globalThis) {
  let ready = false, sink = null;   /* sink：GA4 に送ったのと同じ（イベント名・kind）を渡す先（2026-10-28 利用モニタ・presence.js の use）。送れる環境・作家の端末でないときだけ呼ばれる */
  const enabled = () => {
    try {
      const loc = env.location; if (!loc || loc.protocol !== 'https:' || loc.hostname !== HOST) return false;
      return env.localStorage?.getItem(OPTOUT_KEY) !== '1';   /* 作家自身の端末（管理画面で設定）では計測しない */
    } catch { return false; }
  };
  const load = () => {
    if (ready) return true; if (!enabled()) return false;
    try {
      env.dataLayer = env.dataLayer || [];
      env.gtag = env.gtag || function () { env.dataLayer.push(arguments); };
      const s = env.document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; env.document.head.appendChild(s);
      env.gtag('js', new Date()); env.gtag('config', GA_ID);
      ready = true; return true;
    } catch { return false; }
  };
  return {
    pageview() { load(); },
    event(name, params = {}) {
      if (!NAME_RE.test(String(name)) || !load()) return;
      const clean = {}; if (typeof params?.kind === 'string' && KIND_RE.test(params.kind)) clean.kind = params.kind;
      try { env.gtag('event', name, clean); } catch { /* 計測の失敗で本体の動作を止めない */ }
      try { sink?.(String(name), clean.kind); } catch { /* 利用モニタへ渡せなくても、本体は止めない */ }
    },
    setSink(fn) { sink = typeof fn === 'function' ? fn : null; },
  };
}
export const track = createTracker();
