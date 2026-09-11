// 印刷ズレ補正＋テスト印刷（公開リフィル印刷ツール共通・2026-09-11）
// 使い方: 各ツールで window.NSF_PRINT_GEOMETRY を定義してからこのファイルを読み込む。
//   NSF_PRINT_GEOMETRY = { sheet:[幅mm,高さmm], slots:[{x,y,w,h,holeSide:'left'|'right'}], holes:[上端からの穴中心mm...], holeEdge:綴じ側端からの穴中心mm, holeD:穴径mm, cuts:[{x}|{y}] }
// 印刷時は #preview を translate(X,Y) で動かす（ツール側の @media print は .a4-sheet の transform を !important で消すため、親でずらす）。
// PDF生成側は window.nsfPrintOffset() を読んで jsPDF.addImage の座標にずらし量を足す。
// 補正値は localStorage に「ページごと」に記憶する（プリンターの引き込みズレは用紙の向きごとに違うため）。
(function () {
  const G = window.NSF_PRINT_GEOMETRY;
  if (!G || document.getElementById('nsf-print-adjust')) return;
  const KEY = 'nsf_print_adjust:' + location.pathname.replace(/^\/ns-factory\/?/, '');
  const state = { x: 0, y: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { state.x = +s.x || 0; state.y = +s.y || 0; } } catch (e) {}
  window.nsfPrintOffset = () => ({ x: state.x, y: state.y });

  const style = document.createElement('style');
  style.id = 'nsf-print-adjust-style';
  document.head.appendChild(style);
  function apply() {
    style.textContent = '@media print { #preview { transform: translate(' + state.x + 'mm, ' + state.y + 'mm); } }';
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    const xs = document.getElementById('nsfAdjX'), ys = document.getElementById('nsfAdjY');
    if (xs) { xs.value = state.x; xs.nextElementSibling.textContent = state.x; }
    if (ys) { ys.value = state.y; ys.nextElementSibling.textContent = state.y; }
  }

  // ── テスト印刷: 枠・穴・カット線だけの用紙を1枚描いて印刷し、元の表示に戻す ──
  function buildTestSheet() {
    const [W, H] = G.sheet;
    let inner = '';
    (G.cuts || []).forEach(c => {
      if (c.x != null) inner += `<div style="position:absolute;top:0;bottom:0;left:${c.x}mm;width:0;border-left:0.2mm dashed #888"></div>`;
      if (c.y != null) inner += `<div style="position:absolute;left:0;right:0;top:${c.y}mm;height:0;border-top:0.2mm dashed #888"></div>`;
    });
    (G.slots || []).forEach((s, i) => {
      const hx = s.holeSide === 'right' ? s.x + s.w - (G.holeEdge || 6) : s.x + (G.holeEdge || 6);
      inner += `<div style="position:absolute;left:${s.x}mm;top:${s.y}mm;width:${s.w}mm;height:${s.h}mm;border:0.3mm solid #444;box-sizing:border-box"></div>`;
      (G.holes || []).forEach(hy => {
        inner += `<div style="position:absolute;left:${hx}mm;top:${s.y + hy}mm;width:${G.holeD || 5}mm;height:${G.holeD || 5}mm;border:0.3mm solid #444;border-radius:50%;transform:translate(-50%,-50%);box-sizing:border-box"></div>`;
      });
      inner += `<div style="position:absolute;left:${s.x + s.w / 2}mm;top:${s.y + s.h / 2}mm;transform:translate(-50%,-50%);font:3mm/1.4 sans-serif;color:#444;text-align:center;white-space:nowrap">テスト印刷 ${i + 1}<br><span style="font-size:2.2mm">${s.w}×${s.h}mm ／ 穴は${s.holeSide === 'right' ? '右' : '左'}</span></div>`;
    });
    // 定規（10mm刻み）を左上と右下に。実測のズレをそのまま補正値に入れられる
    for (let m = 10; m < Math.min(W, 60); m += 10) inner += `<div style="position:absolute;left:${m}mm;top:0;width:0;height:3mm;border-left:0.2mm solid #444"></div><div style="position:absolute;left:${m + 0.5}mm;top:3mm;font:1.8mm sans-serif;color:#444">${m}</div>`;
    for (let m = 10; m < Math.min(H, 60); m += 10) inner += `<div style="position:absolute;top:${m}mm;left:0;height:0;width:3mm;border-top:0.2mm solid #444"></div><div style="position:absolute;top:${m + 0.5}mm;left:3.5mm;font:1.8mm sans-serif;color:#444">${m}</div>`;
    inner += `<div style="position:absolute;right:4mm;bottom:3mm;font:2.2mm/1.5 sans-serif;color:#444;text-align:right">ズレ補正 X ${state.x}mm / Y ${state.y}mm<br>印刷後、枠の位置が紙の端からどれだけずれたかを測り、その分を補正値に入れてください</div>`;
    return `<div class="sheet-wrap"><div class="sheet-label">テスト印刷（枠と穴だけ）</div><div class="a4-sheet" style="background:#fff">${inner}</div></div>`;
  }
  function restore() {
    if (typeof window.rerender === 'function') window.rerender();
    else if (typeof window.render === 'function') window.render();
  }
  function testPrint() {
    const pv = document.getElementById('preview');
    if (!pv) return;
    pv.innerHTML = buildTestSheet();
    const done = () => { window.removeEventListener('afterprint', done); setTimeout(restore, 300); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 100);
    // afterprint が来ないブラウザ向けの保険
    setTimeout(() => { if (pv.querySelector('.sheet-label') && /テスト印刷/.test(pv.querySelector('.sheet-label').textContent)) restore(); }, 60000);
  }
  function previewTest() {
    const pv = document.getElementById('preview');
    if (!pv) return;
    if (pv.querySelector('.sheet-label') && /テスト印刷/.test(pv.querySelector('.sheet-label').textContent)) { restore(); return; }
    pv.innerHTML = buildTestSheet();
  }

  // ── サイドバーに差し込む（「印刷」セクションの直前） ──
  function mount() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    const sec = document.createElement('div');
    sec.className = 'ctrl-section';
    sec.id = 'nsf-print-adjust';
    sec.innerHTML = [
      '<h3>印刷ズレ補正・テスト印刷</h3>',
      '<div class="ctrl-row"><label>横のズレ</label><input type="range" id="nsfAdjX" min="-10" max="10" step="0.5" value="0"><span class="val">0</span>mm</div>',
      '<div class="ctrl-row"><label>縦のズレ</label><input type="range" id="nsfAdjY" min="-10" max="10" step="0.5" value="0"><span class="val">0</span>mm</div>',
      '<div class="btn-row"><button type="button" class="btn-secondary" id="nsfAdjReset">0に戻す</button><button type="button" class="btn-secondary" id="nsfTestPreview">テスト用紙を表示</button><button type="button" class="btn-primary" id="nsfTestPrint">テスト印刷</button></div>',
      '<div style="font-size:9px;color:#aaa;line-height:1.6;margin-top:4px;">プリンターの引き込みで印刷位置がずれるときに使います。右（＋）・下（＋）にずらします。値はこのツールごとに記憶されます。テスト印刷は枠・穴・カット線だけを1枚印刷し、紙の端からのズレを測って補正値に入れてください。PDF生成にも同じ補正がかかります。</div>',
    ].join('');
    const printSec = [...controls.querySelectorAll('.ctrl-section h3')].find(h => /^印刷$/.test(h.textContent.trim()));
    if (printSec && printSec.parentElement) controls.insertBefore(sec, printSec.parentElement); else controls.appendChild(sec);
    sec.querySelector('#nsfAdjX').addEventListener('input', e => { state.x = +e.target.value; apply(); });
    sec.querySelector('#nsfAdjY').addEventListener('input', e => { state.y = +e.target.value; apply(); });
    sec.querySelector('#nsfAdjReset').addEventListener('click', () => { state.x = 0; state.y = 0; apply(); });
    sec.querySelector('#nsfTestPreview').addEventListener('click', previewTest);
    sec.querySelector('#nsfTestPrint').addEventListener('click', testPrint);
    apply();
  }
  window.nsfPrintAdjust = { buildTestSheet, previewTest, testPrint, get state() { return { ...state }; }, set(x, y) { state.x = +x || 0; state.y = +y || 0; apply(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
