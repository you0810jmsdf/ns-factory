// 三面図（正面から見た図・上から見た図・右から見た図）を描くときの手伝い。
// ここは計算だけ（画面に描くのは app.js）。依存は geometry.js の bboxOf だけ。
//
// 3つの枠の置き方：上から見た図は正面の真上、右から見た図は正面の真右。
//   正面から見た図 … 横の位置（x）と 高さ（y）
//   上から見た図   … 横の位置（x）は正面と同じ。縦（y）が「奥行き」。枠の下の辺が手前、上に行くほど奥。
//   右から見た図   … 高さ（y）は正面と同じ。横（x）が「奥行き」。枠の左の辺が手前、右に行くほど奥。
// 上から見た図の奥行きを右から見た図へ移すときは、2つの枠の「手前どうし」が出会う角から
// 右上へ伸びる 45° の線を使う（上の図の点 → 右へ → 45°の線に当たる → そこから下へ）。
import { bboxOf, flattenShape } from './geometry.js';
import { v3, faceNormal } from './sim3d.js';

/** 3つの枠の最初の場所と大きさ（mm）。枠は目安で、図形ではない。描いた形がこれより大きければ threeViewFitLayout で広がる。 */
export const THREE_VIEW_LAYOUT = {
  top: { x: 0, y: 0, w: 300, h: 220 },
  front: { x: 0, y: 250, w: 300, h: 220 },
  side: { x: 330, y: 250, w: 220, h: 220 },
};
/** 枠を広げるときの余白(mm)と、枠と枠のすき間(mm)。 */
export const THREE_VIEW_MARGIN = 10, THREE_VIEW_GAP = 30;

const keyOf = v => Math.round(v * 1e6) / 1e6; /* 同じ位置の点をひとつにまとめるための丸め */

/** 点がどの枠のものか：'front' | 'top' | 'side' | null。
 *  枠と枠のすき間の真ん中に縦横の境目を引き、左下＝正面・左上＝上から見た図・右下＝右から見た図。右上（45°の線のあたり）だけ null。
 *  枠からどれだけ離れていても、その方向にあれば同じ枠とみなす（枠は描いた形に合わせて広がるため）。 */
export function threeViewAreaAt(p, layout = THREE_VIEW_LAYOUT) {
  const divX = (layout.front.x + layout.front.w + layout.side.x) / 2, divY = (layout.top.y + layout.top.h + layout.front.y) / 2;
  const left = p.x < divX, lower = p.y >= divY;
  if (left && lower) return 'front';
  if (left) return 'top';
  if (lower) return 'side';
  return null;
}

/** 図形がどの枠のものか：図形を囲む四角の真ん中の点で決める（1 つの図形は 1 つの枠に属する。枠の境目をまたいで描いても割れない）。 */
export function threeViewShapeArea(s, layout = THREE_VIEW_LAYOUT) {
  let b = null; try { b = bboxOf(s); } catch { b = null; }
  if (!b || ![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite)) {
    const pts = threeViewGuidePoints(s).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)); if (!pts.length) return null;
    b = { minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)), minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y)) };
  }
  return threeViewAreaAt({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, layout);
}

/** 描いた形に合わせて 3 つの枠を広げる（最初の枠より小さくはしない）。
 *  正面の枠：正面と上の図の点を横に、正面と右の図の点を縦に、余白つきで含める。上の枠は正面と同じ横幅、右の枠は正面と同じ高さ。
 *  奥行き：上の図の点の奥行きと右の図の点の奥行きのいちばん深いところ＋余白を、上の枠の高さと右の枠の幅にする（両方同じ）。
 *  手前の線（上の枠の下の辺・右の枠の左の辺）は、正面の図が上や右に大きく広がらない限り動かない。 */
