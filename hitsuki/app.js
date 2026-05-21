(function () {
  const { volumes, commentaries, videos, workflow } = window.HITSUKI_DATA;

  const state = {
    query: '',
    group: 'all',
    selectedVolumeId: volumes[0].id
  };

  const els = {
    statVolumeCount: document.getElementById('stat-volume-count'),
    statChapterCount: document.getElementById('stat-chapter-count'),
    statVideoCount: document.getElementById('stat-video-count'),
    search: document.getElementById('archive-search'),
    segments: Array.from(document.querySelectorAll('.segment')),
    volumeList: document.getElementById('volume-list'),
    selectedMeta: document.getElementById('selected-volume-meta'),
    selectedTitle: document.getElementById('selected-volume-title'),
    selectedLead: document.getElementById('selected-volume-lead'),
    selectedTags: document.getElementById('selected-volume-tags'),
    passageCount: document.getElementById('passage-count'),
    sourceLink: document.getElementById('volume-source-link'),
    passageList: document.getElementById('passage-list'),
    workflowList: document.getElementById('workflow-list')
  };

  const passageRecords = volumes.flatMap(buildPassages);
  const commentaryByPassage = new Map();
  const videosByPassage = new Map();

  commentaries.forEach((commentary) => {
    commentary.chapterKeys.forEach((chapterKey) => {
      commentaryByPassage.set(`${commentary.volumeId}-${chapterKey}`, commentary);
    });
  });

  videos.forEach((video) => {
    video.mappedTo.forEach((mapping) => {
      mapping.chapterKeys.forEach((chapterKey) => {
        const key = `${mapping.volumeId}-${chapterKey}`;
        if (!videosByPassage.has(key)) videosByPassage.set(key, []);
        videosByPassage.get(key).push({ video, note: mapping.note });
      });
    });
  });

  function padChapter(value) {
    if (typeof value === 'number') return String(value).padStart(3, '0');
    return String(value);
  }

  function chapterLabel(value) {
    if (typeof value === 'number') return `第${value}帖`;
    return value;
  }

  function buildPassages(volume) {
    const records = [];
    const missing = new Set(volume.missingChapters || []);

    for (let i = 1; i <= volume.maxChapter; i += 1) {
      const key = padChapter(i);
      const isMissing = missing.has(i);
      records.push({
        volumeId: volume.id,
        key,
        chapter: i,
        label: chapterLabel(i),
        title: `${volume.title} ${chapterLabel(i)}`,
        anchor: `passage-${volume.id}-${key}`,
        sourceUrl: volume.sourceUrl,
        excerpt: volume.samplePassages?.[i] || '',
        status: isMissing ? 'missing' : volume.samplePassages?.[i] ? 'sample' : 'pending'
      });
    }

    (volume.extraChapters || []).forEach((extra) => {
      records.push({
        volumeId: volume.id,
        key: extra.key,
        chapter: extra.key,
        label: extra.label,
        title: `${volume.title} ${extra.label}`,
        anchor: `passage-${volume.id}-${extra.key}`,
        sourceUrl: volume.sourceUrl,
        excerpt: '',
        status: 'pending'
      });
    });

    return records;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function normalize(value) {
    return String(value ?? '').toLowerCase().replace(/\s+/g, '');
  }

  function volumeMatches(volume) {
    const query = normalize(state.query);
    const inGroup = state.group === 'all' || volume.group === state.group;
    if (!inGroup) return false;
    if (!query) return true;

    const haystack = normalize([
      volume.displayNo,
      volume.group,
      volume.title,
      volume.kana,
      volume.period,
      volume.lead,
      volume.themes.join(',')
    ].join(' '));
    return haystack.includes(query);
  }

  function passageMatches(passage) {
    if (!state.query) return true;
    const query = normalize(state.query);
    const volume = volumes.find((item) => item.id === passage.volumeId);
    const haystack = normalize([
      passage.title,
      passage.label,
      passage.excerpt,
      volume?.title,
      volume?.themes.join(',')
    ].join(' '));
    return haystack.includes(query);
  }

  function getSelectedVolume() {
    return volumes.find((volume) => volume.id === state.selectedVolumeId) || volumes[0];
  }

  function renderStats() {
    const totalChapters = passageRecords.filter((record) => record.status !== 'missing').length;
    els.statVolumeCount.textContent = String(volumes.length);
    els.statChapterCount.textContent = String(totalChapters);
    els.statVideoCount.textContent = String(videos.length);
  }

  function renderVolumeList() {
    const filtered = volumes.filter(volumeMatches);
    if (!filtered.some((volume) => volume.id === state.selectedVolumeId)) {
      state.selectedVolumeId = filtered[0]?.id || volumes[0].id;
    }

    els.volumeList.innerHTML = filtered.map((volume) => {
      const active = volume.id === state.selectedVolumeId ? ' active' : '';
      const videoCount = videos.filter((video) => video.mappedTo.some((mapping) => mapping.volumeId === volume.id)).length;
      return `
        <button class="volume-card${active}" type="button" data-volume-id="${escapeHtml(volume.id)}">
          <span class="volume-card-top">
            <span>${escapeHtml(volume.displayNo)}</span>
            <span>${escapeHtml(volume.group)}</span>
          </span>
          <strong>${escapeHtml(volume.title)}</strong>
          <span class="volume-period">${escapeHtml(volume.period)}</span>
          <span class="volume-card-bottom">
            <span>${volume.totalChapters}帖</span>
            <span>${videoCount ? `${videoCount}動画` : '動画未設定'}</span>
          </span>
        </button>
      `;
    }).join('');
  }

  function renderSelectedVolume() {
    const volume = getSelectedVolume();
    const passages = passageRecords
      .filter((record) => record.volumeId === volume.id)
      .filter(passageMatches);

    els.selectedMeta.textContent = `${volume.displayNo} / ${volume.group} / ${volume.period}`;
    els.selectedTitle.textContent = volume.title;
    els.selectedLead.textContent = volume.lead;
    els.selectedTags.innerHTML = volume.themes.map((theme) => `<span>${escapeHtml(theme)}</span>`).join('');
    els.passageCount.textContent = `${passages.filter((record) => record.status !== 'missing').length}件`;
    els.sourceLink.href = volume.sourceUrl;

    els.passageList.innerHTML = passages.map(renderPassageCard).join('');
  }

  function renderPassageCard(passage) {
    const passageKey = `${passage.volumeId}-${passage.key}`;
    const transcript = (window.HITSUKI_TRANSCRIPTS || {})[passageKey];
    const mappedVideos = videosByPassage.get(passageKey) || [];
    const statusLabel = {
      pending: '本文入力待ち',
      missing: '欠帖'
    }[passage.status] || null;

    const excerpt = passage.status === 'missing'
      ? 'この帖は欠帖として扱います。番号は残し、解説側で事情を説明します。'
      : passage.excerpt || '本文全文は出典・掲載許諾の確認後に登録します。';

    const transcriptHtml = transcript ? `
      <div class="commentary-panel" hidden>
        <div class="commentary-panel-inner">
          <p class="commentary-transcript">${escapeHtml(transcript.transcript).replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    ` : '';

    const toggleBtn = transcript
      ? `<button class="commentary-toggle" type="button" data-key="${escapeHtml(passageKey)}" aria-expanded="false">解説を開く ▾</button>`
      : `<span class="commentary-toggle no-data">解説未収録</span>`;

    const hasCommentary = !!transcript;

    return `
      <article class="passage-card${hasCommentary ? ' has-commentary' : ''}" id="${escapeHtml(passage.anchor)}">
        <div class="passage-card-head">
          <div>
            <span class="passage-label">${escapeHtml(passage.label)}</span>
            <h4>${escapeHtml(passage.title)}</h4>
          </div>
          ${statusLabel ? `<span class="status-pill ${escapeHtml(passage.status)}">${escapeHtml(statusLabel)}</span>` : ''}
        </div>
        <p class="passage-excerpt">${escapeHtml(excerpt)}</p>
        <div class="passage-links">
          ${toggleBtn}
        </div>
        ${transcriptHtml}
      </article>
    `;
  }

  function renderWorkflow() {
    els.workflowList.innerHTML = workflow.map((item, index) => `
      <article class="workflow-item">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </article>
    `).join('');
  }

  function render() {
    renderVolumeList();
    renderSelectedVolume();
  }

  els.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  els.segments.forEach((button) => {
    button.addEventListener('click', () => {
      els.segments.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      state.group = button.dataset.group;
      render();
    });
  });

  els.volumeList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-volume-id]');
    if (!button) return;
    state.selectedVolumeId = button.dataset.volumeId;
    render();
  });

  els.passageList.addEventListener('click', (event) => {
    const toggle = event.target.closest('.commentary-toggle');
    if (!toggle || toggle.classList.contains('no-data')) return;
    const card = toggle.closest('.passage-card');
    const panel = card.querySelector('.commentary-panel');
    if (!panel) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? '解説を開く ▾' : '解説を閉じる ▴';
    panel.hidden = expanded;
  });

  renderStats();
  renderWorkflow();
  render();
}());
