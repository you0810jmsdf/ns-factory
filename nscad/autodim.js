// 寸法線を自動で入れる（事業主の希望 2026-10-19「図面に全自動で寸法線を入れ、あとから微調整が簡単にできるようにしてほしい」）。
// 純粋関数：図面（doc）と対象の図形（cand）から「作る寸法線の一覧」を返す。図面には触らない。画面側（app.js）が一覧を doc.shapes に足す。
// 入れるもの（チェックで選ぶ）：①型紙（端がつながった一周の線）ごとの全体の幅と高さ（いちばん広い所＝外接の枠） ②まっすぐな辺ごとの長さ ③円の直径 ④縫い穴の間隔（端から最初の穴・穴と穴・最後の穴から端）。
// 菱目（菱の線）には寸法を入れない（事業主指摘 2026-10-19「菱目の寸法は不要」）。
// 同じ2点を測る寸法がすでにあれば入れない（何度押しても増えない）。作った寸法には autoDim（種類）の印を付ける（「自動で入れた寸法を全部消す」で消せる）。
import { distance, bboxOf, arcLength, pointAtLength, resolvePath, pathSegments, diamondLoopSizes, outlinePolygon } from './geometry.js';

const AD_EQ = 0.01;    /* 同じ点とみなす距離（mm） */
const AD_MIN = 1;      /* これより短い寸法は入れない（mm） */
const AD_MIN_EDGE = 3; /* 辺の寸法は、これより短い辺には入れない（丸角のつなぎなど小さな辺の数字が散らばらないように） */
const AD_TINY = 3;     /* 外接の枠がこれ以下の小さな一周（小さな穴など）には、全体の幅・高さを入れない（mm） */
const AD_TYPES = ['line', 'polyline', 'path', 'arc', 'bezier', 'circle'];
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
/** 菱目（菱の線）か：小さな4点の一周（diamondLoopSizes が菱形と判定するもの）。寸法を入れない。 */
export const adIsDiamond = s => s?.type === 'polyline' && diamondLoopSizes([s]).length > 0;
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
const adBoundsOf = list => { let b = null; for (const s of list) { const x = s && bboxOf(s); if (!x) continue; b = b ? { minX: Math.min(b.minX, x.minX), minY: Math.min(b.minY, x.minY), maxX: Math.max(b.maxX, x.maxX), maxY: Math.max(b.maxY, x.maxY) } : { ...x }; } return b; };
/** 辺 p→q が、全体の幅（上下の辺で長さが幅と同じ）か全体の高さ（左右の辺で長さが高さと同じ）と同じ寸法になるか。同じなら辺の寸法は入れない（全体の寸法と二重になる）。 */
function adIsBoxEdge(p, q, b) {
  const horiz = Math.abs(p.y - q.y) <= AD_EQ, vert = Math.abs(p.x - q.x) <= AD_EQ;
  if (horiz && Math.abs(Math.abs(q.x - p.x) - (b.maxX - b.minX)) <= AD_EQ) return true;
  if (vert && Math.abs(Math.abs(q.y - p.y) - (b.maxY - b.minY)) <= AD_EQ) return true;
  return false;
}
/** 型紙（一周の線）を見つける：大きい図形から順に、端がつながった一周をたどる（outlinePolygon：0.2mm までの隙間を越え、分岐では枝に入らない＝取り込んだ図面の外形でも一周になる）。
 *  見つかった一周の図形は使用済みにして、同じ図形を2つの型紙に数えない。返す値：[{ ids, points（多角形）, box（外接の枠＝いちばん広い所）, circle }] */
export function adPieces(geo) {
  const size = s => { const b = bboxOf(s); return b ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0; };
  const order = [...geo].sort((a, b) => size(b) - size(a)), used = new Set(), pieces = [];
  for (const s of order) {
    if (used.has(s.id)) continue;
    let poly = null; try { poly = outlinePolygon(geo, s.id); } catch { poly = null; }
    if (!poly || !Array.isArray(poly.points) || poly.points.length < 3 || poly.ids.some(id => used.has(id))) continue;
    for (const id of poly.ids) used.add(id);
    const list = poly.ids.map(id => geo.find(x => x.id === id)), box = adBoundsOf(list); if (!box) continue;
    pieces.push({ ids: poly.ids, points: poly.points, box, circle: list.length === 1 && list[0].type === 'circle' });
  }
  return pieces;
}