export function threeViewFitLayout(shapes, base = THREE_VIEW_LAYOUT, margin = THREE_VIEW_MARGIN, gap = THREE_VIEW_GAP) {
  const same = (a, b) => ['top', 'front', 'side'].every(k => ['x', 'y', 'w', 'h'].every(f => Math.abs(a[k][f] - b[k][f]) < 1e-9));
  let layout = base;
  for (let round = 0; round < 5; round++) {
    const pts = { front: [], top: [], side: [] };
    for (const s of shapes || []) { const area = threeViewShapeArea(s, layout); if (!area) continue; for (const p of threeViewGuidePoints(s)) if (Number.isFinite(p.x) && Number.isFinite(p.y)) pts[area].push(p); }
    let x0 = base.front.x, x1 = base.front.x + base.front.w, y0 = base.front.y, y1 = base.front.y + base.front.h, depth = Math.max(base.top.h, base.side.w);
    for (const p of [...pts.front, ...pts.top]) { x0 = Math.min(x0, p.x - margin); x1 = Math.max(x1, p.x + margin); }
    for (const p of [...pts.front, ...pts.side]) { y0 = Math.min(y0, p.y - margin); y1 = Math.max(y1, p.y + margin); }
    for (const p of pts.top) depth = Math.max(depth, threeViewDepthOfTopY(p.y, layout) + margin);
    for (const p of pts.side) depth = Math.max(depth, threeViewDepthOfSideX(p.x, layout) + margin);
    const bottomOfTop = Math.min(base.top.y + base.top.h, y0 - gap), leftOfSide = Math.max(base.side.x, x1 + gap);
    const next = { top: { x: x0, y: bottomOfTop - depth, w: x1 - x0, h: depth }, front: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, side: { x: leftOfSide, y: y0, w: depth, h: y1 - y0 } };
    if (same(next, layout)) break;
    layout = next;
  }
  return layout;
}

/** 上から見た図の y ↔ 奥行き（枠の下の辺＝手前からの距離）。 */
export function threeViewDepthOfTopY(y, layout = THREE_VIEW_LAYOUT) { return layout.top.y + layout.top.h - y; }
export function threeViewTopYOfDepth(d, layout = THREE_VIEW_LAYOUT) { return layout.top.y + layout.top.h - d; }
/** 右から見た図の x ↔ 奥行き（枠の左の辺＝手前からの距離）。 */
export function threeViewDepthOfSideX(x, layout = THREE_VIEW_LAYOUT) { return x - layout.side.x; }
export function threeViewSideXOfDepth(d, layout = THREE_VIEW_LAYOUT) { return layout.side.x + d; }

/** 45° の線。手前どうしが出会う角 (side.x, top.y+top.h) から右上へ、奥行きの最大値ぶん伸ばす。 */
export function threeViewMiter(layout = THREE_VIEW_LAYOUT) {
  const x0 = layout.side.x, y0 = layout.top.y + layout.top.h, len = Math.max(layout.top.h, layout.side.w);
  return { x1: x0, y1: y0, x2: x0 + len, y2: y0 - len };
}

/** 図形の目印になる点：線の両はし・折れ線の角・なめらかな線の節・円の上下左右・円弧を囲む四角の角。曲線を細かくは刻まない。 */
export function threeViewGuidePoints(s) {
  if (!s) return [];
  if (s.type === 'line' || s.type === 'fold' || s.type === 'bezier' || s.type === 'dimension') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
  if (s.type === 'polyline') return Array.isArray(s.points) ? s.points.map(p => ({ x: p.x, y: p.y })) : [];
  if (s.type === 'path') return Array.isArray(s.nodes) ? s.nodes.map(n => ({ x: n.x, y: n.y })) : [];
  if (s.type === 'circle') return [{ x: s.cx, y: s.cy - s.r }, { x: s.cx, y: s.cy + s.r }, { x: s.cx - s.r, y: s.cy }, { x: s.cx + s.r, y: s.cy }];
  if (s.type === 'arc') { const b = bboxOf(s); return b ? [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }] : []; }
  return [];
}

/** 各枠にある図形（図形ごとに枠を決める）から「合わせたい位置」を集める。
 *  front: {xs 横の位置, ys 高さ}　top: {xs 横の位置, depths 奥行き}　side: {ys 高さ, depths 奥行き}（それぞれ小さい順・重複なし） */
