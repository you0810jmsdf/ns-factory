// 寸法線を自動で入れる（事業主の希望 2026-10-19「図面に全自動で寸法線を入れ、あとから微調整が簡単にできるようにしてほしい」）。
// 純粋関数：図面（doc）と対象の図形（cand）から「作る寸法線の一覧」を返す。図面には触らない。画面側（app.js）が一覧を doc.shapes に足す。
// 入れるもの（チェックで選ぶ）：①型紙ごとの全体の幅と高さ（いちばん広い所＝外接の枠） ②まっすぐな辺ごとの長さ ③円の直径 ④菱目の間隔（工具のピッチと違う所だけ・区間ごとに代表1本）。
// 型紙＝端どうしが 0.5mm 以内でつながっている線のかたまり（取り込んだ図面の小さな隙間・分岐・丸角＝直線＋円弧でも1つにまとまる・事業主指摘 2026-10-19「縦横の最大値寸法が入っていない」）。
// 型紙の中にある小さなかたまり（スロット・窓・穴）には全体の幅・高さを入れない（辺の長さ・円の直径は入れる）。
// 菱目（菱の線）には寸法を入れない（事業主指摘 2026-10-19「菱目の寸法は不要」）。上下・左右で対称な辺は片側だけに入れる（事業主指摘 2026-10-19「上下左右対称な部分はどちらかに寸法を入れること」）。
// 菱目の間隔は、指定した工具のピッチと違う所だけ、区間ごとに代表1本（事業主指示 2026-10-19「菱目のピッチが指定した工具と異なる部分があれば代表で入れること」）。
// 同じ2点を測る寸法がすでにあれば入れない（何度押しても増えない）。作った寸法には autoDim（種類）の印を付ける（「自動で入れた寸法を全部消す」で消せる）。
import { distance, bboxOf, arcLength, pointAtLength, resolvePath, pathSegments, diamondLoopSizes, outlinePolygon } from './geometry.js';

