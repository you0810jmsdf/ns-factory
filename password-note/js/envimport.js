// .env 一括取り込み（N's notebook）
// 選んだ .env を読み、サービス名＝キー名で照合して「新規／更新／説明のみ／変更なし」を確認してから反映する。
// 説明ファイル（.json）を選ぶと、キーごとの説明（どういうときに使うキーか）を説明欄に入れる。
// ファイルは何回かに分けて選んでよい（別のフォルダにある .env と説明ファイルも、1つずつ続けて選べる）。順番も問わない。
// ⛔ 値は画面に平文で出さない（伏字）。ブラウザ内で処理するだけで、外部へは送らない。
// ⛔ 値が変わったキーだけ履歴に「パスワード変更」の行を足す（古い値は履歴に残る）。変更なしは触らない
//    （「PW変更から N日」のカウントを途切れさせないため）。
// ⛔ キーごとの説明文をこのコードやリポジトリに埋め込まない（公開リポジトリ。サービス名・社内スクリプト名が出る）。
//    説明は利用者の手元のファイル（.json）から読む。
const EnvImport = (() => {
  let rows = [];
  let fileName = '';
  let hasDescFile = false;
  // 選んだファイルの蓄積（開き直すまで残す）
  let envMap = new Map();
  let descMap = new Map();
  let envNames = [];
  let descCount = 0;

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

  // 説明ファイル: {"KEY": "どういうときに使うキーか", ...}（値は文字列、または {"説明": "..."}）。"_" で始まるキーは無視。
  function parseDescriptions(text) {
    const obj = JSON.parse(String(text || '').replace(/^﻿/, ''));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('形式が違います');
    const map = new Map();
    Object.keys(obj).forEach(k => {
      if (k.charAt(0) === '_') return;
      const v = obj[k];
      const d = typeof v === 'string' ? v : (v && (v['説明'] || v.description)) || '';
      if (String(d).trim()) map.set(k, String(d).trim());
    });
    return map;
  }

  function mask(value) {
    const len = value.length;
    if (len >= 16) return '●●●●' + value.slice(-4) + `（${len}文字）`;
    return '●'.repeat(Math.min(len, 8)) + `（${len}文字）`;
  }

  // 説明欄が空、または取り込み時の仮の文言（「.env から取り込み（…）」だけ）のままなら、説明ファイルの説明で埋めてよい。
  // 手で書いた説明は上書きしない。
  function needsDesc(entry) {
    return !entry.description || /^\.env から取り込み（/.test(entry.description);
  }
  function descText(r) { return `${r.desc}\n（${fileName} から取り込み）`; }

  function buildRows(map, dMap) {
    const out = [];
    map.forEach((value, key) => {
      const entry = vault.entries.find(e => e.title === key) || null;
      const desc = (dMap && dMap.get(key)) || '';
      if (value === '') { out.push({ key, value, desc, status: 'empty', entryId: entry && entry.id, checked: false }); return; }
      if (!entry) { out.push({ key, value, desc, status: 'new', entryId: null, checked: true }); return; }
      const creds = getLatestCreds(entry);
      const same = creds && creds.password === value;
      const status = !same ? 'changed' : (desc && needsDesc(entry) ? 'fill' : 'same');
      out.push({ key, value, desc, status, entryId: entry.id, checked: status !== 'same', days: daysSinceChange(entry) });
    });
    return out;
  }

  const STATUS_LABEL = { new: '新規', changed: '更新', fill: '説明のみ', same: '変更なし', empty: '値が空' };

  function applicable(r) { return r.status === 'new' || r.status === 'changed' || r.status === 'fill'; }

  function descLine(r) {
    if (r.desc) return `<small class="env-desc">${escHtml(r.desc.split('\n')[0].slice(0, 70))}</small>`;
    if (hasDescFile && applicable(r)) return '<small class="env-desc env-nodesc">説明なし</small>';
    return '';
  }

  function render() {
    const cnt = { new: 0, changed: 0, fill: 0, same: 0, empty: 0 };
    rows.forEach(r => { cnt[r.status]++; });
    const targets = rows.filter(applicable).length;
    const withDesc = rows.filter(r => r.desc && applicable(r)).length;
    let summary = '';
    if (rows.length) {
      summary = `${fileName}：新規 ${cnt.new}件 ／ 更新 ${cnt.changed}件 ／ ${cnt.fill ? `説明のみ ${cnt.fill}件 ／ ` : ''}変更なし ${cnt.same}件 ／ 値が空 ${cnt.empty}件` +
        (hasDescFile ? `（説明つき ${withDesc}／${targets}件）` : '');
    } else if (descCount > 0 && !envNames.length) {
      summary = `説明ファイル（${descMap.size}件）を読み込みました。続けて .env を選んでください。`;
    }
    document.getElementById('env-summary').textContent = summary;
    document.getElementById('env-rows').innerHTML = rows.length ? rows.map((r, i) => `
      <label class="env-row env-${r.status}">
        <input type="checkbox" data-i="${i}" ${r.checked ? 'checked' : ''} ${applicable(r) ? '' : 'disabled'}>
        <span class="env-key">${escHtml(r.key)}${descLine(r)}</span>
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

  // .env と説明ファイル（.json）を、何回かに分けて選んでもよい（ファイルの中身で自動判別・選んだ内容は蓄積する）
  async function onFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      // 先に全部読んで、1つでも壊れていたら何も変えずに中断する
      const addEnv = new Map(), addDesc = new Map();
      const addNames = [];
      let addDescCount = 0;
      for (const f of files) {
        const text = await f.text();
        const looksJson = /\.json$/i.test(f.name || '') || /^\s*\{/.test(text.replace(/^﻿/, ''));
        if (looksJson) {
          try { parseDescriptions(text).forEach((v, k) => addDesc.set(k, v)); addDescCount++; }
          catch (e) { toast('説明ファイル（.json）の形式が正しくありません', 'error'); return; }
        } else {
          parseEnv(text).forEach((v, k) => addEnv.set(k, v));
          addNames.push(f.name || '.env');
        }
      }
      // 開いたままのチェックの状態を引き継ぐ（後から説明ファイルを足しても、外したチェックは戻さない）
      // （反映できる行だけ。「変更なし」だった行が説明ファイルで「説明のみ」に変わったときは、初期のチェックを入れる）
      const wasChecked = new Map(rows.filter(applicable).map(r => [r.key, r.checked]));
      addEnv.forEach((v, k) => envMap.set(k, v));
      addDesc.forEach((v, k) => descMap.set(k, v));
      addNames.forEach(n => { if (!envNames.includes(n)) envNames.push(n); });
      descCount += addDescCount;
      hasDescFile = descCount > 0;
      fileName = envNames.join('・');
      rows = envMap.size ? buildRows(envMap, descMap) : [];
      rows.forEach(r => { if (applicable(r) && wasChecked.has(r.key)) r.checked = wasChecked.get(r.key); });
      if (envMap.size && !rows.length) toast('KEY=値 の形の行が見つかりませんでした', 'error');
      render();
    } catch (e) {
      toast('ファイルを読み込めませんでした', 'error');
    } finally {
      document.getElementById('env-file').value = '';
    }
  }

  async function apply() {
    const today = localToday();
    let added = 0, changed = 0, filled = 0;
    rows.filter(r => r.checked && applicable(r)).forEach(r => {
      if (r.status === 'new') {
        vault.entries.unshift({
          id: uuid(), type: 'service', title: r.key, owner: '', url: '',
          description: r.desc ? descText(r) : `.env から取り込み（${fileName}）`,
          createdAt: now(), updatedAt: now(),
          history: [{ id: uuid(), date: today, type: 'initial', username: '', password: r.value, note: '' }]
        });
        added++;
      } else if (r.status === 'fill') {
        const entry = vault.entries.find(e => e.id === r.entryId);
        if (!entry) return;
        entry.description = descText(r);
        entry.updatedAt = now();
        filled++;
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
        if (r.desc && needsDesc(entry)) entry.description = descText(r);
        entry.updatedAt = now();
        changed++;
      }
    });
    if (!added && !changed && !filled) return;
    try {
      await saveVaultLocal();
      renderList();
      if (GistManager.isConfigured()) syncToGist();
      close();
      toast(`.env を反映しました（新規 ${added}件・更新 ${changed}件${filled ? `・説明のみ ${filled}件` : ''}）`, 'success');
    } catch (e) {
      toast('反映できませんでした: ' + e.message, 'error');
    }
  }

  function reset() {
    rows = [];
    fileName = '';
    hasDescFile = false;
    envMap = new Map();
    descMap = new Map();
    envNames = [];
    descCount = 0;
  }

  function open() {
    reset();
    render();
    document.getElementById('env-modal').style.display = 'flex';
  }

  function close() {
    reset();
    document.getElementById('env-modal').style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('env-btn').addEventListener('click', open);
    document.getElementById('close-env-modal-btn').addEventListener('click', close);
    document.getElementById('env-cancel-btn').addEventListener('click', close);
    document.getElementById('env-choose-btn').addEventListener('click', () => document.getElementById('env-file').click());
    document.getElementById('env-file').addEventListener('change', e => onFiles(e.target.files));
    document.getElementById('env-apply-btn').addEventListener('click', apply);
    document.getElementById('env-rows').addEventListener('change', e => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i === undefined) return;
      rows[+i].checked = e.target.checked;
      updateApplyButton();
    });
  });

  return { parseEnv, parseDescriptions };
})();