export function threeViewMarks(shapes, layout = THREE_VIEW_LAYOUT) {
  const sets = { front: { xs: new Set(), ys: new Set() }, top: { xs: new Set(), depths: new Set() }, side: { ys: new Set(), depths: new Set() } };
  /* 点線の「出発点」：同じ位置の点が複数あるときは、行き先に一番近い点から伸ばす（線が図形の角や端から切れ目なくつながって見えるように） */
  const from = { front: { xFrom: {}, yFrom: {} }, top: { xFrom: {}, depthFrom: {} }, side: { yFrom: {}, depthFrom: {} } };
  const keep = (map, key, value, pick) => { map[key] = key in map ? pick(map[key], value) : value; };
  for (const s of shapes || []) for (const p of threeViewGuidePoints(s)) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const area = threeViewShapeArea(s, layout); if (!area) continue;
    if (area === 'front') { const kx = keyOf(p.x), ky = keyOf(p.y); sets.front.xs.add(kx); sets.front.ys.add(ky); keep(from.front.xFrom, kx, p.y, Math.min); keep(from.front.yFrom, ky, p.x, Math.max); }
    else if (area === 'top') { const kx = keyOf(p.x), kd = keyOf(threeViewDepthOfTopY(p.y, layout)); sets.top.xs.add(kx); sets.top.depths.add(kd); keep(from.top.xFrom, kx, p.y, Math.max); keep(from.top.depthFrom, kd, p.x, Math.max); }
    else { const ky = keyOf(p.y), kd = keyOf(threeViewDepthOfSideX(p.x, layout)); sets.side.ys.add(ky); sets.side.depths.add(kd); keep(from.side.yFrom, ky, p.x, Math.min); keep(from.side.depthFrom, kd, p.y, Math.min); }
  }
  const sorted = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
  return { front: { ...sorted(sets.front), ...from.front }, top: { ...sorted(sets.top), ...from.top }, side: { ...sorted(sets.side), ...from.side } };
}

/** ある枠で描くときに合わせたい位置 {xs, ys}（文書座標）。
 *  front：横は上から見た図の横の位置、高さは右から見た図の高さ。
 *  top：横は正面の横の位置、縦は右から見た図の奥行きを移したもの。
 *  side：高さは正面の高さ、横は上から見た図の奥行きを移したもの。 */
export function threeViewTargets(area, marks, layout = THREE_VIEW_LAYOUT) {
  if (!marks) return { xs: [], ys: [] };
  if (area === 'front') return { xs: marks.top.xs.slice(), ys: marks.side.ys.slice() };
  if (area === 'top') return { xs: marks.front.xs.slice(), ys: marks.side.depths.map(d => threeViewTopYOfDepth(d, layout)) };
  if (area === 'side') return { xs: marks.top.depths.map(d => threeViewSideXOfDepth(d, layout)), ys: marks.front.ys.slice() };
  return { xs: [], ys: [] };
}

/** 描いてある図形から他の枠へ伸ばす点線（いつも表示）。{x1,y1,x2,y2, from:元の枠, to:行き先の枠} の配列。
 *  線は図形の角や端そのものから出発し、行き先の枠の向こう側のふちまで切れ目なく伸ばす（どの線がどこへ行くか見失わないように）。
 *  奥行きを移す線は、点 → 45° の線 → 行き先の枠、の折れ線（2 本）になる。 */
