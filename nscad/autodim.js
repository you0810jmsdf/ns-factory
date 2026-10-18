// 寸法線を自動で入れる（事業主の希望 2026-10-19「図面に全自動で寸法線を入れ、あとから微調整が簡単にできるようにしてほしい」）。
// 純粋関数：図面（doc）と対象の図形（cand）から「作る寸法線の一覧」を返す。図面には触らない。画面側（app.js）が一覧を doc.shapes に足す。
// 入れるもの（チェックで選ぶ）：①型紙（端がつながった一周の線）ごとの全体の幅と高さ ②まっすぐな辺ごとの長さ ③円の直径 ④縫い穴の間隔（端から最初の穴・穴と穴・最後の穴から端）。
// 同じ2点を測る寸法がすでにあれば入れない（何度押しても増えない）。作った寸法には autoDim（種類）の印を付ける（「自動で入れた寸法を全部消す」で消せる）。
import { distance, bboxOf, chainShapes, flattenShape, arcLength, pointAtLength, resolvePath, pathSegments } from './geometry.js';

const AD_EQ = 0.01;   /* 同じ点とみなす距離（mm） */
const AD_MIN = 1;     /* これより短い寸法は入れない（mm） */
const adRound = v => Math.round(v * 100) / 100;
const adSame = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= AD_EQ;
const adSamePair = (d, p, q) => { const a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }; return (adSame(a, p) && adSame(b, q)) || (adSame(a, q) && adSame(b, p)); };

/** 多角形（点列）の中に点があるか（辺をまたぐ回数の偶奇で決める）。 */
export function adPointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** ひとつながり（chainShapes の1件）を、端どうしをつないだ点列にする（閉じていれば多角形）。 */
function adChainPoints(chain) {
  const out = [];
  for (const it of chain.items) { let pts = flattenShape(it.shape, 0.05); if (it.reversed) pts = [...pts].reverse(); for (const p of pts) if (!out.length || distance(out.at(-1), p) > 1e-6) out.push({ x: p.x, y: p.y }); }
  if (out.length > 1 && distance(out[0], out.at(-1)) <= 1e-6) out.pop();
  return out;
}
/** 図形のまっすぐな辺 [[p, q], …]（直線・折れ線の各辺・ペンの直線区間。円弧・曲線は無し）。 */
function adStraightEdges(s) {
  if (s.type === 'line') return [[{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]];
  if (s.type === 'polyline') { const pts = s.points, n = pts.length, out = []; for (let i = 0; i < n - (s.closed ? 0 : 1); i++) out.push([pts[i], pts[(i + 1) % n]]); return out; }
  if (s.type === 'path') return pathSegments(s).filter(seg => seg.type === 'line').map(seg => [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]);
  return [];
}
/** 辺 p→q の寸法線を置く側：型紙（多角形）があれば外側、無ければ進む向きの左。dimension() の offset は、進む向きの左が正。 */
function adEdgeOffset(p, q, poly, gap) {
  if (!poly) return gap;
  const len = distance(p, q) || 1, n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len }, mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  return adPointInPolygon({ x: mid.x + n.x * 0.5, y: mid.y + n.y * 0.5 }, poly) ? -gap : gap;
}
const adBoundsOf = list => { let b = null; for (const s of list) { const x = bboxOf(s); if (!x) continue; b = b ? { minX: Math.min(b.minX, x.minX), minY: Math.min(b.minY, x.minY), maxX: Math.max(b.maxX, x.maxX), maxY: Math.max(b.maxY, x.maxY) } : { ...x }; } return b; };
/** 辺 p→q が、全体の幅（上下の辺で長さが幅と同じ）か全体の高さ（左右の辺で長さが高さと同じ）と同じ寸法になるか。同じなら辺の寸法は入れない（全体の寸法と二重になる）。 */
function adIsBoxEdge(p, q, b) {
  const horiz = Math.abs(p.y - q.y) <= AD_EQ, vert = Math.abs(p.x - q.x) <= AD_EQ;
  if (horiz && Math.abs(Math.abs(q.x - p.x) - (b.maxX - b.minX)) <= AD_EQ) return true;
  if (vert && Math.abs(Math.abs(q.y - p.y) - (b.maxY - b.minY)) <= AD_EQ) return true;
  return false;
}

