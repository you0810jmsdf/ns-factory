(function () {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';

  function pageKey() {
    let path = location.pathname.replace(/^\/ns-factory\/?/, '');
    if (!path || path.endsWith('/')) path += 'index.html';
    return decodeURIComponent(path);
  }

  function getVisitorId() {
    try {
      let vid = localStorage.getItem('nsf_vid');
      if (!vid) {
        vid = Date.now().toString(36) + Math.random().toString(36).slice(2);
        localStorage.setItem('nsf_vid', vid);
      }
      return vid;
    } catch (_) {
      return '';
    }
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('ja-JP');
  }

  function addBadge(pv, uu, hasUu) {
    if (document.getElementById('access-counter')) return;
    const badge = document.createElement('div');
    badge.id = 'access-counter';
    const lines = hasUu
      ? `<div>PV ${fmt(pv)}</div><div>UU ${fmt(uu)}</div>`
      : `<div>アクセス ${fmt(pv)}</div>`;
    badge.innerHTML = lines;
    Object.assign(badge.style, {
      position: 'fixed',
      top: '76px',
      right: '12px',
      zIndex: '900',
      padding: '6px 10px',
      border: '1px solid rgba(120, 86, 60, .28)',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, .9)',
      color: '#6f4e37',
      fontSize: '11px',
      fontWeight: '700',
      lineHeight: '1.35',
      letterSpacing: '0',
      boxShadow: '0 3px 12px rgba(0,0,0,.08)',
      backdropFilter: 'blur(6px)',
      textAlign: 'center',
      minWidth: '60px'
    });
    document.body.appendChild(badge);
  }

  async function track() {
    try {
      const url = `${GAS_URL}?action=track`
        + `&page=${encodeURIComponent(pageKey())}`
        + `&title=${encodeURIComponent(document.title || '')}`
        + `&vid=${encodeURIComponent(getVisitorId())}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.ok) return;
      const pv = typeof data.pv !== 'undefined' ? data.pv : data.count;
      const hasUu = typeof data.uu !== 'undefined';
      addBadge(pv, data.uu, hasUu);
    } catch (_) {
      // Counter is decorative; never block the page if GAS is unavailable.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