export function threeViewGuideLines(marks, layout = THREE_VIEW_LAYOUT) {
  if (!marks) return [];
  const { front, top, side } = layout, out = [], bottomOfTop = top.y + top.h;
  const at = (map, key, fallback) => { const v = map && map[keyOf(key)]; return Number.isFinite(v) ? v : fallback; };
  for (const x of marks.front.xs) out.push({ x1: x, y1: at(marks.front.xFrom, x, front.y), x2: x, y2: top.y, from: 'front', to: 'top' });                         /* 正面の横の位置 → 上の図（縦線） */
  for (const y of marks.front.ys) out.push({ x1: at(marks.front.yFrom, y, front.x + front.w), y1: y, x2: side.x + side.w, y2: y, from: 'front', to: 'side' });     /* 正面の高さ → 右の図（横線） */
  for (const x of marks.top.xs) out.push({ x1: x, y1: at(marks.top.xFrom, x, bottomOfTop), x2: x, y2: front.y + front.h, from: 'top', to: 'front' });               /* 上の図の横の位置 → 正面（縦線） */
  for (const d of marks.top.depths) { const y = threeViewTopYOfDepth(d, layout), mx = threeViewSideXOfDepth(d, layout);                                              /* 上の図の奥行き → 45° の線 → 右の図（縦線） */
    out.push({ x1: at(marks.top.depthFrom, d, top.x + top.w), y1: y, x2: mx, y2: y, from: 'top', to: 'side' }); out.push({ x1: mx, y1: y, x2: mx, y2: side.y + side.h, from: 'top', to: 'side' }); }
  for (const y of marks.side.ys) out.push({ x1: at(marks.side.yFrom, y, side.x), y1: y, x2: front.x, y2: y, from: 'side', to: 'front' });                           /* 右の図の高さ → 正面（横線） */
  for (const d of marks.side.depths) { const x = threeViewSideXOfDepth(d, layout), my = threeViewTopYOfDepth(d, layout);                                             /* 右の図の奥行き → 45° の線 → 上の図（横線） */
    out.push({ x1: x, y1: at(marks.side.depthFrom, d, side.y), x2: x, y2: my, from: 'side', to: 'top' }); out.push({ x1: x, y1: my, x2: top.x, y2: my, from: 'side', to: 'top' }); }
  return out;
}
/** カーソルの位置から他の 2 つの枠へ伸ばす線と、奥行きの読み。{area, lines, depth}。枠の外なら null。 */
export function threeViewCursorLines(p, layout = THREE_VIEW_LAYOUT) {
  const area = threeViewAreaAt(p, layout); if (!area) return null;
  const { front, top, side } = layout, lines = [];
  if (area === 'front') {
    lines.push({ x1: p.x, y1: p.y, x2: p.x, y2: top.y });                 /* 上へ */
    lines.push({ x1: p.x, y1: p.y, x2: side.x + side.w, y2: p.y });       /* 右へ */
    return { area, lines, depth: null };
  }
  if (area === 'top') {
    const depth = threeViewDepthOfTopY(p.y, layout), mx = threeViewSideXOfDepth(depth, layout), my = p.y;
    lines.push({ x1: p.x, y1: p.y, x2: p.x, y2: front.y + front.h });     /* 下へ（正面） */
    lines.push({ x1: p.x, y1: p.y, x2: mx, y2: my });                     /* 右へ、45°の線まで */
    lines.push({ x1: mx, y1: my, x2: mx, y2: side.y + side.h });          /* 45°の線から下へ（右から見た図） */
    return { area, lines, depth };
  }
  const depth = threeViewDepthOfSideX(p.x, layout), mx = p.x, my = threeViewTopYOfDepth(depth, layout);
  lines.push({ x1: p.x, y1: p.y, x2: front.x, y2: p.y });                 /* 左へ（正面） */
  lines.push({ x1: p.x, y1: p.y, x2: mx, y2: my });                       /* 上へ、45°の線まで */
  lines.push({ x1: mx, y1: my, x2: top.x, y2: my });                      /* 45°の線から左へ（上から見た図） */
  return { area, lines, depth };
}

/** 描こうとしている点を、他の枠から伸ばした線にぴったり合わせる。
 *  tol(mm) 以内に線があれば、その向き（横 or 縦）だけ置き換える。合う線が無ければ null。
 *  返り値：{ point, snappedX, snappedY, area } */
export function threeViewSnap(p, marks, tol, layout = THREE_VIEW_LAYOUT) {
  if (!(tol > 0)) return null;
  const area = threeViewAreaAt(p, layout); if (!area) return null;
  const { xs, ys } = threeViewTargets(area, marks, layout);
  const nearest = (v, list) => { let best = null, bd = tol; for (const c of list) { const d = Math.abs(c - v); if (d < bd) { bd = d; best = c; } } return best; };
  const sx = nearest(p.x, xs), sy = nearest(p.y, ys);
  if (sx === null && sy === null) return null;
  return { point: { x: sx ?? p.x, y: sy ?? p.y }, snappedX: sx !== null, snappedY: sy !== null, area };
}

/** 正面の枠にある図形をぜんぶ囲む四角（いちばん外側）と奥行きから、上から見た図と右から見た図の外形（四角）を作る。
 *  上の図：横は正面と同じ、縦は枠の下の辺（手前）から depth ぶん上へ。右の図：高さは正面と同じ、横は枠の左の辺（手前）から depth ぶん右へ。
 *  文字・寸法・折り線・下絵は数えない。正面に形が無い（幅か高さが 0）・奥行きが 0 以下なら null。
 *  返り値：{ top: 折れ線, side: 折れ線, width, height, depth } */
