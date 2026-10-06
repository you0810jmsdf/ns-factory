let masterPassword = '';
let vault = { entries: [], lastModified: null };
let currentQuery = '';
let currentSort = 'updatedAt';
let editingId = null;
let selectedIds = new Set();

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function now() { return new Date().toISOString(); }

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function genPassword(len = 16) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length]).join('');
}

function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function backupFileName() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `password-note-backup-${y}${m}${day}-${hh}${mm}.json`;
}

async function saveVaultLocal() {
  vault.lastModified = now();
  const enc = await CryptoManager.encrypt(vault, masterPassword);
  await DB.set('vault', enc);
  await DB.pushSnapshot(enc);
  AutoBackup.notifyChange('change');
}

async function loadVaultLocal() {
  const enc = await DB.get('vault');
  if (!enc) return false;
  vault = await CryptoManager.decrypt(enc, masterPassword);
  return true;
}

async function syncToGist() {
  if (!GistManager.isConfigured()) return;
  try {
    toast('家族共有データを保存しています...', 'info');
    const enc = await CryptoManager.encrypt(vault, masterPassword);
    await GistManager.save(enc);
    toast('家族共有データを保存しました', 'success');
  } catch (e) {
    toast('家族共有の保存に失敗しました: ' + e.message, 'error');
  }
}