const AD_EQ = 0.01;      /* 同じ点とみなす距離（mm） */
const AD_MIN = 1;        /* これより短い寸法は入れない（mm） */
const AD_MIN_EDGE = 3;   /* 辺の寸法は、これより短い辺には入れない（丸角のつなぎなど小さな辺の数字が散らばらないように） */
const AD_TINY = 3;       /* 外接の枠がこれ以下の小さなかたまり（小さな穴など）には、全体の幅・高さを入れない（mm） */
const AD_JOIN = 0.5;     /* 端どうしがこの距離以内なら「つながっている」とみなす（取り込んだ図面の小さな隙間を越える・mm） */
const AD_MIRROR = 0.1;   /* 対称（鏡写し）とみなす位置の差（mm） */
const AD_PITCH_TOL = 0.05; /* 菱目の間隔が工具のピッチと「同じ」とみなす差（mm） */
const AD_TYPES = ['line', 'polyline', 'path', 'arc', 'bezier', 'circle'];
const adRound = v => Math.round(v * 100) / 100;
const adFinite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const adSame = (p, q, tol = AD_EQ) => Math.hypot(p.x - q.x, p.y - q.y) <= tol;
const adSamePair = (d, p, q, tol = AD_EQ) => { const a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }; return (adSame(a, p, tol) && adSame(b, q, tol)) || (adSame(a, q, tol) && adSame(b, p, tol)); };

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
/** 辺 p→q の寸法線を置く側：型紙の多角形があれば外側、無ければかたまりの真ん中から遠い側、それも無ければ進む向きの左。dimension() の offset は、進む向きの左が正。 */
function adEdgeOffset(p, q, pc, gap) {
  const len = distance(p, q) || 1, n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len }, mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  if (pc?.points) return adPointInPolygon({ x: mid.x + n.x * 0.5, y: mid.y + n.y * 0.5 }, pc.points) ? -gap : gap;
  if (pc?.box) { const c = { x: (pc.box.minX + pc.box.maxX) / 2, y: (pc.box.minY + pc.box.maxY) / 2 }; return n.x * (mid.x - c.x) + n.y * (mid.y - c.y) >= 0 ? gap : -gap; }
  return gap;
}
const adBoxOk = b => b && [b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite);
const adBoundsOf = list => { let b = null; for (const s of list) { let x = null; try { x = s && bboxOf(s); } catch { x = null; } if (!adBoxOk(x)) continue; b = b ? { minX: Math.min(b.minX, x.minX), minY: Math.min(b.minY, x.minY), maxX: Math.max(b.maxX, x.maxX), maxY: Math.max(b.maxY, x.maxY) } : { ...x }; } return b; };
const adSize = s => { let b = null; try { b = bboxOf(s); } catch { b = null; } return adBoxOk(b) ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0; };
/** 辺 p→q が、全体の幅（上下の辺で長さが幅と同じ）か全体の高さ（左右の辺で長さが高さと同じ）と同じ寸法になるか。同じなら辺の寸法は入れない（全体の寸法と二重になる）。 */
function adIsBoxEdge(p, q, b) {
  const horiz = Math.abs(p.y - q.y) <= AD_EQ, vert = Math.abs(p.x - q.x) <= AD_EQ;
  if (horiz && Math.abs(Math.abs(q.x - p.x) - (b.maxX - b.minX)) <= AD_EQ) return true;
  if (vert && Math.abs(Math.abs(q.y - p.y) - (b.maxY - b.minY)) <= AD_EQ) return true;
  return false;
}
/** 開いた図形の両端（円・閉じた図形は無し。座標が壊れている図形は無し）。 */
function adEnds(s) {
  if (s.type === 'circle' || s.closed) return [];
  let len = 0; try { len = arcLength(s); } catch { return []; }
  if (!(len > 1e-9)) return [];
  try { return [pointAtLength(s, 0), pointAtLength(s, len)].filter(adFinite).map(p => ({ x: p.x, y: p.y })); } catch { return []; }
}
/** 端どうしが AD_JOIN 以内でつながっている図形を、かたまりにまとめる（分岐があってもよい・一周していなくてもよい）。返す値：図形の配列の配列。 */
export function adClusters(geo) {
  const parent = geo.map((_, i) => i), find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }, union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const key = (x, y) => Math.floor(x / AD_JOIN) + ',' + Math.floor(y / AD_JOIN), grid = new Map(), ends = geo.map(adEnds);
  ends.forEach((ps, i) => { for (const p of ps) { const k = key(p.x, p.y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push({ i, p }); } });
  ends.forEach((ps, i) => { for (const p of ps) { const cx = Math.floor(p.x / AD_JOIN), cy = Math.floor(p.y / AD_JOIN); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get((cx + dx) + ',' + (cy + dy)) || []) if (o.i !== i && distance(o.p, p) <= AD_JOIN) union(i, o.i); } });
  const groups = new Map(); geo.forEach((s, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(s); });
  return [...groups.values()];
}
/** 型紙（かたまり）の一覧：[{ ids, list, box（外接の枠＝いちばん広い所）, w, h, circle（円1つだけ）, piece（全体の幅・高さを入れる型紙か）, inner（別のかたまりの枠の中にある＝スロット・窓・穴）, why（piece でない理由）, points（一周の多角形・内外の判定用・無ければ null） }]。
 *  piece＝別のかたまりの中に無く、外接の枠が AD_TINY より大きく、2つ以上の図形か・閉じた図形か・縦横とも AD_TINY より大きい1つの図形（1本の直線だけは型紙にしない）。 */
export function adPieces(geo) {
  const cl = adClusters(geo).map(list => { const box = adBoundsOf(list); return box ? { list, ids: list.map(s => s.id), box, w: box.maxX - box.minX, h: box.maxY - box.minY, circle: list.length === 1 && list[0].type === 'circle', points: null, inner: false, piece: false, why: '' } : null; }).filter(Boolean);
  for (const c of cl) c.inner = cl.some(o => o !== c && (o.w > c.w + AD_EQ || o.h > c.h + AD_EQ) && o.box.minX - AD_JOIN <= c.box.minX && o.box.minY - AD_JOIN <= c.box.minY && o.box.maxX + AD_JOIN >= c.box.maxX && o.box.maxY + AD_JOIN >= c.box.maxY);
  for (const c of cl) {
    const one = c.list.length === 1 ? c.list[0] : null;
    c.why = c.circle ? 'circle' : c.inner ? 'inner' : !(Math.max(c.w, c.h) > AD_TINY) ? 'tiny' : (one && one.type !== 'circle' && !one.closed && !(Math.min(c.w, c.h) > AD_TINY)) ? 'single' : '';
    c.piece = c.why === '';
    if (c.circle) continue;
    const start = [...c.list].sort((a, b) => adSize(b) - adSize(a))[0];
    try { const poly = outlinePolygon(c.list, start.id, { gapTol: AD_JOIN }); if (poly && Array.isArray(poly.points) && poly.points.length >= 3) c.points = poly.points; } catch { c.points = null; }   /* 一周がたどれれば、辺の外側を正しく決められる。たどれなくても、かたまりの真ん中から遠い側で決める */
  }
  return cl;
}
/** 上下・左右で対称な寸法を片側だけにする：同じ種類・同じ長さで、両方を含むかたまりの真ん中の縦線か横線で鏡写しにすると重なる寸法は、先のもの（上・左）だけ残す。
 *  落とした寸法も「見た」に数える（鏡写しの鏡写し＝点対称の所も片側だけになる）。出力の並びは元のまま。全体の幅・高さは対象外。 */
