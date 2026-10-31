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

  // ---- 紙面のページをタップで拡大（スマホ幅）。ページを画面幅いっぱいに出し、前後のページへ送れる。閉じるは ✕・暗い所・Esc ----
  // 紙面（#preview）の中の [data-leaf]（面付けしたページの枠・全ツール共通。綴じ後プレビューと同じ）を、複製して拡大する。元の紙面は変えない。
  function installZoom() {
    if (window.__nsfZoomInstalled) return;
    window.__nsfZoomInstalled = true;
    const zcss = [
      '#nsf-zoom-ov{position:fixed;inset:0;z-index:930;background:rgba(15,15,20,.94);display:none;flex-direction:column;font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif;color:#eee}',
      '#nsf-zoom-ov.open{display:flex}',
      '#nsf-zoom-top{display:flex;align-items:center;gap:8px;padding:8px 10px;flex:0 0 auto}',
      '#nsf-zoom-cap{flex:1;font-size:13px;color:#bbb;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
      '#nsf-zoom-close{width:44px;height:44px;border-radius:10px;border:1px solid #555;background:#2a2a4a;color:#eee;font-size:20px;cursor:pointer;padding:0;min-height:0}',
      '#nsf-zoom-body{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:4px 8px 12px;text-align:center}',
      '#nsf-zoom-frame{display:inline-block;position:relative;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5);overflow:hidden;text-align:left}',
      '#nsf-zoom-inner{position:absolute;left:0;top:0;transform-origin:0 0;background:#fff;overflow:hidden}',
      '#nsf-zoom-inner>*{position:static!important;transform:none!important;margin:0!important;left:auto!important;top:auto!important}',
      '#nsf-zoom-bar{display:flex;gap:8px;align-items:center;justify-content:center;padding:8px 10px calc(8px + env(safe-area-inset-bottom));flex:0 0 auto}',
      '#nsf-zoom-bar button{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #555;background:#2a2a4a;color:#eee;font-size:14px;font-weight:700;cursor:pointer}',
      '#nsf-zoom-bar button:disabled{opacity:.35}',
      '#nsf-zoom-count{min-width:5em;text-align:center;font-weight:700}',
      '#nsf-zoom-toast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:925;background:rgba(20,16,12,.92);color:#fff;border:1px solid rgba(201,169,110,.7);border-radius:999px;padding:8px 16px;font-size:13px;font-weight:700;pointer-events:none;opacity:0;transition:opacity .4s}',
      '#nsf-zoom-toast.show{opacity:1}',
      'body.nsf-zoom-on #nsf-bug-btn,body.nsf-zoom-on #nsf-flip-btn,body.nsf-zoom-on #swipeHandle,body.nsf-zoom-on #ctrl-toggle-btn{display:none!important}',
      '@media print{#nsf-zoom-ov,#nsf-zoom-toast{display:none!important}}',
      '@media (min-width:601px){#nsf-zoom-ov,#nsf-zoom-toast{display:none!important}}'
    ];
    const zs = document.createElement('style'); zs.id = 'nsf-zoom-css'; zs.textContent = zcss.join('\n'); document.head.appendChild(zs);
    const ov = document.createElement('div'); ov.id = 'nsf-zoom-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'ページの拡大表示');
    ov.innerHTML = '<div id="nsf-zoom-top"><div id="nsf-zoom-cap"></div><button type="button" id="nsf-zoom-close" aria-label="閉じる">✕</button></div>'
      + '<div id="nsf-zoom-body"><div id="nsf-zoom-frame"><div id="nsf-zoom-inner"></div></div></div>'
      + '<div id="nsf-zoom-bar"><button type="button" id="nsf-zoom-prev">◀ 前</button><span id="nsf-zoom-count"></span><button type="button" id="nsf-zoom-next">次 ▶</button></div>';
    document.body.appendChild(ov);
    const toast = document.createElement('div'); toast.id = 'nsf-zoom-toast'; toast.textContent = '紙面のページをタップすると拡大できます'; document.body.appendChild(toast);
    let list = [], idx = 0;
    const slotsNow = () => [...document.querySelectorAll('#preview [data-leaf]')].filter(s => !s.classList.contains('empty') && s.innerHTML.trim());
    function show(i) {
      if (!list.length) return;
      idx = Math.max(0, Math.min(list.length - 1, i));
      const slot = list[idx];
      const w = slot.offsetWidth, hgt = slot.offsetHeight;
      if (!w || !hgt) return;
      const k = Math.max(0.2, (innerWidth - 16) / w);
      const frame = $('nsf-zoom-frame'), inner = $('nsf-zoom-inner');
      inner.innerHTML = '';
      const clone = slot.cloneNode(true);
      clone.style.position = 'static'; clone.style.left = ''; clone.style.top = ''; clone.style.margin = '0'; clone.style.width = w + 'px'; clone.style.height = hgt + 'px';
      clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      inner.appendChild(clone);
      inner.style.width = w + 'px'; inner.style.height = hgt + 'px'; inner.style.transform = 'scale(' + k + ')';
      frame.style.width = Math.round(w * k) + 'px'; frame.style.height = Math.round(hgt * k) + 'px';
      const wrap = slot.closest('.sheet-wrap, .a4-wrapper'), lab = wrap && wrap.querySelector('.sheet-label');
      $('nsf-zoom-cap').textContent = lab ? lab.textContent.trim() : '';
      $('nsf-zoom-count').textContent = (idx + 1) + ' / ' + list.length;
      $('nsf-zoom-prev').disabled = idx === 0; $('nsf-zoom-next').disabled = idx === list.length - 1;
      $('nsf-zoom-body').scrollTop = 0;
    }
    function open(slot) {
      list = slotsNow(); const i = list.indexOf(slot); if (i < 0) return;
      ov.classList.add('open'); document.body.classList.add('nsf-zoom-on'); document.documentElement.style.overflow = 'hidden'; show(i);
    }
    function close() { ov.classList.remove('open'); document.body.classList.remove('nsf-zoom-on'); document.documentElement.style.overflow = ''; $('nsf-zoom-inner').innerHTML = ''; }
    $('nsf-zoom-close').addEventListener('click', close);
    $('nsf-zoom-prev').addEventListener('click', () => show(idx - 1));
    $('nsf-zoom-next').addEventListener('click', () => show(idx + 1));
    $('nsf-zoom-body').addEventListener('click', e => { if (e.target === $('nsf-zoom-body')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) close(); });
    // ページをタップ。メニューが開いているとき、綴じ後プレビュー等の他のダイアログが出ているときは、拡大しない（捕捉段階で見るので、外側タップで閉じる処理より先に判定できる）
    document.addEventListener('click', e => {
      if (innerWidth > 600 || ov.classList.contains('open')) return;
      if (document.body.classList.contains('panel-open')) return;
      const t = e.target; if (!t || !t.closest) return;
      if (t.closest('#controls, #ctrl-toggle-btn, #swipeHandle, .history-overlay, #nsf-flip-ov, #nsf-bug-overlay, #nsfNudge, button, a, input, select, textarea, label')) return;
      const slot = t.closest('#preview [data-leaf]');
      if (slot) open(slot);
    }, true);
    // 最初の1回だけ、案内を数秒出す（端末ごと）
    try {
      if (innerWidth <= 600 && !localStorage.getItem('nsf_zoom_hint_v1')) {
        setTimeout(() => { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); try { localStorage.setItem('nsf_zoom_hint_v1', '1'); } catch (e) {} }, 2500);
      }
    } catch (e) {}
    // 更新履歴（HISTORY_ENTRIES の末尾が最新）
    try {
      if (typeof HISTORY_ENTRIES !== 'undefined' && Array.isArray(HISTORY_ENTRIES) && !HISTORY_ENTRIES.some(x => x.title === 'スマホで、紙面のページをタップして拡大')) {
        HISTORY_ENTRIES.push({ date: '2026-10-31', type: 'improve', title: 'スマホで、紙面のページをタップして拡大',
          detail: 'スマホの画面で、紙面のページをタップすると、そのページを画面の幅いっぱいに拡大して見られるようにしました。「前」「次」で隣のページへ送れます。閉じるには ✕ か、まわりの暗い部分をタップします。拡大して見ているだけで、印刷やPDFの内容は変わりません。' });
      }
    } catch (e) {}
  }

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
    installZoom();
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
    const NO = 'input, select, textarea, .history-overlay, #nsf-flip-ov, #nsf-bug-overlay, #nsfNudge, #nsf-zoom-ov';
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
