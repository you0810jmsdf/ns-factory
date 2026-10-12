// 参拝の記録（スタンプ帳）。この端末の localStorage だけに保存し、サーバーへは送らない。
// 記録の形は、将来「みんなのギャラリー」へ広げられるように、公開してよいか（shareOk）を持たせてある。
//   { v: 1, visits: [ { shrineId, visitedAt: 'YYYY-MM-DD', photoId: null, shareOk: false } ] }
const KEY = 'shrine-note-stamps-v1';
const listeners = [];
let data = load();

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && j.v === 1 && Array.isArray(j.visits)) return j;
  } catch (_) { /* 読めなければ空から始める */ }
  return { v: 1, visits: [] };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* 保存できなくても動く */ }
  listeners.forEach((f) => { try { f(); } catch (_) { /* 1つの失敗で止めない */ } });
}
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export const stamps = {
  all: () => data.visits.slice(),
  get: (id) => data.visits.find((v) => v.shrineId === id) || null,
  has: (id) => data.visits.some((v) => v.shrineId === id),
  count: () => data.visits.length,
  add(id) {
    if (this.has(id)) return false;
    data.visits.push({ shrineId: id, visitedAt: today(), photoId: null, shareOk: false });
    save();
    return true;
  },
  setPhoto(id, photoId) {
    const v = this.get(id);
    if (!v) return false;
    v.photoId = photoId;
    save();
    return true;
  },
  remove(id) {
    const n = data.visits.length;
    data.visits = data.visits.filter((v) => v.shrineId !== id);
    if (data.visits.length !== n) save();
    return data.visits.length !== n;
  },
  onChange: (f) => listeners.push(f),
};
