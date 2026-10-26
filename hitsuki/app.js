(function () {
  const { volumes, commentaries, videos, workflow } = window.HITSUKI_DATA;
  const FULLTEXT = window.HITSUKI_FULLTEXT || {};   // 原典の全文（出典：ひふみ神示データー）。'巻id-帖番号' → { t, n, r, x }
  const FULLTEXT_SOURCE = window.HITSUKI_FULLTEXT_SOURCE || {};
  const FULLTEXT_INLINE_MAX = 240;   // この文字数までの帖は、押さなくても全文を出す

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
        full: isMissing ? null : FULLTEXT[`${volume.id}-${key}`] || null,
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
        full: FULLTEXT[`${volume.id}-${extra.key}`] || null,
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

  // 原典の記号（私用領域の文字）は、図（glyphs.css）に直して出す
  function withGlyphs(escaped) {
    return escaped.replace(/[\uE000-\uF8FF]/g, (ch) => `<i class="gl g-${ch.charCodeAt(0).toString(16).toUpperCase()}" role="img" aria-label="記号"></i>`);
  }

  function fullTextHtml(text) {
    return withGlyphs(escapeHtml(text)).replace(/\n/g, '<br>');
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
      passage.full?.t,
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
      pending: passage.full ? null : '本文入力待ち',
      missing: '欠帖'
    }[passage.status] || null;

    // 本文の出し方：サイトの本文（抜粋のこともある）→ 原典の全文（出典サイトの転記）。全文が無い帖は、その理由を出す
    const full = passage.full;
    const fullText = full && full.t ? full.t : '';
    const pct = full && Number.isFinite(full.r) && full.r < 90 ? (full.r < 5 ? null : Math.round(full.r / 5) * 5) : undefined;   // サイトの本文が原典より短いときだけ
    const sourceUrl = FULLTEXT_SOURCE.url && passage.sourceUrl ? passage.sourceUrl : '';
    // サイトの本文（カードの上）は別の版：仮名遣い・語句・記号の位置の言葉が、原典の全文と違うことがある
    const sampleNote = passage.excerpt
      ? `。カードの上のサイトの本文は別の版です${pct === undefined ? '' : `（この原典の${pct === null ? '5％に満たない' : `約${pct}％`}、文字数の比較）`}。仮名遣い・語句・記号の位置の言葉が、原典の全文と違うことがあります`
      : '';
    const credit = fullText
      ? `<p class="fulltext-credit">原典の全文。出典：${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(FULLTEXT_SOURCE.name || '出典サイト')}</a>` : escapeHtml(FULLTEXT_SOURCE.name || '出典サイト')}（${escapeHtml(passage.title)}）${full.n ? `　通し番号 ${escapeHtml(full.n)}` : ''}${sampleNote}。記号は図で表しています。</p>`
      : '';
    let excerptHtml;
    let fullToggle = '';
    let fullPanel = '';
    if (passage.status === 'missing') {
      excerptHtml = '<p class="passage-excerpt">この帖は欠帖として扱います。番号は残し、解説側で事情を説明します。</p>';
    } else if (passage.excerpt) {
      excerptHtml = `<p class="passage-excerpt">${escapeHtml(passage.excerpt)}</p>`;
      if (fullText) {
        fullToggle = `<button class="fulltext-toggle" type="button" aria-expanded="false">原典の全文を読む ▾</button>`;
        fullPanel = `<div class="fulltext-panel" hidden><p class="fulltext-body">${fullTextHtml(fullText)}</p>${credit}</div>`;
      }
    } else if (fullText && fullText.length <= FULLTEXT_INLINE_MAX) {
      excerptHtml = `<p class="passage-excerpt fulltext-body">${fullTextHtml(fullText)}</p>${credit}`;
    } else if (fullText) {
      const preview = [...fullText].slice(0, 90).join('').replace(/\n/g, ' ');
      excerptHtml = `<p class="passage-excerpt">${withGlyphs(escapeHtml(preview))}……</p>`;
      fullToggle = `<button class="fulltext-toggle" type="button" aria-expanded="false">原典の全文を読む ▾</button>`;
      fullPanel = `<div class="fulltext-panel" hidden><p class="fulltext-body">${fullTextHtml(fullText)}</p>${credit}</div>`;
    } else if (full && full.x) {
      excerptHtml = `<p class="passage-excerpt">${escapeHtml(full.x)}</p>`;
    } else {
      excerptHtml = '<p class="passage-excerpt">この帖の本文は、まだ載せられていません。</p>';
    }

    // 工房の言い換え解説（kind: 'workshop'）は、出典リンクとバッジを付けて動画の解説と区別する
    const isWorkshop = !!transcript && transcript.kind === 'workshop';
    const sourceLinks = isWorkshop && Array.isArray(transcript.sources)
      ? transcript.sources
        .filter((s) => /^https:\/\//.test(s.u || ''))
        .map((s) => `<a href="${escapeHtml(s.u)}" target="_blank" rel="noopener">${escapeHtml(s.t)}</a>`)
      : [];
    const sourcesHtml = sourceLinks.length
      ? `<p class="commentary-source">出典・参考：${sourceLinks.join('、')}</p>`
      : '';

    const transcriptHtml = transcript ? `
      <div class="commentary-panel" hidden>
        <div class="commentary-panel-inner">
          <p class="commentary-transcript">${escapeHtml(transcript.transcript).replace(/\n/g, '<br>')}</p>
          ${sourcesHtml}
        </div>
      </div>
    ` : '';

    const toggleBtn = transcript
      ? `<button class="commentary-toggle" type="button" data-key="${escapeHtml(passageKey)}" aria-expanded="false">解説を開く ▾</button>`
      : `<span class="commentary-toggle no-data">解説未収録</span>`;

    const hasCommentary = !!transcript;
    // サイトの本文が原典の抜粋のときは、原典に対する割合を閉じたカードにも出す（将来、本文がそろったら解説を作り直す）
    const excerptPct = transcript && Number.isFinite(transcript.excerptPercent) ? transcript.excerptPercent : null;
    const excerptBadge = excerptPct === null ? '' : (transcript.basis === 'full'
      ? `<span class="commentary-badge excerpt" title="カードの上に出ている本文は、原典の一部（抜粋）です。この解説は、「原典の全文を読む」で開く全文をもとに作りました。">解説は原典の全文に対応・上の本文は約${escapeHtml(String(excerptPct))}％</span>`
      : `<span class="commentary-badge excerpt" title="サイトに載っている本文は、出典サイトの原典の一部です。本文がそろったときに、解説を改めて作ります。">抜粋・原典の約${escapeHtml(String(excerptPct))}％</span>`);
    const badge = !transcript ? '' : (isWorkshop
      ? '<span class="commentary-badge workshop">工房の言い換え解説（AI作成）</span>'
      : '<span class="commentary-badge video">動画の解説</span>');

    return `
      <article class="passage-card${hasCommentary ? ' has-commentary' : ''}${isWorkshop ? ' is-workshop' : ''}" id="${escapeHtml(passage.anchor)}">
        <div class="passage-card-head">
          <div>
            <span class="passage-label">${escapeHtml(passage.label)}</span>
            <h4>${escapeHtml(passage.title)}</h4>
          </div>
          ${statusLabel ? `<span class="status-pill ${escapeHtml(passage.status)}">${escapeHtml(statusLabel)}</span>` : ''}
        </div>
        ${excerptHtml}
        <div class="passage-links">
          ${fullToggle}
          ${toggleBtn}
          ${badge}
          ${excerptBadge}
        </div>
        ${fullPanel}
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
    const fullToggle = event.target.closest('.fulltext-toggle');
    if (fullToggle) {
      const fullPanel = fullToggle.closest('.passage-card')?.querySelector('.fulltext-panel');
      if (!fullPanel) return;
      const open = fullToggle.getAttribute('aria-expanded') === 'true';
      fullToggle.setAttribute('aria-expanded', String(!open));
      fullToggle.textContent = open ? '原典の全文を読む ▾' : '原典の全文を閉じる ▴';
      fullPanel.hidden = open;
      return;
    }
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