export function threeViewOutlines(shapes, depth, layout = THREE_VIEW_LAYOUT) {
  if (!(depth > 0)) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes || []) {
    if (!s || ['text', 'dimension', 'fold', 'image'].includes(s.type)) continue;
    let b = null; try { b = bboxOf(s); } catch { b = null; }
    if (!b || ![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite)) continue;
    if (threeViewShapeArea(s, layout) !== 'front') continue;
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY); maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  }
  if (!(maxX - minX > 1e-9) || !(maxY - minY > 1e-9)) return null;
  const rect = (x1, y1, x2, y2) => ({ type: 'polyline', closed: true, points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
  const bottomOfTop = layout.top.y + layout.top.h, leftOfSide = layout.side.x;
  return { top: rect(minX, bottomOfTop - depth, maxX, bottomOfTop), side: rect(leftOfSide, minY, leftOfSide + depth, maxY), width: maxX - minX, height: maxY - minY, depth };
}

/** 2 つの図形が同じ四角（閉じた折れ線・4 点・並び順は問わない）かどうか。重ねて作らないための判定。 */
export function threeViewSameRect(a, b, eps = 1e-6) {
  if (!a || !b || a.type !== 'polyline' || b.type !== 'polyline' || !a.closed || !b.closed) return false;
  if (!Array.isArray(a.points) || !Array.isArray(b.points) || a.points.length !== 4 || b.points.length !== 4) return false;
  const key = p => [...p].sort((u, v) => u.x - v.x || u.y - v.y);
  const pa = key(a.points), pb = key(b.points);
  return pa.every((p, i) => Math.abs(p.x - pb[i].x) < eps && Math.abs(p.y - pb[i].y) < eps);
}

// ---- 三面図から立体を組み立てる（3D 表示用） ----
/** 閉じた図形（折れ線・なめらかな線・円）を点の列にする。閉じていなければ null。 */
function closedPolygon(s, tol) {
  if (!s || !['polyline', 'path', 'circle'].includes(s.type) || !(s.closed || s.type === 'circle')) return null;
  let pts; try { pts = flattenShape(s, tol); } catch { return null; }
  if (pts.length > 1 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < 1e-9) pts = pts.slice(0, -1);
  return pts.length >= 3 ? pts : null;
}
const polyArea = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.x * q.y - q.x * p.y; }, 0) / 2);
/** 高さ y の横線が多角形と交わる区間（[x0, x1] の列・小さい順）。 */
export function threeViewSpansAt(poly, y) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; if ((p.y > y) !== (q.y > y)) xs.push(p.x + (y - p.y) * (q.x - p.x) / (q.y - p.y)); }
  xs.sort((a, b) => a - b); const out = []; for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 1e-9) out.push([xs[i], xs[i + 1]]); return out;
}
/** 多角形を長方形 [x0,x1]×[y0,y1] で切り取る（辺ごとに順に切る）。 */
export function threeViewClipToRect(poly, x0, x1, y0, y1) {
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const clip = (pts, inside, cross) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) out.push(cross(a, b)); } return out; };
  let p = poly;
  p = clip(p, q => q.x >= x0, (a, b) => lerp(a, b, (x0 - a.x) / (b.x - a.x)));
  p = clip(p, q => q.x <= x1, (a, b) => lerp(a, b, (x1 - a.x) / (b.x - a.x)));
  p = clip(p, q => q.y >= y0, (a, b) => lerp(a, b, (y0 - a.y) / (b.y - a.y)));
  p = clip(p, q => q.y <= y1, (a, b) => lerp(a, b, (y1 - a.y) / (b.y - a.y)));
  return p.filter((q, i) => i === 0 || Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y) > 1e-9);
}
/** 三面図から立体を組み立てる。
 *  正面の枠の閉じた形（いちばん大きいもの）＝正面の輪郭、上の枠の閉じた形＝上の輪郭（横 x × 奥行き）、右の枠の閉じた形＝右の輪郭（奥行き × 高さ）。
 *  高さを薄い輪切りにし、各輪切りで「正面の横幅 × 右の奥行き」の長方形で上の輪郭を切り取った形を、輪切りの厚みぶん積み上げる。
 *  上の輪郭が無ければ長方形（奥行きは右の輪郭から・それも無ければ depthDefault）。右の輪郭が無ければ奥行きいっぱい。正面に閉じた形が無ければ null。
 *  3D の置き方（sim3d と同じ座標）：x はそのまま、高さは正面の下端を z=0 として上へ（z = 下端 − y）、奥行きは正面の下端の y を手前として奥へ y が小さくなる（y = 下端 − 奥行き）。
 *  返り値：{ faces（sim3d.applyFolds と同じ形）, slabs, width, height, depth, hasTop, hasSide } */
