// 公開リフィル印刷ツール共通の追加機能（2026-10-29）。各ツールの末尾で読み込む。
//  1. 操作パネルをシンプルに: 日付・用紙・印刷など「いつも使う設定」だけを前に出し、透かし・フォント・チェックリスト等は「くわしい設定」に畳む
//     印刷ズレ補正は「印刷がずれるとき」として独立した折りたたみにする。
//  2. 設定の保存・読み込み: 端末に保存された設定（nsf_ で始まるキー）をファイルに書き出し／読み込む（機種変更・ブラウザ変更用）
//  3. ホーム画面に追加（PWA）: manifest と Service Worker を登録する（開いたページは電波がなくても開ける）
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
      '.nsf-fold .nsf-fold-note{font-size:9px;color:#888;line-height:1.5;margin:0 0 4px}'
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
    box.querySelector('#nsfNudgeClose').addEventListener('click', () => box.remove());
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

  function usage() {
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('#btnPdf');
      if (!b) return;
      sendEvent('pdf');
      setTimeout(showNudge, 6000);   // 生成の操作を邪魔しないよう、少し待ってから
    }, true);
    window.addEventListener('beforeprint', () => sendEvent('print'));
    window.addEventListener('afterprint', () => setTimeout(showNudge, 1500));
  }

  function mount() { injectStyle(); fold(); mountBackup(); pwa(); usage(); }
  // print-adjust.js が DOMContentLoaded で差し込む設定欄を待ってから畳む
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0)); else setTimeout(mount, 0);
})();