/** 作る寸法線の一覧 [{ type:'dimension', x1, y1, x2, y2, offset, autoDim:'size'|'edge'|'circle'|'hole' }, …] を返す。
 *  doc：図面（既存の寸法・穴・経路を見る）。cand：対象の図形（画面側で「見えている・ガイドの層でない・金具でない」に絞ったもの。選んでいればその図形だけ）。
 *  gap：線から寸法線までの距離（mm・欄の数字がそのまま距離）。 */
export function autoDimensionPlan(doc, cand, { size = true, edges = true, circles = true, holes = false, gap = 8 } = {}) {
  const existing = (doc.shapes || []).filter(s => s.type === 'dimension'), out = [];
  const has = (p, q) => existing.some(d => adSamePair(d, p, q)) || out.some(d => adSamePair(d, p, q));
  const add = (p, q, offset, kind) => { if (!(distance(p, q) >= AD_MIN) || has(p, q)) return; out.push({ type: 'dimension', x1: adRound(p.x), y1: adRound(p.y), x2: adRound(q.x), y2: adRound(q.y), offset: adRound(offset), autoDim: kind }); };
  const geo = (cand || []).filter(s => s && ['line', 'polyline', 'path', 'arc', 'bezier', 'circle'].includes(s.type));
  const polyOfShape = new Map();   /* 辺の図形 id → それが属する型紙の多角形（穴の間隔の置く側にも使う） */
  for (const ch of chainShapes(geo)) {
    const list = ch.shapeIds.map(id => geo.find(s => s.id === id)), isCircle = list.length === 1 && list[0].type === 'circle';
    const poly = ch.closed && !isCircle ? adChainPoints(ch) : null, b = adBoundsOf(list);
    if (poly && poly.length >= 3) for (const s of list) polyOfShape.set(s.id, poly);
    if (size && poly && b) {
      add({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, gap, 'size');    /* 全体の幅：上の辺の上（左→右の左側＝上） */
      add({ x: b.minX, y: b.minY }, { x: b.minX, y: b.maxY }, -gap, 'size');   /* 全体の高さ：左の辺の左（上→下の左側は右＝内側なので、負で外へ） */
    }
    if (circles && isCircle) { const c = list[0]; add({ x: c.cx - c.r, y: c.cy }, { x: c.cx + c.r, y: c.cy }, c.r + gap, 'circle'); }   /* 直径：円の上に */
    if (edges) for (const s of list) for (const [p, q] of adStraightEdges(s)) { if (size && poly && b && adIsBoxEdge(p, q, b)) continue; add(p, q, adEdgeOffset(p, q, poly, gap), 'edge'); }
  }
  if (holes) for (const path of doc.paths || []) {
    if (!path.shapeIds.every(id => geo.some(s => s.id === id))) continue;
    const hs = (doc.holes || []).filter(h => h.pathId === path.id).sort((a, b) => a.s - b.s); if (hs.length < 2) continue;
    const route = resolvePath(doc, path), poly = polyOfShape.get(path.shapeIds[0]) || null, off = (p, q) => adEdgeOffset(p, q, poly, gap);
    if (route && !path.closed) { const a = pointAtLength(route, 0), z = pointAtLength(route, arcLength(route)); if (a) add(a, hs[0], off(a, hs[0]), 'hole'); if (z) add(hs.at(-1), z, off(hs.at(-1), z), 'hole'); }   /* 端から最初の穴・最後の穴から端 */
    let last = null;
    for (let i = 0; i + 1 < hs.length; i++) { const d = distance(hs[i], hs[i + 1]); if (last === null || Math.abs(d - last) > 0.05) { add(hs[i], hs[i + 1], off(hs[i], hs[i + 1]), 'hole'); last = d; } }   /* 穴と穴：間隔が変わる所だけ */
  }
  return out;
}
/** 一覧の種類ごとの本数 { size, edge, circle, hole }。 */
export function autoDimCounts(plan) { const c = { size: 0, edge: 0, circle: 0, hole: 0 }; for (const d of plan || []) if (d.autoDim in c) c[d.autoDim]++; return c; }
