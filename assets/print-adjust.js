// 印刷ズレ補正＋テスト印刷（公開リフィル印刷ツール共通・2026-09-11／2026-09-12 表裏別に対応）
// 使い方: 各ツールで window.NSF_PRINT_GEOMETRY を定義してからこのファイルを読み込む。
//   NSF_PRINT_GEOMETRY = { sheet:[幅mm,高さmm], slots:[{x,y,w,h,holeSide:'left'|'right'}], holes:[上端からの穴中心mm...], holeEdge:綴じ側端からの穴中心mm, holeD:穴径mm, cuts:[{x}|{y}] }
// 補正は「表面のずれ（X/Y）」と「裏面の追加ずれ（X/Y）」の2系統。裏面の実際のずらし量 ＝ 表面 ＋ 追加。
//   両面印刷は裏面だけ別方向にずれることが多い（用紙を反転して引き込むため）ので、裏面は表面に対する差分で持つ。
// 印刷時は .sheet-wrap（1枚の用紙）ごとに translate でずらす。表裏は sheet-label の「裏」「裏面」で判定して data-side を付ける。
//   （ツール側の @media print は .a4-sheet の transform を !important で消すため、その親でずらす）
// PDF生成側は window.nsfPrintOffsetFor(用紙の要素) を読んで jsPDF.addImage の座標にずらし量を足す。
// 補正値は localStorage に「ページごと」に記憶する（プリンターの引き込みズレは用紙の向きごとに違うため）。
(function () {
  const G = window.NSF_PRINT_GEOMETRY;
  if (!G || document.getElementById('nsf-print-adjust')) return;
  const KEY = 'nsf_print_adjust:' + location.pathname.replace(/^\/ns-factory\/?/, '');
  const state = { x: 0, y: 0, bx: 0, by: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { state.x = +s.x || 0; state.y = +s.y || 0; state.bx = +s.bx || 0; state.by = +s.by || 0; } } catch (e) {}
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
    style.textContent = '@media print { #preview .sheet-wrap { transform: translate(' + f.x + 'mm, ' + f.y + 'mm); } #preview .sheet-wrap[data-side="back"] { transform: translate(' + b.x + 'mm, ' + b.y + 'mm); } }';
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    [['nsfAdjX', 'x'], ['nsfAdjY', 'y'], ['nsfAdjBX', 'bx'], ['nsfAdjBY', 'by']].forEach(([id, k]) => {
      const el = document.getElementById(id); if (el) { el.value = state[k]; el.nextElementSibling.textContent = fmt(state[k]); }
    });
    const sum = document.getElementById('nsfAdjSum');
    if (sum) sum.textContent = '表面 ' + fmt(f.x) + ' / ' + fmt(f.y) + ' mm ・ 裏面 ' + fmt(b.x) + ' / ' + fmt(b.y) + ' mm（横 / 縦）';
    tagSides();
  }

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
      const holeRight = isBack ? s.holeSide !== 'right' : s.holeSide === 'right';
      const hx = holeRight ? s.x + s.w - (G.holeEdge || 6) : s.x + (G.holeEdge || 6);
      inner += `<div style="position:absolute;left:${s.x}mm;top:${s.y}mm;width:${s.w}mm;height:${s.h}mm;border:0.3mm solid #444;box-sizing:border-box"></div>`;
      (G.holes || []).forEach(hy => {
        inner += `<div style="position:absolute;left:${hx}mm;top:${s.y + hy}mm;width:${G.holeD || 5}mm;height:${G.holeD || 5}mm;border:0.3mm solid #444;border-radius:50%;transform:translate(-50%,-50%);box-sizing:border-box"></div>`;
      });
      inner += `<div style="position:absolute;left:${s.x + s.w / 2}mm;top:${s.y + s.h / 2}mm;transform:translate(-50%,-50%);font:3mm/1.4 sans-serif;color:#444;text-align:center;white-space:nowrap">${isBack ? '裏面' : '表面'} テスト ${i + 1}<br><span style="font-size:2.2mm">${s.w}×${s.h}mm ／ 穴は${holeRight ? '右' : '左'}</span></div>`;
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
    const row = (id, label) => '<div class="ctrl-row"><label>' + label + '</label><input type="range" id="' + id + '" min="-10" max="10" step="0.5" value="0"><span class="val">0</span>mm</div>';
    sec.innerHTML = [
      '<h3>印刷ズレ補正・テスト印刷</h3>',
      '<div style="font-size:10px;color:#ccc;margin:2px 0 4px;font-weight:700;">表面のずれ</div>',
      row('nsfAdjX', '横'), row('nsfAdjY', '縦'),
      '<div style="font-size:10px;color:#ccc;margin:8px 0 4px;font-weight:700;">裏面の追加ずれ（表面に対して）</div>',
      row('nsfAdjBX', '横'), row('nsfAdjBY', '縦'),
      '<div id="nsfAdjSum" style="font-size:9px;color:#aaa;margin-top:4px;"></div>',
      '<div class="btn-row" style="margin-top:6px"><button type="button" class="btn-secondary" id="nsfAdjReset">0に戻す</button><button type="button" class="btn-secondary" id="nsfTestPreview">テスト用紙を表示</button><button type="button" class="btn-primary" id="nsfTestPrint">テスト印刷（両面）</button></div>',
      '<div style="font-size:9px;color:#aaa;line-height:1.6;margin-top:4px;">プリンターの引き込みで印刷位置がずれるときに使います。右（＋）・下（＋）にずらします。両面印刷では裏面だけ別方向にずれることが多いので、裏面は「表面に対する追加分」で入れます。テスト印刷は枠・穴・カット線だけの用紙を表裏1枚ずつ出します（プリンターの両面設定は本番と同じにしてください）。表面は紙の端からのずれ、裏面は透かして表面と重ねたずれを測って入れてください。値はこのツールごとに記憶され、PDF生成にも同じ補正がかかります。</div>',
    ].join('');
    const printSec = [...controls.querySelectorAll('.ctrl-section h3')].find(h => /^印刷$/.test(h.textContent.trim()));
    if (printSec && printSec.parentElement) controls.insertBefore(sec, printSec.parentElement); else controls.appendChild(sec);
    [['nsfAdjX', 'x'], ['nsfAdjY', 'y'], ['nsfAdjBX', 'bx'], ['nsfAdjBY', 'by']].forEach(([id, k]) => {
      sec.querySelector('#' + id).addEventListener('input', e => { state[k] = +e.target.value; apply(); });
    });
    sec.querySelector('#nsfAdjReset').addEventListener('click', () => { state.x = 0; state.y = 0; state.bx = 0; state.by = 0; apply(); });
    sec.querySelector('#nsfTestPreview').addEventListener('click', previewTest);
    sec.querySelector('#nsfTestPrint').addEventListener('click', testPrint);
    apply();
  }
  window.nsfPrintAdjust = { buildTestSheet, previewTest, testPrint, tagSides, get state() { return { ...state }; },
    set(x, y, bx, by) { state.x = +x || 0; state.y = +y || 0; if (bx != null) state.bx = +bx || 0; if (by != null) state.by = +by || 0; apply(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
