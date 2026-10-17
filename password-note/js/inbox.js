/**
 * 受け取り箱 ── 書き込み専用の入口（事業主専用。同期の鍵を設定した端末だけで動く）
 *
 * 何をするか
 *   Claude やスクリプトが「新しい秘密（サービス名・ID・パスワード・メモ）」を、金庫を読めないまま入れられる仕組みの、
 *   受け取り側。書き込む側は公開鍵で封をするだけで、箱も金庫も読めない。開けるのは、金庫の中の秘密鍵だけ。
 *   開いたとき（同期のあと）に箱を確認し、サービス名だけを見せて、あなたが「取り込む」を押すと金庫に入る。
 *
 * 仕組み
 *   - 鍵ペア（ECDH P-256）はこの端末で作り、秘密鍵は金庫（vault.inbox.keys）に入れる＝合言葉で暗号化され、同期・予備コピーに入る。
 *     公開鍵は中継 Worker に登録する（SYNC_KEY が要る）。書き込む側はそれを取って封をする。
 *   - 封筒: ECDH（封筒ごとの一時鍵）＋ HKDF-SHA256 ＋ AES-256-GCM。kid・一時公開鍵を HKDF の info と AAD に束縛する。
 *     平文は 512 バイトの倍数まで空白で埋める（暗号文の長さから値の長さを推測させない）。
 *     書き込み側（保全部\pn_inbox.py）と同じ仕様。仕様を変えるときは両方を直し、相互接続テストを通すこと。
 *   - 取り込みの順番: 開封 → 確認 → 金庫に追加 → 端末に保存 → 中継へ同期が成功 → 箱から削除。
 *     同期が失敗したら箱に残す。次回は seen（取り込み済み id）で二重登録を防ぐ。
 *
 * 守り
 *   - 値は画面に出さない（文字数だけ）。画面の文字はすべて textContent で入れる（封筒の中身を HTML として解釈しない）。
 *   - 自動で取り込まない。更新（既存のパスワードの差し替え）は最初は未チェック。
 *   - 開けない封筒は箱に残す（自動で消さない）。
 *   - 同期が成功していないときは、鍵を作らず箱も見ない。公開鍵を登録するのは、鍵を含む金庫を中継へ送れたあと。
 *   - Worker に登録されている公開鍵が自分の鍵でなければ警告する（公開鍵の差し替えの検知）。
 *   - 通信の失敗は保存・ログインを止めない。結果は設定画面の「受け取り箱」で見える。
 *
 * ⛔ 秘密鍵を金庫の外（localStorage・IndexedDB の平文）に置かない。
 * ⛔ この箱から取り込んだ値を、ログ・toast・画面に出さない。
 */
