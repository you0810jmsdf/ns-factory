(function () {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';

  function pageKey() {
    let path = location.pathname.replace(/^\/ns-factory\/?/, '');
    if (!path || path.endsWith('/')) path += 'index.html';
    return decodeURIComponent(path);
  }

  function addBadge(count) {
    if (document.getElementById('access-counter')) return;
    const badge = document.createElement('div');
    badge.id = 'access-counter';
    badge.textContent = `アクセス ${Number(count || 0).toLocaleString('ja-JP')}`;
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
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0',
      boxShadow: '0 3px 12px rgba(0,0,0,.08)',
      backdropFilter: 'blur(6px)'
    });
    document.body.appendChild(badge);
  }

  async function track() {
    try {
      const url = `${GAS_URL}?action=track&page=${encodeURIComponent(pageKey())}&title=${encodeURIComponent(document.title || '')}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok && typeof data.count !== 'undefined') addBadge(data.count);
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
