// 綴じ後プレビュー（ページめくりシミュレーション）— 公開リフィル印刷ツール共通・2026-09-11
// 各ツールは面付け時に .slot へ data-leaf（切り分けた紙の通し番号・0始まり）と data-face（front/back）を付ける。
// ここではそれを集めて、左綴じで綴じたときの見開き（左＝前の紙の裏、右＝次の紙の表）を順に表示する。
// 中身は画面の描画をそのまま複製して縮小するので、印刷される内容と同じものが見える。
// ⛔ 面付けの正しさは各ツールの data-leaf/data-face の付け方で決まる。ここは並べるだけ。
(function () {
  if (document.getElementById('nsf-flip-btn')) return;
  const MM = 96 / 25.4;

  function collect() {
    const leaves = new Map();
    document.querySelectorAll('#preview .slot[data-leaf]').forEach(slot => {
      const leaf = parseInt(slot.dataset.leaf, 10); if (isNaN(leaf)) return;
      const face = slot.dataset.face === 'back' ? 'back' : 'front';
      const wrap = slot.closest('.sheet-wrap');
      const src = wrap && wrap.querySelector('.sheet-label') ? wrap.querySelector('.sheet-label').textContent : '';
      if (!leaves.has(leaf)) leaves.set(leaf, {});
      leaves.get(leaf)[face] = { slot, src, empty: slot.classList.contains('empty') };
    });
    return [...leaves.keys()].sort((a, b) => a - b).map(k => {
      const l = leaves.get(k);
      // 紙には必ず裏がある。片面しか描画されていない（単票印刷など）ときは、もう一面を白紙として扱う
      if (l.front && !l.back) l.back = { slot: l.front.slot, src: '印刷しない面', empty: true };
      if (l.back && !l.front) l.front = { slot: l.back.slot, src: '印刷しない面', empty: true };
      return { leaf: k, ...l };
    });
  }
  // 左綴じ: 見開き i = [紙 i-1 の裏 | 紙 i の表]（i=0 は表紙側＝右ページだけ）
  function spreads(leaves) {
    const out = [];
    for (let i = 0; i <= leaves.length; i++) {
      const left = i > 0 ? (leaves[i - 1].back || null) : null;
      const right = i < leaves.length ? (leaves[i].front || null) : null;
      out.push({ left, right, leftLeaf: i > 0 ? leaves[i - 1].leaf : null, rightLeaf: i < leaves.length ? leaves[i].leaf : null });
    }
    return out;
  }
  function pageBox(face, label) {
    const box = document.createElement('div');
    box.className = 'nsf-flip-page';
    if (!face) { box.classList.add('nsf-flip-none'); box.innerHTML = '<span>（ここにページはありません）</span>'; return box; }
    const w = face.slot.offsetWidth, h = face.slot.offsetHeight;
    box.style.width = w + 'px'; box.style.height = h + 'px';
    if (face.empty) { box.classList.add('nsf-flip-blank'); box.innerHTML = '<span>白紙</span>'; }
    else {
      const clone = face.slot.cloneNode(true);
      clone.style.position = 'static'; clone.style.left = ''; clone.style.top = ''; clone.style.margin = '0';
      clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      box.appendChild(clone);
    }
    const cap = document.createElement('div'); cap.className = 'nsf-flip-cap'; cap.textContent = label; box.appendChild(cap);
    return box;
  }

  let sp = [], idx = 0, ov, stage, counter, note;
  function render() {
    const s = sp[idx]; if (!s) return;
    stage.innerHTML = '';
    const L = pageBox(s.left, s.left ? `紙 ${s.leftLeaf + 1} の裏（${s.left.src}）` : '');
    const R = pageBox(s.right, s.right ? `紙 ${s.rightLeaf + 1} の表（${s.right.src}）` : '');
    stage.appendChild(L); stage.appendChild(R);
    // 画面に収まるよう縮小
    requestAnimationFrame(() => {
      const avail = Math.min(stage.clientWidth, window.innerWidth - 48);
      const availH = window.innerHeight - 170;
      const totalW = L.offsetWidth + R.offsetWidth + 24, totalH = Math.max(L.offsetHeight, R.offsetHeight);
      const k = Math.min(1, avail / totalW, availH / totalH);
      stage.style.transform = `scale(${k})`;
      stage.style.transformOrigin = 'top center';
      stage.parentElement.style.height = (totalH * k + 40) + 'px';
    });
    counter.textContent = `見開き ${idx + 1} / ${sp.length}`;
    note.textContent = idx === 0 ? '表紙側（1枚目の表）。左綴じで、右ページから始まります。' : (idx === sp.length - 1 ? '最後の紙の裏。' : '左＝前の紙の裏、右＝次の紙の表。');
  }
  function go(d) { idx = Math.max(0, Math.min(sp.length - 1, idx + d)); render(); }
  function open() {
    const leaves = collect();
    if (!leaves.length) { alert('綴じ後プレビューを出せません。両面印刷をONにして、先にプレビューを表示してください。'); return; }
    sp = spreads(leaves); idx = 0;
    ov.style.display = 'flex'; render();
  }
  function close() { ov.style.display = 'none'; }

  function mount() {
    const st = document.createElement('style');
    st.textContent = [
      '#nsf-flip-ov{position:fixed;inset:0;z-index:940;background:rgba(15,15,20,.86);display:none;flex-direction:column;align-items:center;padding:14px 16px;font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif;color:#eee;overflow:auto}',
      '#nsf-flip-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;margin-bottom:10px}',
      '#nsf-flip-bar button{padding:8px 14px;border:1px solid #666;border-radius:8px;background:#2a2a4a;color:#eee;font-size:13px;cursor:pointer}',
      '#nsf-flip-bar button.primary{background:#7ec8e3;color:#1a1a2e;border-color:#7ec8e3;font-weight:700}',
      '#nsf-flip-counter{font-weight:700;min-width:8em;text-align:center}',
      '#nsf-flip-note{font-size:12px;color:#bbb;margin-bottom:8px;text-align:center}',
      '#nsf-flip-wrap{position:relative;width:100%;display:flex;justify-content:center}',
      '#nsf-flip-stage{display:flex;gap:24px;align-items:flex-start}',
      '.nsf-flip-page{position:relative;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5);overflow:hidden;flex-shrink:0}',
      '.nsf-flip-page .slot{position:static!important;transform:none!important}',
      '.nsf-flip-blank,.nsf-flip-none{display:flex;align-items:center;justify-content:center;color:#999;font-size:14px}',
      '.nsf-flip-none{width:220px;height:300px;background:transparent;box-shadow:none;border:1px dashed #555}',
      '.nsf-flip-cap{position:absolute;left:0;right:0;bottom:0;background:rgba(26,26,46,.85);color:#fff;font-size:11px;padding:4px 8px;text-align:center}',
      '#nsf-flip-btn{position:fixed;right:12px;bottom:58px;z-index:950;padding:8px 12px;border-radius:999px;border:1px solid rgba(120,86,60,.35);background:rgba(255,255,255,.94);color:#6f4e37;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.10);font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif}',
      '@media print{#nsf-flip-btn,#nsf-flip-ov{display:none!important}}',
    ].join('');
    document.head.appendChild(st);

    const btn = document.createElement('button');
    btn.id = 'nsf-flip-btn'; btn.type = 'button'; btn.textContent = '📖 綴じ後プレビュー';
    btn.title = '印刷・裁断して綴じたあとの見開きを、画面上でめくって確認します';
    btn.addEventListener('click', open);
    document.body.appendChild(btn);

    ov = document.createElement('div'); ov.id = 'nsf-flip-ov';
    ov.innerHTML = '<div id="nsf-flip-bar"><button type="button" id="nsf-flip-first">⏮ 最初</button><button type="button" id="nsf-flip-prev">◀ 前へ</button><span id="nsf-flip-counter"></span><button type="button" class="primary" id="nsf-flip-next">次へ ▶</button><button type="button" id="nsf-flip-last">最後 ⏭</button><button type="button" id="nsf-flip-close">✕ 閉じる</button></div><div id="nsf-flip-note"></div><div id="nsf-flip-wrap"><div id="nsf-flip-stage"></div></div>';
    document.body.appendChild(ov);
    stage = ov.querySelector('#nsf-flip-stage'); counter = ov.querySelector('#nsf-flip-counter'); note = ov.querySelector('#nsf-flip-note');
    ov.querySelector('#nsf-flip-prev').addEventListener('click', () => go(-1));
    ov.querySelector('#nsf-flip-next').addEventListener('click', () => go(1));
    ov.querySelector('#nsf-flip-first').addEventListener('click', () => { idx = 0; render(); });
    ov.querySelector('#nsf-flip-last').addEventListener('click', () => { idx = sp.length - 1; render(); });
    ov.querySelector('#nsf-flip-close').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (ov.style.display !== 'flex') return; if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (ov.style.display === 'flex') render(); });

    // サイドバーにもボタンを置く（「印刷」セクションの先頭）
    const controls = document.getElementById('controls');
    const printH3 = controls && [...controls.querySelectorAll('.ctrl-section h3')].find(h => /^印刷$/.test(h.textContent.trim()));
    if (printH3) {
      const row = document.createElement('div'); row.className = 'btn-row';
      const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn-secondary'; b2.textContent = '📖 綴じ後プレビュー（紙を使わず確認）'; b2.style.flex = '1';
      b2.addEventListener('click', open); row.appendChild(b2);
      printH3.insertAdjacentElement('afterend', row);
    }
  }
  window.nsfFlipSim = { open, close, collect, spreads, get index() { return idx; }, get count() { return sp.length; }, go };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