const Inbox = (() => {
  'use strict';

  const SALT = 'pn-inbox-v1';
  const PAD_BLOCK = 512;
  const SEEN_MAX = 300;
  const TYPES = ['website', 'app', 'service', 'other'];
  const te = new TextEncoder();
  const td = new TextDecoder();

  const st = { at: 0, ok: null, msg: '', pending: 0, unreadable: 0, pub: '', registeredKid: '' };
  let deferred = new Set();   // この画面を開いている間「あとで」にした封筒の id
  let mem = null;             // 予備コピーの復元で金庫が置き換わったとき、鍵を足し戻すための控え（メモリだけ）
  let dlg = null;             // 確認ダイアログ { el, timer }

  // ---- base64（バイナリ） ----
  function toB64(u8) {
    let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromB64(s) {
    const bin = atob(String(s));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function toB64Url(u8) { return toB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  // ---- 暗号 ----
  async function kidOf(rawPub) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', rawPub));
    return toB64Url(h.slice(0, 8));
  }

  /** 鍵ペアを作る。戻り値は金庫に入れる形 { kid, pub, priv(JWK), createdAt }。 */
  async function generateKeyPair() {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const j = await crypto.subtle.exportKey('jwk', kp.privateKey);
    return {
      kid: await kidOf(raw),
      pub: toB64(raw),
      priv: { kty: j.kty, crv: j.crv, x: j.x, y: j.y, d: j.d },
      createdAt: new Date().toISOString(),
    };
  }

  function headerOf(kid, epk) { return SALT + '|' + kid + '|' + epk; }

  async function deriveAes(sharedBits, kid, epk) {
    const ikm = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: te.encode(SALT), info: te.encode(headerOf(kid, epk)) },
      ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  function padJson(obj) {
    const s = JSON.stringify(obj);
    const n = te.encode(s).length;
    const target = Math.ceil((n + 1) / PAD_BLOCK) * PAD_BLOCK;
    return te.encode(s + ' '.repeat(target - n));
  }

  /** 封をする（アプリ本体では使わない。試験と、書き込み側の仕様の基準用）。 */
  async function seal(recipientPubB64, payload) {
    const raw = fromB64(recipientPubB64);
    const kid = await kidOf(raw);
    const peer = await crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const epk = toB64(new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey)));
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, eph.privateKey, 256);
    const key = await deriveAes(shared, kid, epk);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(headerOf(kid, epk)) }, key, padJson(payload)));
    return { v: 1, kid, epk, iv: toB64(iv), ct: toB64(ct) };
  }

  /** 封筒を開く。鍵が違う・改ざんされている・形が違うときは例外。 */
  async function open(env, keyRec) {
    if (!env || env.v !== 1) throw new Error('封筒の版が違います');
    const priv = await crypto.subtle.importKey('jwk', keyRec.priv, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const peer = await crypto.subtle.importKey('raw', fromB64(env.epk), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, priv, 256);
    const key = await deriveAes(shared, env.kid, env.epk);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv), additionalData: te.encode(headerOf(env.kid, env.epk)) }, key, fromB64(env.ct));
    return JSON.parse(td.decode(plain));
  }

  // ---- 中身の検査（封筒の中身も信用しない） ----
  function cleanStr(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
  }

  /** 検査して、取り込める形にそろえる。使えないときは null。 */
  function normalizePayload(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const title = cleanStr(p.title, 100).trim();
    if (!title) return null;
    if (!Array.isArray(p.history) || p.history.length < 1 || p.history.length > 30) return null;
    const history = [];
    for (const h of p.history) {
      if (!h || typeof h !== 'object') return null;
      const password = typeof h.password === 'string' ? h.password : '';
      if (password.length > 8000) return null;
      history.push({ username: cleanStr(h.username, 200), password, note: cleanStr(h.note, 500) });
    }
    if (!history.some(h => h.password || h.username)) return null;
    return {
      title,
      type: TYPES.includes(p.type) ? p.type : 'service',
      url: cleanStr(p.url, 300).trim(),
      owner: cleanStr(p.owner, 60),
      description: cleanStr(p.description, 2000),
      src: cleanStr(p.src, 30).trim() || '不明',
      ts: cleanStr(p.ts, 40),
      history,
    };
  }

  function urlInfo(u) {
    if (!u) return null;
    try {
      const x = new URL(u);
      return { host: x.host, secure: x.protocol === 'https:' };
    } catch (e) {
      return { host: String(u).slice(0, 40), secure: false };
    }
  }

  // ---- 金庫の中の鍵（vault.inbox） ----
  /** 2つの vault.inbox を合わせる（鍵は kid ごとの和集合・seen は和集合を最後の300件まで）。純粋関数。 */
  function mergeInbox(a, b) {
    if (!a && !b) return undefined;
    const keys = new Map();
    for (const k of [...((b && b.keys) || []), ...((a && a.keys) || [])]) {
      if (k && k.kid && !keys.has(k.kid)) keys.set(k.kid, k);
    }
    const seen = [];
    const s = new Set();
    for (const id of [...((b && b.seen) || []), ...((a && a.seen) || [])]) {
      if (typeof id === 'string' && !s.has(id)) { s.add(id); seen.push(id); }
    }
    return {
      keys: clone([...keys.values()].sort((x, y) => String(x.createdAt).localeCompare(String(y.createdAt)) || String(x.kid).localeCompare(String(y.kid)))),
      seen: seen.slice(-SEEN_MAX),
    };
  }

  /** 合流の比較用（順番に左右されない形）。鍵も取り込み済みも無ければ null。 */
  function canonInbox(v) {
    if (!v) return null;
    const keys = [...(v.keys || [])].map(k => ({ kid: k.kid, pub: k.pub, priv: k.priv, createdAt: k.createdAt }))
      .sort((x, y) => String(x.kid).localeCompare(String(y.kid)));
    const seen = [...(v.seen || [])].sort();
    if (!keys.length && !seen.length) return null;
    return { keys, seen };
  }

  function ib() {
    if (!vault.inbox || !Array.isArray(vault.inbox.keys)) vault.inbox = { keys: [], seen: [] };
    if (!Array.isArray(vault.inbox.seen)) vault.inbox.seen = [];
    return vault.inbox;
  }
  function keysNow() { return (vault && vault.inbox && Array.isArray(vault.inbox.keys)) ? vault.inbox.keys : []; }
  function activeKey() {
    const ks = keysNow();
    return ks.length ? ks.reduce((m, k) => (String(k.createdAt) >= String(m.createdAt) ? k : m)) : null;
  }

  /** ログアウト（合言葉が消えた）後は、メモリ上の控え（秘密鍵を含む）を捨てる */
  function wipeIfLocked() {
    if (mem && typeof masterPassword === 'string' && !masterPassword) mem = null;
  }
  const wipeTimer = setInterval(() => { try { wipeIfLocked(); } catch (e) { /* */ } }, 5000);
  if (wipeTimer && typeof wipeTimer.unref === 'function') wipeTimer.unref();   // Node の試験が終われなくならないように

  /** 予備コピーの復元などで金庫が置き換わったあと、控えておいた鍵を足し戻す（古い予備コピーに鍵が無くても失わない）。 */
  function restoreInto(v) {
    if (!mem || !v) return;
    const m = mergeInbox(v.inbox, mem);
    if (m) v.inbox = m;
  }

  // ---- 取り込みの判定・適用 ----
  function localToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** 既存の項目（サービス名が同じ）と照らして new / changed / same を返す */
  function classify(item) {
    const entry = (vault.entries || []).find(e => e.title === item.title) || null;
    if (!entry) return { status: 'new', entryId: null };
    const cur = typeof getLatestCreds === 'function' ? getLatestCreds(entry) : null;
    const last = item.history[item.history.length - 1];
    const same = !!cur && cur.password === last.password && (cur.username || '') === (last.username || '');
    return { status: same ? 'same' : 'changed', entryId: entry.id };
  }

  function provenance(item, today) { return '受け取り箱から（出所：' + item.src + '・' + today + '）'; }

  /** 1件を金庫に反映する（保存は呼び出し側）。同名のサービスは履歴に「パスワード変更」の行を足す。 */
  function applyOne(r, today) {
    const item = r.item;
    const prov = provenance(item, today);
    const entry = (vault.entries || []).find(e => e.title === item.title) || null;
    if (!entry) {
      vault.entries.unshift({
        id: uuid(), type: item.type, title: item.title, owner: item.owner, url: item.url,
        description: item.description ? item.description + '\n' + prov : prov,
        createdAt: now(), updatedAt: now(),
        history: item.history.map((h, i) => ({
          id: uuid(), date: today, type: i === 0 ? 'initial' : 'change',
          username: h.username, password: h.password, note: h.note,
        })),
      });
      return 'added';
    }
    const prev = typeof getLatestCreds === 'function' ? getLatestCreds(entry) : null;
    entry.history = entry.history || [];
    for (const h of item.history) {
      entry.history.push({
        id: uuid(), date: today, type: 'change',
        username: h.username || (prev && prev.username) || '', password: h.password,
        note: (h.note ? h.note + '／' : '') + prov,
      });
    }
    if (!entry.description) entry.description = prov;
    entry.updatedAt = now();
    return 'changed';
  }

  // ---- 中継との通信 ----
  async function drop(ids) {
    let n = 0;
    for (const id of ids) {
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(id))) continue;
      const r = await Sync.inboxApi('DELETE', '/inbox/' + encodeURIComponent(id));
      if (r && (r.ok || r.status === 404)) n++;
    }
    return n;
  }

  function enabled() {
    return typeof Sync !== 'undefined' && Sync.isConfigured() &&
      typeof masterPassword === 'string' && !!masterPassword && typeof vault === 'object' && !!vault;
  }

  async function ensureKey() {
    if (activeKey()) return;
    const k = await generateKeyPair();
    ib().keys.push(k);
    await saveVaultLocal();            // 保存すると同期のまとめ送信が予約される
    await Sync.flushNow();             // 鍵を含む金庫を、公開鍵の登録より先に中継へ送る
  }

  /** Worker に登録されている公開鍵を点検し、無ければ登録する（鍵を含む金庫を送れたあとだけ） */
  async function syncPubkey() {
    const act = activeKey();
    if (!act) return;
    const r = await Sync.inboxApi('GET', '/inbox/pubkey');
    if (!r) { st.pub = 'unknown'; return; }
    if (r.status === 404) {
      if (!Sync.status().clean) { st.pub = 'wait'; return; }
      const put = await Sync.inboxApi('PUT', '/inbox/pubkey', { pub: act.pub });
      st.pub = put && put.ok ? 'ok' : 'error';
      st.registeredKid = put && put.ok && put.json ? put.json.kid : '';
      return;
    }
    if (!r.ok || !r.json) { st.pub = 'unknown'; return; }
    st.registeredKid = r.json.kid;
    st.pub = keysNow().some(k => k.kid === r.json.kid) ? 'ok' : 'foreign';
  }

  /** 箱を見る。開封して、確認が要るものがあればダイアログを出す。opts.show=false なら出さない。戻り値は確認待ちの一覧。 */
  async function check(opts) {
    const show = !opts || opts.show !== false;
    const r = await Sync.inboxApi('GET', '/inbox');
    st.at = Date.now();
    if (!r) { st.ok = false; st.msg = '中継につながりません'; return []; }
    if (r.status === 401) { st.ok = false; st.msg = '同期の鍵が違います'; return []; }
    if (!r.ok || !r.json || !Array.isArray(r.json.items)) { st.ok = false; st.msg = '箱の応答が不正です（' + r.status + '）'; return []; }

    const seen = new Set((vault.inbox && vault.inbox.seen) || []);
    const ready = [];
    const cleanupSeen = [];
    const cleanupSame = [];
    let unreadable = 0;
    for (const it of r.json.items) {
      if (!it || typeof it.id !== 'string') continue;
      if (seen.has(it.id)) { cleanupSeen.push(it.id); continue; }
      const key = it.env && keysNow().find(k => k.kid === it.env.kid);
      if (!key) { unreadable++; continue; }
      let item = null;
      try { item = normalizePayload(await open(it.env, key)); } catch (e) { item = null; }
      if (!item) { unreadable++; continue; }
      const c = classify(item);
      if (c.status === 'same') { cleanupSame.push(it.id); continue; }   // 金庫にすでに同じ値がある
      ready.push({ id: it.id, item, status: c.status });
    }

    // 片付け: すでに同じ値が金庫にあるもの／取り込み済みで削除し損ねたもの（同期が済んでいるときだけ）
    if (cleanupSame.length) await drop(cleanupSame);
    if (cleanupSeen.length && Sync.status().clean) await drop(cleanupSeen);

    st.unreadable = unreadable;
    st.pending = ready.length;
    st.ok = true;
    st.msg = ready.length ? ready.length + '件が確認待ち' : '新しい受け取りはありません';
    if (unreadable) st.msg += '／開けない封筒 ' + unreadable + '件（箱に残しています）';

    const fresh = ready.filter(x => !deferred.has(x.id));
    if (show && fresh.length && !dlg) showDialog(fresh);
    refreshSection();
    return ready;
  }

  async function onSynced() {
    if (!enabled()) return;
    const s = Sync.status();
    if (!s.ok) return;                                  // 同期が成功していないときは何もしない
    try {
      mem = vault.inbox ? clone(vault.inbox) : mem;
      await ensureKey();
      mem = vault.inbox ? clone(vault.inbox) : mem;
      await syncPubkey();
      await check({ show: true });
    } catch (e) {
      st.ok = false;
      st.msg = '受け取り箱でエラー: ' + (e && e.message ? e.message : e);
    }
  }

  // ---- 取り込み・捨てる（同期の列に乗せて実行する） ----
  async function doImport(chosen, leftCount) {
    if (!enabled()) return;
    const today = localToday();
    let added = 0, changed = 0;
    for (const r of chosen) { if (applyOne(r, today) === 'added') added++; else changed++; }
    const box = ib();
    for (const r of chosen) if (!box.seen.includes(r.id)) box.seen.push(r.id);
    box.seen = box.seen.slice(-SEEN_MAX);
    try {
      await saveVaultLocal();
    } catch (e) {
      toast('取り込めませんでした: ' + (e && e.message ? e.message : e), 'error');
      return;
    }
    if (typeof renderList === 'function') renderList();
    const clean = await Sync.flushNow();
    let msg = '受け取り箱から取り込みました（新規 ' + added + '件・更新 ' + changed + '件）';
    if (clean) await drop(chosen.map(r => r.id));
    else msg += '。同期が終わったら箱を片付けます';
    if (leftCount) msg += '。未チェックの ' + leftCount + '件は箱に残しました';
    toast(msg, 'success');
    st.msg = '取り込みました';
    refreshSection();
  }

  async function doDiscard(rows) {
    const n = await drop(rows.map(r => r.id));
    toast('受け取り箱の ' + n + '件を捨てました', 'info');
    refreshSection();
  }

  async function rotateKey() {
    if (!enabled()) return;
    const k = await generateKeyPair();
    ib().keys.push(k);
    await saveVaultLocal();
    const clean = await Sync.flushNow();
    if (!clean) { toast('鍵を作りましたが、同期が終わっていないため公開鍵はまだ登録していません', 'info'); return; }
    const put = await Sync.inboxApi('PUT', '/inbox/pubkey', { pub: k.pub });
    if (put && put.ok) {
      mem = clone(vault.inbox);
      st.pub = 'ok';
      st.registeredKid = k.kid;
      toast('受け取り箱の鍵を作り直しました（書き込み側は pn_inbox.py pin --repin が必要です）', 'success');
    } else {
      st.pub = 'error';
      toast('公開鍵を登録できませんでした', 'error');
    }
    refreshSection();
  }

  // ---- 画面 ----
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function closeDialog(toLater, rows) {
    if (!dlg) return;
    clearInterval(dlg.timer);
    dlg.el.remove();
    dlg = null;
    if (toLater && rows) for (const r of rows) deferred.add(r.id);
  }

  function showDialog(rows) {
    const overlay = el('div', { id: 'inbox-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'inbox-modal-title',
      style: 'position:fixed;inset:0;z-index:201;display:flex;align-items:flex-start;justify-content:center;padding:1rem;overflow-y:auto;background:rgba(0,0,0,0.6)' });
    const card = el('div', { class: 'modal-card', style: 'max-width:640px' });
    const head = el('div', { class: 'modal-header' });
    head.appendChild(el('h2', { id: 'inbox-modal-title' }, '受け取り箱に ' + rows.length + '件 あります'));
    const x = el('button', { type: 'button', class: 'btn-icon', title: 'あとで' }, '×');
    head.appendChild(x);
    const body = el('div', { class: 'modal-body', style: 'gap:12px' });
    body.appendChild(el('p', { style: 'font-size:0.85rem;color:var(--text-muted);margin:0' },
      '新しく届いた内容です。値は伏せています。「取り込む」を押すと金庫に追加され、箱から消えます。心当たりのないものは、チェックを外すか「捨てる」を選んでください。'));
    const list = el('div', { class: 'env-rows' });
    const cbs = [];
    for (const r of rows) {
      const label = el('label', { class: 'env-row ' + (r.status === 'new' ? 'env-new' : 'env-changed') });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = r.status === 'new';       // 新規は最初からチェック。更新（差し替え）は最初は未チェック
      cbs.push(cb);
      const key = el('span', { class: 'env-key' }, r.item.title);
      key.appendChild(el('small', { style: 'display:block;font-weight:400;color:var(--text-muted)' },
        '出所：' + r.item.src + (r.item.ts ? '・' + r.item.ts.slice(0, 16).replace('T', ' ') : '')));
      const u = urlInfo(r.item.url);
      if (u) key.appendChild(el('small', { style: 'display:block;font-weight:400;color:' + (u.secure ? 'var(--text-muted)' : 'var(--warning)') },
        'URL：' + u.host + (u.secure ? '' : '　⚠ https ではありません')));
      if (r.status === 'changed') key.appendChild(el('small', { style: 'display:block;font-weight:400;color:var(--warning)' },
        '⚠ 既存のパスワードを差し替えます（古い値は履歴に残ります）'));
      const badge = el('span', { class: 'env-badge' }, r.status === 'new' ? '新規' : '更新');
      const last = r.item.history[r.item.history.length - 1];
      const val = el('span', { class: 'env-val' }, '●●●●（' + last.password.length + '文字）' + (r.item.history.length > 1 ? '×' + r.item.history.length + '行' : ''));
      label.append(cb, key, badge, val);
      list.appendChild(label);
    }
    body.appendChild(list);
    const foot = el('div', { class: 'modal-footer' });
    const later = el('button', { type: 'button', class: 'btn-cancel' }, 'あとで');
    const discard = el('button', { type: 'button', class: 'btn-cancel' }, '取り込まずに捨てる');
    const go = el('button', { type: 'button', class: 'btn-save' }, '取り込む');
    foot.append(later, discard, go);
    card.append(head, body, foot);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const upd = () => {
      const n = cbs.filter(c => c.checked).length;
      go.disabled = n === 0;
      go.textContent = n ? '取り込む（' + n + '件）' : '取り込む項目がありません';
    };
    cbs.forEach(c => c.addEventListener('change', upd));
    upd();
    const toLater = () => closeDialog(true, rows);
    later.addEventListener('click', toLater);
    x.addEventListener('click', toLater);
    go.addEventListener('click', () => {
      const chosen = rows.filter((r, i) => cbs[i].checked);
      const left = rows.filter((r, i) => !cbs[i].checked);
      closeDialog(false);
      for (const r of left) deferred.add(r.id);
      Sync.run(() => doImport(chosen, left.length));
    });
    discard.addEventListener('click', () => {
      if (!discard.dataset.armed) {
        discard.dataset.armed = '1';
        discard.textContent = 'もう一度押すと、この ' + rows.length + '件を箱から捨てます（取り消せません）';
        setTimeout(() => { if (discard.isConnected) { delete discard.dataset.armed; discard.textContent = '取り込まずに捨てる'; } }, 8000);
        return;
      }
      closeDialog(false);
      Sync.run(() => doDiscard(rows));
    });
    // ログアウト（合言葉が消えた）ら、開封済みの内容ごとダイアログを閉じる
    dlg = { el: overlay, timer: setInterval(() => { if (!masterPassword) closeDialog(false); }, 2000) };
  }

  function refreshSection() {
    try {
      const modal = document.getElementById('settings-modal');
      const body = document.querySelector('#settings-modal .modal-body');
      if (modal && body && modal.style.display !== 'none') renderSection(body);
    } catch (e) { /* 画面の更新に失敗しても本体は止めない */ }
  }

  /** 設定画面の欄（Sync.render の最後から呼ばれる） */
  function renderSection(body) {
    const old = document.getElementById('inbox-section');
    if (old) old.remove();
    if (typeof Sync === 'undefined' || !Sync.isConfigured()) return;   // 同期の鍵が無い端末には出さない
    const sec = el('div', { id: 'inbox-section', style: 'border-top:1px solid var(--border,#444);padding-top:12px;margin-top:12px' });
    sec.appendChild(el('strong', null, '受け取り箱'));
    const box = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:8px' });
    sec.appendChild(box);
    box.appendChild(el('p', { style: 'font-size:0.8rem;color:var(--text-muted);margin:0' },
      'Claude などが「書き込み専用」で入れた新しい秘密を、確認してから金庫に取り込む機能です。入れた側は箱も金庫も読めません。'));
    const act = activeKey();
    const pubText = {
      ok: '公開鍵：登録済み',
      wait: '公開鍵：同期が終わってから登録します',
      foreign: '⚠ 見覚えのない公開鍵が登録されています（指紋 ' + st.registeredKid + '）。「鍵を作り直す」で自分の鍵に戻せます',
      error: '⚠ 公開鍵を登録できませんでした',
      unknown: '公開鍵：確認できませんでした',
    }[st.pub] || '公開鍵：未確認';
    box.appendChild(el('p', { style: 'font-size:0.8rem;margin:0' }, '鍵の指紋：' + (act ? act.kid : 'まだありません') + '　／　' + pubText));
    const last = st.at ? new Date(st.at) : null;
    const p2 = n => String(n).padStart(2, '0');
    box.appendChild(el('p', { id: 'inbox-last', style: 'font-size:0.8rem;margin:0' },
      '最後の確認：' + (last ? p2(last.getHours()) + ':' + p2(last.getMinutes()) + '（' + (st.ok ? st.msg : '失敗・' + st.msg) + '）' : 'まだありません')));
    const row = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' });
    const chk = el('button', { type: 'button', class: 'btn-add-history', id: 'inbox-check-btn' }, '今すぐ確認');
    chk.addEventListener('click', () => {
      chk.disabled = true;
      deferred = new Set();             // 保留していたものも、もう一度ダイアログに出す
      Sync.run(async () => { try { await syncPubkey(); await check({ show: true }); } finally { refreshSection(); } });
    });
    row.appendChild(chk);
    const rot = el('button', { type: 'button', class: 'btn-add-history', id: 'inbox-rotate-btn' }, '鍵を作り直す');
    rot.addEventListener('click', () => {
      if (!rot.dataset.armed) {
        rot.dataset.armed = '1';
        rot.textContent = 'もう一度押すと、新しい鍵に作り直します（書き込み側の再登録が必要）';
        setTimeout(() => { if (rot.isConnected) { delete rot.dataset.armed; rot.textContent = '鍵を作り直す'; } }, 8000);
        return;
      }
      rot.disabled = true;
      Sync.run(() => rotateKey().finally(refreshSection));
    });
    row.appendChild(rot);
    box.appendChild(row);
    body.appendChild(sec);
  }

  const api = { generateKeyPair, seal, open, kidOf, normalizePayload, mergeInbox, canonInbox, restoreInto, onSynced, check, renderSection };
  // 試験用（アプリ本体からは使わない）
  api._test = { classify, applyOne, urlInfo, doImport, drop, ensureKey, syncPubkey, wipeIfLocked, hasMem: () => !!mem, state: () => ({ ...st }) };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Inbox;
