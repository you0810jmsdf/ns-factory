// 公開ツール共通の「不具合を報告」ボタン。access-counter.js と同じGASへ GET で送る。
// ⛔ ブラウザからGASへは GET で送る（POSTはCORSで応答が読めない）。rid で二重送信を防ぐ。
(function () {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';
  if (document.getElementById('nsf-bug-btn')) return;

  function pageKey() {
    let path = location.pathname.replace(/^\/ns-factory\/?/, '');
    if (!path || path.endsWith('/')) path += 'index.html';
    return decodeURIComponent(path);
  }
  function el(tag, style, html) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (html != null) e.innerHTML = html;
    return e;
  }

  const btn = el('button', [
    'position:fixed;right:12px;bottom:14px;z-index:950;padding:8px 12px;border-radius:999px;',
    'border:1px solid rgba(120,86,60,.35);background:rgba(255,255,255,.94);color:#6f4e37;',
    'font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.10);',
    'font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif;'
  ].join(''), '🐞 不具合を報告');
  btn.id = 'nsf-bug-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', '不具合を報告する');

  const overlay = el('div', 'position:fixed;inset:0;z-index:960;background:rgba(15,15,15,.55);display:none;align-items:center;justify-content:center;padding:16px;');
  overlay.id = 'nsf-bug-overlay';
  const card = el('div', [
    'background:#fff;border-radius:14px;padding:20px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.35);',
    'font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif;color:#1d1d1f;font-size:13px;line-height:1.7;'
  ].join(''));
  card.innerHTML = [
    '<div style="font-size:15px;font-weight:700;margin-bottom:6px;">不具合・ご要望を送る</div>',
    '<div style="font-size:12px;color:#6e6e73;margin-bottom:12px;">うまく動かない・印刷がずれる・こうしてほしい等、そのまま書いてください。ページ名は自動で添えます。</div>',
    '<textarea id="nsf-bug-msg" rows="5" maxlength="1000" placeholder="例：A4横で印刷したら左右が3mmずれる" style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;"></textarea>',
    '<input id="nsf-bug-contact" type="text" maxlength="200" placeholder="返信先（メール等・任意）" style="width:100%;box-sizing:border-box;margin-top:8px;padding:9px 10px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:13px;font-family:inherit;">',
    '<div id="nsf-bug-status" style="min-height:20px;font-size:12px;color:#6e6e73;margin-top:8px;"></div>',
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">',
    '<button type="button" id="nsf-bug-cancel" style="padding:8px 14px;border:1px solid #d2d2d7;border-radius:8px;background:#fff;color:#1d1d1f;font-size:13px;cursor:pointer;font-family:inherit;">閉じる</button>',
    '<button type="button" id="nsf-bug-send" style="padding:8px 16px;border:none;border-radius:8px;background:#7A5540;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">送信する</button>',
    '</div>'
  ].join('');
  overlay.appendChild(card);

  function open() { overlay.style.display = 'flex'; setTimeout(() => { const t = document.getElementById('nsf-bug-msg'); if (t) t.focus(); }, 0); }
  function close() { overlay.style.display = 'none'; }

  let sending = false;
  async function send() {
    if (sending) return;
    const msg = (document.getElementById('nsf-bug-msg').value || '').trim();
    const contact = (document.getElementById('nsf-bug-contact').value || '').trim();
    const status = document.getElementById('nsf-bug-status');
    const sendBtn = document.getElementById('nsf-bug-send');
    if (!msg) { status.textContent = '内容を入力してください。'; return; }
    sending = true;
    sendBtn.disabled = true;
    status.textContent = '送信しています…';
    const rid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const url = GAS_URL + '?action=report'
      + '&page=' + encodeURIComponent(pageKey())
      + '&title=' + encodeURIComponent(document.title || '')
      + '&msg=' + encodeURIComponent(msg)
      + '&contact=' + encodeURIComponent(contact)
      + '&ua=' + encodeURIComponent(navigator.userAgent.slice(0, 300))
      + '&rid=' + encodeURIComponent(rid);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const txt = await res.text();
      if (!txt || txt.trim().charAt(0) === '<') throw new Error('サーバーが混み合っています');
      const data = JSON.parse(txt);
      if (!data.ok) throw new Error(data.error || '送信に失敗しました');
      status.style.color = '#29613d';
      status.textContent = '送りました。ありがとうございます。';
      document.getElementById('nsf-bug-msg').value = '';
      setTimeout(close, 1600);
    } catch (e) {
      status.style.color = '#b42318';
      status.textContent = '送れませんでした（' + (e && e.message ? e.message : e) + '）。時間をおいて再度お試しください。';
    } finally {
      sending = false;
      sendBtn.disabled = false;
    }
  }

  function mount() {
    document.body.appendChild(btn);
    document.body.appendChild(overlay);
    btn.addEventListener('click', open);
    document.getElementById('nsf-bug-cancel').addEventListener('click', close);
    document.getElementById('nsf-bug-send').addEventListener('click', send);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    // 印刷には出さない
    const st = document.createElement('style');
    st.textContent = '@media print { #nsf-bug-btn, #nsf-bug-overlay { display: none !important; } }';
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
