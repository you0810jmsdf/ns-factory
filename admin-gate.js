// ============================================================
// admin-gate.js — 管理者専用ページの簡易アクセスゲート
// 台帳(invoice/*)・オーダー進捗(orderprogress.html)で共用
//
// 【仕組み】
//  - <head> 内で同期読み込みすること（body描画前に実行される）。assets/admin-remember.js を先に読み込むこと
//  - 未認証ならページ全体を隠し、パスワード入力画面を被せる
//  - 入力値は admin_guard GAS の verify（サーバー側）で照合する。公開 JS にハッシュは置かない
//    （2026-10-17・API漏洩総点検 M5。照合の関数 window.nsfAdminVerify は assets/admin-remember.js にある）
//  - 一致したらタブを閉じるまで（sessionStorage）認証を保持
//
// 【パスワード変更手順】サーバー側（GAS のスクリプトプロパティ）で行う。この JS を直す必要はない。
//
// ※ パスワードは1Password等の安全な場所に別途保管すること。
// ※ これは画面ロックです。GASの窓口(API)は各GAS側でパスワードを確認している。
// ============================================================
(function () {
  'use strict';

  var AUTH_OK   = window.NSF_ADMIN_AUTH_OK || 'ok'; // 通過印の値（assets/admin-remember.js と同じ）
  var AUTH_KEY  = 'nsf_admin_auth';
  var KEY_STORE = 'nsf_admin_key'; // 通過時に入力平文を保持（GAS APIのkeyとして各ページが使用）

  // 既に認証済み（同一タブセッション内）なら何もしない
  try {
    if (sessionStorage.getItem(AUTH_KEY) === AUTH_OK) return;
  } catch (e) { /* sessionStorage不可環境はゲート表示にフォールバック */ }

  // ---- 認証されるまでページ本体を隠す（FOUC防止・即時） ----
  var hideStyle = document.createElement('style');
  hideStyle.id = 'nsf-gate-hide';
  hideStyle.textContent = 'body{visibility:hidden !important;}';
  (document.head || document.documentElement).appendChild(hideStyle);

  // ---- ゲート画面を構築 ----
  function buildGate() {
    var ov = document.createElement('div');
    ov.id = 'nsf-admin-gate';
    ov.setAttribute('role', 'dialog');
    ov.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:#16130f', 'display:flex',
      'align-items:center', 'justify-content:center',
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif'
    ].join(';');

    ov.innerHTML =
      '<form id="nsf-gate-form" style="width:min(92vw,360px);background:#fff;border-radius:14px;' +
      'padding:32px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;">' +
        '<div style="font-size:13px;letter-spacing:.08em;color:#a07d3e;font-weight:700;">N\'s factory</div>' +
        '<h1 style="font-size:18px;margin:10px 0 4px;color:#2a2520;">管理者ログイン</h1>' +
        '<p style="font-size:12px;color:#8a8278;margin:0 0 20px;">関係者専用ページです</p>' +
        '<input id="nsf-gate-pass" type="password" autocomplete="current-password" ' +
        'placeholder="パスワード" style="width:100%;box-sizing:border-box;padding:12px 14px;' +
        'border:1px solid #d8d2c6;border-radius:8px;font-size:15px;outline:none;">' +
        '<div id="nsf-gate-msg" style="min-height:18px;color:#c0392b;font-size:12px;margin:8px 0 4px;"></div>' +
        '<button type="submit" style="width:100%;padding:12px;border:none;border-radius:8px;' +
        'background:#a07d3e;color:#fff;font-size:15px;font-weight:600;cursor:pointer;">ログイン</button>' +
      '</form>';
    return ov;
  }

  function mountGate() {
    var ov = buildGate();
    document.body.appendChild(ov);
    // ゲート自身は見せる（body hidden を打ち消す）
    ov.style.visibility = 'visible';
    var hide = document.getElementById('nsf-gate-hide');
    if (hide) hide.textContent =
      'body>*:not(#nsf-admin-gate){visibility:hidden !important;}' +
      '#nsf-admin-gate,#nsf-admin-gate *{visibility:visible !important;}';

    var form = document.getElementById('nsf-gate-form');
    var input = document.getElementById('nsf-gate-pass');
    var msg = document.getElementById('nsf-gate-msg');
    input.focus();

    var btn = form.querySelector('button[type="submit"]');
    var busy = false;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      msg.textContent = '';
      if (typeof window.nsfAdminVerify !== 'function') {
        msg.textContent = '照合の部品を読み込めませんでした。再読み込み（Ctrl+F5）してください';
        return;
      }
      busy = true;
      btn.disabled = true;
      btn.textContent = '確認中…';
      var typed = input.value;
      window.nsfAdminVerify(typed).then(function (valid) {
        if (valid === true) {
          try {
            sessionStorage.setItem(AUTH_KEY, AUTH_OK);
            sessionStorage.setItem(KEY_STORE, typed);
          } catch (e) {}
          // 解錠：ゲート除去・本体表示
          var g = document.getElementById('nsf-admin-gate');
          if (g) g.remove();
          var h = document.getElementById('nsf-gate-hide');
          if (h) h.remove();
        } else {
          msg.textContent = 'パスワードが違います';
          input.value = '';
          input.focus();
        }
      }).catch(function () {
        msg.textContent = '照合に失敗しました（通信できません。時間をおいてもう一度）';
      }).then(function () {
        busy = false;
        btn.disabled = false;
        btn.textContent = 'ログイン';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountGate);
  } else {
    mountGate();
  }
})();
