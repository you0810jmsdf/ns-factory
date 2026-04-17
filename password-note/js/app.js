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

async function handleLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('master-pw').value;
  const isNew = document.getElementById('login-btn').dataset.mode === 'new';

  try {
    document.getElementById('login-btn').disabled = true;
    document.getElementById('login-btn').textContent = '確認中...';

    if (isNew) {
      const confirm = document.getElementById('master-pw-confirm').value;
      if (pw !== confirm) {
        toast('合言葉が一致しません', 'error');
        return;
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

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'flex';
  renderList();
  initGist();
}

function handleLogout() {
  masterPassword = '';
  vault = { entries: [], lastModified: null };
  selectedIds.clear();
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('master-pw').value = '';
  document.getElementById('master-pw-confirm').value = '';
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

const TYPE_LABELS = { website: 'Web', app: 'アプリ', service: 'サービス', other: 'その他' };

function renderList() {
  const list = document.getElementById('entry-list');
  const entries = getFiltered();

  document.getElementById('entry-count').textContent = `${entries.length}件`;
  document.getElementById('print-btn').style.display = selectedIds.size > 0 ? 'flex' : 'none';
  document.getElementById('print-count').textContent = selectedIds.size;
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
          <span class="entry-icon">${escHtml(TYPE_LABELS[entry.type] || 'その他')}</span>
          <span class="entry-title">${escHtml(entry.title)}</span>
          ${alerts.length > 0 ? `<span class="alert-badge" title="${alerts.length}件のメモ">メモあり</span>` : ''}
        </div>
        <div class="entry-sub">
          ${entry.owner ? `<span class="tag">担当: ${escHtml(entry.owner)}</span>` : ''}
          ${entry.url ? `<span class="url-tag">${escHtml(entry.url)}</span>` : ''}
        </div>
        ${creds ? `<div class="entry-creds"><span class="cred-id">${escHtml(creds.username || '(IDなし)')}</span><span class="cred-dot">パスワード登録済み</span></div>` : ''}
        <div class="entry-date">更新: ${fmtDate(entry.updatedAt)}</div>
      </div>
      <button class="entry-edit-btn" onclick="event.stopPropagation(); openEntry('${entryId}')" title="編集">編集</button>
    </div>`;
  }).join('');
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
        <input type="text" class="h-user" value="${escHtml(h.username || '')}" placeholder="ID / ユーザー名">
        <div class="pw-wrap">
          <input type="text" class="h-pass" value="${escHtml(h.password || '')}" placeholder="パスワード">
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
      <input type="text" class="h-user" placeholder="ID / ユーザー名">
      <div class="pw-wrap">
        <input type="text" class="h-pass" placeholder="パスワード">
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
  document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedEntries);
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-btn').addEventListener('click', chooseImportFile);
  document.getElementById('import-file').addEventListener('change', e => importBackupFile(e.target.files[0]));

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

  DB.get('vault').then(enc => {
    setAuthMode(!enc);
  });
});
