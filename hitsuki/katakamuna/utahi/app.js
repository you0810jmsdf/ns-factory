(function () {
  const { songs, groups } = window.KATAKAMUNA_UTAHI_DATA;

  const state = {
    query: '',
    group: 'all',
    selectedId: songs[0].id,
  };

  const els = {
    search:       document.getElementById('archive-search'),
    segments:     Array.from(document.querySelectorAll('.segment')),
    songList:     document.getElementById('song-list'),
    selectedMeta: document.getElementById('selected-meta'),
    selectedTitle:document.getElementById('selected-title'),
    selectedLead: document.getElementById('selected-lead'),
    songCount:    document.getElementById('song-count'),
    detailList:   document.getElementById('song-detail-list'),
  };

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── フィルタ ──────────────────────────────────────────────
  function filtered() {
    const q = state.query.toLowerCase();
    return songs.filter(s => {
      const gOk = state.group === 'all' || s.group === state.group;
      if (!gOk) return false;
      if (!q) return true;
      return (
        s.utahi.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        (s.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    });
  }

  // ── 左カラム ──────────────────────────────────────────────
  function renderList() {
    const list = filtered();
    els.songList.innerHTML = '';

    list.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'volume-card' + (s.id === state.selectedId ? ' active' : '');
      btn.setAttribute('aria-pressed', s.id === state.selectedId ? 'true' : 'false');
      btn.dataset.id = s.id;

      const firstWord = s.utahi.split(' ')[0];

      btn.innerHTML = `
        <div class="volume-card-top">
          <span>第${esc(s.id)}首</span>
          <span>${esc(s.group)}</span>
        </div>
        <strong>${esc(firstWord)}…</strong>
      `;

      btn.addEventListener('click', () => {
        state.selectedId = s.id;
        renderList();
        renderPanel();
      });

      els.songList.appendChild(btn);
    });

    els.songCount.textContent = `${list.length} 首`;
  }

  // ── 右パネル ヘッダー ─────────────────────────────────────
  function renderPanelHeader() {
    const list = filtered();
    if (list.length === 0) {
      els.selectedMeta.textContent = '';
      els.selectedTitle.textContent = '該当する首がありません';
      els.selectedLead.textContent = '';
      return;
    }
    if (!list.find(s => s.id === state.selectedId)) {
      state.selectedId = list[0].id;
    }
    const grp = state.group === 'all'
      ? groups.find(g => g.id === songs.find(s => s.id === state.selectedId)?.group)
      : groups.find(g => g.id === state.group);

    els.selectedMeta.textContent = grp ? grp.label : 'カタカムナウタヒ';
    els.selectedTitle.textContent = grp ? grp.label : '全80首';
    els.selectedLead.textContent  = grp ? grp.description : '全群を表示しています。';
  }

  // ── 右パネル 詳細 ─────────────────────────────────────────
  function renderPanel() {
    const list = filtered();
    els.detailList.innerHTML = '';

    if (list.length === 0) {
      els.detailList.innerHTML = '<p style="padding:24px;color:var(--muted)">該当する首が見つかりませんでした。</p>';
      return;
    }

    renderPanelHeader();

    list.forEach(s => {
      const card = document.createElement('article');
      card.className = 'song-card';
      card.id = `song-${s.id}`;

      const verifiedBadge = s.verified
        ? `<span class="badge-verified">確認済</span>`
        : `<span class="badge-inferred">参考編纂</span>`;

      const keywords = (s.keywords || []).map(k => `<span>${esc(k)}</span>`).join('');

      card.innerHTML = `
        <div class="song-card-head">
          <div>
            <p class="song-label">第 ${esc(s.id)} 首 ／ ${esc(s.group)}</p>
            <div class="song-badge-row">${verifiedBadge}</div>
          </div>
          <div class="song-number" aria-hidden="true">${esc(s.id)}</div>
        </div>
        <div class="song-body">
          <p class="utahi-text">${esc(s.utahi)}</p>
          <p class="song-summary">${esc(s.summary)}</p>
          <div class="tag-row">${keywords}</div>
          <button class="accordion-toggle" aria-expanded="false" aria-controls="interp-${s.id}">
            <span>解釈を読む</span>
            <span class="toggle-icon" aria-hidden="true">▼</span>
          </button>
          <div class="accordion-body" id="interp-${s.id}" hidden>
            <p class="interpretation-text">${esc(s.interpretation)}</p>
          </div>
        </div>
      `;

      const toggle = card.querySelector('.accordion-toggle');
      const body   = card.querySelector('.accordion-body');
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        body.hidden = open;
      });

      els.detailList.appendChild(card);
    });

    const target = document.getElementById(`song-${state.selectedId}`);
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
    }
  }

  // ── イベント ──────────────────────────────────────────────
  els.search.addEventListener('input', e => {
    state.query = e.target.value.trim();
    renderList();
    renderPanel();
  });

  els.segments.forEach(btn => {
    btn.addEventListener('click', () => {
      state.group = btn.dataset.group;
      els.segments.forEach(b => b.classList.toggle('active', b === btn));
      const f = filtered();
      if (f.length > 0) state.selectedId = f[0].id;
      renderList();
      renderPanel();
    });
  });

  // ── 初期描画 ──────────────────────────────────────────────
  renderList();
  renderPanel();

})();
