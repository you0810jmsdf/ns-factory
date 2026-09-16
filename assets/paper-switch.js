// 用紙切り替え（リフィル印刷ツール共通・2026-09-16）
// 各ツールは window.NSF_PAPERS = { default:'a4', options:{ key:{ label, note, sheet:[W,H], slots:[{pos,x,y,w,h,holeSide}], map:{front:{pos:idx},back:{pos:idx}}, perSheet, cols, rows, cuts:[{x}|{y}], pdf:{format,orientation}, duplex } } }
// と、切り替え時に面付けの変数を入れ替える window.nsfOnPaperChange(paper, key, {initial}) を定義してからこのファイルを読み込む。
// ここがやること: (1) 用紙の寸法とスロット位置を CSS で当てる（画面・印刷・PDF用の複製にも効くよう body 配下のセレクタ）
//                 (2) 印刷ズレ補正（print-adjust.js）の形状 window.NSF_PRINT_GEOMETRY をその場で書き換える（同じオブジェクトを保つ）
//                 (3) 左パネル「印刷モード」に「用紙」ボタンを差し込み、選択をツールごとに localStorage へ記憶する
// ⛔ 面付け（どのページをどの枠に置くか）はツール側の責任。ここは寸法・見た目・記憶だけ。
(function () {
  const P = window.NSF_PAPERS;
  if (!P || !P.options) return;
  const KEY = 'nsf_paper:' + location.pathname.replace(/^\/ns-factory\/?/, '');
  const keys = Object.keys(P.options);
  let current = P.default && P.options[P.default] ? P.default : keys[0];
  try { const s = localStorage.getItem(KEY); if (s && P.options[s]) current = s; } catch (e) {}

  window.nsfPaper = () => P.options[current];
  window.nsfPaperKey = () => current;

  function css(p) {
    const [W, H] = p.sheet;
    let s = `body .a4-sheet{width:${W}mm;height:${H}mm}\n`;
    s += `@media screen{.a4-sheet{margin-bottom:calc(${H}mm * 0.65 - ${H}mm)}.sheet-wrap{width:calc(${W}mm * 0.65)}}\n`;
    s += `@media screen and (max-width:900px){.a4-sheet{margin-bottom:calc(${H}mm * 0.45 - ${H}mm)}.sheet-wrap{width:calc(${W}mm * 0.45)}}\n`;
    s += `@media screen and (max-width:560px){.a4-sheet{margin-bottom:calc(${H}mm * 0.3 - ${H}mm)}.sheet-wrap{width:calc(${W}mm * 0.3)}}\n`;
    s += `@page{size:${W}mm ${H}mm;margin:0}\n`;
    s += `@media print{html,body{width:${W}mm;height:${H}mm}#preview{width:${W}mm !important}body .sheet-wrap{width:${W}mm !important;height:${H}mm !important}body .a4-sheet{width:${W}mm !important;height:${H}mm !important}}\n`;
    (p.slots || []).forEach(sl => { s += `body .slot[data-pos="${sl.pos}"]{left:${sl.x}mm;top:${sl.y}mm}\n`; });
    return s;
  }
  function applyGeometry(p) {
    const G = window.NSF_PRINT_GEOMETRY;
    if (!G) return;
    G.sheet = p.sheet.slice();
    G.slots = (p.slots || []).map(sl => ({ x: sl.x, y: sl.y, w: sl.w, h: sl.h, holeSide: sl.holeSide || 'left' }));
    G.cuts = (p.cuts || []).map(c => ({ ...c }));
  }
  let styleEl = null;
  function apply(key, initial) {
    current = key;
    const p = P.options[key];
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'nsf-paper-style'; document.body.appendChild(styleEl); }
    styleEl.textContent = css(p);
    applyGeometry(p);
    document.body.dataset.paper = key;
    document.querySelectorAll('#nsf-paper-row .btn-toggle').forEach(b => b.classList.toggle('on', b.dataset.key === key));
    document.querySelectorAll('[data-nsf-duplex]').forEach(el => { el.textContent = p.duplex || ''; });
    const note = document.getElementById('nsf-paper-note'); if (note) note.textContent = p.note || '';
    if (typeof window.nsfOnPaperChange === 'function') window.nsfOnPaperChange(p, key, { initial: !!initial });
    if (!initial) { try { localStorage.setItem(KEY, key); } catch (e) {} }
  }
  function mount() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    const rows = [...controls.querySelectorAll('.ctrl-row')];
    const orient = rows.find(r => { const l = r.querySelector('label'); return l && /使う向き/.test(l.textContent); });
    const row = document.createElement('div');
    row.className = 'ctrl-row'; row.id = 'nsf-paper-row';
    row.innerHTML = '<label>用紙</label>' + keys.map(k => `<button type="button" class="btn-toggle" data-key="${k}">${P.options[k].label}</button>`).join('');
    const note = document.createElement('div');
    note.id = 'nsf-paper-note'; note.style.cssText = 'font-size:9px;color:#888;line-height:1.5;margin:-2px 0 5px;';
    if (orient) { orient.parentNode.insertBefore(row, orient.nextSibling); row.parentNode.insertBefore(note, row.nextSibling); }
    else { const h = [...controls.querySelectorAll('.ctrl-section h3')].find(x => /印刷モード/.test(x.textContent)); if (h) { h.parentNode.insertBefore(row, h.nextSibling); row.parentNode.insertBefore(note, row.nextSibling); } }
    row.addEventListener('click', e => { const b = e.target.closest('.btn-toggle'); if (!b || b.dataset.key === current) return; apply(b.dataset.key, false); });
  }
  mount();
  apply(current, true);
})();
