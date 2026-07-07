const DB = (() => {
  const NAME = 'PasswordManagerDB';
  const VER = 1;
  const STORE = 'kv';
  let _db = null;

  async function open() {
    if (_db) return _db;
    return new Promise((res, rej) => {
      const req = indexedDB.open(NAME, VER);
      req.onupgradeneeded = e => {
        if (!e.target.result.objectStoreNames.contains(STORE))
          e.target.result.createObjectStore(STORE, { keyPath: 'k' });
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = () => rej(req.error);
    });
  }

  async function get(k) {
    const db = await open();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(k);
      req.onsuccess = () => res(req.result?.v);
      req.onerror = () => rej(req.error);
    });
  }

  async function set(k, v) {
    const db = await open();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put({ k, v });
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  async function del(k) {
    const db = await open();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(k);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  const SNAPSHOT_LIMIT = 5;

  async function pushSnapshot(enc) {
    const list = (await get('snapshots')) || [];
    list.unshift({ ts: new Date().toISOString(), enc });
    await set('snapshots', list.slice(0, SNAPSHOT_LIMIT));
  }

  async function getSnapshots() {
    return (await get('snapshots')) || [];
  }

  return { get, set, del, pushSnapshot, getSnapshots };
})();