async function loadFromGist() {
  if (!GistManager.isConfigured()) {
    toast('家族共有設定が未設定です', 'info');
    return;
  }
  try {
    toast('家族共有データを読み込んでいます...', 'info');
    const enc = await GistManager.load();
    if (!enc) { toast('共有先にデータがありません', 'info'); return; }
    const loaded = await CryptoManager.decrypt(enc, masterPassword);
    if (!vault.lastModified || new Date(loaded.lastModified) > new Date(vault.lastModified)) {
      vault = loaded;
      await DB.set('vault', enc);
      renderList();
      toast('最新の共有データを読み込みました', 'success');
    } else {
      toast('この端末のデータが最新です', 'info');
    }
  } catch (e) {
    toast('家族共有データを読み込めませんでした: ' + e.message, 'error');
  }
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function openSnapshotModal() {
  const snapshots = await DB.getSnapshots();
  const list = document.getElementById('snapshot-list');
  if (snapshots.length === 0) {
    list.innerHTML = '<div class="empty-state">自動バックアップはまだありません。</div>';
  } else {
    list.innerHTML = snapshots.map((s, i) => `
      <div class="snapshot-row">
        <span>${fmtDateTime(s.ts)}</span>
        <button type="button" class="btn-icon" onclick="restoreSnapshot(${i})">この時点に復元</button>
      </div>
    `).join('');
  }
  document.getElementById('snapshot-modal').style.display = 'flex';
}

function closeSnapshotModal() {
  document.getElementById('snapshot-modal').style.display = 'none';
}

async function restoreSnapshot(idx) {
  try {
    const snapshots = await DB.getSnapshots();
    const snap = snapshots[idx];
    if (!snap) return;
    const loaded = await CryptoManager.decrypt(snap.enc, masterPassword);
    if (!loaded || !Array.isArray(loaded.entries)) {
      throw new Error('自動バックアップの中身を確認できませんでした');
    }
    const ok = confirm(`${fmtDateTime(snap.ts)} 時点の内容に置き換えます。現在の内容は失われます。続けますか？`);
    if (!ok) return;
    vault = loaded;
    await DB.set('vault', snap.enc);
    selectedIds.clear();
    renderList();
    closeSnapshotModal();
    toast('自動バックアップから復元しました', 'success');
    if (GistManager.isConfigured()) syncToGist();
  } catch (e) {
    toast('復元できませんでした: ' + e.message, 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('master-pw').value;
  const isNew = document.getElementById('login-btn').dataset.mode === 'new';

  try {
    document.getElementById('login-btn').disabled = true;
    document.getElementById('login-btn').textContent = '確認中...';

    if (isNew) {
      const confirmPw = document.getElementById('master-pw-confirm').value;
      if (pw !== confirmPw) {
        toast('合言葉が一致しません', 'error');
        return;
      }
      const existing = await DB.get('vault');
      if (existing) {
        const ok = window.confirm(
          'この端末には既に登録済みのデータがあります。\n' +
          '「新規作成」を続けると、今あるデータは自動バックアップの復元以外では戻せなくなります。\n' +
          '本当に新しく作り直しますか？（通常は「開く」から既存の合言葉で開いてください）'
        );
        if (!ok) return;
      }
      masterPassword = pw;
      vault = { entries: [], lastModified: now() };
      await saveVaultLocal();
    } else {
      masterPassword = pw;
      const ok = await loadVaultLocal();
      if (!ok) {
        setAuthMode(true);
        toast('この端末にデータがありません。新しく整理ノートを作成します。', 'info');
        return;
      }
    }
    // 開けた合言葉だけを記憶する（チェックなしなら既存の記憶も消す）
    try {
      if (document.getElementById('remember-chk').checked) await Remember.save(pw);
      else await Remember.clear();
    } catch (e) { /* 記憶に失敗しても開くのは続ける */ }
    showApp();
  } catch (err) {
    toast('合言葉が正しくありません', 'error');
    masterPassword = '';
  } finally {
    document.getElementById('login-btn').disabled = false;
    document.getElementById('login-btn').textContent = document.getElementById('login-btn').dataset.mode === 'new'
      ? '作成して始める'
      : '開く';
  }
}

// 記憶した合言葉で開く。開けなければ記憶を消して通常のログイン画面に戻す。
async function loginWithRemembered() {
  const pw = await Remember.load();
  if (!pw) { await updateRememberUi(); return false; }
  try {
    masterPassword = pw;
    const ok = await loadVaultLocal();
    if (!ok) { masterPassword = ''; return false; }
    showApp();
    return true;
  } catch (err) {
    masterPassword = '';
    await Remember.clear();
    await updateRememberUi();
    toast('記憶した合言葉では開けませんでした。合言葉を入力してください', 'error');
    return false;
  }
}

async function updateRememberUi() {
  const on = await Remember.isSet();
  document.getElementById('remember-actions').style.display = on ? 'flex' : 'none';
  document.getElementById('remember-chk').checked = on;
}

async function clearRemembered() {
  await Remember.clear();
  await updateRememberUi();
  toast('この端末の記憶を消しました', 'success');
}

function setAuthMode(isNew) {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.dataset.mode = isNew ? 'new' : 'login';
  loginBtn.textContent = isNew ? '作成して始める' : '開く';
  document.getElementById('confirm-row').style.display = isNew ? 'flex' : 'none';
  document.getElementById('toggle-mode-btn').textContent = isNew ? 'すでに作成済みの方はこちら' : '初めて使う方はこちら';
  document.getElementById('login-hint').textContent = isNew
    ? 'この端末だけで使う整理ノートを作成します。合言葉は忘れないよう別に控えてください。'
    : '開くための合言葉を入力してください。';
}

// 放置で自動的に閉じる（最後の操作から N 分・既定5分・設定画面で変更）。経過は時刻で判定する
// （バックグラウンドのタブはタイマーが遅れるため、カウントダウン方式にしない）。
// 閉じてもこの端末の「記憶」は残す（ログイン画面に戻るだけ）。
const IDLE_MINUTES_KEY = 'pw-idle-minutes';
const IDLE_MINUTES_CHOICES = [1, 5, 15, 30];
const IDLE_MINUTES_DEFAULT = 5;

function getIdleMinutes() {
  try {
    const n = parseInt(localStorage.getItem(IDLE_MINUTES_KEY), 10);
    if (IDLE_MINUTES_CHOICES.includes(n)) return n;
  } catch (e) { /* 読めなければ既定値 */ }
  return IDLE_MINUTES_DEFAULT;
}

function setIdleMinutes(n) {
  if (!IDLE_MINUTES_CHOICES.includes(n)) return;
  try { localStorage.setItem(IDLE_MINUTES_KEY, String(n)); } catch (e) { /* 保存できなくても今回は有効 */ }
  markActivity();
  toast('放置で閉じる時間を ' + n + ' 分にしました', 'success');
}

function openSettingsModal() {
  document.getElementById('idle-minutes').value = String(getIdleMinutes());
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

let lastActivityAt = Date.now();
let idleCheckTimer = null;

function markActivity() { lastActivityAt = Date.now(); }

function startIdleWatch() {
  stopIdleWatch();
  markActivity();
  idleCheckTimer = setInterval(checkIdle, 10000);
}

function stopIdleWatch() {
  clearInterval(idleCheckTimer);
  idleCheckTimer = null;
}

// 「この端末で記憶する」がオンの端末は、放置しても閉じない（記憶で1クリックで開ける端末なので、閉じる意味が薄い。
// 事業主指示 2026-10-06）。記憶オフの端末だけ従来どおり閉じる。
async function checkIdle() {
  if (Date.now() - lastActivityAt < getIdleMinutes() * 60 * 1000) return;
  if (await Remember.isSet()) { markActivity(); return; }
  closeAllModals();
  handleLogout();
  toast('しばらく操作がなかったため閉じました', 'info');
}

function closeAllModals() {
  document.getElementById('entry-modal').style.display = 'none';
  document.getElementById('gist-modal').style.display = 'none';
  document.getElementById('snapshot-modal').style.display = 'none';
  document.getElementById('settings-modal').style.display = 'none';
  editingId = null;
}

['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach(ev =>
  document.addEventListener(ev, markActivity, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && idleCheckTimer) checkIdle(); });

function showApp() {
  startIdleWatch();
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'flex';
  applyLaunchQuery();
  renderList();
  initGist();
  AutoBackup.run('login');
}

// 外部（管理画面など）から「このサービスを開きたい」と指定して起動されたときに、
// 検索窓へ流し込む。受け取りは URL のハッシュ（#q=...）だけに限定している。
//
// なぜハッシュか:
//   ハッシュはHTTPリクエストに含まれないため、サーバー・アクセスログ・リファラのどれにも残らない。
//   ?q= のクエリだとGitHub Pagesのログや外部サイトへのリファラに載る可能性がある。
// ⛔ ここでパスワードや合言葉を受け取らないこと。受け取ってよいのは検索語だけ。
// ⛔ ハッシュはブラウザ履歴に残るため、読み取ったら即座に消す（下の replaceState）。
function applyLaunchQuery() {
  let raw = '';
  try {
    raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  } catch (e) {
    raw = '';
  }
  if (!raw) return;
  const m = /(?:^|&)q=([^&]*)/.exec(raw);
  if (!m) return;

  // 受け取るのは検索語のみ。長すぎる値・制御文字は捨てる（想定外の入力を持ち込ませない）
  let q = m[1].replace(/[ -]/g, '').trim().slice(0, 40);

  // 履歴に検索語（＝どのサービスを見に来たか）を残さないよう、読み取った時点でハッシュを消す
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) { /* 失敗しても本処理は続ける */ }

  if (!q) return;
  const input = document.getElementById('search-input');
  if (!input) return;
  input.value = q;
  currentQuery = q;
  // 何が起きたか利用者に見せる（勝手に絞り込まれた、と思わせないため）
  if (typeof toast === 'function') toast(`「${q}」で検索しました`, 'info');
}

function handleLogout() {
  stopIdleWatch();
  masterPassword = '';
  vault = { entries: [], lastModified: null };
  selectedIds.clear();
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('master-pw').value = '';
  document.getElementById('master-pw-confirm').value = '';
  updateRememberUi();
}

async function exportBackup() {
  try {
    await saveVaultLocal();
    const encryptedVault = await DB.get('vault');
    const backup = {
      app: APP_CONFIG.APP_NAME,
      format: 'password-note-encrypted-backup',
      formatVersion: 1,
      appVersion: APP_CONFIG.APP_VERSION,
      exportedAt: now(),
      encryptedVault
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('暗号化済みの予備コピーを保存しました', 'success');
  } catch (e) {
    toast('予備コピーを保存できませんでした: ' + e.message, 'error');
  }
}

function chooseImportFile() {
  document.getElementById('import-file').click();
}

async function importBackupFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const encryptedVault = backup.encryptedVault || backup.vault || backup.data;
    if (!encryptedVault || typeof encryptedVault !== 'string') {
      throw new Error('予備コピーの形式が正しくありません');
    }

    const loaded = await CryptoManager.decrypt(encryptedVault, masterPassword);
    if (!loaded || !Array.isArray(loaded.entries)) {
      throw new Error('予備コピーの中身を確認できませんでした');
    }

    const ok = confirm('現在の内容を、予備コピーの内容で置き換えます。続けますか？');
    if (!ok) return;

    vault = loaded;
    await DB.set('vault', encryptedVault);
    selectedIds.clear();
    renderList();
    if (GistManager.isConfigured()) syncToGist();
    toast('予備コピーを読み込みました', 'success');
  } catch (e) {
    toast('予備コピーを読み込めませんでした。合言葉またはファイルを確認してください。', 'error');
  } finally {
    const input = document.getElementById('import-file');
    if (input) input.value = '';
  }
}

function initGist() {
  document.getElementById('gist-btn').style.display = 'flex';
  document.getElementById('sync-btn').style.display = GistManager.isConfigured() ? 'flex' : 'none';
  updateGistBtnState();
}

function updateGistBtnState() {
  const btn = document.getElementById('gist-btn');
  if (GistManager.isConfigured()) {
    btn.classList.add('active');
    btn.title = '家族共有設定済み';
  } else {
    btn.classList.remove('active');
    btn.title = '家族共有設定（上級者向け）';
  }
}

function openGistModal() {
  document.getElementById('gist-token-input').value = GistManager.getToken();
  document.getElementById('gist-id-input').value = GistManager.getGistId();
  document.getElementById('gist-modal').style.display = 'flex';
}

function closeGistModal() {
  document.getElementById('gist-modal').style.display = 'none';
}

function saveGistSettings() {
  const token = document.getElementById('gist-token-input').value.trim();
  const gistId = document.getElementById('gist-id-input').value.trim();
  GistManager.setToken(token);
  GistManager.setGistId(gistId);
  closeGistModal();
  document.getElementById('sync-btn').style.display = token ? 'flex' : 'none';
  updateGistBtnState();
  toast(token ? '家族共有設定を保存しました' : '家族共有設定をクリアしました', 'success');
}

function getFiltered() {
  const q = currentQuery.toLowerCase();
  let entries = q
    ? vault.entries.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.owner?.toLowerCase().includes(q) ||
        e.url?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      )
    : [...vault.entries];

  if (currentSort === 'owner') {
    entries.sort((a, b) => (a.owner || '').localeCompare(b.owner || '', 'ja'));
  } else if (currentSort === 'title') {
    entries.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
  } else {
    entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return entries;
}

function getLatestCreds(entry) {
  return [...(entry.history || [])]
    .filter(h => h.type === 'initial' || h.type === 'change' || h.type === 'create' || h.type === 'update')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

// パスワードを最後に変えた日からの日数（履歴の日付基準。パスワード未登録・日付なしは null）
function daysSinceChange(entry) {
  const c = getLatestCreds(entry);
  const m = c && c.password && /^(\d{4})-(\d{2})-(\d{2})/.exec(c.date || '');
  if (!m) return null;
  const t = new Date();
  const days = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000);
  return Math.max(days, 0);
}

// 90日以上で黄、180日以上で赤（目安。変更を促す表示）
function pwAgeBadge(entry) {
  const d = daysSinceChange(entry);
  if (d === null) return '';
  const cls = d >= 180 ? ' pw-age-old' : d >= 90 ? ' pw-age-warn' : '';
  return ` <span class="pw-age${cls}" title="パスワードを最後に変更した日からの日数">PW変更から ${d}日</span>`;
}

const TYPE_LABELS = { website: 'Web', app: 'アプリ', service: 'サービス', other: 'その他' };

function renderList() {
  const list = document.getElementById('entry-list');
  const entries = getFiltered();

  document.getElementById('entry-count').textContent = `${entries.length}件`;
  document.getElementById('print-btn').style.display = selectedIds.size > 0 ? 'flex' : 'none';
  document.getElementById('print-count').textContent = selectedIds.size;
  document.getElementById('print-list-btn').style.display = selectedIds.size > 0 ? 'flex' : 'none';
  document.getElementById('print-list-count').textContent = selectedIds.size;
  document.getElementById('delete-selected-btn').style.display = selectedIds.size > 0 ? 'flex' : 'none';
  document.getElementById('delete-count').textContent = selectedIds.size;

  const selAllBtn = document.getElementById('select-all-btn');
  if (entries.length > 0) {
    selAllBtn.style.display = 'flex';
    const allSelected = entries.every(e => selectedIds.has(e.id));
    selAllBtn.textContent = allSelected ? '選択を解除' : 'すべて選択';
  } else {
    selAllBtn.style.display = 'none';
  }

  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state">${
      currentQuery ? '検索結果がありません' : 'まだ登録がありません。右下の「＋」から追加してください。'
    }</div>`;
    return;
  }

  list.innerHTML = entries.map(entry => {
    const creds = getLatestCreds(entry);
    const alerts = (entry.history || []).filter(h => h.type === 'alert' || h.type === 'warning' || h.type === 'other');
    const checked = selectedIds.has(entry.id) ? 'checked' : '';
    const entryId = escHtml(entry.id);
    return `
    <div class="entry-card ${selectedIds.has(entry.id) ? 'selected' : ''}" data-id="${entryId}">
      <label class="entry-checkbox">
        <input type="checkbox" ${checked} onchange="toggleSelect('${entryId}')" onclick="event.stopPropagation()">
      </label>
      <div class="entry-main" onclick="openEntry('${entryId}')">
        <div class="entry-header">
          <span class="entry-title">${escHtml(entry.title)}</span>
          ${alerts.length > 0 ? `<span class="alert-badge" title="${alerts.length}件のメモ">メモあり</span>` : ''}
        </div>
        <div class="entry-sub">
          ${entry.owner ? `<span class="tag">担当: ${escHtml(entry.owner)}</span>` : ''}
          ${entry.url ? `<a class="url-tag url-open-btn" href="${escHtml(entry.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="ブラウザで開く">${escHtml(entry.url)}</a>` : ''}
        </div>
        ${creds ? `<div class="entry-creds"><span class="cred-id">${escHtml(creds.username || '(IDなし)')}</span><span class="cred-dot">パスワード登録済み</span></div>` : ''}
        <div class="entry-date">更新: ${fmtDate(entry.updatedAt)}${pwAgeBadge(entry)}</div>
      </div>
      ${creds ? `<div class="entry-copy-btns">
        <button class="entry-copy-btn" onclick="event.stopPropagation(); copyCardCred('${entryId}', 'username')" title="IDをコピー">IDコピー</button>
        <button class="entry-copy-btn" onclick="event.stopPropagation(); copyCardCred('${entryId}', 'password')" title="パスワードをコピー">PWコピー</button>
      </div>` : ''}
      <button class="entry-edit-btn" onclick="event.stopPropagation(); openEntry('${entryId}')" title="編集">編集</button>
    </div>`;
  }).join('');
}

async function copyCardCred(id, field) {
  const entry = vault.entries.find(e => e.id === id);
  const creds = entry && getLatestCreds(entry);
  const label = field === 'username' ? 'ID' : 'パスワード';
  const text = creds && creds[field];
  if (!text) { toast(label + 'が登録されていません', 'error'); return; }
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) { toast('コピーできませんでした', 'error'); return; }
  }
  if (field === 'password') {
    scheduleClipboardClear(text);
    toast(label + 'をコピーしました（30秒後に自動で消去）', 'success');
  } else {
    toast(label + 'をコピーしました', 'success');
  }
}

const CLIPBOARD_CLEAR_MS = 30000;
let clipboardClearTimer = null;

// パスワードをコピーしたら30秒後にクリップボードを空にする。
// 別の内容をコピーし直していたら（読み取れた場合のみ判定）消さない。
function scheduleClipboardClear(text) {
  clearTimeout(clipboardClearTimer);
  clipboardClearTimer = setTimeout(async () => {
    try {
      let current = text;
      try { current = await navigator.clipboard.readText(); } catch (e) { /* 読めない環境では消去を優先 */ }
      if (current === text) await navigator.clipboard.writeText('');
    } catch (e) { /* タブが非アクティブ等で消せない場合は何もしない */ }
  }, CLIPBOARD_CLEAR_MS);
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  renderList();
}

function toggleSelectAll() {
  const entries = getFiltered();
  const allSelected = entries.length > 0 && entries.every(e => selectedIds.has(e.id));
  if (allSelected) {
    entries.forEach(e => selectedIds.delete(e.id));
  } else {
    entries.forEach(e => selectedIds.add(e.id));
  }
  renderList();
}

function openNewEntry() {
  editingId = null;
  const entry = {
    id: uuid(), type: 'website', title: '', owner: '', url: '',
    description: '', createdAt: now(), updatedAt: now(),
    history: [{ id: uuid(), date: now().slice(0, 10), type: 'initial', username: '', password: '', note: '' }]
  };
  openEntryModal(entry, true);
}

function openEntry(id) {
  const entry = vault.entries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  openEntryModal(JSON.parse(JSON.stringify(entry)), false);
}

function openEntryModal(entry, isNew) {
  document.getElementById('modal-title').textContent = isNew ? '新しく登録' : '登録内容の編集';
  document.getElementById('e-id').value = entry.id;
  document.getElementById('e-title').value = entry.title;
  document.getElementById('e-type').value = entry.type;
  document.getElementById('e-owner').value = entry.owner || '';
  document.getElementById('e-url').value = entry.url || '';
  document.getElementById('e-desc').value = entry.description || '';
  toggleUrlField(entry.type);
  renderHistoryForm(entry.history || []);
  document.getElementById('delete-btn').style.display = isNew ? 'none' : 'inline-flex';
  document.getElementById('entry-modal').style.display = 'flex';
  document.getElementById('e-title').focus();
}

function closeModal() {
  document.getElementById('entry-modal').style.display = 'none';
  editingId = null;
}

function toggleUrlField(type) {
  document.getElementById('url-row').style.display = type === 'website' ? 'flex' : 'none';
}

function renderHistoryForm(history) {
  const cont = document.getElementById('history-form');
  cont.innerHTML = history.map((h, i) => `
    <div class="history-row" data-idx="${i}" data-hid="${escHtml(h.id || uuid())}">
      <div class="hr-top">
        <input type="date" class="h-date" value="${escHtml(h.date?.slice(0, 10) || '')}" placeholder="日付">
        <select class="h-type">
          <option value="initial" ${h.type === 'initial' || h.type === 'create' ? 'selected' : ''}>初期設定</option>
          <option value="change" ${h.type === 'change' || h.type === 'update' ? 'selected' : ''}>パスワード変更</option>
          <option value="other" ${h.type === 'other' || h.type === 'alert' || h.type === 'warning' ? 'selected' : ''}>メモ・注意</option>
        </select>
        <button type="button" class="btn-icon btn-danger" onclick="removeHistoryRow(${i})" title="削除">削除</button>
      </div>
      <div class="hr-creds">
        <div class="pw-wrap">
          <input type="text" class="h-user" value="${escHtml(h.username || '')}" placeholder="ID / ユーザー名">
          <button type="button" class="btn-gen" onclick="copyField(this, 'ID')" title="IDをコピー">コピー</button>
        </div>
        <div class="pw-wrap">
          <input type="text" class="h-pass" value="${escHtml(h.password || '')}" placeholder="パスワード">
          <button type="button" class="btn-gen" onclick="copyField(this, 'パスワード')" title="パスワードをコピー">コピー</button>
          <button type="button" class="btn-gen" onclick="genAndFill(this)" title="自動生成">生成</button>
        </div>
      </div>
      <textarea class="h-note" rows="3" placeholder="メモ・家族への注意">${escHtml(h.note || '')}</textarea>
    </div>
  `).join('');
}

function addHistoryRow() {
  const rows = document.querySelectorAll('#history-form .history-row');
  const cont = document.getElementById('history-form');
  const idx = rows.length;
  const div = document.createElement('div');
  div.className = 'history-row';
  div.dataset.idx = idx;
  div.dataset.hid = uuid();
  div.innerHTML = `
    <div class="hr-top">
      <input type="date" class="h-date" value="${now().slice(0, 10)}">
      <select class="h-type">
        <option value="change" selected>パスワード変更</option>
        <option value="initial">初期設定</option>
        <option value="other">メモ・注意</option>
      </select>
      <button type="button" class="btn-icon btn-danger" onclick="removeHistoryRow(${idx})" title="削除">削除</button>
    </div>
    <div class="hr-creds">
      <div class="pw-wrap">
        <input type="text" class="h-user" placeholder="ID / ユーザー名">
        <button type="button" class="btn-gen" onclick="copyField(this, 'ID')" title="IDをコピー">コピー</button>
      </div>
      <div class="pw-wrap">
        <input type="text" class="h-pass" placeholder="パスワード">
        <button type="button" class="btn-gen" onclick="copyField(this, 'パスワード')" title="パスワードをコピー">コピー</button>
        <button type="button" class="btn-gen" onclick="genAndFill(this)" title="自動生成">生成</button>
      </div>
    </div>
    <textarea class="h-note" rows="3" placeholder="メモ・家族への注意"></textarea>
  `;
  cont.appendChild(div);
}

function removeHistoryRow(idx) {
  const row = document.querySelector(`#history-form .history-row[data-idx="${idx}"]`);
  if (row) row.remove();
  document.querySelectorAll('#history-form .history-row').forEach((r, i) => {
    r.dataset.idx = i;
    const btn = r.querySelector('.btn-danger');
    if (btn) btn.setAttribute('onclick', `removeHistoryRow(${i})`);
  });
}

