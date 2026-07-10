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

  window.NSFGitHubToken = {
    get: get,
    set: set,
    isPersisted: isPersisted,
    prompt: prompt,
    onChange: onChange,
    SESSION_KEY: SESSION_KEY,
    LOCAL_KEY: LOCAL_KEY
  };
})();