/** 作る寸法線の一覧 [{ type:'dimension', x1, y1, x2, y2, offset, autoDim:'size'|'edge'|'circle'|'hole' }, …] を返す。
 *  doc：図面（既存の寸法・穴・経路を見る）。cand：対象の図形（画面側で「見えている・ガイドの層でない・金具でない」に絞ったもの。選んでいればその図形だけ）。
 *  gap：線から寸法線までの距離（mm・欄の数字がそのまま距離）。 */
export function autoDimensionPlan(doc, cand, { size = true, edges = true, circles = true, holes = false, gap = 8 } = {}) {
  const existing = (doc.shapes || []).filter(s => s.type === 'dimension'), out = [];
  const has = (p, q) => existing.some(d => adSamePair(d, p, q)) || out.some(d => adSamePair(d, p, q));
  const add = (p, q, offset, kind) => { if (!(distance(p, q) >= (kind === 'edge' ? AD_MIN_EDGE : AD_MIN)) || has(p, q)) return; out.push({ type: 'dimension', x1: adRound(p.x), y1: adRound(p.y), x2: adRound(q.x), y2: adRound(q.y), offset: adRound(offset), autoDim: kind }); };
  const geo = (cand || []).filter(s => s && AD_TYPES.includes(s.type) && !adIsDiamond(s));   /* 菱目（菱の線）は対象外 */
  const pieces = adPieces(geo), pieceOf = new Map(); for (const pc of pieces) for (const id of pc.ids) pieceOf.set(id, pc);
  for (const pc of pieces) {
    const b = pc.box;
    if (pc.circle) { if (circles) { const c = geo.find(s => s.id === pc.ids[0]); add({ x: c.cx - c.r, y: c.cy }, { x: c.cx + c.r, y: c.cy }, c.r + gap, 'circle'); } continue; }   /* 直径：円の上に */
    if (size && Math.max(b.maxX - b.minX, b.maxY - b.minY) > AD_TINY) {
      add({ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, gap, 'size');    /* 全体の幅（いちばん広い所）：上の辺の上（左→右の左側＝上） */
      add({ x: b.minX, y: b.minY }, { x: b.minX, y: b.maxY }, -gap, 'size');   /* 全体の高さ（いちばん高い所）：左の辺の左（上→下の左側は右＝内側なので、負で外へ） */
    }
  }
  if (edges) for (const s of geo) { const pc = pieceOf.get(s.id), poly = pc && !pc.circle ? pc.points : null; for (const [p, q] of adStraightEdges(s)) { if (size && poly && adIsBoxEdge(p, q, pc.box)) continue; add(p, q, adEdgeOffset(p, q, poly, gap), 'edge'); } }
  if (holes) for (const path of doc.paths || []) {
    if (!path.shapeIds.every(id => geo.some(s => s.id === id))) continue;
    const hs = (doc.holes || []).filter(h => h.pathId === path.id).sort((a, b) => a.s - b.s); if (hs.length < 2) continue;
    const route = resolvePath(doc, path), pc = pieceOf.get(path.shapeIds[0]), poly = pc && !pc.circle ? pc.points : null, off = (p, q) => adEdgeOffset(p, q, poly, gap);
    if (route && !path.closed) { const a = pointAtLength(route, 0), z = pointAtLength(route, arcLength(route)); if (a) add(a, hs[0], off(a, hs[0]), 'hole'); if (z) add(hs.at(-1), z, off(hs.at(-1), z), 'hole'); }   /* 端から最初の穴・最後の穴から端 */
    let last = null;
    for (let i = 0; i + 1 < hs.length; i++) { const d = distance(hs[i], hs[i + 1]); if (last === null || Math.abs(d - last) > 0.05) { add(hs[i], hs[i + 1], off(hs[i], hs[i + 1]), 'hole'); last = d; } }   /* 穴と穴：間隔が変わる所だけ */
  }
  return out;
}
/** 一覧の種類ごとの本数 { size, edge, circle, hole }。 */
export function autoDimCounts(plan) { const c = { size: 0, edge: 0, circle: 0, hole: 0 }; for (const d of plan || []) if (d.autoDim in c) c[d.autoDim]++; return c; }