export function threeViewSolid(shapes, layout = THREE_VIEW_LAYOUT, { depthDefault = 30, tolerance = 0.3, maxSlices = 80 } = {}) {
  const groups = { front: [], top: [], side: [] };
  for (const s of shapes || []) { const area = threeViewShapeArea(s, layout); if (!area) continue; const poly = closedPolygon(s, tolerance); if (poly) groups[area].push(poly); }
  const biggest = list => list.length ? list.reduce((a, b) => polyArea(b) > polyArea(a) ? b : a) : null;
  const F = biggest(groups.front); if (!F) return null;
  const bottomOfTop = layout.top.y + layout.top.h, leftOfSide = layout.side.x;
  const topPoly = biggest(groups.top), sidePoly = biggest(groups.side);
  const T = topPoly ? topPoly.map(p => ({ x: p.x, y: bottomOfTop - p.y })) : null;      /* (x, 奥行き) */
  const S = sidePoly ? sidePoly.map(p => ({ x: p.x - leftOfSide, y: p.y })) : null;    /* (奥行き, 高さ y) */
  const fy = F.map(p => p.y), minY = Math.min(...fy), maxY = Math.max(...fy);
  const depthMax = T ? Math.max(...T.map(p => p.y)) : S ? Math.max(...S.map(p => p.x)) : depthDefault;
  if (!(maxY - minY > 1e-9) || !(depthMax > 1e-9)) return null;
  let levels = [...new Set([...fy, ...(S ? S.map(p => p.y) : [])].map(v => Math.round(v * 1e6) / 1e6))].filter(v => v >= minY - 1e-9 && v <= maxY + 1e-9).sort((a, b) => a - b);
  if (levels.length - 1 > maxSlices) levels = Array.from({ length: maxSlices + 1 }, (_, i) => minY + (maxY - minY) * i / maxSlices);
  const base = maxY, to3 = (x, d, y) => v3(x, base - d, base - y);
  const mean = pts => pts.reduce((a, p) => v3(a.x + p.x / pts.length, a.y + p.y / pts.length, a.z + p.z / pts.length), v3());
  const faces = []; let slabs = 0;
  for (let i = 0; i + 1 < levels.length; i++) {
    const ya = levels[i], yb = levels[i + 1]; if (yb - ya < 1e-9) continue;
    const ym = (ya + yb) / 2, xSpans = threeViewSpansAt(F, ym), dSpans = S ? threeViewSpansAt(S, ym) : [[0, depthMax]];
    for (const [x0, x1] of xSpans) for (const [d0, d1] of dSpans) {
      const poly = T ? threeViewClipToRect(T, x0, x1, d0, d1) : [{ x: x0, y: d0 }, { x: x1, y: d0 }, { x: x1, y: d1 }, { x: x0, y: d1 }];
      if (poly.length < 3 || polyArea(poly) < 1e-6) continue;
      slabs++;
      const top = poly.map(p => to3(p.x, p.y, ya)), bottom = poly.map(p => to3(p.x, p.y, yb)), centre = mean(top.concat(bottom));
      const push = (kind, pts) => { let n = faceNormal(pts); const c = mean(pts); if ((c.x - centre.x) * n.x + (c.y - centre.y) * n.y + (c.z - centre.z) * n.z < 0) { pts = [...pts].reverse(); n = faceNormal(pts); } faces.push({ kind, points: pts, normal: n, center: c, panelId: 'threeView', partId: 'threeView', color: null }); };
      push('top', top); push('bottom', bottom);
      for (let k = 0; k < poly.length; k++) { const j = (k + 1) % poly.length; push('side', [top[k], top[j], bottom[j], bottom[k]]); }
    }
  }
  if (!slabs) return null;
  const xs = F.map(p => p.x);
  return { faces, slabs, width: Math.max(...xs) - Math.min(...xs), height: maxY - minY, depth: depthMax, hasTop: !!T, hasSide: !!S };
}
