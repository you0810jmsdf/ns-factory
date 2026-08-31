(function () {
  // 80首の本体は utahi/（原文80首アーカイブ）に一本化しているため、
  // このページでは首の一覧・詳細は描画しない。
  const { persons, glossary, phonetics } = window.KATAKAMNA_DATA;
  const goods = window.KATAKAMNA_GOODS || { shopUrl: '', items: [] };

  const els = {
    ptypeSegments: Array.from(document.querySelectorAll('.phonetics-toolbar .segment')),
    personList: document.getElementById('person-list'),
    glossaryList: document.getElementById('glossary-list'),
    goodsList: document.getElementById('goods-list'),
    phoneticsGrid: document.getElementById('phonetics-grid'),
  };

  const ptypeState = { type: 'all' };

  // ── ユーティリティ ────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  // ── カタカムナグッズ ──────────────────────────────────────
  function renderGoods() {
    if (!els.goodsList) return;
    els.goodsList.innerHTML = '';
    goods.items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'goods-card';

      const link = item.url || goods.shopUrl;
      const priceText = item.price ? esc(item.price) : '価格準備中';
      const buy = link
        ? `<a class="goods-buy" href="${esc(link)}" target="_blank" rel="noopener">ショップで見る →</a>`
        : `<span class="goods-buy goods-buy-soon" aria-disabled="true">準備中</span>`;
      const generator = item.generatorUrl
        ? `<a class="goods-generator" href="${esc(item.generatorUrl)}">✍ カタカムナ文字をつくる →</a>`
        : '';

      card.innerHTML = `
        <div class="goods-thumb">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">
        </div>
        <div class="goods-body">
          <span class="goods-song">${esc(item.song)}</span>
          <h3>${esc(item.name)}</h3>
          <p class="goods-lead">${esc(item.lead)}</p>
          <p class="goods-desc">${esc(item.description)}</p>
          <div class="goods-meta">
            <span class="goods-material">${esc(item.material)}</span>
            <span class="goods-price">${priceText}</span>
          </div>
          ${generator}
          ${buy}
        </div>
      `;
      els.goodsList.appendChild(card);
    });
  }

  // ── 48音グリッド ──────────────────────────────────────────
  function renderPhonetics() {
    els.phoneticsGrid.innerHTML = '';
    const filtered = phonetics.filter(p =>
      ptypeState.type === 'all' || p.type === ptypeState.type
    );

    filtered.forEach(p => {
      const card = document.createElement('button');
      card.className = `phonetics-card type-${p.type}`;
      card.setAttribute('aria-expanded', 'false');

      card.innerHTML = `
        <svg class="ph-svg" viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          ${p.svgPath}
        </svg>
        <span class="ph-sound">${esc(p.sound)}</span>
        <span class="ph-romaji">${esc(p.romaji)}</span>
        <span class="ph-meaning">${esc(p.meaning)}</span>
        <div class="ph-detail-body" hidden>${esc(p.detail)}</div>
      `;

      card.addEventListener('click', () => {
        const expanded = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', String(!expanded));
        const detail = card.querySelector('.ph-detail-body');
        detail.hidden = expanded;
      });

      els.phoneticsGrid.appendChild(card);
    });
  }

  // ── イベント ──────────────────────────────────────────────
  els.ptypeSegments.forEach(btn => {
    btn.addEventListener('click', () => {
      ptypeState.type = btn.dataset.ptype;
      els.ptypeSegments.forEach(b => b.classList.toggle('active', b === btn));
      renderPhonetics();
    });
  });

  // ── 初期描画 ──────────────────────────────────────────────
  renderPersons();
  renderGlossary();
  renderGoods();
  renderPhonetics();

})();
