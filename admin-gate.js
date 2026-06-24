// ============================================================
// admin-gate.js — 管理者専用ページの簡易アクセスゲート
// 台帳(invoice/*)・オーダー進捗(orderprogress.html)で共用
//
// 【仕組み】
//  - <head> 内で同期読み込みすること（body描画前に実行される）
//  - 未認証ならページ全体を隠し、パスワード入力画面を被せる
//  - 入力値の SHA-256 を計算し、下記 PASS_HASH と照合
//  - 一致したらタブを閉じるまで（sessionStorage）認証を保持
//
// 【パスワード変更手順】
//  1. 任意のパスワードを決める
//  2. SHA-256ハッシュを生成（下記いずれか）
//     - PowerShell:
//        $s=[Text.Encoding]::UTF8.GetBytes('決めたパス'); `
//        ($h=[Security.Cryptography.SHA256]::Create().ComputeHash($s)|
//         %{ $_.ToString('x2') }) -join ''
//     - ブラウザのコンソール(F12)で:
//        crypto.subtle.digest('SHA-256', new TextEncoder().encode('決めたパス'))
//          .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
//  3. 出力された64桁の文字列を、下の PASS_HASH の値に貼り替える
//  4. git add → commit → push（GitHub Pages に自動反映）
//
// ※ パスワードは1Password等の安全な場所に別途保管すること。
// ※ これは画面ロックです。GASの窓口(API)直叩きは別途対策が必要（次段階）。
// ============================================================
(function () {
  'use strict';

  var PASS_HASH = 'cd5ce9218e7ae8c4615aa3717be119536201c0e5829a2b23924537006146765f';
  var AUTH_KEY  = 'nsf_admin_auth';

  // 既に認証済み（同一タブセッション内）なら何もしない
  try {
    if (sessionStorage.getItem(AUTH_KEY) === PASS_HASH) return;
  } catch (e) { /* sessionStorage不可環境はゲート表示にフォールバック */ }

  // ---- 認証されるまでページ本体を隠す（FOUC防止・即時） ----
  var hideStyle = document.createElement('style');
  hideStyle.id = 'nsf-gate-hide';
  hideStyle.textContent = 'body{visibility:hidden !important;}';
  (document.head || document.documentElement).appendChild(hideStyle);

  // ---- SHA-256（crypto.subtle / https必須） ----
  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

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

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      msg.textContent = '';
      sha256Hex(input.value).then(function (hex) {
        if (hex === PASS_HASH) {
          try { sessionStorage.setItem(AUTH_KEY, PASS_HASH); } catch (e) {}
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
        msg.textContent = '照合に失敗しました（https環境で開いてください）';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountGate);
  } else {
    mountGate();
  }
})();
