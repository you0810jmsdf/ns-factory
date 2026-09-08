/* 自動バックアップ（保全部フォルダへの直接書き出し）
   保存先フォルダのハンドルを IndexedDB に保持し、金庫の変更時と起動時に
   暗号化済みバックアップJSONを書き出す。
   対応: PC の Chrome / Edge（File System Access API）。iPhone / Safari は非対応。
   ⛔ この処理は絶対に例外を外へ投げない。自動保存の失敗で本体の保存を壊さないため。 */
const AutoBackup = (() => {
  const HANDLE_KEY = 'backupDirHandle';
  const LAST_KEY = 'backupLastAuto';
  const DEBOUNCE_MS = 3000;

  let timer = null;
  let writing = false;
  let pendingReason = null;

  function isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  /* 自動保存は1日1ファイル（同じ日は上書き）。
     手動の「予備コピー保存」は -HHMM 付きなので、ファイル名で区別できる。
     どちらも password-note-backup-*.json に一致するので保全部の点検台帳は両方拾う。 */
  function autoFileName() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `password-note-backup-${y}${m}${day}-auto.json`;
  }

  /* ⚠ app.js の exportBackup と同一形式。片方だけ変えないこと。 */
  function buildBackup(encryptedVault) {
    return {
      app: APP_CONFIG.APP_NAME,
      format: 'password-note-encrypted-backup',
      formatVersion: 1,
      appVersion: APP_CONFIG.APP_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'auto',
      encryptedVault
    };
  }

  async function getHandle() {
    try {
      return (await DB.get(HANDLE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  /* 'granted' / 'prompt' / 'denied' / 'none' */
  async function permissionState(handle) {
    if (!handle) return 'none';
    try {
      return await handle.queryPermission({ mode: 'readwrite' });
    } catch (e) {
      return 'prompt';
    }
  }

  /* フォルダ選択。ユーザー操作から呼ぶこと。キャンセル時は AbortError を投げる。 */
  async function chooseFolder() {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'password-note-backup'
    });
    await DB.set(HANDLE_KEY, handle);
    return handle;
  }

  /* 権限が prompt に戻ったときの再許可。ユーザー操作から呼ぶこと。 */
  async function requestAccess() {
    const handle = await getHandle();
    if (!handle) return 'none';
    try {
      return await handle.requestPermission({ mode: 'readwrite' });
    } catch (e) {
      return 'denied';
    }
  }

  async function forget() {
    try {
      await DB.del(HANDLE_KEY);
      await DB.del(LAST_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* 実書き出し。戻り値で成否を返し、例外は投げない。 */
  async function run(reason) {
    if (writing) {
      pendingReason = reason;
      return { ok: false, reason: 'busy' };
    }
    writing = true;
    try {
      if (!isSupported()) return { ok: false, reason: 'unsupported' };

      const handle = await getHandle();
      if (!handle) return { ok: false, reason: 'not-configured' };

      const state = await permissionState(handle);
      if (state !== 'granted') return { ok: false, reason: 'permission', state };

      const enc = await DB.get('vault');
      if (!enc) return { ok: false, reason: 'empty' };

      const name = autoFileName();
      const fh = await handle.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(JSON.stringify(buildBackup(enc), null, 2));
      await w.close();

      const rec = {
        at: new Date().toISOString(),
        file: name,
        dir: handle.name || '',
        reason: reason || ''
      };
      await DB.set(LAST_KEY, rec);
      return { ok: true, file: name, record: rec };
    } catch (e) {
      return { ok: false, reason: 'error', message: e && e.message ? e.message : String(e) };
    } finally {
      writing = false;
      if (pendingReason) {
        const r = pendingReason;
        pendingReason = null;
        setTimeout(() => run(r), 0);
      }
    }
  }

  /* 金庫を保存したときに呼ぶ。連続保存でディスクI/Oを連発しないようデバウンスする。 */
  function notifyChange(reason) {
    if (!isSupported()) return;
    clearTimeout(timer);
    timer = setTimeout(() => { run(reason || 'change'); }, DEBOUNCE_MS);
  }

  async function status() {
    const handle = await getHandle();
    let last = null;
    try { last = (await DB.get(LAST_KEY)) || null; } catch (e) { last = null; }
    return {
      supported: isSupported(),
      configured: !!handle,
      dir: handle && handle.name ? handle.name : '',
      permission: await permissionState(handle),
      last
    };
  }

  function fmtLast(last) {
    if (!last || !last.at) return 'まだ書き出していません';
    const d = new Date(last.at);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* 失敗理由を利用者向けの言葉にする。原因を断定しないこと。 */
  function describe(r) {
    switch (r.reason) {
      case 'unsupported': return 'このブラウザは自動保存に対応していません';
      case 'not-configured': return '保存先フォルダが未設定です';
      case 'permission': return '保存先フォルダへの書き込みが許可されていません';
      case 'empty': return '書き出す内容がありません';
      case 'busy': return '書き出し中です';
      case 'error': return r.message || '不明なエラー';
      default: return r.reason || '不明';
    }
  }

  async function setup() {
    try {
      await chooseFolder();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('保存先フォルダを記憶できませんでした: ' + (e && e.message ? e.message : e), 'error');
      return;
    }
    const r = await run('setup');
    if (r.ok) toast(`保存先を記憶しました。以後この端末では自動で書き出します（${r.file}）`, 'success');
    else toast('保存先は記憶しましたが書き出せませんでした: ' + describe(r), 'error');
  }

  async function handleButtonClick() {
    if (!isSupported()) {
      toast('この端末では自動保存を使えません。PCのChromeまたはEdgeで開いてください', 'error');
      return;
    }

    const st = await status();
    if (!st.configured) { await setup(); return; }

    const ok = confirm(
      `自動保存の保存先: ${st.dir || '(不明)'}\n` +
      `最終書き出し: ${fmtLast(st.last)}\n\n` +
      'OK … 今すぐ書き出す\n' +
      'キャンセル … 保存先を選び直す'
    );
    if (!ok) { await setup(); return; }

    if (st.permission !== 'granted') {
      const p = await requestAccess();
      if (p !== 'granted') {
        toast('保存先フォルダへの書き込みが許可されませんでした', 'error');
        return;
      }
    }

    const r = await run('manual');
    if (r.ok) toast(`予備コピーを書き出しました（${r.file}）`, 'success');
    else toast('書き出せませんでした: ' + describe(r), 'error');
  }

  return {
    isSupported, chooseFolder, requestAccess, forget,
    run, notifyChange, status, autoFileName, handleButtonClick
  };
})();
