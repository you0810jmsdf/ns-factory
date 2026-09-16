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

  // 明らかに外部でない閲覧（事業主の端末・撮影や検証の自動操作）は数えない（2026-09-16 事業主指示）。
  // 管理者モードに入った端末は以後ずっと除外。?nsf_internal=1 で手動登録、?nsf_internal=0 で解除
  function isInternal() {
    try {
      const flag = new URLSearchParams(location.search).get('nsf_internal');
      if (flag === '1') localStorage.setItem('nsf_internal', '1');
      if (flag === '0') localStorage.removeItem('nsf_internal');
      if (sessionStorage.getItem('nsf_admin_key')) localStorage.setItem('nsf_internal', '1');
      if (localStorage.getItem('nsf_internal') === '1') return true;
    } catch (_) {}
    if (navigator.webdriver) return true;
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:';
  }

  // 数えずに今の件数だけ表示する
  async function peek() {
    try {
      const res = await fetch(`${GAS_URL}?action=counts`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const row = data && data.ok && (data.counts || []).find(c => c.page === pageKey());
      if (row) addBadge(row.pv, row.uu, true);
    } catch (_) {}
  }

  async function track() {
    if (isInternal()) return peek();
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