export function adDedupeMirror(dims, pieces) {
  const inBox = (c, d) => [[d.x1, d.y1], [d.x2, d.y2]].every(([x, y]) => x >= c.box.minX - AD_JOIN && x <= c.box.maxX + AD_JOIN && y >= c.box.minY - AD_JOIN && y <= c.box.maxY + AD_JOIN);
  const order = (a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2) || Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2);
  const boxes = new Map(dims.map(d => [d, pieces.filter(c => inBox(c, d))])), lenKey = d => Math.round(distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) / AD_MIRROR);
  const mirrored = (x, c, a, b) => { const cx = (c.box.minX + c.box.maxX) / 2, cy = (c.box.minY + c.box.maxY) / 2; return adSamePair(x, { x: 2 * cx - a.x, y: a.y }, { x: 2 * cx - b.x, y: b.y }, AD_MIRROR) || adSamePair(x, { x: a.x, y: 2 * cy - a.y }, { x: b.x, y: 2 * cy - b.y }, AD_MIRROR); };
  const seen = new Map(), drop = new Set();
  for (const d of [...dims].sort(order)) {
    if (d.autoDim === 'size') continue;
    const k = lenKey(d), near = [-1, 0, 1].flatMap(o => seen.get(k + o) || []).filter(x => x.autoDim === d.autoDim), a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }, mine = boxes.get(d);
    if (near.some(x => { const theirs = boxes.get(x); return mine.some(c => theirs.includes(c) && mirrored(x, c, a, b)); })) drop.add(d);
    if (!seen.has(k)) seen.set(k, []); seen.get(k).push(d);
  }
  return dims.filter(d => !drop.has(d));
}
/** 菱目（菱の線）の中心を、並びの列にする：間隔 maxD 以内で近い順にたどり、進む向きが大きく変わる相手（72度以上）には行かない（角で列を分ける）。返す値：中心の配列の配列（2つ以上）。 */
export function adDiamondChains(centers, maxD) {
  const pts = centers.filter(adFinite).map((c, i) => ({ x: c.x, y: c.y, i })), used = new Set(), chains = [];
  const key = (x, y) => Math.floor(x / maxD) + ',' + Math.floor(y / maxD), grid = new Map();
  for (const p of pts) { const k = key(p.x, p.y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const around = p => { const out = [], cx = Math.floor(p.x / maxD), cy = Math.floor(p.y / maxD); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get((cx + dx) + ',' + (cy + dy)) || []) if (o !== p && !used.has(o.i)) { const d = distance(p, o); if (d <= maxD) out.push({ o, d }); } return out; };
  const next = (cur, prev) => { let best = null, bs = Infinity; for (const { o, d } of around(cur)) { let score = d; if (prev) { const ux = cur.x - prev.x, uy = cur.y - prev.y, vx = o.x - cur.x, vy = o.y - cur.y, cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1)); if (cos < 0.3) continue; score = d * (2 - cos); } if (score < bs) { bs = score; best = o; } } return best; };
  const degree = new Map(pts.map(p => [p.i, around(p).length]));
  for (const start of [...pts].sort((a, b) => degree.get(a.i) - degree.get(b.i))) {
    if (used.has(start.i)) continue; used.add(start.i); const chain = [start];
    let prev = null, cur = start; for (;;) { const n = next(cur, prev); if (!n) break; used.add(n.i); chain.push(n); prev = cur; cur = n; }
    prev = chain.length >= 2 ? chain[1] : null; cur = chain[0]; for (;;) { const n = next(cur, prev); if (!n) break; used.add(n.i); chain.unshift(n); prev = cur; cur = n; }
    if (chain.length >= 2) { const f = chain[0], l = chain.at(-1); if (f.x > l.x + 1e-6 || (Math.abs(f.x - l.x) <= 1e-6 && f.y > l.y)) chain.reverse(); chains.push(chain.map(p => ({ x: p.x, y: p.y }))); }   /* 左→右（縦なら上→下）にそろえる：区間の代表が同じ端から決まり、上下対称の列が片側になる */
  }
  return chains;
}
/** 菱目の間隔の寸法線を置く側：型紙（かたまりの枠）の真ん中に近い側＝内側（辺の寸法と重ならない）。型紙でも一周でもないかたまり（1本の線など）なら進む向きの左。 */
function adInwardOffset(p, q, pc, gap) {
  if (!pc?.box || !(pc.piece || pc.points)) return gap;
  const len = distance(p, q) || 1, n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len }, mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, c = { x: (pc.box.minX + pc.box.maxX) / 2, y: (pc.box.minY + pc.box.maxY) / 2 };
  return n.x * (mid.x - c.x) + n.y * (mid.y - c.y) >= 0 ? -gap : gap;
}
/** 菱目の列（pts：並び順の中心。pitch＝その点の工具のピッチ）から、工具のピッチと違う区間ごとに代表1本（区間の最初の2点）を入れる。 */
function adPitchDims(runs, add, gap) {
  for (const r of runs) {
    const pts = r.pts, off = (p, q) => adInwardOffset(p, q, r.pc, gap);   /* 型紙の中では内側へ（辺の寸法と重ならない） */
    let i = 0;
    while (i + 1 < pts.length) {
      const d = distance(pts[i], pts[i + 1]), ref = pts[i].pitch ?? pts[i + 1].pitch;
      if (!(ref > 0) || Math.abs(d - ref) <= AD_PITCH_TOL) { i++; continue; }
      let j = i + 1; while (j + 1 < pts.length && Math.abs(distance(pts[j], pts[j + 1]) - d) <= AD_PITCH_TOL) j++;   /* 同じ間隔が続く所は1つの区間 */
      add(pts[i], pts[i + 1], off(pts[i], pts[i + 1]), 'hole'); i = j;
    }
  }
}

