// リフィル印刷ツール共通：スマホ幅（600px以下）の使いやすさ（2026-10-31 事業主指示「他の種類のリフィルメーカーも同様に」）
// ・メニュー（#controls）を紙面の上に重ねて開く（紙面を押しつぶさない）／外側の暗い部分をタップで閉じる
// ・メニュー内の入力は16px（iPhone の自動拡大を防ぐ）・ボタンは高さ40px前後以上
// ・「PDFを生成」をメニュー下端に固定／無料のお知らせは2行に畳む（タップで全文）
// ・横にフリックで開閉（右へ払う＝開く／左へ払う＝閉じる）／画面端のつまみ（▶・◀）
// 読み込み元：assets/refill-extras.js（全リフィルツール共通）。PC幅の見た目は変えない。
// window.NSF_MOBILE_HANDLE_ONLY が真のページ（リフィルメーカー本体＝同じ内容を自前で持つ）には、画面端のつまみだけ足す。
// ⛔ 前提：#controls・#ctrl-toggle-btn・toggleSidebar()・body.panel-open がある（リフィル印刷ツールの共通の作り）。無ければ何もしない。
(function () {
  if (window.__nsfRefillMobile) return;
  const HANDLE_ONLY = !!window.NSF_MOBILE_HANDLE_ONLY;
  const $ = id => document.getElementById(id);

  function init() {
    if (window.__nsfRefillMobile) return;
    if (!$('controls') || !$('ctrl-toggle-btn') || typeof window.toggleSidebar !== 'function') return;
    window.__nsfRefillMobile = true;

    const css = [];
    // ---- 画面端のつまみ（全ページ共通・スマホ幅だけ）----
    css.push(
      '#swipeHandle{display:none}',
      '@media screen and (max-width:600px){',
      '#swipeHandle{display:flex;position:fixed;left:0;top:42%;width:24px;height:68px;align-items:center;justify-content:center;background:rgba(26,26,46,.85);color:#7ec8e3;border:1px solid #444;border-left:none;border-radius:0 12px 12px 0;font-size:13px;z-index:150;padding:0;min-height:0;cursor:pointer;transition:left .25s ease;animation:nsfPeek 1.4s ease-in-out 3}',
      '#swipeHandle::before{content:"\\25B6"}',
      'body.panel-open #swipeHandle{left:min(88vw,340px);animation:none}',
      'body.panel-open #swipeHandle::before{content:"\\25C0"}',
      '}',
      '@keyframes nsfPeek{0%,100%{transform:translateX(0)}50%{transform:translateX(7px)}}',
      '@media print{#swipeHandle{display:none!important}}'
    );
    if (!HANDLE_ONLY) {
      css.push(
        '#mobileDock{display:none}',
        '@media screen and (max-width:600px){',
        'body{padding-top:54px}',
        '#preview{padding:6px 12px 20px}',
        'body.panel-open #preview{margin-left:0}',
        'body.panel-open::after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99}',
        '#ctrl-toggle-btn{width:40px;height:40px}',
        '#controls{width:min(88vw,340px);height:100vh;height:100dvh;padding-bottom:0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
        '#controls h2{font-size:15px;padding-left:50px}',
        '.ctrl-section h3{font-size:12px}',
        '.ctrl-row{gap:8px;margin-bottom:8px}',
        '.ctrl-row label{font-size:13px}',
        '.ctrl-row .val{font-size:12px}',
        'button{font-size:13px;padding:9px 12px;min-height:40px}',
        '#controls button{font-size:13px!important}',
        '#controls input:not([type=checkbox]):not([type=range]),#controls select,#controls textarea{font-size:16px!important;min-height:38px}',
        '#controls input[type=checkbox]{width:22px;height:22px}',
        '.hint{font-size:11px}',
        '#mobileDock{display:flex;gap:8px;position:sticky;bottom:0;margin:8px -12px 0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#1a1a2e;border-top:1px solid #444;z-index:2}',
        '#mobileDock button{flex:1;min-height:44px;font-size:14px!important}',
        '.history-box{padding:16px;max-height:86vh}',
        '.history-box h3{font-size:15px}',
        '.history-entry{font-size:12px}',
        '.history-date,.history-type{font-size:11px}',
        '.history-close{padding:8px 12px;font-size:13px}',
        '#nsf-free-notice{margin:8px 12px!important;padding:8px 12px!important;font-size:12px!important;line-height:1.6!important}',
        '#nsf-free-notice:not(.expanded) .nsf-nb{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
        '#nsf-size-switch{margin:0 12px 8px!important;padding:6px 10px!important;line-height:1.5!important}',
        '}'
      );
    }
    const st = document.createElement('style'); st.id = 'nsf-refill-mobile-css'; st.textContent = css.join('\n'); document.head.appendChild(st);

    // つまみ
    const h = document.createElement('button'); h.id = 'swipeHandle'; h.type = 'button';
    h.setAttribute('aria-label', 'メニューを開く／閉じる'); h.addEventListener('click', () => window.toggleSidebar());
    document.body.appendChild(h);
    if (HANDLE_ONLY) return;

    // 更新履歴（各ページの HISTORY_ENTRIES は新しい順の逆＝末尾が最新）。ページ側を18本書き換えず、ここから1件足す
    try {
      if (typeof HISTORY_ENTRIES !== 'undefined' && Array.isArray(HISTORY_ENTRIES) && !HISTORY_ENTRIES.some(x => x.title === 'スマホで使いやすくしました（メニュー・フリック）')) {
        HISTORY_ENTRIES.push({ date: '2026-10-31', type: 'improve', title: 'スマホで使いやすくしました（メニュー・フリック）',
          detail: 'スマホの画面幅で、メニューを紙面の上に重ねて開くようにしました（以前は紙面が押しつぶされて見えませんでした）。メニューの外をタップするか、画面を横に払う（右へ＝開く・左へ＝閉じる）と切り替わります。画面の左端の小さなつまみ（▶）でも開けます。入力欄の文字を大きくして、iPhoneで触れたときに画面が拡大しないようにし、「PDFを生成」はメニューの下に固定しました。右下の「綴じ後プレビュー」「改善要望」は丸いアイコンだけにしました。PCの見た目は変わりません。' });
      }
    } catch (e) {}

    // 「PDFを生成」を固定表示するドック（生成関数があるページだけ）
    if (typeof window.generatePDF === 'function') {
      const d = document.createElement('div'); d.id = 'mobileDock';
      d.innerHTML = '<button type="button" class="btn-primary" data-nsf-pdf>📄 PDFを生成</button><button type="button" class="btn-secondary" data-nsf-view>紙面を見る</button>';
      d.querySelector('[data-nsf-pdf]').addEventListener('click', e => window.generatePDF(e));
      d.querySelector('[data-nsf-view]').addEventListener('click', () => window.toggleSidebar());
      $('controls').appendChild(d);
    }
    // お知らせ：本文を .nsf-nb に包み、2行に畳む（タップで全文）
    const n = $('nsf-free-notice');
    if (n && !n.querySelector('.nsf-nb')) {
      const w = document.createElement('div'); w.className = 'nsf-nb';
      while (n.firstChild) w.appendChild(n.firstChild);
      n.appendChild(w);
      n.addEventListener('click', e => { if (innerWidth <= 600 && !e.target.closest('a')) n.classList.toggle('expanded'); });
    }
    // 外側（暗い部分）をタップで閉じる
    document.addEventListener('click', e => {
      if (innerWidth > 600 || !$('controls').classList.contains('open')) return;
      if (!e.target.closest('#controls, #ctrl-toggle-btn, #swipeHandle, .history-overlay')) window.toggleSidebar();
    });
    // 横フリックで開閉（入力欄・スライダー・ダイアログ上、拡大中、2本指では効かせない。縦の動きが大きいときは通常のスクロール）
    let sx = 0, sy = 0, t0 = 0, ok = false;
    const NO = 'input, select, textarea, .history-overlay, #nsf-flip-ov, #nsf-bug-overlay, #nsfNudge';
    document.addEventListener('touchstart', e => {
      const zoomed = window.visualViewport && window.visualViewport.scale > 1.05;
      ok = innerWidth <= 600 && e.touches.length === 1 && !zoomed && !(e.target.closest && e.target.closest(NO));
      if (ok) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); }
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!ok || !e.changedTouches.length) return;
      ok = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Date.now() - t0 > 700 || Math.abs(dx) < 60 || Math.abs(dx) < 1.8 * Math.abs(dy)) return;
      const open = $('controls').classList.contains('open');
      if ((dx > 0 && !open) || (dx < 0 && open)) window.toggleSidebar();
    }, { passive: true });
    document.addEventListener('touchcancel', () => { ok = false; }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
