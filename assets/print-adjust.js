// 印刷ズレ補正＋テスト印刷（公開リフィル印刷ツール共通・2026-09-11／2026-09-12 表裏別に対応）
// 使い方: 各ツールで window.NSF_PRINT_GEOMETRY を定義してからこのファイルを読み込む。
//   NSF_PRINT_GEOMETRY = { sheet:[幅mm,高さmm], slots:[{x,y,w,h,holeSide:'left'|'right'|'top'}], holes:[上端からの穴中心mm...（holeSide:'top' のときは左端から）], holeEdge:綴じ側端からの穴中心mm, holeD:穴径mm, cuts:[{x}|{y}] }
// 補正は「表面のずれ（X/Y）」と「裏面の追加ずれ（X/Y）」の2系統。裏面の実際のずらし量 ＝ 表面 ＋ 追加。
//   両面印刷は裏面だけ別方向にずれることが多い（用紙を反転して引き込むため）ので、裏面は表面に対する差分で持つ。
// 印刷時は .sheet-wrap（1枚の用紙）ごとに translate でずらす。表裏は sheet-label の「裏」「裏面」で判定して data-side を付ける。
//   （ツール側の @media print は .a4-sheet の transform を !important で消すため、その親でずらす）
// PDF生成側は window.nsfPrintOffsetFor(用紙の要素) を読んで jsPDF.addImage の座標にずらし量を足す。
// 補正値は localStorage に「ページごと」に記憶する（プリンターの引き込みズレは用紙の向きごとに違うため）。
// 2026-10-29 追加: 倍率補正（縦横 %。ブラウザ印刷にだけ効く）／プリンター設定の保存・切替（全ツール共通 nsf_print_profiles）／逆順印刷（排紙が面を上にして出るプリンター向け）。
(function () {
  const G = window.NSF_PRINT_GEOMETRY;
  if (!G || document.getElementById('nsf-print-adjust')) return;
  const KEY = 'nsf_print_adjust:' + location.pathname.replace(/^\/ns-factory\/?/, '');
  const state = { x: 0, y: 0, bx: 0, by: 0, sx: 100, sy: 100, reverse: false };
  const clampScale = v => { v = +v; return isFinite(v) && v >= 90 && v <= 110 ? v : 100; };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { state.x = +s.x || 0; state.y = +s.y || 0; state.bx = +s.bx || 0; state.by = +s.by || 0; state.sx = clampScale(s.sx); state.sy = clampScale(s.sy); state.reverse = !!s.reverse; } } catch (e) {}
  const PROF_KEY = 'nsf_print_profiles'; // { 名前: {x,y,bx,by,sx,sy,reverse} }。全ツール共通（プリンターごとの設定）
  const loadProfiles = () => { try { const o = JSON.parse(localStorage.getItem(PROF_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const saveProfiles = o => { try { localStorage.setItem(PROF_KEY, JSON.stringify(o)); } catch (e) {} };
  const offsetOf = side => side === 'back' ? { x: state.x + state.bx, y: state.y + state.by } : { x: state.x, y: state.y };
  const sideOf = el => {
    const wrap = el && el.closest ? (el.closest('.sheet-wrap') || el) : null;
    if (wrap && wrap.dataset && wrap.dataset.side) return wrap.dataset.side;
    const lab = wrap && wrap.querySelector ? wrap.querySelector('.sheet-label') : null;
    return lab && /裏/.test(lab.textContent) ? 'back' : 'front';
  };
  window.nsfPrintOffset = side => offsetOf(side === 'back' ? 'back' : 'front');   // 旧API（引数なし＝表面）
  window.nsfPrintOffsetFor = el => offsetOf(sideOf(el));

  // 用紙ごとに表裏の印を付ける（描画のたびに変わるので印刷直前と補正変更時に付け直す）
  function tagSides() {
    document.querySelectorAll('#preview .sheet-wrap').forEach(w => { w.dataset.side = sideOf(w); });
  }
  window.addEventListener('beforeprint', tagSides);
  const mo = new MutationObserver(() => tagSides());
  const pv0 = document.getElementById('preview');
  if (pv0) mo.observe(pv0, { childList: true });

  const style = document.createElement('style');
  style.id = 'nsf-print-adjust-style';
  document.head.appendChild(style);
  function fmt(v) { return (Math.round(v * 10) / 10).toString(); }
  function apply() {
    const f = offsetOf('front'), b = offsetOf('back');
    const sc = ' scale(' + (state.sx / 100) + ', ' + (state.sy / 100) + ')';
    style.textContent = '@media print { #preview .sheet-wrap { transform-origin: 0 0; transform: translate(' + f.x + 'mm, ' + f.y + 'mm)' + sc + '; } #preview .sheet-wrap[data-side="back"] { transform: translate(' + b.x + 'mm, ' + b.y + 'mm)' + sc + '; } }';
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    [['nsfAdjX', 'x'], ['nsfAdjY', 'y'], ['nsfAdjBX', 'bx'], ['nsfAdjBY', 'by'], ['nsfAdjSX', 'sx'], ['nsfAdjSY', 'sy']].forEach(([id, k]) => {
      const el = document.getElementById(id); if (el) { el.value = state[k]; el.nextElementSibling.textContent = fmt(state[k]); }
    });
    const rv = document.getElementById('nsfAdjReverse'); if (rv) rv.checked = !!state.reverse;
    const sum = document.getElementById('nsfAdjSum');
    if (sum) sum.textContent = '表面 ' + fmt(f.x) + ' / ' + fmt(f.y) + ' mm ・ 裏面 ' + fmt(b.x) + ' / ' + fmt(b.y) + ' mm（横 / 縦）・ 倍率 ' + fmt(state.sx) + ' / ' + fmt(state.sy) + ' %' + (state.reverse ? ' ・ 逆順印刷' : '');
    tagSides();
  }

  // ── 逆順印刷: 排紙が「面を上」で出るプリンター向け。印刷の直前に用紙の並びを逆にして、終わったら戻す ──
  // 表裏が交互（自動両面）のときは「表→裏」の組を保ったまま組の順を逆に、そうでなければ同じ面が続く塊ごとに逆にする。
  let reversedFrom = null;
  function reverseForPrint() {
    const pv = document.getElementById('preview');
    if (!state.reverse || !pv || reversedFrom) return;
    tagSides();
    const items = [...pv.children].filter(e => e.classList && e.classList.contains('sheet-wrap'));
    if (items.length < 2) return;
    reversedFrom = [...pv.children];
    const faces = items.map(e => e.dataset.side);
    const alternate = items.length % 2 === 0 && items.every((e, i) => faces[i] === (i % 2 ? 'back' : 'front'));
    let order = [];
    if (alternate) { for (let i = items.length - 2; i >= 0; i -= 2) order.push(items[i], items[i + 1]); }
    else { let i = 0; while (i < items.length) { let j = i; while (j < items.length && faces[j] === faces[i]) j++; order = order.concat(items.slice(i, j).reverse()); i = j; } }
    const others = [...pv.children].filter(e => !items.includes(e));
    pv.innerHTML = '';
    order.concat(others).forEach(e => pv.appendChild(e));
  }
  function restoreAfterPrint() {
    const pv = document.getElementById('preview');
    if (!reversedFrom || !pv) { reversedFrom = null; return; }
    const orig = reversedFrom; reversedFrom = null;
    pv.innerHTML = '';
    orig.forEach(e => pv.appendChild(e));
  }
  window.addEventListener('beforeprint', reverseForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);

  // ── テスト印刷: 枠・穴・カット線だけの用紙を表裏1枚ずつ描いて印刷し、元の表示に戻す ──
  function testSheetHTML(side) {
    const [W, H] = G.sheet;
    const isBack = side === 'back';
    const o = offsetOf(side);
    let inner = '';
    (G.cuts || []).forEach(c => {
      if (c.x != null) inner += `<div style="position:absolute;top:0;bottom:0;left:${c.x}mm;width:0;border-left:0.2mm dashed #888"></div>`;
      if (c.y != null) inner += `<div style="position:absolute;left:0;right:0;top:${c.y}mm;height:0;border-top:0.2mm dashed #888"></div>`;
    });
    (G.slots || []).forEach((s, i) => {
      // 裏面は列が左右反転して印刷されるので、穴も反対側に描く
      // holeSide:'top' は上端（短辺）の穴。G.holes は左端からの穴中心mm、G.holeEdge は上端から穴中心まで。裏面でも上端のまま
      const holeTop = s.holeSide === 'top';
      const holeRight = isBack ? s.holeSide !== 'right' : s.holeSide === 'right';
      const hx = holeRight ? s.x + s.w - (G.holeEdge || 6) : s.x + (G.holeEdge || 6);
      inner += `<div style="position:absolute;left:${s.x}mm;top:${s.y}mm;width:${s.w}mm;height:${s.h}mm;border:0.3mm solid #444;box-sizing:border-box"></div>`;
      // G.holeRect = [幅（縁から内へ）, 高さ（縁に沿って）]：穴が矩形のとき（無ければ従来どおり丸）。上端の穴は向きが入れ替わる
      const hw = G.holeRect ? (holeTop ? G.holeRect[1] : G.holeRect[0]) : (G.holeD || 5), hh = G.holeRect ? (holeTop ? G.holeRect[0] : G.holeRect[1]) : (G.holeD || 5), hr = G.holeRect ? '0' : '50%';
      (G.holes || []).forEach(h => {
        const cx = holeTop ? s.x + h : hx, cy = holeTop ? s.y + (G.holeEdge || 6) : s.y + h;
        inner += `<div style="position:absolute;left:${cx}mm;top:${cy}mm;width:${hw}mm;height:${hh}mm;border:0.3mm solid #444;border-radius:${hr};transform:translate(-50%,-50%);box-sizing:border-box"></div>`;
      });
      inner += `<div style="position:absolute;left:${s.x + s.w / 2}mm;top:${s.y + s.h / 2}mm;transform:translate(-50%,-50%);font:3mm/1.4 sans-serif;color:#444;text-align:center;white-space:nowrap">${isBack ? '裏面' : '表面'} テスト ${i + 1}<br><span style="font-size:2.2mm">${s.w}×${s.h}mm ／ 穴は${holeTop ? '上' : (holeRight ? '右' : '左')}</span></div>`;
    });
    // 定規（10mm刻み）を左上に。紙の端からのズレをそのまま補正値に入れられる
    for (let m = 10; m < Math.min(W, 60); m += 10) inner += `<div style="position:absolute;left:${m}mm;top:0;width:0;height:3mm;border-left:0.2mm solid #444"></div><div style="position:absolute;left:${m + 0.5}mm;top:3mm;font:1.8mm sans-serif;color:#444">${m}</div>`;
    for (let m = 10; m < Math.min(H, 60); m += 10) inner += `<div style="position:absolute;top:${m}mm;left:0;height:0;width:3mm;border-top:0.2mm solid #444"></div><div style="position:absolute;top:${m + 0.5}mm;left:3.5mm;font:1.8mm sans-serif;color:#444">${m}</div>`;
    inner += `<div style="position:absolute;left:50%;top:${Math.min(12, H / 20)}mm;transform:translateX(-50%);font:6mm/1 sans-serif;font-weight:700;color:#444;letter-spacing:.2em">${isBack ? '裏面' : '表面'}</div>`;
    inner += `<div style="position:absolute;right:4mm;bottom:3mm;font:2.2mm/1.5 sans-serif;color:#444;text-align:right">${isBack ? '裏面の補正 横 ' + fmt(o.x) + ' / 縦 ' + fmt(o.y) + ' mm（表面＋追加）' : '表面の補正 横 ' + fmt(o.x) + ' / 縦 ' + fmt(o.y) + ' mm'}<br>${isBack ? '透かして表面の枠と重ね、ずれた分を「裏面の追加ずれ」に入れてください' : '紙の端から枠までを測り、ずれた分を「表面のずれ」に入れてください'}</div>`;
    return `<div class="sheet-wrap" data-side="${side}"><div class="sheet-label">テスト印刷（${isBack ? '裏面' : '表面'}・枠と穴だけ）</div><div class="a4-sheet" style="background:#fff">${inner}</div></div>`;
  }
  function buildTestSheet() { return testSheetHTML('front') + testSheetHTML('back'); }
  function isTestShown(pv) { const l = pv.querySelector('.sheet-label'); return !!(l && /テスト印刷/.test(l.textContent)); }
  function restore() {
    if (typeof window.rerender === 'function') window.rerender();
    else if (typeof window.render === 'function') window.render();
    else if (typeof window.renderMonths === 'function') window.renderMonths();
  }
  function testPrint() {
    const pv = document.getElementById('preview');
    if (!pv) return;
    pv.innerHTML = buildTestSheet();
    const done = () => { window.removeEventListener('afterprint', done); setTimeout(restore, 300); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 100);
    // afterprint が来ないブラウザ向けの保険
    setTimeout(() => { if (isTestShown(pv)) restore(); }, 60000);
  }
  function previewTest() {
    const pv = document.getElementById('preview');
    if (!pv) return;
    if (isTestShown(pv)) { restore(); return; }
    pv.innerHTML = buildTestSheet();
  }

  // ── サイドバーに差し込む（「印刷」セクションの直前） ──
  function mount() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    const sec = document.createElement('div');
    sec.className = 'ctrl-section';
    sec.id = 'nsf-print-adjust';
    const rowS = (id, label) => '<div class="ctrl-row"><label>' + label + '</label><input type="range" id="' + id + '" min="97" max="103" step="0.1" value="100"><span class="val">100</span>%</div>';
    const row = (id, label) => '<div class="ctrl-row"><label>' + label + '</label><input type="range" id="' + id + '" min="-10" max="10" step="0.5" value="0"><span class="val">0</span>mm</div>';
    sec.innerHTML = [
      '<h3>印刷ズレ補正・テスト印刷</h3>',
      '<div style="font-size:10px;color:#ccc;margin:2px 0 4px;font-weight:700;">表面のずれ</div>',
      row('nsfAdjX', '横'), row('nsfAdjY', '縦'),
      '<div style="font-size:10px;color:#ccc;margin:8px 0 4px;font-weight:700;">裏面の追加ずれ（表面に対して）</div>',
      row('nsfAdjBX', '横'), row('nsfAdjBY', '縦'),
      '<div style="font-size:10px;color:#ccc;margin:8px 0 4px;font-weight:700;">印刷の倍率（用紙の寸法がずれるとき）</div>',
      rowS('nsfAdjSX', '横倍率'), rowS('nsfAdjSY', '縦倍率'),
      '<div style="font-size:9px;color:#aaa;line-height:1.5;margin:0 0 4px;">100%のまま、定規で測って寸法が合わないときだけ使います（99.5〜100.5程度）。ブラウザの印刷に効き、PDF生成には効きません。</div>',
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#ddd;margin:6px 0;cursor:pointer;"><input type="checkbox" id="nsfAdjReverse"> 逆順で印刷する（排紙が面を上にして出るプリンター）</label>',
      '<div style="font-size:10px;color:#ccc;margin:8px 0 4px;font-weight:700;">プリンターごとの設定（全ツール共通）</div>',
      '<div class="ctrl-row"><select id="nsfProfSel" style="flex:1"></select></div>',
      '<div class="btn-row"><button type="button" class="btn-secondary" id="nsfProfLoad">この設定を使う</button><button type="button" class="btn-secondary" id="nsfProfSave">今の補正を保存</button><button type="button" class="btn-secondary" id="nsfProfDel">削除</button></div>',
      '<div id="nsfAdjSum" style="font-size:9px;color:#aaa;margin-top:4px;"></div>',
      '<div class="btn-row" style="margin-top:6px"><button type="button" class="btn-secondary" id="nsfAdjReset">0に戻す</button><button type="button" class="btn-secondary" id="nsfTestPreview">テスト用紙を表示</button><button type="button" class="btn-primary" id="nsfTestPrint">テスト印刷（両面）</button></div>',
      '<div style="font-size:9px;color:#aaa;line-height:1.6;margin-top:4px;">プリンターの引き込みで印刷位置がずれるときに使います。右（＋）・下（＋）にずらします。両面印刷では裏面だけ別方向にずれることが多いので、裏面は「表面に対する追加分」で入れます。テスト印刷は枠・穴・カット線だけの用紙を表裏1枚ずつ出します（プリンターの両面設定は本番と同じにしてください）。表面は紙の端からのずれ、裏面は透かして表面と重ねたずれを測って入れてください。値はこのツールごとに記憶され、PDF生成にも同じ補正がかかります。</div>',
    ].join('');
    const printSec = [...controls.querySelectorAll('.ctrl-section h3')].find(h => /^印刷$/.test(h.textContent.trim()));
    if (printSec && printSec.parentElement) controls.insertBefore(sec, printSec.parentElement); else controls.appendChild(sec);
    [['nsfAdjX', 'x'], ['nsfAdjY', 'y'], ['nsfAdjBX', 'bx'], ['nsfAdjBY', 'by'], ['nsfAdjSX', 'sx'], ['nsfAdjSY', 'sy']].forEach(([id, k]) => {
      sec.querySelector('#' + id).addEventListener('input', e => { state[k] = +e.target.value; apply(); });
    });
    sec.querySelector('#nsfAdjReverse').addEventListener('change', e => { state.reverse = e.target.checked; apply(); });
    sec.querySelector('#nsfAdjReset').addEventListener('click', () => { state.x = 0; state.y = 0; state.bx = 0; state.by = 0; state.sx = 100; state.sy = 100; state.reverse = false; apply(); });
    const sel = sec.querySelector('#nsfProfSel');
    const fillProfiles = (keep) => {
      const names = Object.keys(loadProfiles());
      sel.innerHTML = '<option value="">' + (names.length ? '（保存した設定を選ぶ）' : '（まだ保存した設定はありません）') + '</option>' + names.map(n => '<option></option>').join('');
      [...sel.options].slice(1).forEach((o, i) => { o.value = names[i]; o.textContent = names[i]; });
      if (keep && names.includes(keep)) sel.value = keep;
    };
    fillProfiles();
    sec.querySelector('#nsfProfSave').addEventListener('click', () => {
      const name = (window.prompt('この補正に付ける名前（例：自宅プリンター）', sel.value || '') || '').trim().slice(0, 30);
      if (!name) return;
      const o = loadProfiles(); o[name] = { x: state.x, y: state.y, bx: state.bx, by: state.by, sx: state.sx, sy: state.sy, reverse: state.reverse };
      saveProfiles(o); fillProfiles(name);
    });
    sec.querySelector('#nsfProfLoad').addEventListener('click', () => {
      const p = loadProfiles()[sel.value]; if (!p) return;
      state.x = +p.x || 0; state.y = +p.y || 0; state.bx = +p.bx || 0; state.by = +p.by || 0; state.sx = clampScale(p.sx); state.sy = clampScale(p.sy); state.reverse = !!p.reverse; apply();
    });
    sec.querySelector('#nsfProfDel').addEventListener('click', () => {
      if (!sel.value || !window.confirm('「' + sel.value + '」を削除しますか？')) return;
      const o = loadProfiles(); delete o[sel.value]; saveProfiles(o); fillProfiles();
    });
    sec.querySelector('#nsfTestPreview').addEventListener('click', previewTest);
    sec.querySelector('#nsfTestPrint').addEventListener('click', testPrint);
    apply();
  }
  window.nsfPrintAdjust = { buildTestSheet, previewTest, testPrint, tagSides, get state() { return { ...state }; },
    set(x, y, bx, by) { state.x = +x || 0; state.y = +y || 0; if (bx != null) state.bx = +bx || 0; if (by != null) state.by = +by || 0; apply(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
