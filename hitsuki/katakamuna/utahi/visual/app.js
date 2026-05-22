(function () {
  'use strict';

  /* ── データ取得 ─────────────────────────────── */
  const { songs, groups } = window.KATAKAMUNA_UTAHI_DATA;
  const CHARS  = window.KATAKAMUNA_CHARS;
  const CENTER = window.KATAKAMUNA_CENTER_SYMBOL;

  /* ── 状態 ──────────────────────────────────── */
  const state = {
    currentId: songs[0].id,
    group: 'all',
  };

  /* ── DOM ────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const el = {
    spiralSvg:    $('spiral-svg'),
    spiralGroup:  $('spiral-group'),
    btnPrev:      $('btn-prev'),
    btnNext:      $('btn-next'),
    navNumber:    $('nav-number'),
    navGroup:     $('nav-group'),
    infoUtahi:    $('info-utahi'),
    infoBadges:   $('info-badges'),
    infoSummary:  $('info-summary'),
    infoInterp:   $('info-interp'),
    interpToggle: $('interp-toggle'),
    interpBody:   $('interp-body'),
    indexGrid:    $('index-grid'),
    charGrid:     $('char-grid'),
    segments:     Array.from(document.querySelectorAll('.segment')),
  };

  /* ── SVG ヘルパー ───────────────────────────── */
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}) {
    const e = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function makeCharGroup(charStr, x, y, scale = 1.0) {
    const g = svgEl('g', {
      transform: `translate(${x.toFixed(2)}, ${y.toFixed(2)}) scale(${scale.toFixed(3)})`,
      'stroke-width': (1.6 / scale).toFixed(2),
      stroke: 'currentColor',
      fill: 'none',
    });
    const svgStr = CHARS[charStr];
    if (svgStr) {
      g.innerHTML = svgStr;
    } else {
      // フォールバック: カタカナテキスト
      const t = svgEl('text', {
        x: '0', y: '4',
        'text-anchor': 'middle',
        'font-size': '11',
        'font-family': 'sans-serif',
        fill: 'currentColor',
        stroke: 'none',
      });
      t.textContent = charStr;
      g.appendChild(t);
    }
    return g;
  }

  /* ── アルキメデス螺旋 配置計算 ──────────────── */
  /**
   * アルキメデス螺旋上の各文字位置を計算する
   * r(θ) = b * θ （中心から外へ螺旋）
   *
   * @param {number} numChars 文字数
   * @param {object} opts オプション
   * @returns {Array<{x,y,r,theta}>}
   */
  function computeSpiralPositions(numChars, opts = {}) {
    const {
      startR     = 22,   // 最初の文字の半径（中心からの距離）
      turnSpace  = 26,   // 1回転ごとの半径増加量（px）
      charSpacing = 24,  // 文字間の弧長（px）
    } = opts;

    const b = turnSpace / (2 * Math.PI);  // 螺旋成長係数 (r = b * θ)
    const positions = [];

    // θ0: startR に対応するθ
    let theta = startR / b;

    for (let i = 0; i < numChars; i++) {
      const r = b * theta;
      // 開始角を -π/2（上）にして時計回りで外へ伸ばす
      const angle = theta - Math.PI / 2;
      positions.push({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        r,
        theta,
      });

      // 次の文字へ θ を進める（弧長 charSpacing 分）
      // ds/dθ = sqrt(r² + b²) = b * sqrt(θ² + 1)
      const ds_dtheta = b * Math.sqrt(theta * theta + 1);
      theta += charSpacing / ds_dtheta;
    }

    return positions;
  }

  /* ── 螺旋描画 ───────────────────────────────── */
  function renderSpiral(song) {
    const group = el.spiralGroup;
    group.innerHTML = '';
    el.spiralSvg.classList.remove('spiral-appear');
    void el.spiralSvg.offsetWidth; // reflow

    // テキストからスペースを除いた文字列
    const charArray = [...song.utahi.replace(/\s/g, '')];
    const n = charArray.length;

    // 文字数に応じてパラメータを調整
    const turnSpace  = n <= 8  ? 30 : n <= 15 ? 27 : n <= 25 ? 24 : 21;
    const charSpacing = n <= 8 ? 28 : n <= 15 ? 25 : n <= 25 ? 22 : 20;

    const positions = computeSpiralPositions(n, { turnSpace, charSpacing });

    // 最大半径を確認してスケールアウトしすぎないようにする
    const maxR = positions.length > 0 ? positions[positions.length - 1].r : 20;
    const viewSize = Math.max(180, maxR + 30);

    el.spiralSvg.setAttribute('viewBox',
      `${-viewSize} ${-viewSize} ${viewSize * 2} ${viewSize * 2}`);

    // 中心シンボルを描画
    const centerG = svgEl('g', {
      stroke: 'currentColor',
      fill: 'none',
      'stroke-width': '1.8',
    });
    centerG.innerHTML = CENTER;
    group.appendChild(centerG);

    // 文字を描画（外から内へ: 外側が第1文字）
    // computeSpiralPositions はθ小→大（内から外）なので逆順に対応
    positions.forEach((pos, i) => {
      // 外側から読む：最後のpositionが第1文字
      const charIdx = n - 1 - i;  // 内側ほど後ろの文字
      const char = charArray[charIdx];

      // 半径に応じてサイズを微調整（外側ほど少し大きく）
      const scale = 0.9 + (pos.r / (maxR + 30)) * 0.15;

      const g = makeCharGroup(char, pos.x, pos.y, scale);
      group.appendChild(g);
    });

    el.spiralSvg.classList.add('spiral-appear');
  }

  /* ── 情報パネル更新 ─────────────────────────── */
  function updateInfoPanel(song) {
    el.navNumber.textContent = `第 ${song.id} 首`;
    const grp = groups.find(g => g.id === song.group);
    el.navGroup.textContent = grp ? grp.label : song.group;

    el.infoUtahi.textContent = song.utahi;

    el.infoBadges.innerHTML = song.verified
      ? `<span class="badge-verified">確認済</span>`
      : `<span class="badge-inferred">参考編纂</span>`;

    el.infoSummary.textContent = song.summary || '';
    el.infoInterp.textContent  = song.interpretation || '';

    // アコーディオンを閉じる
    el.interpToggle.setAttribute('aria-expanded', 'false');
    el.interpBody.hidden = true;
  }

  /* ── 選択・描画 ─────────────────────────────── */
  function selectSong(id) {
    state.currentId = id;
    const song = songs.find(s => s.id === id);
    if (!song) return;

    renderSpiral(song);
    updateInfoPanel(song);
    renderIndexGrid(); // active 更新

    // ビュワーへスクロール（グリッドからの選択時）
    el.spiralSvg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── 前後ナビ ───────────────────────────────── */
  function visibleSongs() {
    return songs.filter(s =>
      state.group === 'all' || s.group === state.group
    );
  }

  el.btnPrev.addEventListener('click', () => {
    const list = visibleSongs();
    const idx = list.findIndex(s => s.id === state.currentId);
    if (idx > 0) selectSong(list[idx - 1].id);
  });

  el.btnNext.addEventListener('click', () => {
    const list = visibleSongs();
    const idx = list.findIndex(s => s.id === state.currentId);
    if (idx < list.length - 1) selectSong(list[idx + 1].id);
  });

  /* ── アコーディオン ─────────────────────────── */
  el.interpToggle.addEventListener('click', () => {
    const open = el.interpToggle.getAttribute('aria-expanded') === 'true';
    el.interpToggle.setAttribute('aria-expanded', String(!open));
    el.interpBody.hidden = open;
  });

  /* ── インデックスグリッド ───────────────────── */
  function makeMiniSpiral(song) {
    const chars = [...song.utahi.replace(/\s/g, '')].slice(0, 12);
    const n = chars.length;
    const positions = computeSpiralPositions(n, { startR: 8, turnSpace: 10, charSpacing: 9 });
    const maxR = positions.length > 0 ? positions[positions.length - 1].r : 10;
    const vs = Math.max(25, maxR + 8);

    let svgStr = `<svg viewBox="${-vs} ${-vs} ${vs * 2} ${vs * 2}" `
      + `xmlns="http://www.w3.org/2000/svg" `
      + `stroke="currentColor" fill="none" stroke-width="1.5">`;

    // 中心シンボル（縮小版）
    svgStr += `<g transform="scale(0.35)" stroke-width="3">${CENTER}</g>`;

    // 文字（最初の数文字）
    positions.forEach((pos, i) => {
      const charIdx = n - 1 - i;
      const char = chars[charIdx];
      const charSvg = CHARS[char];
      if (!charSvg) return;
      svgStr += `<g transform="translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) scale(0.35)" `
        + `stroke-width="3">${charSvg}</g>`;
    });

    svgStr += '</svg>';
    return svgStr;
  }

  function renderIndexGrid() {
    const grid = el.indexGrid;
    const activeGroup = state.group;

    // 既存のセルを更新（初回は作成）
    if (grid.children.length === 0) {
      songs.forEach(song => {
        const cell = document.createElement('div');
        cell.className = 'index-cell';
        cell.dataset.id = song.id;

        const num = document.createElement('span');
        num.className = 'index-cell-num';
        num.textContent = `第${song.id}首`;

        const svgWrap = document.createElement('div');
        svgWrap.className = 'index-cell-svg';
        svgWrap.innerHTML = makeMiniSpiral(song);

        cell.appendChild(num);
        cell.appendChild(svgWrap);

        cell.addEventListener('click', () => selectSong(song.id));
        grid.appendChild(cell);
      });
    }

    // active / filtered-out の更新
    Array.from(grid.children).forEach(cell => {
      const id = parseInt(cell.dataset.id, 10);
      const song = songs.find(s => s.id === id);
      cell.classList.toggle('active', id === state.currentId);
      cell.classList.toggle('filtered-out',
        activeGroup !== 'all' && song && song.group !== activeGroup
      );
    });
  }

  /* ── 文字対応表 ─────────────────────────────── */
  // ローマ字対応（参考用）
  const ROMAJI = {
    'ア':'A','イ':'I','ウ':'U','エ':'E','オ':'O',
    'カ':'KA','キ':'KI','ク':'KU','ケ':'KE','コ':'KO',
    'サ':'SA','シ':'SI','ス':'SU','セ':'SE','ソ':'SO',
    'タ':'TA','チ':'TI','ツ':'TU','テ':'TE','ト':'TO',
    'ナ':'NA','ニ':'NI','ヌ':'NU','ネ':'NE','ノ':'NO',
    'ハ':'HA','ヒ':'HI','フ':'HU','ヘ':'HE','ホ':'HO',
    'マ':'MA','ミ':'MI','ム':'MU','メ':'ME','モ':'MO',
    'ヤ':'YA','ユ':'YU','ヨ':'YO',
    'ラ':'RA','リ':'RI','ル':'RU','レ':'RE','ロ':'RO',
    'ワ':'WA','ヲ':'WO','ン':'N',
    'ヰ':'WI','ヱ':'WE',
  };

  const CHAR_ORDER = [
    'ア','イ','ウ','エ','オ',
    'カ','キ','ク','ケ','コ',
    'サ','シ','ス','セ','ソ',
    'タ','チ','ツ','テ','ト',
    'ナ','ニ','ヌ','ネ','ノ',
    'ハ','ヒ','フ','ヘ','ホ',
    'マ','ミ','ム','メ','モ',
    'ヤ','ユ','ヨ',
    'ラ','リ','ル','レ','ロ',
    'ワ','ヲ','ン',
  ];

  function renderCharGrid() {
    const grid = el.charGrid;
    CHAR_ORDER.forEach(kana => {
      const charSvg = CHARS[kana];
      if (!charSvg) return;

      const card = document.createElement('div');
      card.className = 'char-card';

      const svgWrap = document.createElement('div');
      svgWrap.className = 'char-svg';
      svgWrap.innerHTML = `<svg viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor" fill="none" stroke-width="1.6">${charSvg}</svg>`;

      const label = document.createElement('div');
      label.className = 'char-label';
      label.textContent = kana;

      const romaji = document.createElement('div');
      romaji.className = 'char-romaji';
      romaji.textContent = ROMAJI[kana] || '';

      card.appendChild(svgWrap);
      card.appendChild(label);
      card.appendChild(romaji);
      grid.appendChild(card);
    });
  }

  /* ── 群フィルター ───────────────────────────── */
  el.segments.forEach(btn => {
    btn.addEventListener('click', () => {
      state.group = btn.dataset.group;
      el.segments.forEach(b => b.classList.toggle('active', b === btn));
      const list = visibleSongs();
      if (list.length > 0 && !list.find(s => s.id === state.currentId)) {
        state.currentId = list[0].id;
        const song = songs.find(s => s.id === state.currentId);
        if (song) { renderSpiral(song); updateInfoPanel(song); }
      }
      renderIndexGrid();
    });
  });

  /* ── キーボードナビ ─────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   el.btnPrev.click();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  el.btnNext.click();
  });

  /* ── 初期化 ─────────────────────────────────── */
  (function init() {
    renderCharGrid();
    renderIndexGrid();
    selectSong(songs[0].id);
  })();

})();
