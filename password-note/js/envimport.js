// .env 一括取り込み（N's notebook）
// 選んだ .env を読み、サービス名＝キー名で照合して「新規／更新／変更なし」を確認してから反映する。
// ⛔ 値は画面に平文で出さない（伏字）。ブラウザ内で処理するだけで、外部へは送らない。
// ⛔ 値が変わったキーだけ履歴に「パスワード変更」の行を足す（古い値は履歴に残る）。変更なしは触らない
//    （「PW変更から N日」のカウントを途切れさせないため）。
const EnvImport = (() => {
  let rows = [];
  let fileName = '';

  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseEnv(text) {
    const map = new Map();
    String(text || '').replace(/^﻿/, '').split(/\r?\n/).forEach(line => {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.\-]*)\s*=\s*(.*)$/.exec(line);
      if (!m) return;
      let v = m[2].trim();
      const q = v.charAt(0);
      if (q === '"' || q === "'") {
        const end = v.indexOf(q, 1);
        if (end > 0) v = v.slice(1, end);
      } else {
        v = v.replace(/\s+#.*$/, '');
      }
      map.set(m[1], v);
    });
    return map;
  }

  function mask(value) {
    const len = value.length;
    if (len >= 16) return '●●●●' + value.slice(-4) + `（${len}文字）`;
    return '●'.repeat(Math.min(len, 8)) + `（${len}文字）`;
  }

  function buildRows(map) {
    const out = [];
    map.forEach((value, key) => {
      const entry = vault.entries.find(e => e.title === key) || null;
      if (value === '') { out.push({ key, value, status: 'empty', entryId: entry && entry.id, checked: false }); return; }
      if (!entry) { out.push({ key, value, status: 'new', entryId: null, checked: true }); return; }
      const creds = getLatestCreds(entry);
      const same = creds && creds.password === value;
      out.push({
        key, value, status: same ? 'same' : 'changed', entryId: entry.id,
        checked: !same, days: daysSinceChange(entry)
      });
    });
    return out;
  }

  const STATUS_LABEL = { new: '新規', changed: '更新', same: '変更なし', empty: '値が空' };

  function applicable(r) { return r.status === 'new' || r.status === 'changed'; }

  function render() {
    const cnt = { new: 0, changed: 0, same: 0, empty: 0 };
    rows.forEach(r => { cnt[r.status]++; });
    document.getElementById('env-summary').textContent = rows.length
      ? `${fileName}：新規 ${cnt.new}件 ／ 更新 ${cnt.changed}件 ／ 変更なし ${cnt.same}件 ／ 値が空 ${cnt.empty}件`
      : '';
    document.getElementById('env-rows').innerHTML = rows.length ? rows.map((r, i) => `
      <label class="env-row env-${r.status}">
        <input type="checkbox" data-i="${i}" ${r.checked ? 'checked' : ''} ${applicable(r) ? '' : 'disabled'}>
        <span class="env-key">${escHtml(r.key)}</span>
        <span class="env-badge">${STATUS_LABEL[r.status]}</span>
        <span class="env-val">${escHtml(mask(r.value))}${r.status === 'changed' && r.days != null ? `<small>前回変更 ${r.days}日前</small>` : ''}</span>
      </label>`).join('') : '<p class="env-hint">.env ファイルを選ぶと、ここに内容の差分が出ます。</p>';
    updateApplyButton();
  }

  function updateApplyButton() {
    const n = rows.filter(r => r.checked && applicable(r)).length;
    const btn = document.getElementById('env-apply-btn');
    btn.disabled = n === 0;
    btn.textContent = n ? `選んだ ${n}件を反映` : '反映する項目がありません';
  }

  async function onFile(file) {
    if (!file) return;
    try {
      const map = parseEnv(await file.text());
      fileName = file.name || '.env';
      rows = buildRows(map);
      if (!rows.length) toast('KEY=値 の形の行が見つかりませんでした', 'error');
      render();
    } catch (e) {
      toast('ファイルを読み込めませんでした', 'error');
    } finally {
      document.getElementById('env-file').value = '';
    }
  }

  async function apply() {
    const today = localToday();
    let added = 0, changed = 0;
    rows.filter(r => r.checked && applicable(r)).forEach(r => {
      if (r.status === 'new') {
        vault.entries.unshift({
          id: uuid(), type: 'service', title: r.key, owner: '', url: '',
          description: `.env から取り込み（${fileName}）`,
          createdAt: now(), updatedAt: now(),
          history: [{ id: uuid(), date: today, type: 'initial', username: '', password: r.value, note: '' }]
        });
        added++;
      } else {
        const entry = vault.entries.find(e => e.id === r.entryId);
        if (!entry) return;
        const prev = getLatestCreds(entry);
        entry.history = entry.history || [];
        entry.history.push({
          id: uuid(), date: today, type: 'change',
          username: (prev && prev.username) || '', password: r.value,
          note: `.env 取り込みで更新（${fileName}）`
        });
        entry.updatedAt = now();
        changed++;
      }
    });
    if (!added && !changed) return;
    try {
      await saveVaultLocal();
      renderList();
      if (GistManager.isConfigured()) syncToGist();
      close();
      toast(`.env を反映しました（新規 ${added}件・更新 ${changed}件）`, 'success');
    } catch (e) {
      toast('反映できませんでした: ' + e.message, 'error');
    }
  }

  function open() {
    rows = [];
    fileName = '';
    render();
    document.getElementById('env-modal').style.display = 'flex';
  }

  function close() {
    rows = [];
    document.getElementById('env-modal').style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('env-btn').addEventListener('click', open);
    document.getElementById('close-env-modal-btn').addEventListener('click', close);
    document.getElementById('env-cancel-btn').addEventListener('click', close);
    document.getElementById('env-choose-btn').addEventListener('click', () => document.getElementById('env-file').click());
    document.getElementById('env-file').addEventListener('change', e => onFile(e.target.files[0]));
    document.getElementById('env-apply-btn').addEventListener('click', apply);
    document.getElementById('env-rows').addEventListener('change', e => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i === undefined) return;
      rows[+i].checked = e.target.checked;
      updateApplyButton();
    });
  });

  return { parseEnv };
})();
