/* =============================================================
 * NSF i18n — 日英切替エンジン（2026-08-17）
 *
 * 使い方（各ページ側）:
 *   1. 翻訳したい要素に data-i18n="キー" を付ける（日本語はHTML原文のまま）
 *      属性の翻訳は data-i18n-placeholder / data-i18n-title / data-i18n-aria-label /
 *      data-i18n-content / data-i18n-value / data-i18n-alt を使う
 *   2. ページ内で window.NSF_I18N_DICT = { キー: '英語文', ... } を定義
 *   3. このファイルを </body> 直前で読み込む（辞書定義より後）
 *
 * 動作:
 *   - 初期言語: localStorage('nsf_lang') → ブラウザ言語（ja以外はen）
 *   - 右上に EN/日本語 切替ピルを自動挿入（#nsfLangToggle が既にあればそれを使う）
 *   - 切替時に <html lang> を更新し 'nsf:langchange' イベントを発火
 *     （hearing-ai 等の動的ページはこのイベントで追従する）
 *   - JSから使うAPI: NSF_I18N.lang / NSF_I18N.set('en') / NSF_I18N.t('キー','日本語既定')
 * ============================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'nsf_lang';
  var dict = window.NSF_I18N_DICT || {};
  var ATTRS = ['placeholder', 'title', 'aria-label', 'content', 'value', 'alt'];
  var origText = new WeakMap();   // 要素 → 日本語原文（初回EN適用時に退避）
  var origAttr = new WeakMap();   // 要素 → {属性名: 日本語原文}

  function detectLang() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved === 'en' || saved === 'ja') return saved;
    } catch (e) { /* プライベートモード等では保存なし扱い */ }
    var nav = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
    return nav.indexOf('ja') === 0 ? 'ja' : 'en';
  }

  var current = detectLang();

  function applyTo(root, lang) {
    var nodes = (root || document).querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (lang === 'en') {
        if (dict[key] === undefined) return; // 辞書漏れは日本語のまま表示
        if (!origText.has(el)) {
          origText.set(el, { html: el.getAttribute('data-i18n-as-html') !== null, text: el.getAttribute('data-i18n-as-html') !== null ? el.innerHTML : el.textContent });
        }
        if (el.getAttribute('data-i18n-as-html') !== null) el.innerHTML = dict[key];
        else el.textContent = dict[key];
      } else if (origText.has(el)) {
        var o = origText.get(el);
        if (o.html) el.innerHTML = o.text; else el.textContent = o.text;
      }
    });
    ATTRS.forEach(function (attr) {
      var sel = '[data-i18n-' + attr + ']';
      (root || document).querySelectorAll(sel).forEach(function (el) {
        var key = el.getAttribute('data-i18n-' + attr);
        if (lang === 'en') {
          if (dict[key] === undefined) return;
          var bag = origAttr.get(el) || {};
          if (bag[attr] === undefined) { bag[attr] = el.getAttribute(attr); origAttr.set(el, bag); }
          el.setAttribute(attr, dict[key]);
        } else {
          var bag2 = origAttr.get(el);
          if (bag2 && bag2[attr] !== undefined) el.setAttribute(attr, bag2[attr]);
        }
      });
    });
  }

  function updateToggleLabel(btn, lang) {
    // 表示は「切替先」の言語名（英語表示中は「日本語」を出す）
    btn.textContent = lang === 'en' ? '日本語' : 'EN';
    btn.setAttribute('aria-label', lang === 'en' ? '日本語に切り替える' : 'Switch to English');
  }

  function setLang(lang, opts) {
    if (lang !== 'en' && lang !== 'ja') return;
    current = lang;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* 保存不可でも切替は継続 */ }
    document.documentElement.setAttribute('lang', lang);
    applyTo(document, lang);
    var btn = document.getElementById('nsfLangToggle');
    if (btn) updateToggleLabel(btn, lang);
    // 初期適用（ページ読み込み時）ではイベントを発火しない。
    // ⛔ silent を外さないこと: works/hearing は langchange で location.reload するため、
    //    初期適用で発火すると無限リロードになる（2026-08-17 実測で発生）。
    if (opts && opts.silent) return;
    try {
      document.dispatchEvent(new CustomEvent('nsf:langchange', { detail: { lang: lang } }));
    } catch (e) { /* CustomEvent非対応環境は無視 */ }
  }

  function ensureToggle() {
    var btn = document.getElementById('nsfLangToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'nsfLangToggle';
      btn.type = 'button';
      btn.style.cssText = [
        'position:fixed', 'top:14px', 'right:14px', 'z-index:9999',
        'padding:6px 14px', 'border-radius:999px',
        'background:rgba(10,10,10,.82)', 'color:#c9a96e',
        'border:1px solid rgba(201,169,110,.55)',
        'font:600 12px/1.4 "Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif',
        'letter-spacing:.08em', 'cursor:pointer',
        'backdrop-filter:blur(4px)', '-webkit-backdrop-filter:blur(4px)',
        'box-shadow:0 2px 10px rgba(0,0,0,.35)'
      ].join(';');
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', function () {
      setLang(current === 'en' ? 'ja' : 'en');
    });
    updateToggleLabel(btn, current);
  }

  window.NSF_I18N = {
    get lang() { return current; },
    set: setLang,
    t: function (key, jaFallback) {
      if (current === 'en' && dict[key] !== undefined) return dict[key];
      return jaFallback !== undefined ? jaFallback : key;
    },
    apply: function (root) { applyTo(root, current); } // 動的挿入ノード用
  };

  function init() {
    ensureToggle();
    if (current === 'en') setLang('en', { silent: true });
    else document.documentElement.setAttribute('lang', 'ja');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
