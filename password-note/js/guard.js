/**
 * 見守り（引き継ぎ）── 事業主専用の機能。見守りの鍵を設定した端末だけで動く。
 *
 * 何をするか
 *   - ログイン・自動ログイン・保存・ログイン失敗を、見張り Worker（password-note-guard）へ知らせる。
 *     Worker は一定期間ログインが無いと、本人へ警告し、最後に家族へ「金庫に紙がある」の一言を送る。
 *   - 設定画面に「家族へ引き継ぎのメールを送る」手動ボタン（2段押し）を出す。
 *
 * 守り
 *   - 見守りの鍵が未設定なら、一切通信しない（鍵を入れていない人・端末には影響しない）。
 *   - 送るのは「種類」だけ。合言葉・登録内容・画像は一切送らない。
 *   - 通信の失敗はログイン・保存を止めない（黙って捨てる）。結果は設定画面の「最後の送信」で見える。
 *   - 鍵は保管庫（vault.guard.key）の中に入れる＝合言葉で暗号化される。端末に平文では残さない。
 *   - localStorage に置くのは「鍵を設定済み」の印と、最後の送信結果（種類・時刻・成否）だけ。
 *     ログイン失敗は鍵が無い状態（保管庫を開く前）で送るため、この印があるときだけ送る。
 */
