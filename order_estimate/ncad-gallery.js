/* N's CAD 型紙ギャラリーの承認（管理画面の「🖼 型紙ギャラリー承認」タブ・2026-11-02 事業主「最初は私が承認してから公開」）。
 * 利用者が N's CAD から「登録する」で送った型紙は、承認待ちで保存先（Cloudflare Worker leather-cad-gallery・D1）に入る。ここで中身（絵・題・作者・利用条件・作者のページ・説明）を見て、承認・却下・公開を止める。
 * 合言葉（保全部\.env の TOOL_ADMIN_PASSWORD と同じ値）は、このタブを閉じるまでだけ覚える（sessionStorage）。保存先には、合言葉を間違えると10分に10回で止まる仕組みがある。
 * 却下・公開を止めると、保存先から図面と絵が消える（元に戻せない）ので、2回押し（5秒以内）。承認は元に戻せる（公開を止められる）ので1回。
 * 使い方：window.NCADGallery.start()（タブを開いたとき）／stop()。表示先は #ncadGalleryMount。 */
(function () {
  'use strict';
  var BASE = 'https://leather-cad-gallery.bouncy-xenoposeidon.workers.dev', KEY_SS = 'ncadGalleryKey';
  var STATUSES = [['pending', '承認待ち'], ['approved', '公開中'], ['rejected', '却下・公開を止めた']];
  var LICENSE = { personal: '個人利用のみ（作った物の販売はしない）', commercial: '商用可（作った革製品の販売まで可・型紙の再配布は不可）' };
  var ERRORS = { 401: '合言葉が違います。', 429: '合言葉の間違いが続いたため、10分間止めています。', 503: '保存先に合言葉が設定されていません。' };
  var mount = null, built = false, els = {}, status = 'pending', busy = false;

  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }
  function getKey() { try { return sessionStorage.getItem(KEY_SS) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { sessionStorage.setItem(KEY_SS, k); } catch (e) { /* 覚えられなくても続ける */ } }
  function say(text, bad) { els.msg.textContent = text || ''; els.msg.style.color = bad ? '#ff8a80' : '#9fb4a6'; }
  function when(t) { return new Date(t).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false }); }
  function api(path, body) {
    var key = els.key.value.trim() || getKey();
    return fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'x-admin-key': key, 'content-type': 'text/plain;charset=utf-8' }, body: body ? JSON.stringify(body) : undefined, credentials: 'omit' });
  }
  function failText(res) { return ERRORS[res.status] || ('失敗しました（' + res.status + '）。'); }

  function build() {
    if (built || !mount) return; built = true;
    mount.textContent = '';
    var wrap = el('div', 'max-width:960px;margin:0 auto;display:grid;gap:12px;');
    var bar = el('div', 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;');
    els.key = el('input', 'padding:6px 8px;min-width:220px;'); els.key.type = 'password'; els.key.autocomplete = 'off'; els.key.placeholder = '合言葉（TOOL_ADMIN_PASSWORD）';
    els.load = el('button', 'padding:6px 12px;', '読み込む'); els.load.type = 'button'; els.load.onclick = function () { setKey(els.key.value.trim()); load(); };
    els.key.onkeydown = function (e) { if (e.key === 'Enter') els.load.onclick(); };
    bar.appendChild(els.key); bar.appendChild(els.load);
    els.tabs = el('div', 'display:flex;gap:6px;margin-left:auto;');
    STATUSES.forEach(function (s) {
      var b = el('button', 'padding:6px 10px;', s[1]); b.type = 'button'; b.dataset.st = s[0];
      b.onclick = function () { status = s[0]; paintTabs(); load(); }; els.tabs.appendChild(b);
    });
    bar.appendChild(els.tabs);
    els.msg = el('div', 'min-height:1.4em;font-size:13px;');
    els.list = el('div', 'display:grid;gap:12px;');
    wrap.appendChild(bar); wrap.appendChild(els.msg); wrap.appendChild(els.list); mount.appendChild(wrap);
    paintTabs();
  }
  function paintTabs() { Array.prototype.forEach.call(els.tabs.children, function (b) { var on = b.dataset.st === status; b.style.fontWeight = on ? '700' : '400'; b.style.outline = on ? '2px solid #c9a96e' : 'none'; }); }

  function card(it) {
    var box = el('div', 'display:grid;grid-template-columns:200px 1fr;gap:14px;padding:12px;border:1px solid #3a3a3c;border-radius:8px;');
    var thumb = el('div', 'width:200px;height:150px;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;');
    if (it.thumb) { var img = document.createElement('img'); img.alt = ''; img.style.cssText = 'max-width:100%;max-height:100%;'; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(it.thumb); thumb.appendChild(img); }
    else thumb.appendChild(el('span', 'color:#888;font-size:12px;', '絵なし'));
    var info = el('div', 'display:grid;gap:4px;min-width:0;');
    info.appendChild(el('div', 'font-weight:700;font-size:16px;word-break:break-all;', it.title));
    info.appendChild(el('div', 'font-size:13px;', '作者：' + it.author + '　' + it.copyright));
    info.appendChild(el('div', 'font-size:13px;', '利用条件：' + (LICENSE[it.license] || it.license)));
    var st = it.stats || {};
    info.appendChild(el('div', 'font-size:13px;color:#9fb4a6;', '図形 ' + (st.shapes || 0) + ' 個・縫い穴 ' + (st.holes || 0) + ' 個・' + (st.w || 0) + '×' + (st.h || 0) + ' mm・登録 ' + when(it.createdAt)));
    if (it.authorUrl) {
      var link = el('div', 'font-size:13px;word-break:break-all;', '作者のページ：'), a = el('a', '', it.authorUrl);
      a.style.color = '#8ab4f8'; a.href = it.authorUrl; a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; link.appendChild(a); info.appendChild(link);
    }
    if (it.description) info.appendChild(el('div', 'font-size:13px;white-space:pre-wrap;word-break:break-all;', it.description));
    if (it.reason) info.appendChild(el('div', 'font-size:13px;color:#ffb74d;', '理由：' + it.reason));
    var row = el('div', 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;');
    var dl = el('button', 'padding:5px 10px;', '図面（JSON）を保存'); dl.type = 'button';
    dl.onclick = function () { download(it); }; row.appendChild(dl);
    if (it.status !== 'rejected') {
      var reason = el('input', 'padding:5px 8px;flex:1;min-width:160px;'); reason.type = 'text'; reason.maxLength = 200; reason.placeholder = status === 'pending' ? '却下の理由（却下するときだけ）' : '公開を止める理由';
      if (status === 'pending') { var ok = el('button', 'padding:5px 12px;font-weight:700;', '承認する'); ok.type = 'button'; ok.onclick = function () { act('/admin/approve', { id: it.id }, '承認しました。公開の一覧に出ます。'); }; row.appendChild(ok); }
      var no = el('button', 'padding:5px 10px;', status === 'pending' ? '却下する' : '公開を止める'); no.type = 'button'; var armed = 0;
      no.onclick = function () {
        if (!armed || Date.now() - armed > 5000) { armed = Date.now(); no.textContent = 'もう一度押すと実行（図面と絵が消えます）'; return; }
        act('/admin/reject', { id: it.id, reason: reason.value.trim() }, status === 'pending' ? '却下しました（図面と絵を消しました）。' : '公開を止めました（図面と絵を消しました）。');
      };
      row.appendChild(reason); row.appendChild(no);
    }
    info.appendChild(row); box.appendChild(thumb); box.appendChild(info); return box;
  }
  function download(it) {
    say('図面を読んでいます…');
    api('/admin/doc/' + it.id).then(function (res) {
      if (!res.ok) { say(failText(res), true); return; }
      return res.text().then(function (text) {
        var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
        a.href = url; a.download = 'gallery-' + it.id + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); say('図面を保存しました（N\'s CAD で開いて、中身を確かめられます）。');
      });
    }).catch(function () { say('つながりませんでした。', true); });
  }
  function act(path, body, done) {
    if (busy) return; busy = true; say('送っています…');
    api(path, body).then(function (res) {
      if (res.ok) { say(done); return load(true); }
      say(res.status === 409 ? 'すでに状態が変わっています。一覧を読み直します。' : failText(res), res.status !== 409); return load(true);
    }).catch(function () { say('つながりませんでした。', true); }).then(function () { busy = false; });
  }
  function load(keepMsg) {
    if (!els.key.value && getKey()) els.key.value = getKey();
    if (!els.key.value.trim()) { say('合言葉を入れて「読み込む」を押してください。'); els.list.textContent = ''; return Promise.resolve(); }
    if (!keepMsg) say('読み込んでいます…');
    return api('/admin/list?status=' + status).then(function (res) {
      if (!res.ok) { say(failText(res), true); els.list.textContent = ''; return; }
      return res.json().then(function (j) {
        var items = (j && j.items) || []; els.list.textContent = '';
        items.forEach(function (it) { it.status = status; els.list.appendChild(card(it)); });
        if (!keepMsg || !els.msg.textContent) say(items.length ? items.length + ' 件' : '該当する型紙はありません。');
      });
    }).catch(function () { say('つながりませんでした。', true); });
  }
  window.NCADGallery = {
    start: function () { mount = document.getElementById('ncadGalleryMount'); build(); load(); },
    stop: function () { /* 自動では読み直さない（開いたときと、操作のあとだけ読む） */ }
  };
})();
