// 「この端末で記憶する」: 合言葉を、取り出せない鍵（AES-GCM・extractable:false）で暗号化して
// IndexedDB に保存する。最後に使ってから 30 日で失効する。
//
// ⛔ 合言葉を localStorage などに平文で置かないこと。
// ⛔ この仕組みは「同じ端末・同じブラウザを触れる人」には効かない（その人は記憶で開ける）。
//    共用PCでは記憶させない。画面の「記憶を消す」で即削除できる。
const Remember = (() => {
  const KEY = 'rememberedLogin';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000;

  async function save(password) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
    await DB.set(KEY, { key, iv, ct, last: Date.now() });
  }

  async function isSet() {
    try {
      const r = await DB.get(KEY);
      return !!r && Date.now() - r.last <= TTL_MS;
    } catch (e) { return false; }
  }

  // 記憶があって期限内なら合言葉を返す（使った日時を更新）。無い・期限切れ・復号失敗は null（期限切れ・壊れは消す）。
  async function load() {
    try {
      const r = await DB.get(KEY);
      if (!r) return null;
      if (Date.now() - r.last > TTL_MS) { await clear(); return null; }
      const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, r.key, r.ct);
      await DB.set(KEY, { ...r, last: Date.now() });
      return new TextDecoder().decode(buf);
    } catch (e) {
      await clear();
      return null;
    }
  }

  async function clear() {
    try { await DB.del(KEY); } catch (e) { /* 消せなくても本処理は続ける */ }
  }

  return { save, load, clear, isSet };
})();
