// 公開リフィル印刷ツール共通の追加機能（2026-10-29）。各ツールの末尾で読み込む。
//  1. 操作パネルをシンプルに: 日付・用紙・印刷など「いつも使う設定」だけを前に出し、透かし・フォント・チェックリスト等は「くわしい設定」に畳む
//     印刷ズレ補正は「印刷がずれるとき」として独立した折りたたみにする。
//  2. 設定の保存・読み込み: 端末に保存された設定（nsf_ で始まるキー）をファイルに書き出し／読み込む（機種変更・ブラウザ変更用）
//  3. ホーム画面に追加（PWA）: manifest と Service Worker を登録する（開いたページは電波がなくても開ける）
//  5. 利用登録（2026-11-27）: PDF・印刷のとき、最初の1回だけ名前・メール・区分を登録してもらう（名簿は N's CAD と共通）
//  4. 使われ方の計測（PDF生成・印刷の回数）と、印刷のあとの「次の分を作るきっかけ」の案内（カレンダー・ホーム画面）
// ⛔ 畳むのは DOM を <details> の中へ「移す」だけ。要素の id と onclick はそのまま動く。要素を作り直さない。
(function () {
  if (window.__nsfExtras) return;
  window.__nsfExtras = true;
  const SRC = (document.currentScript && document.currentScript.src) || '';
  const ESSENTIAL = /^(印刷モード|用紙|書式|日付設定|日付・週設定|週の並び|期間|時間設定|時間軸（バーチカル）|日付なしの設定|印刷|サポート)$/;
  const OPEN_KEY = 'nsf_ui_open';

  function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  const titleOf = sec => { const h = sec.querySelector('h3'); return h ? h.textContent.trim() : ''; };

  function injectStyle() {
    const st = document.createElement('style');
    st.textContent = [
      '.nsf-fold{margin:0 0 10px;border-top:1px solid #333;padding-top:6px}',
      '.nsf-fold>summary{cursor:pointer;color:#7ec8e3;font-size:11px;font-weight:700;padding:6px 0;list-style:none}',
      '.nsf-fold>summary::-webkit-details-marker{display:none}',
      '.nsf-fold>summary::before{content:"▸ ";color:#7ec8e3}',
      '.nsf-fold[open]>summary::before{content:"▾ "}',
      '.nsf-fold>.ctrl-section{border-top:1px dashed #333;margin-top:8px;padding-top:6px}',
      '.nsf-fold .nsf-fold-note{font-size:9px;color:#888;line-height:1.5;margin:0 0 4px}',
      '.nsf-hole-hint{font-size:10px;color:#9a9a9a;line-height:1.6;margin:2px 2px 6px}',
      '@media (max-width:600px){.nsf-hole-hint{font-size:11px}}'
    ].join('');
    document.head.appendChild(st);
  }
  function makeFold(id, summary, note) {
    const d = document.createElement('details');
    d.className = 'nsf-fold'; d.id = id;
    d.innerHTML = '<summary></summary>';
    d.firstChild.textContent = summary;
    if (note) { const n = document.createElement('div'); n.className = 'nsf-fold-note'; n.textContent = note; d.appendChild(n); }
    if (lsGet(OPEN_KEY, {})[id]) d.open = true;
    d.addEventListener('toggle', () => { const o = lsGet(OPEN_KEY, {}); o[id] = d.open; lsSet(OPEN_KEY, o); });
    return d;
  }

  function fold() {
    const controls = document.getElementById('controls');
    if (!controls || document.getElementById('nsfAdvanced')) return;
    const secs = [...controls.children].filter(e => e.classList && e.classList.contains('ctrl-section'));
    const printSec = secs.find(s => titleOf(s) === '印刷');
    const anchor = printSec || secs.find(s => titleOf(s) === 'サポート') || null;
    const adj = secs.find(s => s.id === 'nsf-print-adjust');
    const advanced = secs.filter(s => s !== adj && !ESSENTIAL.test(titleOf(s)));
    if (advanced.length) {
      const d = makeFold('nsfAdvanced', '⚙ くわしい設定（表示・透かし・フォントなど）', 'いつも使う設定は上にあります。ここを開くと、細かい調整ができます。');
      advanced.forEach(s => d.appendChild(s));
      controls.insertBefore(d, anchor);
    }
    if (adj) {
      const d = makeFold('nsfAdjustFold', '📐 印刷がずれるとき（位置・倍率の補正）', '印刷した位置や大きさが合わないときに開いてください。');
      d.appendChild(adj);
      controls.insertBefore(d, anchor);
    }
  }

  // ── 設定の保存・読み込み ──
  function exportSettings() {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('nsf_') === 0) items[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: 'nsf-refill-settings', version: 1, exportedAt: new Date().toISOString(), items }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date(), p = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = 'nsfactory-settings-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importSettings(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('ファイルが大きすぎます。N\'s factory の設定ファイルを選んでください。'); return; }
    const r = new FileReader();
    r.onload = () => {
      let data;
      try { data = JSON.parse(String(r.result)); } catch (e) { alert('設定ファイルを読み込めませんでした。'); return; }
      if (!data || data.app !== 'nsf-refill-settings' || !data.items || typeof data.items !== 'object') { alert('N\'s factory の設定ファイルではありません。'); return; }
      const keys = Object.keys(data.items).filter(k => k.indexOf('nsf_') === 0 && typeof data.items[k] === 'string');
      if (!keys.length) { alert('読み込める設定がありませんでした。'); return; }
      if (!confirm(keys.length + '件の設定を読み込みます。この端末の同じ設定は上書きされます。よろしいですか？')) return;
      keys.forEach(k => { try { localStorage.setItem(k, data.items[k]); } catch (e) {} });
      location.reload();
    };
    r.readAsText(file);
  }
  function mountBackup() {
    const controls = document.getElementById('controls');
    if (!controls || document.getElementById('nsfBackupRow')) return;
    const sup = [...controls.querySelectorAll('.ctrl-section')].find(s => titleOf(s) === 'サポート');
    const box = document.createElement('div');
    box.id = 'nsfBackupRow';
    box.innerHTML = '<div class="btn-row" style="margin-top:6px"><button type="button" class="btn-secondary" id="nsfBackupSave" style="flex:1">💾 設定を保存</button><button type="button" class="btn-secondary" id="nsfBackupLoad" style="flex:1;margin-left:6px">📂 設定を読み込む</button></div>'
      + '<input type="file" id="nsfBackupFile" accept="application/json,.json" style="display:none">'
      + '<div style="font-size:9px;color:#888;line-height:1.6;margin-top:4px;">設定（補正値・プリンター設定を含む）をファイルに保存して、別の端末やブラウザで読み込めます。<br>📱 ブラウザのメニューの「ホーム画面に追加」で、アプリのように開けます。</div>';
    (sup || controls).appendChild(box);
    box.querySelector('#nsfBackupSave').addEventListener('click', exportSettings);
    box.querySelector('#nsfBackupLoad').addEventListener('click', () => box.querySelector('#nsfBackupFile').click());
    box.querySelector('#nsfBackupFile').addEventListener('change', e => { importSettings(e.target.files && e.target.files[0]); e.target.value = ''; });
  }

  // ── ホーム画面に追加（PWA） ──
  function pwa() {
    if (!SRC) return;
    try {
      if (!document.querySelector('link[rel="manifest"]')) {
        const l = document.createElement('link'); l.rel = 'manifest'; l.href = new URL('../manifest.webmanifest', SRC).href; document.head.appendChild(l);
        if (!document.querySelector('meta[name="theme-color"]')) { const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#7A5540'; document.head.appendChild(m); }
      }
      const secure = location.protocol === 'https:' || location.hostname === 'localhost';
      if (secure && 'serviceWorker' in navigator) {
        const sw = new URL('../sw.js', SRC);
        navigator.serviceWorker.register(sw.href, { scope: new URL('../', SRC).pathname }).catch(() => {});
      }
    } catch (e) {}
  }

  // ── 使われ方の計測と、「また使う」きっかけ（2026-10-30） ──
  // 背景: リフィルツールは1回見て終わる人が大半（PV/UU 1.2〜1.9）。しかも「見た数」しか数えておらず、印刷・PDF生成まで行ったか分からなかった。
  //  1. 「PDFを生成」「印刷」を押した回数を、既存のアクセスカウンターに event/<種類>/<ツール名> という名前で送る（個人を特定する情報は送らない・事業主の端末は除外）
  //  2. 印刷・PDF生成のあと1回だけ、「次の分を作る日をカレンダーに入れる」「ホーム画面／ブックマーク」の案内を出す（60日に1回まで・閉じれば出ない）
  const COUNTER_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';
  const NUDGE_KEY = 'nsf_nudge_v1';
  const NUDGE_INTERVAL_DAYS = 60;

  // access-counter.js と同じ除外条件（事業主の端末・自動操作・手元の確認は数えない）
  function isInternal() {
    try { if (localStorage.getItem('nsf_internal') === '1' || sessionStorage.getItem('nsf_admin_key')) return true; } catch (e) {}
    if (navigator.webdriver) return true;
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:';
  }
  function toolSlug() {
    const p = decodeURIComponent(location.pathname).replace(/^\/+(ns-factory\/)?/, '').replace(/index\.html$/, '').replace(/\/+$/, '');
    return p || 'index';
  }
  function visitorId() { try { return localStorage.getItem('nsf_vid') || ''; } catch (e) { return ''; } }

  const lastSent = {};
  function sendEvent(kind) {
    const now = Date.now();
    if (lastSent[kind] && now - lastSent[kind] < 10000) return false;  // 同じ操作の連打は1回に
    lastSent[kind] = now;
    if (isInternal()) return false;
    try {
      const url = COUNTER_URL + '?action=track&page=' + encodeURIComponent('event/' + kind + '/' + toolSlug()) + '&title=' + encodeURIComponent('[操作] ' + kind + ' ' + (document.title || '')) + '&vid=' + encodeURIComponent(visitorId());
      fetch(url, { cache: 'no-store', keepalive: true }).catch(() => {});
    } catch (e) {}
    return true;
  }

  // ── 次の分を作るきっかけ ──
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });

  function nudgeDue() {
    const t = lsGet(NUDGE_KEY, 0);
    return !t || Date.now() - t > NUDGE_INTERVAL_DAYS * 86400000;
  }
  function ymd(d) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  // 期間の終わり（終了日の欄があれば）の少し前、無ければ約1か月後を、「次を作る日」にする
  function remindDate() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const id of ['periodEnd', 'endDate', 'periodEndDate']) {
      const el = document.getElementById(id), v = el && el.value;
      if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = new Date(v + 'T00:00:00'); d.setDate(d.getDate() - 5);
        if (d > today) return d;
      }
    }
    const d = new Date(today); d.setDate(d.getDate() + 25); return d;
  }
  function calendarUrl() {
    const d = remindDate(), e = new Date(d); e.setDate(e.getDate() + 1);
    const name = (document.title || 'リフィル').split('|')[0].split('｜')[0].trim();
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('リフィルの次の分を作る（' + name + '）')
      + '&dates=' + ymd(d) + '/' + ymd(e)
      + '&details=' + encodeURIComponent('次の期間のリフィルを作って印刷しましょう。\n' + location.href.split('#')[0]);
  }
  function showNudge() {
    if (document.getElementById('nsfNudge') || !nudgeDue()) return;
    lsSet(NUDGE_KEY, Date.now());   // 出した時点で記録（閉じなくても60日は出さない）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const box = document.createElement('div');
    box.id = 'nsfNudge';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100000;width:min(92vw,420px);background:#fff;color:#3b2a1d;border:1px solid #E0D2C2;border-radius:10px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.22);font:13px/1.7 -apple-system,"Hiragino Sans",Meiryo,sans-serif;';
    box.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">お疲れさまでした。次の分も、すぐ作れます。</div>'
      + '<div style="font-size:12px;color:#6b5646;margin-bottom:8px;">リフィルは、期間が終わる前に作り足すものです。忘れないように、次の日を決めておきませんか。</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      + '<a id="nsfNudgeCal" href="' + calendarUrl().replace(/&/g, '&amp;') + '" target="_blank" rel="noopener" style="background:#7A5540;color:#fff;text-decoration:none;border-radius:6px;padding:6px 10px;font-weight:700;">📅 カレンダーに入れる</a>'
      + '<button type="button" id="nsfNudgeHome" style="background:#F3ECE4;color:#4a3a2c;border:1px solid #E0D2C2;border-radius:6px;padding:6px 10px;font-weight:700;cursor:pointer;">📌 ' + (isIOS ? 'ホーム画面に追加' : 'また開きやすくする') + '</button>'
      + '<button type="button" id="nsfNudgeClose" style="margin-left:auto;background:none;border:none;color:#8a7362;cursor:pointer;font-size:12px;">閉じる</button>'
      + '</div><div id="nsfNudgeHelp" style="display:none;font-size:11px;color:#6b5646;margin-top:8px;"></div>';
    document.body.appendChild(box);
    document.body.classList.add('nsf-nudge-on');   // スマホ幅で右下の丸ボタンを隠す（案内と重なるため）
    box.querySelector('#nsfNudgeClose').addEventListener('click', () => { box.remove(); document.body.classList.remove('nsf-nudge-on'); });
    box.querySelector('#nsfNudgeCal').addEventListener('click', () => sendEvent('reminder'));
    box.querySelector('#nsfNudgeHome').addEventListener('click', () => {
      sendEvent('homescreen');
      if (installPrompt) { installPrompt.prompt(); installPrompt = null; return; }
      const help = box.querySelector('#nsfNudgeHelp');
      help.style.display = 'block';
      help.textContent = isIOS ? 'Safari の下の「共有」ボタン → 「ホーム画面に追加」を選ぶと、アプリのように開けます。'
        : 'キーボードの Ctrl＋D（Mac は ⌘＋D）でブックマークに入れておくと、次回すぐ開けます。スマホは、ブラウザのメニューの「ホーム画面に追加」から。';
    });
  }

  // ── 利用登録（2026-11-27 事業主決定A：PDF・印刷のとき最初の1回だけ・名簿は N's CAD と共通） ──
  // 見る・試すのは自由。「PDFを作る」「印刷」を押した最初の1回だけ、お名前・メール・区分を登録してもらう。
  // 登録の部品と名簿は N's CAD と同じ（nscad/registration.js・localStorage leather-cad.reg）。N's CAD で登録済みのブラウザは、入力なしで通る。
  // 登録後は「誰が・いつ・どのツールで PDF／印刷をしたか」だけを登録サーバーへ送る（機能名 refill_pdf / refill_print とツール名）。入力した日付や文字は送らない。
  // 事業主の端末（nsf_internal）と、部品を読み込めないとき（電波なし・古いブラウザ）は、登録を求めずに通す。
  // ⛔ ブラウザのメニューからの印刷は止められない（止めるのはボタンと Ctrl+P）。ブラウザの中の仕組みなので、書き換えられる人は外せる（登録を促すのが目的）。
  let reg = null;
  const REG_TEST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]regtest=1(&|$)/.test(location.search);   // 手元の確認用（本番のアドレスでは効かない）
  function regActive() { return !!reg && reg.enabled() && (!isInternal() || REG_TEST); }
  function regNeeded() { try { return regActive() && reg.state().status !== 'ok'; } catch (e) { return false; } }
  const regSent = {};
  function regTrack(kind) {
    try {
      if (!regActive() || reg.state().status !== 'ok') return;
      const now = Date.now();
      if (regSent[kind] && now - regSent[kind] < 10000) return;   // 連打は1回に
      regSent[kind] = now;
      reg.track('refill_' + kind, toolSlug());
    } catch (e) {}
  }
  const REG_ERR = {
    email: 'メールアドレスの形が正しくありません。', name: 'お名前を入れてください。', kind: '区分（受講生か、それ以外か）を選んでください。',
    consent: '同意のチェックを入れてください。', limit: '短い間に何度も申し込まれています。しばらくしてから、もう一度お試しください。',
    network: '送れませんでした。ネットワークを確かめて、もう一度お試しください。', server: '登録を受け付けられませんでした。時間をおいて、もう一度お試しください。'
  };
  function openReg(what, go) {
    if (document.getElementById('nsfReg')) return;
    const w = document.createElement('div');
    w.id = 'nsfReg';
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-labelledby', 'nsfRegTitle');
    w.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(40,28,18,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;font:14px/1.7 -apple-system,"Hiragino Sans",Meiryo,sans-serif;';
    const inp = 'display:block;width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;border:1px solid #cdbba8;border-radius:6px;margin-top:3px;background:#fff;color:#3b2a1d;';
    const btn = 'border-radius:6px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:14px;';
    w.innerHTML = '<form id="nsfRegForm" novalidate style="background:#fff;color:#3b2a1d;width:min(100%,440px);border-radius:12px;padding:18px 18px 14px;margin:auto;box-shadow:0 10px 40px rgba(0,0,0,.35);">'
      + '<h2 id="nsfRegTitle" style="font-size:17px;margin:0 0 6px;">利用登録（最初の1回だけ）</h2>'
      + '<p style="margin:0 0 10px;font-size:13px;">' + what + 'の前に、お名前・メールアドレス・区分を1回だけ登録してください。このブラウザが覚えるので、次からは聞きません（別のパソコン・スマホでは、もう一度お願いします）。確認メールは届きません。入れたらすぐ使えます。<br>N\'s CAD で登録済みの方は、同じメールアドレスを入れてください。</p>'
      + '<label style="display:block;margin-bottom:8px;font-weight:700;font-size:13px;">お名前（必須）<input id="nsfRegName" type="text" maxlength="30" autocomplete="name" style="' + inp + '"></label>'
      + '<label style="display:block;margin-bottom:8px;font-weight:700;font-size:13px;">メールアドレス（必須）<input id="nsfRegEmail" type="email" maxlength="254" autocomplete="email" inputmode="email" style="' + inp + '"></label>'
      + '<div style="margin-bottom:8px;font-size:13px;"><b>区分（必須）：</b><br>'
      + '<label style="margin-right:14px;white-space:nowrap;"><input type="radio" name="nsfRegKind" value="student"> 教室・講座の受講生</label>'
      + '<label style="white-space:nowrap;"><input type="radio" name="nsfRegKind" value="general"> それ以外</label></div>'
      + '<p style="margin:0 0 8px;font-size:11.5px;color:#6b5646;background:#FAF6F1;border-radius:6px;padding:8px 10px;">預かるのは、お名前・メールアドレス・区分です。目的は、どなたが・いつ・どのリフィルツールでPDF作成・印刷をしたかを運営者が把握し、ツールの改善に役立てることです。入力した日付・文字・予定の中身は送りません。お名前とメールアドレスは運営者（N\'s factory）だけが見て、第三者へは提供しません。登録の削除は、運営者へメールでお知らせください。</p>'
      + '<label style="display:block;margin-bottom:10px;font-size:13px;"><input id="nsfRegConsent" type="checkbox"> 上の内容に同意して登録する</label>'
      + '<div id="nsfRegMsg" role="alert" style="display:none;margin-bottom:10px;font-size:13px;color:#9b2c2c;"></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
      + '<button type="submit" id="nsfRegSend" style="' + btn + 'background:#7A5540;color:#fff;border:1px solid #7A5540;">登録する</button>'
      + '<button type="button" id="nsfRegLater" style="' + btn + 'display:none;background:#F3ECE4;color:#4a3a2c;border:1px solid #E0D2C2;">今回はこのまま使う</button>'
      + '<button type="button" id="nsfRegClose" style="margin-left:auto;background:none;border:none;color:#8a7362;cursor:pointer;font-size:13px;padding:9px 4px;">やめる</button>'
      + '</div></form>';
    document.body.appendChild(w);
    const q = id => w.querySelector('#' + id), form = q('nsfRegForm'), msg = q('nsfRegMsg'), send = q('nsfRegSend');
    const close = () => { document.removeEventListener('keydown', onKey, true); w.remove(); };
    const say = (text, ok) => { msg.textContent = text; msg.style.display = text ? 'block' : 'none'; msg.style.color = ok ? '#2f6b3a' : '#9b2c2c'; };
    const proceed = () => { close(); try { go(); } catch (e) {} };
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    q('nsfRegClose').addEventListener('click', close);
    q('nsfRegLater').addEventListener('click', proceed);   // つながらないときだけ出る。登録していないので、次のときにまた聞く
    try { const s = reg.state(); if (s.nick) q('nsfRegName').value = s.nick; if (s.email) q('nsfRegEmail').value = s.email; } catch (e) {}
    setTimeout(() => { try { q('nsfRegName').focus(); } catch (e) {} }, 50);
    let done = false;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (done) { proceed(); return; }
      if (send.disabled) return;
      const kind = (w.querySelector('input[name="nsfRegKind"]:checked') || {}).value || '';
      send.disabled = true; send.textContent = '送っています…'; say('');
      let r;
      try { r = await reg.register({ email: q('nsfRegEmail').value, name: q('nsfRegName').value, kind: kind, consent: q('nsfRegConsent').checked }); } catch (err) { r = { ok: false, error: 'network' }; }
      send.disabled = false;
      if (r && r.ok && r.status === 'ok') {
        done = true;
        form.querySelectorAll('input').forEach(i => { i.disabled = true; });
        q('nsfRegLater').style.display = 'none'; q('nsfRegClose').style.display = 'none';
        say('登録できました。ありがとうございます。', true);
        send.textContent = '▶ ' + what + 'へ進む';
        try { send.focus(); } catch (err) {}
        return;
      }
      send.textContent = '登録する';
      if (r && r.ok) { say('このメールアドレスは、届いた確認メールのリンクを開くと登録が完了します。開いたあと、もう一度「登録する」を押してください。'); return; }
      const code = (r && r.error) || 'server';
      say(REG_ERR[code] || REG_ERR.server);
      if (code === 'network' || code === 'server' || code === 'limit') q('nsfRegLater').style.display = '';
    });
  }
  function regGate() {
    if (!SRC) return;
    try {
      // 古いブラウザで、このファイル全体が読めなくならないよう、import は文字列から作る
      new Function('u', 'return import(u)')(new URL('../nscad/registration.js', SRC).href).then(m => {
        reg = m.createRegistration({ storage: localStorage, fetchFn: (u, o) => fetch(u, o), version: 'refill:' + toolSlug() });
        if (regActive()) reg.refresh();
      }).catch(() => {});
    } catch (e) { return; }
    let pass = false;
    // usage() より先に登録する（登録前の押下は、PDFの回数にも数えない）
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('#btnPdf, [data-nsf-pdf]');
      if (!b) return;
      if (pass || !regNeeded()) { regTrack('pdf'); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      openReg('PDFを作る', () => { pass = true; try { b.click(); } finally { pass = false; } });
    }, true);
    const nativePrint = window.print.bind(window);
    window.print = function () { if (regNeeded()) { openReg('印刷', nativePrint); return; } nativePrint(); };
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'p' && regNeeded()) { e.preventDefault(); e.stopPropagation(); openReg('印刷', nativePrint); }
    }, true);
    window.addEventListener('beforeprint', () => regTrack('print'));
  }

  function usage() {
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('#btnPdf, [data-nsf-pdf]');
      if (!b) return;
      sendEvent('pdf');
      setTimeout(showNudge, 6000);   // 生成の操作を邪魔しないよう、少し待ってから
    }, true);
    window.addEventListener('beforeprint', () => sendEvent('print'));
    window.addEventListener('afterprint', () => setTimeout(showNudge, 1500));
    features();
  }

  // ── 機能の利用（2026-11-13・事業主「N's CADと同様に分析タブを作って」決定A＝既存カウンター＋管理画面タブ） ──
  // ボタン・選択欄・チェック欄・スライダーなど、id（無ければ name）のある部品を使ったら、
  // 1回の表示につき1機能1度だけ event/f/<部品のid>/<ツール名> としてカウンターへ送る。title は「[機能] 画面の文字｜ツール名」。
  // ⛔ 入力した値（日付・文字・数値）は送らない。送るのは部品の id と、画面に出ている見出しの文字だけ。事業主の端末は isInternal() で除外。
  const featSeen = new Set();
  const FEAT_SKIP = /^(btnPdf|nsfNudge|nsfBackup)/;
  function featLabel(el) {
    let t = '';
    if (el.tagName === 'BUTTON' || el.tagName === 'A') t = el.textContent;
    if (!t && el.id) { const l = document.querySelector('label[for="' + el.id + '"]'); if (l) t = l.textContent; }
    if (!t) { const row = el.closest('.ctrl-row, label'); const l = row && (row.tagName === 'LABEL' ? row : row.querySelector('label')); if (l) t = l.textContent; }
    if (!t) t = el.getAttribute('title') || el.getAttribute('aria-label') || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, 30);
  }
  function sendFeature(el) {
    const raw = el.id || el.getAttribute('name') || '';
    const kind = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
    if (!kind || FEAT_SKIP.test(kind) || featSeen.has(kind)) return;
    featSeen.add(kind);
    if (isInternal()) return;
    try {
      const tool = toolSlug();
      const url = COUNTER_URL + '?action=track&page=' + encodeURIComponent('event/f/' + kind + '/' + tool)
        + '&title=' + encodeURIComponent('[機能] ' + (featLabel(el) || kind) + '｜' + tool) + '&vid=' + encodeURIComponent(visitorId());
      fetch(url, { cache: 'no-store', keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  function features() {
    document.addEventListener('click', e => {
      const el = e.target && e.target.closest && e.target.closest('button, [role="button"], a[id], [onclick]');
      if (el) sendFeature(el);
    }, true);
    document.addEventListener('change', e => {
      const el = e.target;
      if (el && /^(SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) sendFeature(el);
    }, true);
  }

  // 5. スマホ幅の使いやすさ（メニューの重ね表示・フリック・端のつまみ）は別ファイル。畳んだあとに読み込む（2026-10-31）
  function loadMobile() {
    if (window.__nsfRefillMobile || !SRC || document.getElementById('nsf-refill-mobile-js')) return;
    const s = document.createElement('script');
    s.id = 'nsf-refill-mobile-js'; s.async = true;
    s.src = SRC.replace(/refill-extras\.js(\?.*)?$/, 'refill-mobile.js$1');
    document.head.appendChild(s);
  }

  // 6. 「穴の印」を印刷するかどうかを、用紙の近くに出す（2026-10-31）。本体は「表示要素」の「穴印刷」ボタン（くわしい設定の中で見つけにくい）。
  //    同じ設定を操作する行を足すだけで、描画・保存・PDF の仕組みには触れない。穴あけ道具がない人向け。
  function holeRow() {
    const real = document.getElementById('btnHoles');
    const controls = document.getElementById('controls');
    if (!real || !controls || document.getElementById('nsfHoleRow')) return;
    const sec = [...controls.querySelectorAll('.ctrl-section')].find(x => /^(用紙|印刷モード)$/.test(titleOf(x)));
    if (!sec) return;
    const row = document.createElement('div'); row.id = 'nsfHoleRow'; row.className = 'ctrl-row';
    row.innerHTML = '<label>穴の印</label><button type="button" class="btn-toggle" id="nsfHoleBtn"></button>';
    const hint = document.createElement('div'); hint.className = 'nsf-hole-hint';
    hint.textContent = '穴あけ道具がないときは「印刷しない」にすると、穴の印を印刷しません（PDFも同じ）。';
    sec.appendChild(row); sec.appendChild(hint);
    const btn = row.querySelector('button');
    const sync = () => { const on = real.classList.contains('on'); btn.classList.toggle('on', on); btn.textContent = on ? '印刷する' : '印刷しない'; };
    btn.addEventListener('click', () => real.click());
    new MutationObserver(sync).observe(real, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  // 7. 紙面の上の操作バー（2026-11-24 事業主決定B）
  //  背景: PDF・印刷のボタンが閉じた「☰」の中にしかなく、ページを開いた42回のうち☰が開かれたのは2回（11/13〜19）。
  //  - 「📄 PDFを作る」「🖨 印刷」「⚙ 期間・設定」を、サイズ切り替えの下（紙面の上）に常に出す。PDFは本体の #btnPdf を押すだけ（生成の仕組みに触れない）
  //  - PDF・印刷のたびに「作った期間」をツールごとに端末へ保存し、次に来たら「▶ 続きから作る」で開始日を翌日に、長さは前回と同じにする
  //  - パソコン幅で初めて来た人にだけ、設定パネルを開いた状態で始める（スマホは重なるので開かない）
  // ⛔ 期間の欄は2種類の名前がある（開始 startDate／periodStart・終了 periodEnd／endDate）。値を入れて change を送るだけで、各ツールの再描画に任せる。
  const PERIOD_KEY = 'nsf_last_period_v1';
  const INTRO_KEY = 'nsf_panel_intro_v1';
  const $id = id => document.getElementById(id);
  let applying = false;   // 「続きから」で日付を入れている最中（手で変えたときと区別する）
  const startEl = () => $id('startDate') || $id('periodStart');
  const endEl = () => $id('periodEnd') || $id('endDate');
  const pad2 = n => String(n).padStart(2, '0');
  const toVal = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  function parseVal(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function isUndated() { const u = $id('btnUndated'); return !!(u && u.classList.contains('on')); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function lastDayOf(y, m) { return new Date(y, m + 1, 0); }
  // 前回の期間の翌日から、同じ長さの期間。前回が「月初〜月末」なら月数で合わせる（1か月＝28〜31日のずれを出さない）
  function nextRange(s, e) {
    const ns = addDays(e, 1);
    if (s.getDate() === 1 && e.getDate() === lastDayOf(e.getFullYear(), e.getMonth()).getDate()) {
      const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1;
      return { s: ns, e: lastDayOf(ns.getFullYear(), ns.getMonth() + months - 1) };
    }
    return { s: ns, e: addDays(ns, Math.round((e - s) / 86400000)) };
  }
  function fmtMD(d) { return (d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '/' : '') + (d.getMonth() + 1) + '/' + d.getDate(); }
  function savedPeriod() {
    const p = lsGet(PERIOD_KEY, {})[toolSlug()];
    const s = p && parseVal(p.s), e = p && parseVal(p.e);
    return s && e && e >= s ? { s, e } : null;
  }
  // 実際に紙面に出る期間にそろえる。週間・バーチカルは「開始日の週の頭〜終了日の週の終わり」、月間は「開始月の1日〜終了月の末日」で描くので、
  // 入力欄の値のまま次を作ると1週間（1か月）重なる。リフィルメーカーは週間バーチカルの時だけ期間欄を使う（ほかの書式は対象外）。
  function effectiveRange(s, e) {
    const fs = $id('fmtSel');
    if (fs && fs.value !== 'weekly') return null;
    const wsd = $id('weekStartDay');
    if (wsd && $id('startDate') && $id('periodEnd')) {
      const sd = parseInt(wsd.value, 10) || 0;
      const snap = d => addDays(d, -((d.getDay() - sd + 7) % 7));
      return { s: snap(s), e: addDays(snap(e), 6) };
    }
    if ($id('periodStart')) return { s: new Date(s.getFullYear(), s.getMonth(), 1), e: lastDayOf(e.getFullYear(), e.getMonth()) };
    return { s, e };
  }
  function recordPeriod() {
    if (isUndated()) return;
    const s0 = parseVal(startEl() && startEl().value), e0 = parseVal(endEl() && endEl().value);
    if (!s0 || !e0 || e0 < s0) return;
    const r = effectiveRange(s0, e0); if (!r) return;
    const s = r.s, e = r.e;
    const all = lsGet(PERIOD_KEY, {});
    all[toolSlug()] = { s: toVal(s), e: toVal(e), at: Date.now() };
    lsSet(PERIOD_KEY, all);
    const note = $id('nsfBarNote'); if (note) note.textContent = '';
    refreshBar();
  }
  function setDate(el, d) {
    if (!el) return;
    el.value = toVal(d);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function applyNext() {
    const p = savedPeriod(); if (!p) return;
    const n = nextRange(p.s, p.e);
    applying = true;
    try { setDate(startEl(), n.s); setDate(endEl(), n.e); } finally { applying = false; }
    const note = $id('nsfBarNote');
    if (note) note.textContent = '開始日を ' + fmtMD(n.s) + '、終了日を ' + fmtMD(n.e) + ' にしました（前回の続き）。紙面を確かめてから PDF を作ってください。';
    refreshBar();
  }
  function refreshBar() {
    const row = $id('nsfBarNextRow'); if (!row) return;
    const p = savedPeriod();
    const cur = parseVal(startEl() && startEl().value);
    const n = p && nextRange(p.s, p.e);
    const already = n && cur && toVal(cur) === toVal(n.s);
    const fs = $id('fmtSel');
    const show = !!n && !isUndated() && !already && !(fs && fs.value !== 'weekly');
    const noteEl = $id('nsfBarNote');
    if (isUndated() && noteEl) noteEl.textContent = '';
    row.style.display = show || (noteEl && noteEl.textContent) ? '' : 'none';
    const btn = $id('nsfBarNext');
    if (btn) { btn.style.display = show ? '' : 'none'; if (n) btn.textContent = '▶ 続きから作る（' + fmtMD(n.s) + '〜' + fmtMD(n.e) + '）'; }
    const prev = $id('nsfBarPrev');
    if (prev) prev.textContent = show && p ? '前回は ' + fmtMD(p.s) + '〜' + fmtMD(p.e) + ' を作りました。' : '';
  }
  function actionBar() {
    const controls = $id('controls'), preview = $id('preview'), real = $id('btnPdf');
    if (!controls || !preview || !real || $id('nsfActionBar')) return;
    const st = document.createElement('style');
    st.textContent = [
      '#nsfActionBar{max-width:760px;margin:0 auto 12px;padding:8px 10px;background:#fff;border:1px solid #E0D2C2;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:13px/1.6 -apple-system,"Hiragino Sans",Meiryo,sans-serif;color:#4a3a2c;box-sizing:border-box}',
      '#nsfActionBar button{border-radius:6px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer}',
      '#nsfBarPdf{background:#7A5540;color:#fff;border:1px solid #7A5540}',
      '#nsfBarPrint,#nsfBarSettings{background:#F3ECE4;color:#4a3a2c;border:1px solid #E0D2C2}',
      '#nsfBarSettings{margin-left:auto}',
      '#nsfBarNextRow{flex-basis:100%;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;border-top:1px dashed #E0D2C2;padding-top:8px}',
      '#nsfBarNext{background:#fbf7ef;color:#6f4e37;border:1.5px dashed #c9a96e}',
      '#nsfBarPrev,#nsfBarNote{font-size:12px;color:#6b5646}',
      '#nsfBarNote:empty,#nsfBarPrev:empty{display:none}',
      '#nsfBarIos{flex-basis:100%;font-size:12px;line-height:1.6;color:#6b5646;background:#fbf7ef;border-radius:6px;padding:5px 8px}',
      '@media (min-width:1100px){#nsfActionBar{position:sticky;top:0;z-index:60}}',
      '@media (min-width:601px){body.panel-open #nsfActionBar{margin-left:max(292px,calc(50% - 380px));margin-right:auto}}',
      '@media (max-width:600px){#nsfActionBar{margin:0 12px 8px;padding:6px 8px;gap:6px}#nsfActionBar button{padding:7px 10px}}',
      '@media print{#nsfActionBar{display:none!important}}'
    ].join('');
    document.head.appendChild(st);
    const bar = document.createElement('div');
    bar.id = 'nsfActionBar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '作る・印刷する');
    bar.innerHTML = '<button type="button" id="nsfBarPdf">📄 PDFを作る</button>'
      + '<button type="button" id="nsfBarPrint">🖨 印刷</button>'
      + '<button type="button" id="nsfBarSettings">⚙ 期間・設定</button>'
      + '<div id="nsfBarNextRow" style="display:none"><button type="button" id="nsfBarNext"></button><span id="nsfBarPrev"></span><span id="nsfBarNote" role="status"></span></div>';
    // iPhone・iPad の標準の印刷は自動で縮小され、穴やサイズが合わなくなる（2026-11-24 事業主決定・出典 LINE\enriched\2026-09-19-iOSからのリフィル印刷は縮小される問題.md）
    // → iPhone・iPad で開いたときだけ、操作バーに1行の注記を出す。iPadOS は「Mac」を名乗るのでタッチ点の数で見分ける。
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (isIos) bar.insertAdjacentHTML('beforeend', '<div id="nsfBarIos">📱 iPhone・iPad の標準の印刷は、自動で少し縮小されます。原寸で刷るときは「📄 PDFを作る」→ 共有 → プリンターのメーカーのアプリ（Canon PRINT・Epson Smart Panel など）で印刷してください。</div>');
    preview.parentNode.insertBefore(bar, preview);
    // 更新履歴（HISTORY_ENTRIES の末尾が最新・refill-mobile.js と同じやり方）。refill-mobile.js（10/31の項目）を読み終えてから足して、日付の順を保つ
    const pushHist = () => { try {
      if (typeof HISTORY_ENTRIES !== 'undefined' && Array.isArray(HISTORY_ENTRIES) && !HISTORY_ENTRIES.some(x => x.title === '紙面の上に「PDFを作る・印刷・続きから作る」'))
      HISTORY_ENTRIES.push({ date: '2026-11-24', type: 'improve', title: '紙面の上に「PDFを作る・印刷・続きから作る」',
        detail: 'PDF・印刷のボタンを、☰を開かなくても押せるように紙面の上に出しました。PDF・印刷のときに作った期間をこの端末に覚えておき、次に開いたとき「▶ 続きから作る」で、前回の翌日から同じ長さの期間を用意します（週間は週単位・月間は月単位でそろえます）。iPhone・iPad では、原寸で印刷するための注意をボタンの下に出します。' });
      if (typeof HISTORY_ENTRIES !== 'undefined' && Array.isArray(HISTORY_ENTRIES) && !HISTORY_ENTRIES.some(x => x.title === 'PDF・印刷のとき、最初に1回だけ利用登録'))
      HISTORY_ENTRIES.push({ date: '2026-11-27', type: 'improve', title: 'PDF・印刷のとき、最初に1回だけ利用登録',
        detail: '「PDFを作る」「印刷」を初めて押したときに、お名前・メールアドレス・区分（教室・講座の受講生／それ以外）の登録をお願いするようにしました。見る・試すのは、これまでどおり登録なしでできます。登録はこのブラウザが覚えるので、次からは聞きません。N\'s CAD で登録済みのブラウザは、そのまま使えます。リフィルに入れた日付や文字は送りません。' });
    } catch (e) {} };
    setTimeout(() => {
      const m = $id('nsf-refill-mobile-js');
      if (m && !window.__nsfRefillMobile) { m.addEventListener('load', pushHist); m.addEventListener('error', pushHist); setTimeout(pushHist, 5000); }
      else pushHist();
    }, 0);
    $id('nsfBarPdf').addEventListener('click', () => real.click());
    $id('nsfBarPrint').addEventListener('click', () => window.print());
    $id('nsfBarSettings').addEventListener('click', () => { if (typeof window.toggleSidebar === 'function') window.toggleSidebar(); });
    $id('nsfBarNext').addEventListener('click', applyNext);
    // 作った期間を覚える（本体のPDFボタン・スマホのPDFボタン・印刷）
    document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#btnPdf, [data-nsf-pdf]')) recordPeriod(); }, true);
    window.addEventListener('beforeprint', recordPeriod);
    // 日付あり／なしの切り替え・開始日の変更に合わせて「続きから」を出し入れする
    const u = $id('btnUndated');
    if (u) new MutationObserver(() => refreshBar()).observe(u, { attributes: true, attributeFilter: ['class'] });
    const fsel = $id('fmtSel');
    if (fsel) fsel.addEventListener('change', () => setTimeout(() => refreshBar(), 0));
    const se = startEl();
    if (se) se.addEventListener('change', () => {
      if (applying) return;
      const note = $id('nsfBarNote'); if (note) note.textContent = '';
      setTimeout(() => refreshBar(), 0);
    });
    refreshBar();
    // アクセス数の表示（access-counter.js・右端に固定）はサイズ切り替えの下に置かれ、狭い画面では操作バーに重なる → 操作バーの下へずらす
    const placeCounter = () => {
      const c = $id('access-counter'); if (!c || innerWidth >= 920) return;
      c.style.top = Math.round(bar.getBoundingClientRect().bottom) + 8 + 'px';
    };
    if ($id('access-counter')) placeCounter();
    else { const mo = new MutationObserver(() => { if ($id('access-counter')) { mo.disconnect(); placeCounter(); } }); mo.observe(document.body, { childList: true }); setTimeout(() => mo.disconnect(), 15000); }
    window.addEventListener('resize', () => setTimeout(placeCounter, 0));
    new MutationObserver(() => placeCounter()).observe($id('nsfBarNextRow'), { attributes: true, attributeFilter: ['style'] });
    // パソコン幅で初めて来た人には、設定パネルを開いて見せる（1回だけ）
    try {
      if (!localStorage.getItem(INTRO_KEY) && innerWidth >= 1024 && !controls.classList.contains('open') && typeof window.toggleSidebar === 'function') window.toggleSidebar();
      localStorage.setItem(INTRO_KEY, '1');
    } catch (e) {}
  }

  function mount() { injectStyle(); fold(); holeRow(); mountBackup(); pwa(); regGate(); usage(); actionBar(); loadMobile(); }
  // print-adjust.js が DOMContentLoaded で差し込む設定欄を待ってから畳む
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0)); else setTimeout(mount, 0);
})();
