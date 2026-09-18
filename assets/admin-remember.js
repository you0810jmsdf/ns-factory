// ============================================================
// admin-remember.js — このPC（このブラウザ）を自動で管理者扱いにする（2026-09-17 事業主決定）
//
// 【背景】管理者の合言葉は sessionStorage（タブごと）にしか残らず、新しいタブや別の管理者ページを
//        開くたびに入力が必要だった。事業主のPCでは入力なしで管理者モードにしたい。
//
// 【仕組み】
//  - 管理者ページの <head> の先頭で同期読み込みする（admin-gate.js や各ページの処理より先に動くこと）
//  - このブラウザに合言葉が覚えてあれば、タブの sessionStorage へ写す → 各ページは「認証済み」として動く
//  - どこかのページでログインした瞬間（sessionStorage へ nsf_admin_key が入った瞬間）を捕まえ、
//    合言葉が正しければ1回だけ「このPCに覚えさせますか？」と聞く。OKなら localStorage に保存
//  - 各ページが管理者モードを解除（nsf_admin_key を消す）したら、このPCの記憶も消す
//  - 覚えた合言葉が今の合言葉と合わなくなったら（合言葉を変更した後など）記憶を消して読み込み直す
//
// 【記憶を消す／聞き直す】
//  - 消す:       管理者ページのURLの末尾に ?forget-admin=1 を付けて開く（またはSNS動画メーカーの「管理者モード中」を押す）
//  - 聞き直す:   「キャンセル」を選んだ後でもう一度聞かせたいときは ?remember-admin=1 を付けて開く
//
// ※ 合言葉はこのブラウザの中に平文で残る。共用のPCでは覚えさせないこと。
// ※ 照合用のハッシュは admin-gate.js の PASS_HASH と同じ値。合言葉を変えるときは両方を直す。
// ============================================================
(function () {
  'use strict';

  var PASS_HASH = '46f4870c381185671ba3ff063fd973ddb6ba34e5bcbd093a1ca8df3858ac018a';
  var KEY = 'nsf_admin_key';              // 各ページが GAS API の key として使う平文
  var AUTH = 'nsf_admin_auth';            // admin-gate.js の通過印
  var REMEMBER = 'nsf_admin_remember_key';
  var ASKED = 'nsf_admin_remember_asked'; // 'no' = 覚えさせないと答えた

  var ss, ls;
  try { ss = window.sessionStorage; ls = window.localStorage; ss.getItem(KEY); ls.getItem(REMEMBER); }
  catch (e) { return; }

  // ページ別の認証フラグ（増やしたらここに足す。名前と値は各ページのコードと一致させること）
  var SESSION_FLAGS = [
    ['op_auth', '1'],                              // orderprogress.html
    ['nsfactory-chatlog-auth', 'ok'],              // chatlog.html
    ['nsfactory-sns-trend-auth', 'ok'],            // sns-trend.html
    ['nsfactory-automations-auth', 'ok'],          // automations.html
    ['nsfactory-api-costs-auth', 'ok'],            // api-costs.html
    ['nsfactory-staff-monitor-auth', 'ok'],        // staff-monitor.html
    ['nsfactory-youtube-stats-auth', 'ok'],        // youtube-stats.html
    ['nsfactory-sns-queue-auth', 'ok'],            // sns-queue.html
    ['nsfactory-ring-admin-auth', 'ok']            // order_estimate/admin.html
  ];
  var ROOM_TOKENS = ['kanri_auth_token', 'sakusen_auth_token', 'senryaku_auth_token'];

  // 読み込みのたびにログイン欄を出すページ（register.html）は、欄に入れてログインボタンの処理を呼ぶ
  function autoLoginForms(key) {
    document.addEventListener('DOMContentLoaded', function () {
      try {
        var input = document.getElementById('authInput');
        if (input && typeof window.checkAuth === 'function' && document.getElementById('authOverlay')) {
          input.value = key;
          window.checkAuth();
        }
      } catch (e) {}
    });
  }

  var rawSet = Storage.prototype.setItem;
  var rawRemove = Storage.prototype.removeItem;

  function sha256Hex(text) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function forgetThisPc() {
    try {
      rawRemove.call(ls, REMEMBER); rawRemove.call(ls, ASKED);
      SESSION_FLAGS.forEach(function (flag) { rawRemove.call(ss, flag[0]); });
      ROOM_TOKENS.forEach(function (name) { rawRemove.call(ls, name); });
    } catch (e) {}
  }
  window.nsfAdminForgetThisPc = forgetThisPc;

  // ---- URLでの操作（記憶を消す／聞き直す） ----
  try {
    var params = new URLSearchParams(location.search);
    if (params.get('forget-admin') === '1') {
      forgetThisPc();
      rawRemove.call(ss, KEY); rawRemove.call(ss, AUTH);
    }
    if (params.get('remember-admin') === '1') rawRemove.call(ls, ASKED);
  } catch (e) {}

  // ---- 1) 覚えてあれば、このタブを認証済みにする ----
  var saved = '';
  try { saved = ls.getItem(REMEMBER) || ''; } catch (e) {}
  if (saved) {
    try {
      if (!ss.getItem(KEY)) rawSet.call(ss, KEY, saved);
      if (ss.getItem(KEY) === saved) {
        if (ss.getItem(AUTH) !== PASS_HASH) rawSet.call(ss, AUTH, PASS_HASH);
        // 各ページが独自に持つ「このタブは認証済み」の印（ページ側のコードと同じ名前・同じ値）
        SESSION_FLAGS.forEach(function (flag) { rawSet.call(ss, flag[0], flag[1]); });
        // 幕僚室（24時間トークン方式）も通す
        ROOM_TOKENS.forEach(function (name) {
          rawSet.call(ls, name, JSON.stringify({ ok: true, exp: Date.now() + 24 * 60 * 60 * 1000 }));
        });
        autoLoginForms(saved);
      }
    } catch (e) {}
    // 合言葉が変わっていたら記憶を消してやり直す（古い合言葉のまま通過させない）
    sha256Hex(saved).then(function (hex) {
      if (!hex || hex === PASS_HASH) return;
      forgetThisPc();
      try { rawRemove.call(ss, KEY); rawRemove.call(ss, AUTH); } catch (e) {}
      location.reload();
    });
  }

  // ---- 2) ログインの瞬間を捕まえて、このPCに覚えさせるか聞く ----
  Storage.prototype.setItem = function (name, value) {
    rawSet.apply(this, arguments);
    try {
      if (this !== ss || name !== KEY || !value) return;
      var text = String(value);
      if (ls.getItem(REMEMBER) === text) return;
      sha256Hex(text).then(function (hex) {
        if (hex !== PASS_HASH) return;                       // 間違った合言葉は覚えない
        if (ls.getItem(REMEMBER)) { rawSet.call(ls, REMEMBER, text); return; }   // すでに覚えさせているPCは更新だけ
        if (ls.getItem(ASKED) === 'no') return;
        setTimeout(function () {
          var ok = window.confirm(
            'このPC（このブラウザ）に管理者の合言葉を覚えさせますか？\n\n' +
            'OK：次回から、すべての管理者ページで入力が要らなくなります。\n' +
            'キャンセル：今までどおり、タブごとに入力します。\n\n' +
            '※ 共用のPCでは「キャンセル」を選んでください。'
          );
          try { rawSet.call(ls, ok ? REMEMBER : ASKED, ok ? text : 'no'); } catch (e) {}
        }, 400);
      });
    } catch (e) {}
  };

  // ---- 3) ページ側が管理者モードを解除したら、このPCの記憶も消す ----
  Storage.prototype.removeItem = function (name) {
    rawRemove.apply(this, arguments);
    try { if (this === ss && name === KEY) forgetThisPc(); } catch (e) {}
  };
})();
