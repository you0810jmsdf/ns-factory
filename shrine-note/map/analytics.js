// アクセス計測（GA4）：公開版（https の GitHub Pages）でだけ動く。本体サイトと同じ測定 ID・同じ「作家の端末では計測しない」設定（nsf_ga_optout）を使う。
// 送るのは「どの言語で、どの神社・神様・機能が見られたか」だけ。現在地・スタンプの記録・写真・検索の言葉・端末の中身は送らない。
// 管理画面のアクセス解析は「ページのパス」で数えるため、見られた画面を仮想のページ（.../map/en/ise の形）として送る。
export const GA_ID = 'G-ND1T7H067Y';
const HOST = 'you0810jmsdf.github.io', OPTOUT_KEY = 'nsf_ga_optout';
const BASE = 'https://' + HOST + '/ns-factory/shrine-note/map/';
const ID_RE = /^[a-z0-9]{1,40}$/, LANG_RE = /^(en|ja)$/, NAME_RE = /^shrine_[a-z0-9_]{1,30}$/, KIND_RE = /^[A-Za-z0-9_.-]{1,24}$/;
const SECTIONS = new Set(['home', 'tree', 'find', 'book', 'route']);

/** env（既定は window）から計測器を作る。送れない環境（手元・計測しない設定）では何もしない。 */
export function createTracker(env = globalThis) {
  let ready = false;
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
      env.gtag('js', new Date());
      env.gtag('config', GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      ready = true; return true;
    } catch { return false; }
  };
  const lang = (l) => (LANG_RE.test(String(l)) ? String(l) : 'ja');
  /** 仮想ページ: kind = 'home' | 'shrine' | 'deity' | 'tree' | 'find' | 'book' | 'route' */
  const view = (lg, parts, title) => {
    if (!load()) return;
    try { env.gtag('event', 'page_view', { page_location: BASE + [lang(lg), ...parts].join('/'), page_title: title }); } catch { /* 計測の失敗で本体の動作を止めない */ }
  };
  return {
    pageview(lg) { view(lg, [], 'Shrine Note (' + lang(lg) + ')'); },
    shrine(lg, id) { if (ID_RE.test(String(id))) view(lg, [id], 'Shrine Note (' + lang(lg) + ') ' + id); },
    deity(lg, id) { if (ID_RE.test(String(id))) view(lg, ['deity', id], 'Shrine Note (' + lang(lg) + ') deity ' + id); },
    section(lg, name) { if (SECTIONS.has(name)) view(lg, [name], 'Shrine Note (' + lang(lg) + ') ' + name); },
    /** 記事ボタンの押下・言語の切り替えなど。params は shrine / lang / kind だけを通す */
    event(name, params = {}) {
      if (!NAME_RE.test(String(name)) || !load()) return;
      const clean = {};
      if (ID_RE.test(String(params?.shrine))) clean.shrine = String(params.shrine);
      if (LANG_RE.test(String(params?.lang))) clean.lang = String(params.lang);
      if (typeof params?.kind === 'string' && KIND_RE.test(params.kind)) clean.kind = params.kind;
      try { env.gtag('event', name, clean); } catch { /* 計測の失敗で本体の動作を止めない */ }
    },
  };
}
export const track = createTracker();
