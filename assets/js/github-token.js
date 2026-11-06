/**
 * github-token.js — GitHub Personal Access Token の一元管理モジュール（正本）
 *
 * 利用ページ: order_estimate/admin.html / register.html / staff-knowledge-admin.html
 * 保存キーは全ページ共通のため、どのページで設定しても同じブラウザ内で共用される。
 *
 * 使い方:
 *   <script src="（相対パス）/assets/js/github-token.js"></script>
 *   NSFGitHubToken.get()                  … 現在のトークン（'' = 未設定）
 *   NSFGitHubToken.set(token, persist)    … 保存（persist=true でブラウザに永続化）
 *   NSFGitHubToken.isPersisted()          … localStorage に永続保存中か
 *   NSFGitHubToken.prompt()               … 設定ダイアログを開く（Promise<boolean> 設定されたらtrue）
 *   NSFGitHubToken.onChange(cb)           … 変更通知 cb(token, persisted)
 *   NSFGitHubToken.refresh()              … このPCの token_server（127.0.0.1:18765）から現行トークンを取り直す
 *                                             Promise<{ok, changed}>。無いPC・スマホでは 1.5秒で諦めて {ok:false}
 *
 * 自動の取り直し（2026-11-06）:
 *   PAT を再発行するたびに、ブラウザに保存された旧トークンで GitHub が 401 になり管理画面が止まっていた。
 *   ① 保存済みトークンがあるブラウザでは、ページを開くたびに token_server の値で上書きする
 *      （保存が無い＝一般の訪問者のブラウザからは 127.0.0.1 へ接続しない）
 *   ② window.fetch を包み、api.github.com への自分のトークン付き呼び出しが 401/403 なら
 *      取り直して1回だけ再送する（取り直せない・同じ値なら元の応答をそのまま返す）
 */