/** 作る寸法線の一覧 [{ type:'dimension', x1, y1, x2, y2, offset, autoDim:'size'|'edge'|'circle'|'hole' }, …] を返す（配列に info＝{ clusters, biggest:{ w, h, why } } を付ける：全体が入らなかった理由の案内用）。
 *  doc：図面（既存の寸法・穴・経路・工具を見る）。cand：対象の図形（画面側で「見えている・ガイドの層や点線・目印・金具でない」に絞ったもの。選んでいればその図形だけ）。
 *  gap：線から寸法線までの距離（mm・欄の数字がそのまま距離）。toolPitch：菱の線（工具を持たない菱目）に使う、指定した工具のピッチ（mm・無ければ菱の線の間隔は見ない）。 */
export function autoDimensionPlan(doc, cand, { size = true, edges = true, circles = true, holes = false, gap = 8, toolPitch = null } = {}) {
  const existing = (doc.shapes || []).filter(s => s.type === 'dimension'), out = [];
  const has = (p, q) => existing.some(d => adSamePair(d, p, q)) || out.some(d => adSamePair(d, p, q));
  const add = (p, q, offset, kind) => { if (!adFinite(p) || !adFinite(q) || !(distance(p, q) >= (kind === 'edge' ? AD_MIN_EDGE : AD_MIN)) || has(p, q)) return; out.push({ type: 'dimension', x1: adRound(p.x), y1: adRound(p.y), x2: adRound(q.x), y2: adRound(q.y), offset: adRound(offset), autoDim: kind }); };
  const geo = (cand || []).filter(s => s && AD_TYPES.includes(s.type) && !adIsDiamond(s));   /* 菱目（菱の線）は対象外 */
  const pieces = adPieces(geo), pieceOf = new Map(); for (const pc of pieces) for (const id of pc.ids) pieceOf.set(id, pc);
  const sizeExists = (p, q, box) => { const len = distance(p, q), horiz = Math.abs(p.y - q.y) <= AD_EQ, inb = (x, y) => x >= box.minX - 1 && x <= box.maxX + 1 && y >= box.minY - 1 && y <= box.maxY + 1; return existing.some(d => Math.abs(distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) - len) <= 0.02 && (horiz ? Math.abs(d.y1 - d.y2) <= 0.05 : Math.abs(d.x1 - d.x2) <= 0.05) && inb(d.x1, d.y1) && inb(d.x2, d.y2)); };   /* 手で引いた全体の寸法（同じ長さの水平／垂直の寸法が型紙の枠の中にある）があれば、同じ向きの全体は入れない（事業主が手で 283.54・125.00 を入れている図面で二重にしない） */
  for (const pc of pieces) {
    const b = pc.box;
    if (pc.circle) { if (circles) { const c = pc.list[0]; add({ x: c.cx - c.r, y: c.cy }, { x: c.cx + c.r, y: c.cy }, c.r + gap, 'circle'); } continue; }   /* 直径：円の上に */
    if (size && pc.piece) {
      const w1 = { x: b.minX, y: b.minY }, w2 = { x: b.maxX, y: b.minY }, h2 = { x: b.minX, y: b.maxY };
      if (!sizeExists(w1, w2, b)) add(w1, w2, gap, 'size');    /* 全体の幅（いちばん広い所）：上の辺の上（左→右の左側＝上） */
      if (!sizeExists(w1, h2, b)) add(w1, h2, -gap, 'size');   /* 全体の高さ（いちばん高い所）：左の辺の左（上→下の左側は右＝内側なので、負で外へ） */
    }
  }
  if (edges) for (const s of geo) { const pc = pieceOf.get(s.id); for (const [p, q] of adStraightEdges(s)) { if (size && pc?.piece && adIsBoxEdge(p, q, pc.box)) continue; add(p, q, adEdgeOffset(p, q, pc, gap), 'edge'); } }
  if (holes) {
    const runs = [], tools = doc.tools || [];
    for (const path of doc.paths || []) {   /* 目打ちの穴：経路ごとに、穴の工具のピッチと比べる */
      if (!path.shapeIds.every(id => geo.some(s => s.id === id))) continue;
      const hs = (doc.holes || []).filter(h => h.pathId === path.id).sort((a, b) => a.s - b.s); if (hs.length < 2) continue;
      runs.push({ pts: hs.map(h => ({ x: h.x, y: h.y, pitch: tools.find(t => t.id === h.toolId)?.pitch })), pc: pieceOf.get(path.shapeIds[0]) });
    }
    if (toolPitch > 0) {   /* 菱の線（取り込んだ図面の菱目）：中心を列にして、指定した工具のピッチと比べる */
      const centers = (cand || []).filter(adIsDiamond).map(s => diamondLoopSizes([s])[0]).filter(Boolean);
      const pieceAt = p => pieces.filter(c => c.piece && p.x >= c.box.minX - AD_JOIN && p.x <= c.box.maxX + AD_JOIN && p.y >= c.box.minY - AD_JOIN && p.y <= c.box.maxY + AD_JOIN).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
      for (const chain of adDiamondChains(centers, toolPitch * 1.6)) runs.push({ pts: chain.map(c => ({ ...c, pitch: toolPitch })), pc: pieceAt(chain[Math.floor(chain.length / 2)]) });
    }
    adPitchDims(runs, add, gap);
  }
  const result = adDedupeMirror(out, pieces);   /* 上下・左右で対称な辺・円・穴の間隔は片側だけ */
  const big = [...pieces].filter(c => !c.circle).sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  result.info = { clusters: pieces.length, pieces: pieces.filter(c => c.piece).length, biggest: big ? { w: adRound(big.w), h: adRound(big.h), why: big.why } : null };
  return result;
}
/** 一覧の種類ごとの本数 { size, edge, circle, hole }。 */
export function autoDimCounts(plan) { const c = { size: 0, edge: 0, circle: 0, hole: 0 }; for (const d of plan || []) if (d.autoDim in c) c[d.autoDim]++; return c; }
