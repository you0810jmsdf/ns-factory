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
    videoList: document.getElementById('video-list'),
    commentaryList: document.getElementById('commentary-list'),
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
    const commentary = commentaryByPassage.get(`${passage.volumeId}-${passage.key}`);
    const mappedVideos = videosByPassage.get(`${passage.volumeId}-${passage.key}`) || [];
    const statusLabel = {
      pending: '本文入力待ち',
      sample: '短い引用あり',
      missing: '欠帖'
    }[passage.status] || '未整理';

    const excerpt = passage.status === 'missing'
      ? 'この帖は欠帖として扱います。番号は残し、解説側で事情を説明します。'
      : passage.excerpt || '本文全文は出典・掲載許諾の確認後に登録します。';

    const commentaryLink = commentary
      ? `#commentary-${commentary.id}`
      : '#commentaries';

    return `
      <article class="passage-card" id="${escapeHtml(passage.anchor)}">
        <div class="passage-card-head">
          <div>
            <span class="passage-label">${escapeHtml(passage.label)}</span>
            <h4>${escapeHtml(passage.title)}</h4>
          </div>
          <span class="status-pill ${escapeHtml(passage.status)}">${escapeHtml(statusLabel)}</span>
        </div>
        <p class="passage-excerpt">${escapeHtml(excerpt)}</p>
        <div class="passage-links">
          <a href="${escapeHtml(commentaryLink)}">${commentary ? '解説へ' : '解説枠へ'}</a>
          <a href="${escapeHtml(passage.sourceUrl)}" target="_blank" rel="noopener">出典候補</a>
          ${mappedVideos.map(({ video }) => `<a href="${escapeHtml(video.url)}" target="_blank" rel="noopener">動画</a>`).join('')}
        </div>
        ${mappedVideos.length ? `
          <div class="video-note">
            ${mappedVideos.map(({ video, note }) => `
              <span>${escapeHtml(video.host)}: ${escapeHtml(note)}</span>
            `).join('')}
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderVideos() {
    els.videoList.innerHTML = videos.map((video) => {
      const chips = video.mappedTo.flatMap((mapping) => {
        const volume = volumes.find((item) => item.id === mapping.volumeId);
        return mapping.chapterKeys.map((chapterKey) => `${volume?.title || mapping.volumeId} ${chapterKey}`);
      });
      return `
        <article class="video-card">
          <div class="video-meta">
            <span>${escapeHtml(video.host)}</span>
            <span>${escapeHtml(video.publishedAt)}</span>
            <span>${escapeHtml(video.duration)}</span>
          </div>
          <h3>${escapeHtml(video.title)}</h3>
          <p>${escapeHtml(video.themes.join(' / '))}</p>
          <div class="tag-row">
            ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}
          </div>
          <div class="passage-links">
            <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener">YouTube</a>
            <a href="${escapeHtml(video.sourceUrl)}" target="_blank" rel="noopener">メタ情報</a>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderCommentaries() {
    els.commentaryList.innerHTML = commentaries.map((commentary) => {
      const volume = volumes.find((item) => item.id === commentary.volumeId);
      return `
        <article class="commentary-card" id="commentary-${escapeHtml(commentary.id)}">
          <div class="commentary-meta">
            <span>${escapeHtml(volume?.title || '')}</span>
            <span>${escapeHtml(commentary.chapterKeys.join(', '))}</span>
            <span>${escapeHtml(commentary.status)}</span>
          </div>
          <h3>${escapeHtml(commentary.title)}</h3>
          <p>${escapeHtml(commentary.summary)}</p>
          <div class="tag-row">
            ${commentary.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
        </article>
      `;
    }).join('');
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

  renderStats();
  renderVideos();
  renderCommentaries();
  renderWorkflow();
  render();
}());