(function () {
  'use strict';

  // 旧 admin.html 時代からの共通キー（変更すると既存ユーザーの設定が失われるため固定）
  var SESSION_KEY = 'nsfactory-ring-admin-github-token';
  var LOCAL_KEY = 'nsfactory-ring-admin-github-token-local';

  var listeners = [];

  function get() {
    try {
      return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY) || '';
    } catch (e) { return ''; }
  }

  function isPersisted() {
    try { return !!localStorage.getItem(LOCAL_KEY); } catch (e) { return false; }
  }

  function set(token, persist) {
    try {
      if (token) {
        sessionStorage.setItem(SESSION_KEY, token);
        if (persist) localStorage.setItem(LOCAL_KEY, token);
        else localStorage.removeItem(LOCAL_KEY);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_KEY);
      }
    } catch (e) { /* プライベートブラウズ等で storage 不可の場合は無視 */ }
    notify();
  }

  function onChange(cb) {
    if (typeof cb === 'function') listeners.push(cb);
  }

  function notify() {
    var token = get();
    var persisted = isPersisted();
    listeners.forEach(function (cb) {
      try { cb(token, persisted); } catch (e) { /* リスナー内エラーは伝播させない */ }
    });
  }

  // ── 設定ダイアログ（DOM/CSS はモジュールが自前で注入する） ──
  var modalResolve = null;

  var MODAL_CSS = [
    '.nsf-token-overlay{position:fixed;inset:0;background:rgba(60,40,20,.45);display:none;align-items:center;justify-content:center;z-index:9000}',
    '.nsf-token-overlay.open{display:flex}',
    '.nsf-token-card{background:#fffdfb;border:1px solid #eadccf;border-radius:14px;padding:22px;width:min(440px,92vw);box-shadow:0 10px 40px rgba(60,40,20,.25);font-family:inherit}',
    '.nsf-token-card h2{margin:0 0 10px;font-size:16px;color:#6b3a1f}',
    '.nsf-token-desc{margin:0 0 12px;font-size:12px;color:#7d644d;line-height:1.7}',
    '.nsf-token-input-row input{width:100%;box-sizing:border-box;border:1px solid #d9c7b2;border-radius:8px;padding:10px 12px;font-size:13px;background:#fff}',
    '.nsf-token-save-opt{display:flex;align-items:center;gap:6px;margin:10px 0 14px;font-size:12px;color:#6b3a1f;cursor:pointer}',
    '.nsf-token-actions{display:flex;gap:8px;justify-content:flex-end}',
    '.nsf-token-actions button{border:none;border-radius:999px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}',
    '.nsf-token-btn-light{background:#f3e7d9;color:#6b3a1f}',
    '.nsf-token-btn-main{background:#6b3a1f;color:#fff}'
  ].join('\n');

  function ensureModal() {
    if (document.getElementById('nsfTokenOverlay')) return;

    var style = document.createElement('style');
    style.textContent = MODAL_CSS;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'nsfTokenOverlay';
    overlay.className = 'nsf-token-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="nsf-token-card">' +
        '<h2>GitHub トークン設定（全管理ページ共通）</h2>' +
        '<p class="nsf-token-desc">Contents read/write 権限の <b>Personal Access Token</b> を入力してください。' +
        '1回設定すると、管理画面・作品登録・接客ナレッジの各ページで共通に使われます。<br>' +
        'ブラウザのパスワードマネージャーで保存すると、複数PCでも自動入力されます。</p>' +
        '<form id="nsfTokenForm" action="" method="post" autocomplete="on">' +
          '<input type="text" name="username" value="ns-factory-admin" autocomplete="username" style="display:none" aria-hidden="true" tabindex="-1">' +
          '<div class="nsf-token-input-row">' +
            '<input type="password" id="nsfTokenInput" name="password" autocomplete="current-password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" spellcheck="false">' +
          '</div>' +
          '<label class="nsf-token-save-opt"><input type="checkbox" id="nsfTokenPersist"> このブラウザに保存する（ページを閉じても保持）</label>' +
          '<div class="nsf-token-actions">' +
            '<button type="button" class="nsf-token-btn-light" id="nsfTokenClear">クリア</button>' +
            '<button type="button" class="nsf-token-btn-light" id="nsfTokenCancel">キャンセル</button>' +
            '<button type="submit" class="nsf-token-btn-main">設定する</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector('#nsfTokenInput');
    var chk = overlay.querySelector('#nsfTokenPersist');

    overlay.querySelector('#nsfTokenForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim();
      set(val, chk.checked);
      closeModal(!!val);
    });
    overlay.querySelector('#nsfTokenClear').addEventListener('click', function () {
      input.value = '';
      set('', false);
      closeModal(false);
    });
    overlay.querySelector('#nsfTokenCancel').addEventListener('click', function () {
      closeModal(false);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(false);
    });
  }

  function closeModal(saved) {
    var overlay = document.getElementById('nsfTokenOverlay');
    if (overlay) overlay.classList.remove('open');
    if (modalResolve) {
      modalResolve(saved);
      modalResolve = null;
    }
  }

  function prompt() {
    return new Promise(function (resolve) {
      ensureModal();
      modalResolve = resolve;
      var overlay = document.getElementById('nsfTokenOverlay');
      var input = overlay.querySelector('#nsfTokenInput');
      var chk = overlay.querySelector('#nsfTokenPersist');
      input.value = get();
      chk.checked = isPersisted();
      overlay.classList.add('open');
      setTimeout(function () { input.focus(); }, 50);
    });
  }

  // ── このPCの token_server（保全部\token_server.py）から取り直す ──
  var TOKEN_SERVER_URL = 'http://127.0.0.1:18765/token';
  var TOKEN_SERVER_TIMEOUT_MS = 1500;
  var GITHUB_API_PREFIX = 'https://api.github.com/';
  var nativeFetch = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
  var refreshPromise = null;

  function timeoutSignal(ms) {
    try { if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms); } catch (e) { /* 古いブラウザ */ }
    try {
      var c = new AbortController();
      setTimeout(function () { c.abort(); }, ms);
      return c.signal;
    } catch (e) { return undefined; }
  }

  function refresh() {
    if (refreshPromise) return refreshPromise;   // 同時に何度呼ばれても token_server への問い合わせは1回
    var before = get();
    var p;
    if (!nativeFetch) {
      p = Promise.resolve({ ok: false, changed: false });
    } else {
      try {
        p = nativeFetch(TOKEN_SERVER_URL, { signal: timeoutSignal(TOKEN_SERVER_TIMEOUT_MS), cache: 'no-store' })
          .then(function (res) { return res.ok ? res.text() : ''; })
          .then(function (text) {
            var token = (text || '').trim();
            if (!token) return { ok: false, changed: false };
            var changed = token !== before;
            if (changed) set(token, true);   // admin.html の従来の自動取得と同じく「このブラウザに保存」
            return { ok: true, changed: changed };
          })
          .catch(function () { return { ok: false, changed: false }; });
      } catch (e) {
        p = Promise.resolve({ ok: false, changed: false });
      }
    }
    refreshPromise = p;
    p.then(function () { refreshPromise = null; }, function () { refreshPromise = null; });
    return p;
  }

  function headerGet(h, name) {
    try {
      if (!h) return null;
      if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get(name);
      var lname = name.toLowerCase();
      if (Array.isArray(h)) {
        for (var i = 0; i < h.length; i++) if (String(h[i][0]).toLowerCase() === lname) return h[i][1];
        return null;
      }
      var keys = Object.keys(h);
      for (var j = 0; j < keys.length; j++) if (keys[j].toLowerCase() === lname) return h[keys[j]];
    } catch (e) { /* 想定外の形はそのまま */ }
    return null;
  }

  function headerSet(h, name, value) {
    var lname = name.toLowerCase();
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      var copy = new Headers(h);
      copy.set(name, value);
      return copy;
    }
    if (Array.isArray(h)) {
      return h.map(function (pair) { return String(pair[0]).toLowerCase() === lname ? [pair[0], value] : pair; });
    }
    var out = {};
    Object.keys(h).forEach(function (k) { out[k] = (k.toLowerCase() === lname) ? value : h[k]; });
    return out;
  }

  // api.github.com への「自分のトークン付き」呼び出しだけを対象に、401/403 なら取り直して1回だけ再送する
  function wrappedFetch(input, init) {
    var url = (typeof input === 'string') ? input : ((input && input.url) || String(input || ''));
    if (url.indexOf(GITHUB_API_PREFIX) !== 0 || !init || !init.headers) return nativeFetch(input, init);
    var current = get();
    var auth = headerGet(init.headers, 'Authorization');
    if (!current || !auth || String(auth).indexOf(current) === -1) return nativeFetch(input, init);
    if (init.body != null && typeof init.body !== 'string') return nativeFetch(input, init);   // 再送できない本文（ストリーム等）
    return nativeFetch(input, init).then(function (res) {
      if (res.status !== 401 && res.status !== 403) return res;
      return refresh().then(function (r) {
        var fresh = get();
        if (!r.ok || !fresh || fresh === current) return res;   // 取り直せない・同じ値 → 元の応答（従来どおりの案内へ）
        var retryInit = Object.assign({}, init, { headers: headerSet(init.headers, 'Authorization', String(auth).replace(current, fresh)) });
        return nativeFetch(input, retryInit);
      });
    });
  }
  if (nativeFetch) window.fetch = wrappedFetch;

  window.NSFGitHubToken = {
    get: get,
    set: set,
    isPersisted: isPersisted,
    prompt: prompt,
    onChange: onChange,
    refresh: refresh,
    SESSION_KEY: SESSION_KEY,
    LOCAL_KEY: LOCAL_KEY
  };

  // 保存済みトークンがあるブラウザ（＝管理者の端末）だけ、開くたびに token_server の値で上書きする
  if (get()) refresh();
})();
