/**
 * スマホと同期 ── PC とスマホのあいだで保管庫を同じにする（事業主専用。同期の鍵を設定した端末だけで動く）。
 *
 * 仕組み
 *   - 合言葉で暗号化した保管庫（enc）を中継 Worker（password-note-sync）に置く。Worker も KV も暗号文しか持たない。
 *   - 開いたとき: 中継の rev を見る → 変わっていれば取得して合流 → 端末に保存 → 中継と違いが残れば送る。
 *   - 保存したとき: 3秒まとめて送る。baseRev が古ければ 409 で相手の最新が返るので、合流してから再送する。
 *   - 合流の規則: 項目ごとに更新日時（updatedAt）の新しい方を採用。削除は墓標（vault.deleted[id]=日時）で伝える。
 *     予備コピー読込・自動復元のような「全体の置き換え」は resetAt が新しい側をそのまま採用する。
 *
 * 守り
 *   - 鍵が未設定なら一切通信しない。鍵は端末内（IndexedDB の syncConfig）。保管庫の中には入れない（保管庫を開く前に要るため）。
 *   - 中継の内容を合言葉で開けないときは送らない（別の合言葉で上書きして、相手の端末で開けなくなるのを防ぐ）。
 *   - 通信の失敗は保存・ログインを止めない。結果は設定画面の「最後の同期」で見える。
 *   - 送るのは暗号文・端末の種類だけ。合言葉・平文は一切送らない。
 *
 * 鍵の入れ方
 *   - PC: 設定画面「スマホと同期」に鍵を貼り付けて「設定する」。
 *   - スマホ: PC の設定画面に出る QR を読む（#sync=鍵 付きでこのページを開く）か、同じ欄に貼り付ける。
 *     ⛔ ホーム画面に追加したアプリと Safari は別の保存領域。使う側の画面に鍵を入れること。
 */
