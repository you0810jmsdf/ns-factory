// 断面の座標を、紙の位置から独立した形で保存する。
export function normalizeSectionPoints(points) {
  if (!Array.isArray(points) || points.length < 3 || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) throw new Error('断面には3つ以上の正しい頂点が必要です');
  const xs = points.map(p => p.x), ys = points.map(p => p.y), x = (Math.min(...xs) + Math.max(...xs)) / 2, y = Math.min(...ys);
  if (Math.max(...xs) === Math.min(...xs) || Math.max(...ys) === y) throw new Error('断面の幅と高さを確認してください');
  return points.map(p => ({ x: p.x - x, y: p.y - y }));
}
export function sectionPointsText(points) { return points.map(p => `${p.x}:${p.y}`).join(';'); }
export function parseSectionPoints(text) {
  if (!text.trim()) return undefined;
  const number = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
  const points = text.split(';').map(pair => { const a = pair.split(':'); if (a.length !== 2 || !a.every(n => number.test(n.trim()) && Number.isFinite(Number(n)))) throw new Error('座標は x:y;x:y の形で入力してください'); return { x: Number(a[0]), y: Number(a[1]) }; });
  normalizeSectionPoints(points); return points;
}
// 元の規格は書き換えず、この金具だけの断面を重ねる。
export function binderSpecWithSection(spec, params = {}) { return spec && params.sectionPoints ? { ...spec, base: { ...spec.base, sectionPoints: params.sectionPoints } } : spec; }