const Guard = (() => {
  const BASE = 'https://password-note-guard.bouncy-xenoposeidon.workers.dev';
  const FLAG = 'pwn_guard_on';
  const LAST = 'pwn_guard_last';
  const SAVE_GAP_MS = 5 * 60 * 1000; // 保存の通知は5分に1回まで
  let lastSave = 0;
  let armTimer = null;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 使えなくても動く */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };

  function key() {
    try { return (typeof vault !== 'undefined' && vault && vault.guard && vault.guard.key) || ''; } catch (e) { return ''; }
  }

  async function post(path, body, withKey) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (withKey) headers['x-guard-key'] = key();
      return await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true, signal: ctl.signal });
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function record(type, res) {
    ls.set(LAST, JSON.stringify({ t: Date.now(), type, ok: !!(res && res.ok), status: res ? res.status : 0 }));
  }

  /** ログイン('login')・自動ログイン('auto')・保存('save')・AI利用('ai')を知らせる */
  function ping(type) {
    if (!key()) return;
    if (type === 'save') {
      const t = Date.now();
      if (t - lastSave < SAVE_GAP_MS) return;
      lastSave = t;
    }
    post('/ping', { type }, true).then(res => record(type, res));
  }

  /** ログイン失敗。保管庫を開く前なので鍵は無い。設定済みの端末の印がある時だけ送る */
  function pingFail() {
    if (ls.get(FLAG) !== '1') return;
    post('/ping', { type: 'login_fail' }, false).then(res => record('login_fail', res));
  }

  async function saveKey(k) {
    const v = String(k || '').trim();
    if (!/^[A-Za-z0-9]{20,128}$/.test(v)) return { ok: false, msg: '鍵の形式が違います（英数字20文字以上）。' };
    const before = vault.guard;
    vault.guard = { key: v, savedAt: now() };
    const res = await post('/ping', { type: 'login' }, true); // 接続テストを兼ねる（本人宛てにログインの通知が1通届く）
    record('login', res);
    if (!res) { vault.guard = before; return { ok: false, msg: '見守りの Worker につながりませんでした。ネット接続を確認してください。' }; }
    if (res.status === 401) { vault.guard = before; return { ok: false, msg: '鍵が違います。' }; }
    if (!res.ok) { vault.guard = before; return { ok: false, msg: '設定できませんでした（' + res.status + '）。' }; }
    await saveVaultLocal();
    ls.set(FLAG, '1');
    return { ok: true, msg: '設定しました。接続テストとして、ログインの通知が1通届きます。' };
  }

  async function removeKey() {
    delete vault.guard;
    await saveVaultLocal();
    ls.del(FLAG);
    ls.del(LAST);
  }

  async function handover() {
    const res = await post('/handover', { confirm: 'SEND' }, true);
    record('handover', res);
    if (!res) return { ok: false, msg: '送れませんでした。ネット接続を確認してください。' };
    if (res.status === 401) return { ok: false, msg: '鍵が違います。' };
    if (!res.ok) return { ok: false, msg: '送れませんでした（' + res.status + '）。もう一度、少し待ってからお試しください。' };
    let j = {};
    try { j = await res.json(); } catch (e) { /* */ }
    return { ok: true, msg: j.already ? 'すでに送信済みです。' : '家族へ引き継ぎのメールを送りました。控えが自分宛てにも届きます。' };
  }

  function lastText() {
    let o = null;
    try { o = JSON.parse(ls.get(LAST) || 'null'); } catch (e) { /* */ }
    if (!o) return '最後の送信: まだありません';
    const d = new Date(o.t);
    const p = n => String(n).padStart(2, '0');
    return '最後の送信: ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) +
      '（' + o.type + '・' + (o.ok ? '成功' : '失敗 ' + (o.status || '通信不可')) + '）';
  }

  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // この画面は公開サイトで、ほかの人も同じコードを読み込む。見守りの欄は、設定済みの端末か、
  // 「#guard-setup」付きで開いた端末（事業主だけが知っている）にしか出さない。
  const UI_FLAG = 'pwn_guard_ui';
  try {
    if (location.hash === '#guard-setup') {
      ls.set(UI_FLAG, '1');
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) { /* ハッシュが読めなくても動く */ }

  function uiVisible() {
    return ls.get(FLAG) === '1' || ls.get(UI_FLAG) === '1' || !!key();
  }

  /** 設定画面の末尾に、見守りの欄を作る（開くたびに作り直す） */
  function render(firstMsg) {
    const body = document.querySelector('#settings-modal .modal-body');
    if (!body) return;
    const old = document.getElementById('guard-section');
    if (old) old.remove();
    clearTimeout(armTimer);
    if (!uiVisible()) return;

    const sec = el('div', { id: 'guard-section', style: 'border-top:1px solid var(--border,#444);padding-top:12px;display:flex;flex-direction:column;gap:8px' });
    sec.appendChild(el('strong', null, '見守り（引き継ぎ）'));
    const note = el('p', { style: 'font-size:0.8rem;color:var(--text-muted);margin:0' });
    sec.appendChild(note);
    const msg = el('p', { id: 'guard-msg', style: 'font-size:0.85rem;margin:0' }, firstMsg || '');

    if (!key()) {
      note.textContent = '一定期間ログインがないときに、家族へお知らせする機能です。鍵を持っている人だけが設定できます。通信するのは「種類」だけで、合言葉や登録内容は送りません。';
      const input = el('input', { type: 'password', id: 'guard-key-input', placeholder: '見守りの鍵を貼り付け', autocomplete: 'off' });
      const btn = el('button', { type: 'button', class: 'btn-add-history' }, '設定する');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const r = await saveKey(input.value);
        input.value = '';
        msg.textContent = r.msg;
        btn.disabled = false;
        if (r.ok) render(r.msg);
      });
      sec.append(input, btn, msg);
    } else {
      note.textContent = 'この端末で見守りが有効です。ログイン・保存・失敗を知らせています。一定期間ログインがないと、本人へ警告し、最後に家族へ連絡します。';
      sec.appendChild(el('p', { id: 'guard-last', style: 'font-size:0.8rem;margin:0' }, lastText()));

      const hb = el('button', { type: 'button', class: 'btn-add-history', id: 'guard-handover-btn' }, '家族へ引き継ぎのメールを送る');
      hb.addEventListener('click', async () => {
        if (!hb.dataset.armed) {
          hb.dataset.armed = '1';
          hb.textContent = 'もう一度押すと、今すぐ家族へ送ります';
          clearTimeout(armTimer);
          armTimer = setTimeout(() => { delete hb.dataset.armed; hb.textContent = '家族へ引き継ぎのメールを送る'; }, 8000);
          return;
        }
        clearTimeout(armTimer);
        hb.disabled = true;
        hb.textContent = '送っています…';
        const r = await handover();
        msg.textContent = r.msg;
        delete hb.dataset.armed;
        hb.disabled = false;
        hb.textContent = '家族へ引き継ぎのメールを送る';
        const last = document.getElementById('guard-last');
        if (last) last.textContent = lastText();
      });
      const rm = el('button', { type: 'button', class: 'btn-add-history', id: 'guard-remove-btn' }, 'この端末の見守りをやめる');
      rm.addEventListener('click', async () => {
        if (!rm.dataset.armed) {
          rm.dataset.armed = '1';
          rm.textContent = 'もう一度押すと、見守りをやめます';
          setTimeout(() => { delete rm.dataset.armed; rm.textContent = 'この端末の見守りをやめる'; }, 8000);
          return;
        }
        await removeKey();
        render();
      });
      sec.append(hb, msg, rm);
    }
    body.appendChild(sec);
  }

  return { ping, pingFail, render };
})();