const Sync = (() => {
  const PROD_BASE = 'https://password-note-sync.bouncy-xenoposeidon.workers.dev';
  const CFG_KEY = 'syncConfig';     // { key, savedAt }
  const STATE_KEY = 'syncState';    // { rev, dirty, at, ok, msg }
  const UI_FLAG = 'pwn_sync_ui';    // 設定欄を出す印（#sync-setup で開いた端末）
  const PUSH_DEBOUNCE_MS = 3000;
  const PULL_GAP_MS = 60 * 1000;    // 画面に戻ったときの取得は1分に1回まで
  const TOMBSTONE_KEEP_MS = 180 * 24 * 60 * 60 * 1000;

  let cfg = null;
  let state = { rev: 0, dirty: false, at: 0, ok: null, msg: '' };
  let ready = null;         // ハッシュで受け取った鍵の保存（init が待つ）
  let initDone = null;      // 設定の読み込み完了（onOpen・notifyChange が待つ）
  let pushTimer = null;
  let busy = null;          // 進行中の同期（Promise）。重ねて走らせない
  let applying = false;     // 中継の内容を端末に書いている間は、保存通知で送り返さない
  let lastPullAt = 0;
  let pendingToast = '';
  let changeSeq = 0;        // 保存通知の通し番号。取得のあいだに新しい保存が無ければ、まとめ待ちの送信を取り消せる

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 使えなくても動く */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };

  // 接続先。手元の検証（localhost / 127.0.0.1）でだけ、localStorage の pwn_sync_base で差し替えられる
  // （本番の鍵・本番の置き場を検証に使わないため）。公開サイトでは常に本番の中継。
  const BASE = (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && ls.get('pwn_sync_base')) || PROD_BASE;

  // ---- URL のハッシュで鍵・設定欄の表示を受け取る（ハッシュはサーバーに送られない。読んだら即消す） ----
  // 起動時に加えて hashchange でも拾う。初めての端末では sw.js が有効化の直後に clients.navigate(作成時のURL) で
  // 読み直すが、違いがハッシュだけだと「同じ文書内の移動」になりスクリプトは再実行されない。
  // そのままだと鍵がアドレス欄・履歴に残るため、hashchange で受け取り直して消す（2026-10-07 Playwright で再現）。
  function takeHash() {
    try {
      const h = location.hash || '';
      let m;
      if ((m = /^#sync=([A-Za-z0-9]{20,128})$/.exec(h))) {
        const k = m[1];
        if (!cfg || cfg.key !== k) {
          pendingToast = '同期の鍵を受け取りました。保管庫を開くと同期が始まります。';
          ready = DB.set(CFG_KEY, { key: k, savedAt: new Date().toISOString() }).then(() => { cfg = { key: k, savedAt: new Date().toISOString() }; }).catch(() => {});
        }
        ls.set(UI_FLAG, '1');
        history.replaceState(null, '', location.pathname + location.search);
      } else if (h === '#sync-setup') {
        ls.set(UI_FLAG, '1');
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) { /* ハッシュが読めなくても動く */ }
  }
  takeHash();
  window.addEventListener('hashchange', takeHash);

  async function load() {
    try {
      cfg = (await DB.get(CFG_KEY)) || null;
      state = { rev: 0, dirty: false, at: 0, ok: null, msg: '', ...((await DB.get(STATE_KEY)) || {}) };
    } catch (e) { cfg = null; }
  }
  async function saveState(patch) {
    state = { ...state, ...patch };
    try { await DB.set(STATE_KEY, state); } catch (e) { /* 保存できなくても今回は動く */ }
  }

  function key() { return (cfg && cfg.key) || ''; }
  function isConfigured() { return !!key(); }
  function isMobile() { return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent); }
  function deviceName() {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'PC';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
    return (os + ' ' + br).trim();
  }

  // ---- 中継との通信（例外は投げない。失敗は null） ----
  async function api(method, path, body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const headers = { 'x-sync-key': key() };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
      let json = null;
      try { json = await res.json(); } catch (e) { json = null; }
      return { status: res.status, ok: res.ok, json };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 合流（純粋関数。テストしやすいよう外へも出す） ----
  function canon(v) {
    const entries = [...(v.entries || [])].map(e => ({ ...e })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const deleted = Object.fromEntries(Object.entries(v.deleted || {}).sort());
    return JSON.stringify({ entries, deleted, guard: v.guard || null, resetAt: v.resetAt || '' });
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  // a=この端末, b=中継。戻り値は合流後の保管庫（新しいオブジェクト）
  function merge(a, b) {
    const ra = a.resetAt || '';
    const rb = b.resetAt || '';
    if (ra !== rb) return clone(ra > rb ? a : b);

    // 墓標: 同じ id は新しい日時を採る
    const del = {};
    for (const [id, t] of [...Object.entries(b.deleted || {}), ...Object.entries(a.deleted || {})]) {
      if (!del[id] || String(t) > String(del[id])) del[id] = t;
    }
    // 項目: 同じ id は updatedAt の新しい方（同じならこの端末）。片方にしか無ければそのまま
    const map = new Map();
    for (const e of b.entries || []) map.set(e.id, e);
    for (const e of a.entries || []) {
      const o = map.get(e.id);
      if (!o || String(e.updatedAt || '') >= String(o.updatedAt || '')) map.set(e.id, e);
    }
    // 墓標より新しい更新があれば生き返らせる（墓標は消す）。古ければ消す
    const entries = [];
    const seen = new Set();
    const order = [...(a.entries || []).map(e => e.id), ...(b.entries || []).map(e => e.id)];
    for (const id of order) {
      if (seen.has(id)) continue;
      seen.add(id);
      const e = map.get(id);
      if (!e) continue;
      const t = del[id];
      if (t && String(t) > String(e.updatedAt || '')) continue;
      if (t) delete del[id];
      entries.push(e);
    }
    const out = { ...clone(a), entries: clone(entries), deleted: del };
    const lmA = a.lastModified || '';
    const lmB = b.lastModified || '';
    out.lastModified = lmA > lmB ? lmA : lmB;
    const ga = a.guard && a.guard.key ? a.guard : null;
    const gb = b.guard && b.guard.key ? b.guard : null;
    if (ga && gb) out.guard = String(gb.savedAt || '') > String(ga.savedAt || '') ? clone(gb) : clone(ga);
    else if (ga || gb) out.guard = clone(ga || gb);
    else delete out.guard;
    return out;
  }

  function pruneTombstones(v) {
    if (!v.deleted) return;
    const limit = Date.now() - TOMBSTONE_KEEP_MS;
    for (const [id, t] of Object.entries(v.deleted)) {
      const ms = Date.parse(t);
      if (Number.isFinite(ms) && ms < limit) delete v.deleted[id];
    }
    if (Object.keys(v.deleted).length === 0) delete v.deleted;
  }

  // ---- 端末側の保管庫を中継の内容で更新する（保存通知で送り返さない） ----
  async function applyLocal(merged) {
    applying = true;
    try {
      pruneTombstones(merged);
      vault = merged;
      await saveVaultLocal();
      if (typeof renderList === 'function') renderList();
    } finally {
      applying = false;
    }
  }

  async function decryptRemote(enc) {
    try {
      const v = await CryptoManager.decrypt(enc, masterPassword);
      if (!v || !Array.isArray(v.entries)) return null;
      return v;
    } catch (e) {
      return null;
    }
  }

  function countDiff(before, after) {
    const b = new Map((before.entries || []).map(e => [e.id, e.updatedAt || '']));
    let n = 0;
    for (const e of after.entries || []) { if (!b.has(e.id) || b.get(e.id) !== (e.updatedAt || '')) n++; }
    n += (before.entries || []).filter(e => !(after.entries || []).some(x => x.id === e.id)).length;
    return n;
  }

  // 端末の内容が中継と同じになったとき、まとめ待ちの送信を取り消す（同じ内容を送り直して rev を無駄に進めない）。
  // 取得のあいだに新しい保存があった（通し番号が進んだ）ときは取り消さない。
  async function settle(seqAtStart) {
    if (changeSeq !== seqAtStart) return;
    clearTimeout(pushTimer);
    pushTimer = null;
    if (state.dirty) await saveState({ dirty: false });
  }

  // ---- 取得して合流 ----
  async function pullInner(reason) {
    if (!isConfigured() || !masterPassword) return;
    const seq = changeSeq;
    const meta = await api('GET', '/vault/meta');
    if (!meta) { await saveState({ at: Date.now(), ok: false, msg: '中継につながりません（ネット接続を確認）' }); return; }
    if (meta.status === 401) { await saveState({ at: Date.now(), ok: false, msg: '鍵が違います。設定し直してください' }); return; }
    if (!meta.ok || !meta.json) { await saveState({ at: Date.now(), ok: false, msg: '中継の応答が不正です（' + meta.status + '）' }); return; }

    const remoteRev = Number(meta.json.rev) || 0;
    if (remoteRev === 0) {
      // 中継はまだ空。この端末に中身があれば置く
      if ((vault.entries || []).length > 0 || vault.resetAt) await pushInner(0);
      else await saveState({ rev: 0, at: Date.now(), ok: true, msg: '中継はまだ空です' });
      return;
    }
    if (remoteRev === state.rev) {
      if (state.dirty) await pushInner(state.rev);
      else await saveState({ at: Date.now(), ok: true, msg: '最新です（' + reason + '）' });
      return;
    }

    const got = await api('GET', '/vault');
    if (!got || !got.ok || !got.json || !got.json.enc) { await saveState({ at: Date.now(), ok: false, msg: '中継から取得できませんでした' }); return; }
    const remote = await decryptRemote(got.json.enc);
    if (!remote) {
      await saveState({ at: Date.now(), ok: false, msg: '中継の内容をこの合言葉では開けません。PC とスマホで同じ合言葉を使ってください（送信は止めています）' });
      return;
    }
    const merged = merge(vault, remote);
    const changedLocal = canon(merged) !== canon(vault);
    const changedRemote = canon(merged) !== canon(remote);
    let n = 0;
    if (changedLocal) { n = countDiff(vault, merged); await applyLocal(merged); }
    await saveState({ rev: Number(got.json.rev) || remoteRev, dirty: changedRemote });
    if (changedRemote) await pushInner(state.rev);
    else { await settle(seq); await saveState({ at: Date.now(), ok: true, msg: (n ? n + '件を取り込みました' : '最新です') + '（' + (got.json.device || '相手の端末') + ' の内容と合流）' }); }
    if (n && typeof toast === 'function') toast('他の端末の変更を取り込みました（' + n + '件）', 'success');
  }

  // ---- 送る（409 なら合流して再送・最大3回） ----
  async function pushInner(baseRev) {
    if (!isConfigured()) return;
    const seq = changeSeq;
    let base = Number(baseRev) || 0;
    for (let i = 0; i < 3; i++) {
      const enc = await DB.get('vault');
      if (!enc) return;
      const res = await api('PUT', '/vault', { enc, baseRev: base, device: deviceName() });
      if (!res) { await saveState({ dirty: true, at: Date.now(), ok: false, msg: '送れませんでした（次に開いたとき・保存したときに再送）' }); return; }
      if (res.status === 401) { await saveState({ dirty: true, at: Date.now(), ok: false, msg: '鍵が違います。設定し直してください' }); return; }
      if (res.status === 413) { await saveState({ dirty: true, at: Date.now(), ok: false, msg: '保管庫が大きすぎて送れません' }); return; }
      if (res.ok && res.json) { await saveState({ rev: Number(res.json.rev) || 0, dirty: false, at: Date.now(), ok: true, msg: '送りました（rev ' + res.json.rev + '）' }); return; }
      if (res.status === 409 && res.json) {
        if (!masterPassword) { await saveState({ dirty: true, at: Date.now(), ok: false, msg: '相手の変更があるため、次に開いたときに合流します' }); return; }
        const remote = res.json.enc ? await decryptRemote(res.json.enc) : null;
        if (!remote) { await saveState({ dirty: true, at: Date.now(), ok: false, msg: '中継の内容をこの合言葉では開けません（送信は止めています）' }); return; }
        const merged = merge(vault, remote);
        if (canon(merged) !== canon(vault)) { const n = countDiff(vault, merged); await applyLocal(merged); if (n && typeof toast === 'function') toast('他の端末の変更を取り込みました（' + n + '件）', 'success'); }
        base = Number(res.json.rev) || 0;
        await saveState({ rev: base });
        if (canon(merged) === canon(remote)) { await settle(seq); await saveState({ dirty: false, at: Date.now(), ok: true, msg: '最新です（相手の内容と一致）' }); return; }
        continue;
      }
      await saveState({ dirty: true, at: Date.now(), ok: false, msg: '送れませんでした（' + res.status + '）' });
      return;
    }
    await saveState({ dirty: true, at: Date.now(), ok: false, msg: '何度も食い違ったため、次回に持ち越します' });
  }

  // 同期を1本ずつ走らせる
  function run(fn) {
    const job = (busy || Promise.resolve()).then(fn).catch(() => {}).then(() => { if (busy === job) busy = null; render(); });
    busy = job;
    return job;
  }

  // ---- app.js から呼ぶ入口 ----
  function init() {
    initDone = (async () => {
      await (ready || Promise.resolve());
      await load();
      window.addEventListener('online', () => { if (isConfigured() && masterPassword && state.dirty) run(() => pushInner(state.rev)); });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || !isConfigured() || !masterPassword) return;
        if (Date.now() - lastPullAt < PULL_GAP_MS) return;
        lastPullAt = Date.now();
        run(() => pullInner('画面に戻った'));
      });
    })().catch(() => {});
    return initDone;
  }

  function onOpen() {
    if (pendingToast && typeof toast === 'function') { toast(pendingToast, 'info'); pendingToast = ''; }
    run(async () => {
      await (initDone || Promise.resolve());
      if (!isConfigured()) return;
      lastPullAt = Date.now();
      await pullInner('開いたとき');
    });
  }

  /** saveVaultLocal() から呼ぶ。中継の内容を書いている最中は送り返さない */
  function notifyChange() {
    if (applying) return;
    changeSeq++;
    (initDone || Promise.resolve()).then(() => {
      if (!isConfigured()) return;
      if (!state.dirty) saveState({ dirty: true }); // 送る前に閉じても、次に開いたときに送れるよう残す
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { pushTimer = null; run(() => pushInner(state.rev)); }, PUSH_DEBOUNCE_MS);
    });
  }

  /** 閉じる直前。まとめ待ちの送信があれば今すぐ送る（合言葉が消えても暗号文はそのまま送れる） */
  function flush() {
    if (!isConfigured() || !pushTimer) return;
    clearTimeout(pushTimer);
    pushTimer = null;
    run(() => pushInner(state.rev));
  }

  /** 削除した id に墓標を立てる（同期が未設定でも害はない。相手の端末で消すために要る） */
  function noteDeleted(ids) {
    vault.deleted = vault.deleted || {};
    const t = now();
    for (const id of ids) vault.deleted[id] = t;
  }

  /** 予備コピー読込・自動復元のあと。同期中なら「全体の置き換え」として相手の端末にも反映する */
  async function noteReplaced() {
    if (!isConfigured()) return;
    vault.resetAt = now();
    await saveVaultLocal();
  }

  // ---- 設定（鍵の登録・解除） ----
  async function saveKey(k) {
    const v = String(k || '').trim();
    if (!/^[A-Za-z0-9]{20,128}$/.test(v)) return { ok: false, msg: '鍵の形式が違います（英数字20文字以上）。' };
    const before = cfg;
    cfg = { key: v, savedAt: now() };
    const res = await api('GET', '/vault/meta');
    if (!res) { cfg = before; return { ok: false, msg: '中継につながりませんでした。ネット接続を確認してください。' }; }
    if (res.status === 401) { cfg = before; return { ok: false, msg: '鍵が違います。' }; }
    if (!res.ok) { cfg = before; return { ok: false, msg: '設定できませんでした（' + res.status + '）。' }; }
    await DB.set(CFG_KEY, cfg);
    await saveState({ rev: 0, dirty: false, at: 0, ok: null, msg: '' });
    ls.set(UI_FLAG, '1');
    if (masterPassword) run(() => pullInner('設定した'));
    return { ok: true, msg: '設定しました。同期を始めます。' };
  }

  async function removeKey() {
    cfg = null;
    try { await DB.del(CFG_KEY); await DB.del(STATE_KEY); } catch (e) { /* */ }
    state = { rev: 0, dirty: false, at: 0, ok: null, msg: '' };
    clearTimeout(pushTimer);
    pushTimer = null;
  }

  function lastText() {
    if (!state.at) return '最後の同期: まだありません';
    const d = new Date(state.at);
    const p = n => String(n).padStart(2, '0');
    return '最後の同期: ' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) +
      '（' + (state.ok ? '成功' : '失敗') + '・' + (state.msg || '') + '）' + (state.dirty ? '　※未送信の変更あり' : '');
  }

  // ---- 設定画面の欄 ----
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function uiVisible() { return isConfigured() || ls.get(UI_FLAG) === '1'; }

  // QR は PC で鍵をスマホに渡すときだけ使う。ライブラリは押したときに初めて読み込む（普段は何も読み込まない）
  function loadQrLib() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = () => res();
      s.onerror = () => rej(new Error('QR ライブラリを読み込めませんでした'));
      document.head.appendChild(s);
    });
  }

  function render(firstMsg) {
    const body = document.querySelector('#settings-modal .modal-body');
    if (!body) return;
    const modal = document.getElementById('settings-modal');
    if (!modal || modal.style.display === 'none') return;
    const old = document.getElementById('sync-section');
    if (old) old.remove();
    if (!uiVisible()) return;

    const sec = el('div', { id: 'sync-section', style: 'border-top:1px solid var(--border,#444);padding-top:12px;display:flex;flex-direction:column;gap:8px' });
    sec.appendChild(el('strong', null, 'スマホと同期'));
    const note = el('p', { style: 'font-size:0.8rem;color:var(--text-muted);margin:0' });
    sec.appendChild(note);
    const msg = el('p', { id: 'sync-msg', style: 'font-size:0.85rem;margin:0' }, firstMsg || '');

    if (!isConfigured()) {
      note.textContent = 'PC とスマホで同じ内容にする機能です。鍵を持っている人だけが設定できます。中継には合言葉で暗号化した内容だけを置き、合言葉は送りません。両方の端末で同じ合言葉を使ってください。';
      const input = el('input', { type: 'password', id: 'sync-key-input', placeholder: '同期の鍵を貼り付け', autocomplete: 'off' });
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
      note.textContent = 'この端末で同期が有効です。開いたとき・保存したときに中継と合わせます。' +
        (isMobile() ? '' : ' スマホに入れるには、下の QR をスマホのカメラで読むか、鍵をコピーしてスマホの設定画面に貼り付けます。');
      sec.appendChild(el('p', { id: 'sync-last', style: 'font-size:0.8rem;margin:0' }, lastText()));

      const row = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' });
      const nowBtn = el('button', { type: 'button', class: 'btn-add-history' }, '今すぐ同期');
      nowBtn.addEventListener('click', () => {
        nowBtn.disabled = true;
        run(() => pullInner('手動')).then(() => { nowBtn.disabled = false; });
      });
      row.appendChild(nowBtn);

      if (!isMobile()) {
        const copyBtn = el('button', { type: 'button', class: 'btn-add-history' }, '鍵をコピー');
        copyBtn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(key()); msg.textContent = '鍵をコピーしました。スマホの設定画面「スマホと同期」に貼り付けてください。'; }
          catch (e) { msg.textContent = 'コピーできませんでした。'; }
        });
        const qrBtn = el('button', { type: 'button', class: 'btn-add-history' }, 'スマホ用の QR を表示');
        const qrBox = el('div', { id: 'sync-qr', style: 'display:none;background:#fff;padding:12px;border-radius:8px;width:max-content;max-width:100%' });
        qrBtn.addEventListener('click', async () => {
          if (qrBox.style.display !== 'none') { qrBox.style.display = 'none'; qrBox.innerHTML = ''; qrBtn.textContent = 'スマホ用の QR を表示'; return; }
          qrBtn.disabled = true;
          try {
            await loadQrLib();
            qrBox.innerHTML = '';
            new window.QRCode(qrBox, { text: location.origin + location.pathname + '#sync=' + key(), width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M });
            qrBox.style.display = 'block';
            qrBtn.textContent = 'QR を隠す';
            msg.textContent = 'スマホのカメラで読むと、このページが鍵付きで開きます。開いた側（Safari かホーム画面のアプリ）に鍵が入ります。読み終えたら QR を隠してください。';
          } catch (e) {
            msg.textContent = e && e.message ? e.message : 'QR を表示できませんでした。';
          }
          qrBtn.disabled = false;
        });
        row.append(copyBtn, qrBtn);
        sec.append(row, qrBox);
      } else {
        sec.append(row);
      }

      const rm = el('button', { type: 'button', class: 'btn-add-history', id: 'sync-remove-btn' }, 'この端末の同期をやめる');
      rm.addEventListener('click', async () => {
        if (!rm.dataset.armed) {
          rm.dataset.armed = '1';
          rm.textContent = 'もう一度押すと、この端末の同期をやめます（中継と他の端末の内容は残ります）';
          setTimeout(() => { delete rm.dataset.armed; rm.textContent = 'この端末の同期をやめる'; }, 8000);
          return;
        }
        await removeKey();
        render();
      });
      sec.append(msg, rm);
    }
    body.appendChild(sec);
  }

  return { init, onOpen, notifyChange, flush, noteDeleted, noteReplaced, render, isConfigured, merge, canon };
})();
