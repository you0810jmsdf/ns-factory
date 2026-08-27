/* =============================================================
 * NSF i18n — 日英切替エンジン（2026-08-17）
 * ============================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'nsf_lang';
  var dict = window.NSF_I18N_DICT || {};
  var ATTRS = ['placeholder', 'title', 'aria-label', 'content', 'value', 'alt'];
  var origText = new WeakMap();
  var origAttr = new WeakMap();

  function detectLang() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved === 'en' || saved === 'ja') return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'ja').toLowerCase();
    return nav.indexOf('ja') === 0 ? 'ja' : 'en';
  }

  var current = detectLang();

  function applyTo(root, lang) {
    var nodes = (root || document).querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (lang === 'en') {
        if (dict[key] === undefined) return;
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
    btn.textContent = lang === 'en' ? '日本語' : 'EN';
    btn.setAttribute('aria-label', lang === 'en' ? '日本語に切り替える' : 'Switch to English');
  }

  function setLang(lang, opts) {
    if (lang !== 'en' && lang !== 'ja') return;
    current = lang;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);
    applyTo(document, lang);
    var btn = document.getElementById('nsfLangToggle');
    if (btn) updateToggleLabel(btn, lang);
    if (opts && opts.silent) return;
    try {
      document.dispatchEvent(new CustomEvent('nsf:langchange', { detail: { lang: lang } }));
    } catch (e) {}
  }

  function ensureToggle() {
    var btn = document.getElementById('nsfLangToggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'nsfLangToggle';
      btn.type = 'button';
      btn.style.cssText = [
        'position:fixed', 'bottom:14px', 'left:14px', 'z-index:9999',
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
    apply: function (root) { applyTo(root, current); }
  };

  function insertOrderGuideCard() {
    var path = location.pathname.replace(/\/+$/, '/');
    var isHome = path === '/ns-factory/' || path === '/ns-factory/index.html' || path === '/';
    if (!isHome || document.getElementById('first-order-guide')) return;

    dict['guide.label'] = 'For First-time Customers';
    dict['guide.title'] = 'New to custom leather goods?';
    dict['guide.desc'] = 'A simple guide to choosing leather, deciding specifications, understanding price factors, and moving from consultation to completion.';
    dict['guide.cta'] = 'Read the free guide →';
    dict['guide.works'] = 'View works';
    dict['guide.ai'] = 'Ask AI';

    var style = document.createElement('style');
    style.textContent = [
      '#first-order-guide{background:var(--color-bg);padding:48px 24px 54px}',
      '#first-order-guide .fog-inner{max-width:960px;margin:0 auto}',
      '#first-order-guide .fog-card{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:28px;align-items:center;padding:32px;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:linear-gradient(135deg,#FCF7EB,var(--color-accent-light));box-shadow:var(--shadow-sm)}',
      '#first-order-guide .fog-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--color-accent-dark);margin:0 0 10px}',
      '#first-order-guide h2{font-size:clamp(24px,3.5vw,34px);line-height:1.35;margin:0 0 12px}',
      '#first-order-guide .fog-desc{font-size:14px;line-height:1.9;color:var(--color-text-sub);margin:0}',
      '#first-order-guide .fog-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}',
      '#first-order-guide .fog-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 17px;border-radius:var(--radius-sm);font-size:14px;font-weight:700;transition:.2s ease}',
      '#first-order-guide .fog-btn:hover{transform:translateY(-1px);opacity:.88}',
      '#first-order-guide .fog-primary{background:var(--color-accent);color:#fff}',
      '#first-order-guide .fog-secondary{border:1px solid var(--color-border);background:#FCF7EB;color:var(--color-text)}',
      '#first-order-guide .fog-visual{padding:24px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:#FCF7EB;text-align:center}',
      '#first-order-guide .fog-mark{font-family:Cinzel,serif;font-size:13px;letter-spacing:.16em;color:var(--color-accent-dark);margin-bottom:8px}',
      '#first-order-guide .fog-question{font-size:22px;line-height:1.5;font-weight:700;margin:0 0 8px}',
      '#first-order-guide .fog-note{font-size:12px;line-height:1.7;color:var(--color-text-sub);margin:0}',
      '@media(max-width:760px){#first-order-guide{padding:34px 18px 40px}#first-order-guide .fog-card{grid-template-columns:1fr;padding:24px}#first-order-guide .fog-visual{text-align:left}#first-order-guide .fog-actions{flex-direction:column}#first-order-guide .fog-btn{width:100%}}'
    ].join('');
    document.head.appendChild(style);

    var section = document.createElement('section');
    section.id = 'first-order-guide';
    section.innerHTML = '<div class="fog-inner"><div class="fog-card"><div><p class="fog-label" data-i18n="guide.label">初めての方へ</p><h2 data-i18n="guide.title">オーダーメイド、何を伝えればいい？</h2><p class="fog-desc" data-i18n="guide.desc">革の選び方、オーダーで決めること、価格が変わる理由、相談から完成まで。初めての方が迷いやすいポイントを、職人目線でまとめました。</p><div class="fog-actions"><a class="fog-btn fog-primary" href="./order-guide.html" data-i18n="guide.cta">無料ガイドを見る →</a><a class="fog-btn fog-secondary" href="./works.html" data-i18n="guide.works">作品を見る</a><a class="fog-btn fog-secondary" href="./order_estimate/hearing-ai.html" data-i18n="guide.ai">AIに相談する</a></div></div><div class="fog-visual"><div class="fog-mark">FIRST ORDER GUIDE</div><p class="fog-question">「こんなの作れる？」<br>から始められます。</p><p class="fog-note">見るだけでも、相談だけでも大丈夫です。<br>最終の仕様確定・お見積りは職人本人が確認します。</p></div></div></div>';

    var hero = document.querySelector('.hero');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(section, hero.nextSibling);
  }

  function init() {
    insertOrderGuideCard();
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
