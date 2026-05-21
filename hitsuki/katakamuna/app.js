(function () {
  const { songs, groups, persons, glossary } = window.KATAKAMNA_DATA;

  const state = {
    query: '',
    group: 'all',
    selectedId: songs[0].id,
  };

  const els = {
    search: document.getElementById('archive-search'),
    segments: Array.from(document.querySelectorAll('.segment')),
    songList: document.getElementById('song-list'),
    selectedMeta: document.getElementById('selected-song-meta'),
    selectedTitle: document.getElementById('selected-song-title'),
    selectedLead: document.getElementById('selected-song-lead'),
    selectedTags: document.getElementById('selected-song-tags'),
    songCount: document.getElementById('song-count'),
    songDetailList: document.getElementById('song-detail-list'),
    personList: document.getElementById('person-list'),
    glossaryList: document.getElementById('glossary-list'),
  };

  // ── ユーティリティ ────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── フィルタリング ────────────────────────────────────────
  function filteredSongs() {
    const q = state.query.toLowerCase();
    return songs.filter(s => {
      const groupMatch = state.group === 'all' || s.group === state.group;
      if (!groupMatch) return false;
      if (!q) return true;
      return (
        s.utahi.toLowerCase().includes(q) ||
        s.translation.toLowerCase().includes(q) ||
        s.interpretation.toLowerCase().includes(q) ||
        (s.themes || []).some(t => t.toLowerCase().includes(q))
      );
    });
  }

  // ── 左カラム：首一覧 ──────────────────────────────────────
  function renderSongList() {
    const list = filteredSongs();
    els.songList.innerHTML = '';

    list.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'volume-card' + (s.id === state.selectedId ? ' active' : '');
      btn.setAttribute('aria-pressed', s.id === state.selectedId ? 'true' : 'false');
      btn.dataset.id = s.id;

      const themes = (s.themes || []).slice(0, 2).map(t => `<span>${esc(t)}</span>`).join('');

      btn.innerHTML = `
        <div class="volume-card-top">
          <span>第${esc(s.id)}首</span>
          <span>${esc(s.group)}</span>
        </div>
        <strong>${esc(s.utahi.split(' ')[0])}…</strong>
        <div class="volume-card-bottom">${themes}</div>
      `;

      btn.addEventListener('click', () => {
        state.selectedId = s.id;
        renderSongList();
        renderDetail();
      });

      els.songList.appendChild(btn);
    });

    const total = list.length;
    els.songCount.textContent = `${total} 首`;
  }

  // ── 右パネル：選択中の群ヘッダー ─────────────────────────
  function renderPanelHeader() {
    const list = filteredSongs();
    if (list.length === 0) {
      els.selectedMeta.textContent = '';
      els.selectedTitle.textContent = '該当する首がありません';
      els.selectedLead.textContent = '';
      els.selectedTags.innerHTML = '';
      return;
    }

    const selectedSong = songs.find(s => s.id === state.selectedId);
    if (!selectedSong || !list.find(s => s.id === state.selectedId)) {
      state.selectedId = list[0].id;
    }

    const grp = state.group === 'all'
      ? groups.find(g => g.id === songs.find(s => s.id === state.selectedId)?.group)
      : groups.find(g => g.id === state.group);

    els.selectedMeta.textContent = grp ? grp.label : 'カタカムナ ウタヒ';
    els.selectedTitle.textContent = grp ? grp.label : '全80首';
    els.selectedLead.textContent = grp ? grp.description : '全群を表示しています。';
    els.selectedTags.innerHTML = '';
  }

  // ── 右パネル：詳細（全首カード） ─────────────────────────
  function renderDetail() {
    const list = filteredSongs();
    els.songDetailList.innerHTML = '';

    if (list.length === 0) {
      els.songDetailList.innerHTML = '<p style="padding:24px;color:var(--ink-soft)">該当する首が見つかりませんでした。</p>';
      return;
    }

    renderPanelHeader();

    list.forEach(s => {
      const card = document.createElement('article');
      card.className = 'song-card';
      card.id = `song-${s.id}`;

      const themes = (s.themes || []).map(t => `<span>${esc(t)}</span>`).join('');

      card.innerHTML = `
        <div class="song-card-head">
          <div>
            <p class="song-label">第 ${esc(s.id)} 首 ／ ${esc(s.kana)}</p>
          </div>
          <div class="song-number" aria-hidden="true">${esc(s.id)}</div>
        </div>
        <p class="utahi-text">${esc(s.utahi)}</p>
        <p class="translation-text">「${esc(s.translation)}」</p>
        <div class="tag-row">${themes}</div>
        <button class="accordion-toggle" aria-expanded="false" aria-controls="interp-${s.id}">
          <span>楢崎解釈を読む</span>
          <span class="toggle-icon" aria-hidden="true">▼</span>
        </button>
        <div class="accordion-body" id="interp-${s.id}" hidden>
          <p class="interpretation-text">${esc(s.interpretation)}</p>
        </div>
      `;

      const toggleBtn = card.querySelector('.accordion-toggle');
      const body = card.querySelector('.accordion-body');

      toggleBtn.addEventListener('click', () => {
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!expanded));
        if (expanded) {
          body.hidden = true;
        } else {
          body.hidden = false;
        }
      });

      els.songDetailList.appendChild(card);
    });

    // 選択中の首へスクロール
    const target = document.getElementById(`song-${state.selectedId}`);
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  }

  // ── 人物カード ────────────────────────────────────────────
  function renderPersons() {
    els.personList.innerHTML = '';
    persons.forEach(p => {
      const card = document.createElement('article');
      card.className = 'person-card';

      const roles = p.roles.map(r => `<span>${esc(r)}</span>`).join('');
      const icon = p.id === 'narasaki' ? '博' : '猟';

      card.innerHTML = `
        <div class="person-card-head">
          <div class="person-icon" aria-hidden="true">${icon}</div>
          <div>
            <h3>${esc(p.name)}</h3>
            <span class="person-kana">${esc(p.kana)}</span>
            <span class="person-title">${esc(p.title)}</span>
          </div>
        </div>
        <div class="person-meta">
          <span>生：${esc(p.born)}</span>
          <span>没：${esc(p.died)}</span>
          ${roles}
        </div>
        <p>${esc(p.description)}</p>
        ${p.works ? `<div class="tag-row">${p.works.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
        <p class="person-note">注記：${esc(p.note)}</p>
      `;

      els.personList.appendChild(card);
    });
  }

  // ── 用語集 ────────────────────────────────────────────────
  function renderGlossary() {
    els.glossaryList.innerHTML = '';
    glossary.forEach(g => {
      const card = document.createElement('article');
      card.className = 'glossary-card';
      card.innerHTML = `
        <h3>${esc(g.term)}</h3>
        <span class="glossary-reading">${esc(g.reading)}</span>
        <p>${esc(g.meaning)}</p>
      `;
      els.glossaryList.appendChild(card);
    });
  }

  // ── イベント ──────────────────────────────────────────────
  els.search.addEventListener('input', e => {
    state.query = e.target.value.trim();
    renderSongList();
    renderDetail();
  });

  els.segments.forEach(btn => {
    btn.addEventListener('click', () => {
      state.group = btn.dataset.group;
      els.segments.forEach(b => b.classList.toggle('active', b === btn));

      const filtered = filteredSongs();
      if (filtered.length > 0) state.selectedId = filtered[0].id;

      renderSongList();
      renderDetail();
    });
  });

  // ── 初期描画 ──────────────────────────────────────────────
  renderPersons();
  renderGlossary();
  renderSongList();
  renderDetail();

})();
