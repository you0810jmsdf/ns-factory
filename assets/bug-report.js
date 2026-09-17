// 公開ツール共通の「💡 改善要望」ボタン（不具合もここから）。access-counter.js と同じGASへ送る。
// 本文だけのときは GET（従来どおり）、写真があるときは text/plain の POST（Drive保存）。rid で二重送信を防ぐ。
// ⛔ POST は 302 で結果へ飛ぶ。-L 相当（fetch は既定でリダイレクト追従）で本文を読む。写真は端末側で長辺1280px・JPEG圧縮してから送る。
(function () {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-lfLJy_hyy9FlIUT3XokVZs-R4MtUDWk6BB8TZaFKOHTzF-RTbFvZwOzHL3JHWEVRIQ/exec';
  if (document.getElementById('nsf-bug-btn')) return;
  const MAX_PHOTOS = 3;
  // 読み込む <script> の data-label / data-title / data-placeholder で文言を差し替えられる（N's refill 販売ページは「様式の改善意見」・2026-09-17 事業主指示）
  const CFG = (document.currentScript && document.currentScript.dataset) || {};
  const LABEL = CFG.label || '💡 改善要望';
  const TITLE = CFG.title || '改善要望・不具合を送る';
  const PLACEHOLDER = CFG.placeholder || '例：A4横で印刷したら左右が3mmずれる／◯◯の機能がほしい';

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
  ].join(''), LABEL);
  btn.id = 'nsf-bug-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', TITLE);

  const overlay = el('div', 'position:fixed;inset:0;z-index:960;background:rgba(15,15,15,.55);display:none;align-items:center;justify-content:center;padding:16px;');
  overlay.id = 'nsf-bug-overlay';
  const card = el('div', [
    'background:#fff;border-radius:14px;padding:20px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.35);',
    'font-family:-apple-system,"Hiragino Sans",Meiryo,sans-serif;color:#1d1d1f;font-size:13px;line-height:1.7;max-height:90vh;overflow:auto;'
  ].join(''));
  card.innerHTML = [
    '<div style="font-size:15px;font-weight:700;margin-bottom:6px;">' + TITLE + '</div>',
    '<div style="font-size:12px;color:#6e6e73;margin-bottom:12px;">うまく動かない・こうしてほしい等、そのまま書いてください。写真も添付できます。ページ名は自動で添えます。</div>',
    '<textarea id="nsf-bug-msg" rows="5" maxlength="1000" placeholder="' + PLACEHOLDER.replace(/"/g, '&quot;') + '" style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;"></textarea>',
    '<div style="margin-top:10px;">',
    '  <label for="nsf-bug-photo" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1.5px dashed #c9a96e;border-radius:8px;background:#fbf7ef;color:#6f4e37;font-size:13px;cursor:pointer;font-family:inherit;">📷 写真を追加<span style="font-size:11px;color:#8a7362;">（最大' + MAX_PHOTOS + '枚）</span></label>',
    '  <input id="nsf-bug-photo" type="file" accept="image/*" multiple style="display:none;">',
    '  <div id="nsf-bug-thumbs" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>',
    '</div>',
    '<input id="nsf-bug-contact" type="text" maxlength="200" placeholder="返信先（メール等・任意）" style="width:100%;box-sizing:border-box;margin-top:10px;padding:9px 10px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:13px;font-family:inherit;">',
    '<div id="nsf-bug-status" style="min-height:20px;font-size:12px;color:#6e6e73;margin-top:8px;"></div>',
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">',
    '<button type="button" id="nsf-bug-cancel" style="padding:8px 14px;border:1px solid #d2d2d7;border-radius:8px;background:#fff;color:#1d1d1f;font-size:13px;cursor:pointer;font-family:inherit;">閉じる</button>',
    '<button type="button" id="nsf-bug-send" style="padding:8px 16px;border:none;border-radius:8px;background:#7A5540;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">送信する</button>',
    '</div>'
  ].join('');
  overlay.appendChild(card);

  // 選択した写真（圧縮後の dataURL を保持）
  let photos = []; // { name, dataUrl }

  function renderThumbs() {
    const wrap = document.getElementById('nsf-bug-thumbs');
    if (!wrap) return;
    wrap.innerHTML = '';
    photos.forEach((p, i) => {
      const box = el('div', 'position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid #e0d2c2;');
      const img = el('img', 'width:100%;height:100%;object-fit:cover;');
      img.src = p.dataUrl;
      const x = el('button', 'position:absolute;top:2px;right:2px;width:18px;height:18px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:12px;line-height:1;cursor:pointer;padding:0;', '×');
      x.type = 'button';
      x.addEventListener('click', () => { photos.splice(i, 1); renderThumbs(); });
      box.appendChild(img); box.appendChild(x); wrap.appendChild(box);
    });
  }

  // 画像を長辺1280pxのJPEGに圧縮して dataURL を返す
  function compress(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1280;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (Math.max(w, h) > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL('image/jpeg', 0.8)); }
        catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
  }

  async function onPickPhotos(e) {
    const status = document.getElementById('nsf-bug-status');
    const files = [...(e.target.files || [])];
    e.target.value = '';
    for (const f of files) {
      if (photos.length >= MAX_PHOTOS) { if (status) status.textContent = '写真は' + MAX_PHOTOS + '枚までです。'; break; }
      if (!/^image\//.test(f.type)) continue;
      try {
        const dataUrl = await compress(f);
        // 圧縮後がなお大きすぎる（~2.5MB base64）ときは弾く
        if (dataUrl.length > 3.2 * 1024 * 1024) { if (status) status.textContent = 'この写真は大きすぎるため添付できませんでした。'; continue; }
        photos.push({ name: (f.name || 'photo.jpg'), dataUrl });
        renderThumbs();
      } catch (err) { if (status) status.textContent = '写真の処理に失敗しました。'; }
    }
  }

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
    status.style.color = '#6e6e73';
    status.textContent = photos.length ? '写真を添えて送信しています…' : '送信しています…';
    const rid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
      let data;
      if (photos.length) {
        // 写真あり: JSON を text/plain で POST（プリフライトを避ける）。fetch は 302 を追って結果JSONを読む
        const body = {
          action: 'report', page: pageKey(), title: document.title || '', msg: msg, contact: contact,
          ua: navigator.userAgent.slice(0, 300), rid: rid,
          images: photos.map(p => ({ fileName: p.name, base64: p.dataUrl }))
        };
        const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        const txt = await res.text();
        if (!txt || txt.trim().charAt(0) === '<') throw new Error('サーバーが混み合っています');
        data = JSON.parse(txt);
      } else {
        const url = GAS_URL + '?action=report'
          + '&page=' + encodeURIComponent(pageKey())
          + '&title=' + encodeURIComponent(document.title || '')
          + '&msg=' + encodeURIComponent(msg)
          + '&contact=' + encodeURIComponent(contact)
          + '&ua=' + encodeURIComponent(navigator.userAgent.slice(0, 300))
          + '&rid=' + encodeURIComponent(rid);
        const res = await fetch(url, { cache: 'no-store' });
        const txt = await res.text();
        if (!txt || txt.trim().charAt(0) === '<') throw new Error('サーバーが混み合っています');
        data = JSON.parse(txt);
      }
      if (!data.ok) throw new Error(data.error || '送信に失敗しました');
      status.style.color = '#29613d';
      status.textContent = '送りました。ありがとうございます。';
      document.getElementById('nsf-bug-msg').value = '';
      photos = []; renderThumbs();
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
    document.getElementById('nsf-bug-photo').addEventListener('change', onPickPhotos);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    // 印刷には出さない
    const st = document.createElement('style');
    st.textContent = '@media print { #nsf-bug-btn, #nsf-bug-overlay { display: none !important; } }';
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
