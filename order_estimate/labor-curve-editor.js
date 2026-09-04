/* Shared curve data and editor. Public estimates never read administrative drafts. */
(function () {
  'use strict';
  const M = window.NSFLaborCurveModel;
  const KEY = 'nsfactory-labor-curves-draft-v1';
  const state = { data: null, published: null, base: '', error: '', draft: false, host: null, config: null, brand: '', selected: 0, drag: null, busy: false };
  const copy = x => JSON.parse(JSON.stringify(x));
  function validateComplete(data) {
    const result = M.validate(data);
    const required = Object.keys(state.published?.curves || {});
    if (required.some(id => !result.curves[id])) throw new Error('登録済みの全構造の曲線が必要です。');
    return result;
  }
  const el = (tag, text, attrs = {}) => {
    const n = document.createElement(tag);
    if (text !== null) n.textContent = text;
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };
  function notify() { if (state.config?.onChange) state.config.onChange(); }
  function storeDraft() {
    state.draft = true;
    try { localStorage.setItem(KEY, JSON.stringify({ base: state.base, data: state.data })); state.error = ''; }
    catch (_) { state.error = '端末保存ができません。設定ファイルをダウンロードして保管してください。'; }
  }
  async function load(admin = false) {
    try {
      const r = await fetch('./labor-curves.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      state.published = M.validate(await r.json());
      state.base = JSON.stringify(state.published);
      state.data = copy(state.published);
      state.draft = false;
      state.error = '';
      if (admin) {
        try {
          const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
          if (saved && saved.base === state.base) { state.data = validateComplete(saved.data); state.draft = true; }
          else if (saved) state.error = '公開設定が更新されています。古い端末下書きは適用せず、公開値を読み込みました。';
        } catch (_) { state.error = '端末下書きを読み込めませんでした。公開値を使用しています。'; }
      }
    } catch (e) { state.error = '工数曲線の読込に失敗しました。再読込してください（' + e.message + '）。'; }
    if (state.host) render();
    notify();
  }
  function hours(brand, area, fallback) {
    const points = state.data?.curves[brand];
    return points ? M.evaluate(points, area) : fallback;
  }
  function mount(host, config) {
    state.host = host; state.config = config;
    state.brand = config.brands()[0]?.id || Object.keys(state.data?.curves || {})[0] || '';
    render();
  }
  function button(text, action) {
    const b = el('button', text, { type: 'button' });
    b.onclick = action; b.disabled = state.busy;
    return b;
  }
  function commitPoint(index, area, hoursValue) {
    if (state.busy) return false;
    const candidate = copy(state.data);
    candidate.curves[state.brand][index].area = area;
    candidate.curves[state.brand][index].hours = hoursValue;
    try { state.data = M.validate(candidate); storeDraft(); notify(); return true; }
    catch (e) { state.error = e.message; return false; }
  }
  function render() {
    const host = state.host;
    if (!host) return;
    host.replaceChildren(); host.classList.add('labor-editor');
    if (!document.getElementById('labor-editor-style')) {
      const css = el('style', '.labor-editor{margin:16px 0;padding:18px;border:1px solid #dac4ae;border-radius:12px;background:#fffaf4;color:#38291c}.labor-editor h2{font-size:18px;margin-bottom:8px}.labor-editor p{font-size:12px;margin:8px 0}.labor-editor .lc-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.labor-editor button,.labor-editor select,.labor-editor input{font:inherit;padding:7px;border:1px solid #bca48c;border-radius:6px;background:#fff;color:#38291c}.labor-editor button{cursor:pointer}.labor-editor button:disabled{opacity:.5}.labor-editor svg{display:block;width:100%;height:auto;touch-action:none;user-select:none;background:white;border-radius:8px;margin:12px 0}.labor-editor table{border-collapse:collapse;width:100%;font-size:12px}.labor-editor td,.labor-editor th{padding:5px;text-align:left;border-bottom:1px solid #e8d8c8}.labor-editor input{width:90px;max-width:100%}.labor-editor .lc-scroll{overflow:auto}.labor-editor .lc-status{padding:8px;background:#f3e8d8}.labor-editor .lc-current{font-weight:bold;color:#21625c}.labor-editor .lc-actions{margin-top:12px}.labor-editor summary{cursor:pointer;margin-top:12px}.labor-editor circle:focus{outline:2px solid #21625c}');
      css.id = 'labor-editor-style'; document.head.append(css);
    }
    host.append(el('h2', '面積と作業工数のカーブ'));
    host.append(el('p', '構造ごとの点を上下にドラッグ、または表の数値を編集してください。横軸は製作に使う革の面積（ロス前・1 ds = 100 cm²）、縦軸は合計工数です。'));
    const status = el('p', state.error || (state.draft ? '端末下書きで試算中（お客様向けには未反映）' : '公開設定で試算中'), { role: 'status', class: 'lc-status' });
    host.append(status);
    if (!state.data) { host.append(button('曲線を再読込', () => load(true))); return; }
    const controls = el('div', null, { class: 'lc-controls' });
    const select = el('select', null, { 'aria-label': '工数曲線の構造' });
    for (const brand of state.config.brands()) {
      if (state.data.curves[brand.id]) select.append(el('option', brand.name, { value: brand.id }));
    }
    if (!state.data.curves[state.brand]) state.brand = select.options[0]?.value;
    select.value = state.brand;
    select.disabled = state.busy;
    select.onchange = () => { state.brand = select.value; state.selected = 0; render(); };
    controls.append(el('label', '調整する構造'), select);
    host.append(controls);
    const points = state.data.curves[state.brand];
    if (!points) return;
    const W = 760, H = 330, left = 60, top = 25, pw = 670, ph = 250;
    // Axes stay fixed for the entire pointer gesture, even when the maximum point moves.
    const xmax = Math.max(...points.map(p => p.area)) * 1.15;
    const ymax = Math.max(1, ...points.map(p => p.hours)) * 1.35;
    const sx = x => left + x / xmax * pw, sy = y => top + ph - y / ymax * ph;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('aria-label', '革面積と作業工数の曲線');
    const shape = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v)); if (text != null) n.textContent = text; svg.append(n); return n; };
    for (let i = 0; i <= 5; i++) {
      const x = xmax * i / 5, y = ymax * i / 5;
      shape('line', { x1: left, x2: left + pw, y1: sy(y), y2: sy(y), stroke: '#eee4d8' });
      shape('text', { x: left - 8, y: sy(y) + 4, 'text-anchor': 'end', 'font-size': 12 }, y.toFixed(1));
      shape('text', { x: sx(x), y: top + ph + 22, 'text-anchor': 'middle', 'font-size': 12 }, x.toFixed(2));
    }
    shape('text', { x: left, y: 16, 'font-size': 13 }, '工数（h）');
    shape('text', { x: left + pw / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 13 }, '革面積（ds・ロス前）');
    const path = shape('path', { fill: 'none', stroke: '#986429', 'stroke-width': 3 });
    const circles = points.map((p, i) => {
      const c = shape('circle', { cx: sx(p.area), cy: sy(p.hours), r: 7, fill: i === state.selected ? '#21625c' : '#c48d43', stroke: 'white', 'stroke-width': 2, tabindex: 0, role: 'slider', 'aria-label': (p.label || '点 ' + (i + 1)) + 'の工数', 'aria-valuemin': 0, 'aria-valuenow': p.hours, 'data-point': i, style: 'cursor:ns-resize' });
      c.addEventListener('keydown', e => {
        if (state.busy) return;
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault(); const ps = state.data.curves[state.brand];
        const value = Math.max(ps[i - 1]?.hours ?? 0, Math.min(ps[i + 1]?.hours ?? 10000, ps[i].hours + (e.key === 'ArrowUp' ? .05 : -.05)));
        state.selected = i; commitPoint(i, ps[i].area, +value.toFixed(4)); render();
      });
      return c;
    });
    function draw() {
      const ps = state.data.curves[state.brand];
      let d = '';
      for (let i = 0; i <= 300; i++) { const x = xmax * i / 300; d += (i ? 'L' : 'M') + sx(x).toFixed(2) + ',' + sy(M.evaluate(ps, x)).toFixed(2); }
      path.setAttribute('d', d);
      ps.forEach((p, i) => { circles[i].setAttribute('cy', sy(p.hours)); circles[i].setAttribute('aria-valuenow', p.hours); });
    }
    draw();
    svg.onpointerdown = e => {
      const index = e.target.getAttribute('data-point');
      if (index === null || state.busy) return;
      e.preventDefault(); state.selected = Number(index); state.drag = { index: Number(index), id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
    };
    svg.onpointermove = e => {
      if (!state.drag || state.drag.id !== e.pointerId) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const ps = state.data.curves[state.brand], i = state.drag.index;
      const h = Math.max(ps[i - 1]?.hours ?? 0, Math.min(ps[i + 1]?.hours ?? ymax, Math.round((top + ph - pt.y) / ph * ymax * 20) / 20));
      commitPoint(i, ps[i].area, h); draw();
      const input = host.querySelector(`[data-hours="${i}"]`); if (input) input.value = h;
      status.textContent = `${ps[i].label || '点'}: ${ps[i].area.toFixed(4)} ds → ${h.toFixed(2)} h（端末下書き）`;
    };
    const finish = () => { if (state.drag) { state.drag = null; render(); } };
    svg.onpointerup = finish; svg.onpointercancel = finish; svg.onlostpointercapture = finish;
    host.append(svg);
    const current = el('p', '', { class: 'lc-current' }); current.id = 'laborCurveCurrent'; host.append(current); updateCurrent();
    host.append(el('p', '金額 = 基本料金 ＋ 曲線の工数 × 時給 ＋ 構造の固定加算 ＋ 革材料費 ＋ オプション。面積が増えても工数が減らないよう、隣の点の工数が上下限になります。'));
    const scroll = el('div', null, { class: 'lc-scroll' }), table = el('table', null);
    const head = el('tr', null); ['基準点', '面積 ds', '工数 h'].forEach(t => head.append(el('th', t))); table.append(head);
    points.forEach((p, i) => {
      const tr = el('tr', null); tr.append(el('td', p.label || '点 ' + (i + 1)));
      const a = el('input', null, { type: 'number', min: '.0001', step: '.0001', value: p.area, 'aria-label': (p.label || i) + ' 面積' });
      const h = el('input', null, { type: 'number', min: '0', step: '.05', value: p.hours, 'data-hours': i, 'aria-label': (p.label || i) + ' 工数' });
      a.disabled = h.disabled = state.busy;
      const change = () => { state.selected = i; commitPoint(i, a.value === '' ? NaN : Number(a.value), h.value === '' ? NaN : Number(h.value)); render(); };
      a.onchange = h.onchange = change;
      for (const input of [a,h]) { const td = el('td', null); td.append(input); tr.append(td); }
      table.append(tr);
    });
    scroll.append(table); host.append(scroll);
    const details = el('details', null); details.append(el('summary', '自動計算した曲線係数を見る'));
    details.append(el('p', '各区間は h = a + b·t + c·t² + d·t³（t = 面積 − 区間開始面積）。区間外は端の直線で推定します。初期点は実測ではなく従来設定からの移行値です。'));
    const coeff = el('pre', M.segments(points).map(s => `${s.x.toFixed(4)}〜${s.end.toFixed(4)} ds: a=${s.a.toFixed(6)}, b=${s.b.toFixed(6)}, c=${s.c.toFixed(6)}, d=${s.d.toFixed(6)}`).join('\n'));
    coeff.style.overflow = 'auto'; details.append(coeff); host.append(details);
    const actions = el('div', null, { class: 'lc-controls lc-actions' });
    actions.append(button('設定をダウンロード', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state.data, null, 2) + '\n'], { type: 'application/json' }));
      const a = el('a', null, { href: url, download: 'labor-curves.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
    const file = el('input', null, { type: 'file', accept: '.json,application/json', 'aria-label': '工数設定ファイルを読み込む' });
    file.style.width = '220px'; file.disabled = state.busy;
    file.onchange = async () => { try { const data = validateComplete(JSON.parse(await file.files[0].text())); if (state.busy) return; state.data = data; storeDraft(); notify(); } catch (e) { state.error = '取込できません: ' + e.message; } render(); };
    actions.append(file);
    actions.append(button('公開値に戻す', () => {
      if (!confirm('この端末の工数曲線の下書きを破棄して、公開値に戻しますか？')) return;
      try { localStorage.removeItem(KEY); } catch (_) {}
      state.data = copy(state.published); state.draft = false; state.error = ''; notify(); render();
    }));
    if (state.config.publish) actions.append(button('工数曲線をGitHubへ反映', async () => {
      if (!confirm('全構造の工数曲線を公開し、お客様向け見積もりに反映しますか？')) return;
      const snapshot = copy(state.data);
      state.busy = true; render();
      try {
        const result = await state.config.publish(JSON.stringify(snapshot, null, 2) + '\n', state.base);
        if (result) { state.published = snapshot; state.base = JSON.stringify(snapshot); state.draft = false; state.error = 'GitHubへ保存しました。公開サイトへの反映には数分かかります。'; try { localStorage.removeItem(KEY); } catch (_) {} }
      } catch (e) { state.error = '公開できませんでした: ' + e.message; }
      finally { state.busy = false; render(); }
    }));
    else host.append(el('p', '調整はこの端末に自動保存されます。お客様向けに反映するときは、管理画面の「サイズ」タブで同じ下書きを開き「工数曲線をGitHubへ反映」を押してください。'));
    host.append(actions);
  }
  function updateCurrent() {
    const n = document.getElementById('laborCurveCurrent'), c = state.config?.current?.();
    if (n && c) n.textContent = `現在の見積もり：${c.name} ／ ${c.area.toFixed(4)} ds → ${hours(c.brand, c.area, 0).toFixed(2)} h`;
  }
  window.NSFLaborCurves = { load, mount, hours, updateCurrent, get data() { return state.data; }, get error() { return state.error; }, get draft() { return state.draft; } };
})();
