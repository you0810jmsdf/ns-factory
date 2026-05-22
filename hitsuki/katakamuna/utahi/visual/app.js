(function () {
  'use strict';

  /* ── データ取得 ─────────────────────────────── */
  const { songs, groups } = window.KATAKAMUNA_UTAHI_DATA;

  /* ── 状態 ──────────────────────────────────── */
  const state = {
    currentId: songs[0].id,
    group: 'all',
  };

  /* ── DOM ────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const el = {
    songViewer:   $('song-viewer'),
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
    segments:     Array.from(document.querySelectorAll('.segment')),
  };

  /* ── 画像表示 ───────────────────────────────── */
  function renderSongImage(song) {
    const num = String(song.id).padStart(2, '0');
    const src = `images/song_${num}.png`;

    let img = el.songViewer.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'song-img';
      el.songViewer.appendChild(img);
    }

    img.classList.remove('spiral-appear');
    void img.offsetWidth; // reflow でアニメーションリセット

    img.src = src;
    img.alt = `第${song.id}首 ${song.utahi}`;
    img.classList.add('spiral-appear');
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

    renderSongImage(song);
    updateInfoPanel(song);
    renderIndexGrid();

    el.songViewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  function renderIndexGrid() {
    const grid = el.indexGrid;
    const activeGroup = state.group;

    if (grid.children.length === 0) {
      songs.forEach(song => {
        const cell = document.createElement('div');
        cell.className = 'index-cell';
        cell.dataset.id = song.id;

        const num = document.createElement('span');
        num.className = 'index-cell-num';
        num.textContent = `第${song.id}首`;

        const imgWrap = document.createElement('div');
        imgWrap.className = 'index-cell-img';
        const n = String(song.id).padStart(2, '0');
        const thumb = document.createElement('img');
        thumb.src = `images/song_${n}.png`;
        thumb.alt = `第${song.id}首`;
        thumb.loading = 'lazy';
        imgWrap.appendChild(thumb);

        cell.appendChild(num);
        cell.appendChild(imgWrap);
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

  /* ── 群フィルター ───────────────────────────── */
  el.segments.forEach(btn => {
    btn.addEventListener('click', () => {
      state.group = btn.dataset.group;
      el.segments.forEach(b => b.classList.toggle('active', b === btn));
      const list = visibleSongs();
      if (list.length > 0 && !list.find(s => s.id === state.currentId)) {
        state.currentId = list[0].id;
        const song = songs.find(s => s.id === state.currentId);
        if (song) { renderSongImage(song); updateInfoPanel(song); }
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
    renderIndexGrid();
    selectSong(songs[0].id);
  })();

})();