async function copyField(btn, label) {
  const input = btn.closest('.pw-wrap').querySelector('input');
  const text = input.value;
  if (!text) { toast(label + 'が空です', 'error'); return; }
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    input.select();
    if (!document.execCommand('copy')) { toast('コピーできませんでした', 'error'); return; }
  }
  if (input.classList.contains('h-pass')) {
    scheduleClipboardClear(text);
    toast(label + 'をコピーしました（30秒後に自動で消去）', 'success');
  } else {
    toast(label + 'をコピーしました', 'success');
  }
}

function openEntryUrl() {
  let url = document.getElementById('e-url').value.trim();
  if (!url) { toast('URLが空です', 'error'); return; }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
  if (!/^https?:\/\//i.test(url)) { toast('http(s)のURLのみ開けます', 'error'); return; }
  window.open(url, '_blank', 'noopener');
}

function genAndFill(btn) {
  const pw = genPassword(16);
  const input = btn.closest('.pw-wrap').querySelector('.h-pass');
  input.value = pw;
  input.type = 'text';
  toast('パスワードを生成しました', 'success');
}

function collectHistory() {
  return Array.from(document.querySelectorAll('#history-form .history-row')).map(row => ({
    id: row.dataset.hid || uuid(),
    date: row.querySelector('.h-date').value,
    type: row.querySelector('.h-type').value,
    username: row.querySelector('.h-user').value,
    password: row.querySelector('.h-pass').value,
    note: row.querySelector('.h-note').value
  }));
}

async function saveEntry(e) {
  e.preventDefault();
  const title = document.getElementById('e-title').value.trim();
  if (!title) { toast('サービス名を入力してください', 'error'); return; }

  const entry = {
    id: document.getElementById('e-id').value,
    type: document.getElementById('e-type').value,
    title,
    owner: document.getElementById('e-owner').value.trim(),
    url: document.getElementById('e-url').value.trim(),
    description: document.getElementById('e-desc').value.trim(),
    updatedAt: now(),
    history: collectHistory()
  };

  if (editingId) {
    const idx = vault.entries.findIndex(e => e.id === editingId);
    entry.createdAt = vault.entries[idx].createdAt;
    vault.entries[idx] = entry;
  } else {
    entry.createdAt = now();
    vault.entries.unshift(entry);
  }

  await saveVaultLocal();
  renderList();
  closeModal();
  toast(editingId ? '更新しました' : '追加しました', 'success');
  if (GistManager.isConfigured()) syncToGist();
}

async function deleteEntry() {
  if (!editingId) return;
  if (!confirm('この登録を削除しますか？')) return;
  vault.entries = vault.entries.filter(e => e.id !== editingId);
  selectedIds.delete(editingId);
  await saveVaultLocal();
  renderList();
  closeModal();
  toast('削除しました', 'info');
  if (GistManager.isConfigured()) syncToGist();
}

async function deleteSelectedEntries() {
  if (selectedIds.size === 0) {
    toast('削除する登録を選択してください', 'error');
    return;
  }

  const count = selectedIds.size;
  const ok = confirm(`選択した${count}件の登録を削除します。続けますか？`);
  if (!ok) return;

  vault.entries = vault.entries.filter(e => !selectedIds.has(e.id));
  selectedIds.clear();
  await saveVaultLocal();
  renderList();
  toast(`${count}件を削除しました`, 'info');
  if (GistManager.isConfigured()) syncToGist();
}

function printSelected() {
  if (selectedIds.size === 0) {
    toast('印刷する登録を選択してください', 'error');
    return;
  }
  const entries = vault.entries.filter(e => selectedIds.has(e.id));
  PrintManager.printEntries(entries);
}

function printSelectedList() {
  if (selectedIds.size === 0) {
    toast('印刷する登録を選択してください', 'error');
    return;
  }
  const entries = vault.entries.filter(e => selectedIds.has(e.id));
  PrintManager.printList(entries);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('toggle-mode-btn').addEventListener('click', () => {
    const isNew = document.getElementById('login-btn').dataset.mode !== 'new';
    setAuthMode(isNew);
  });

  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('gist-btn').addEventListener('click', openGistModal);
  document.getElementById('sync-btn').addEventListener('click', () => loadFromGist());
  document.getElementById('add-btn').addEventListener('click', openNewEntry);
  document.getElementById('print-btn').addEventListener('click', printSelected);
  document.getElementById('print-list-btn').addEventListener('click', printSelectedList);
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedEntries);
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('autobackup-btn').addEventListener('click', () => AutoBackup.handleButtonClick());
  document.getElementById('import-btn').addEventListener('click', chooseImportFile);
  document.getElementById('import-file').addEventListener('change', e => importBackupFile(e.target.files[0]));
  document.getElementById('snapshot-btn').addEventListener('click', openSnapshotModal);
  document.getElementById('close-snapshot-modal-btn').addEventListener('click', closeSnapshotModal);

  document.getElementById('search-input').addEventListener('input', e => {
    currentQuery = e.target.value;
    renderList();
  });
  document.getElementById('sort-select').addEventListener('change', e => {
    currentSort = e.target.value;
    renderList();
  });

  document.getElementById('entry-form').addEventListener('submit', saveEntry);
  document.getElementById('e-type').addEventListener('change', e => toggleUrlField(e.target.value));
  document.getElementById('add-history-btn').addEventListener('click', addHistoryRow);
  document.getElementById('delete-btn').addEventListener('click', deleteEntry);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);

  document.getElementById('toggle-pw-btn').addEventListener('click', () => {
    const input = document.getElementById('master-pw');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('close-settings-modal-btn').addEventListener('click', closeSettingsModal);
  document.getElementById('idle-minutes').addEventListener('change', e => setIdleMinutes(parseInt(e.target.value, 10)));
  document.getElementById('remember-open-btn').addEventListener('click', loginWithRemembered);
  document.getElementById('remember-clear-btn').addEventListener('click', clearRemembered);

  DB.get('vault').then(enc => {
    setAuthMode(!enc);
    updateRememberUi();
    if (enc) loginWithRemembered();
  });
});
