// 革の厚みを考慮した設計：折り代・重ね補正・コバ帯・駒合わせ・パッチワークの目打ち最適化・ピース寸法提案。
// 純粋関数のみ（DOM 禁止）。単位 mm・角度は度。
import { distance, offsetPolyline, arcLength, pointAtLength, resolvePath, cornerHoles, equalDivide, chainShapes, flattenShape, areaOf, allIntersections, offsetShape, intersections, distToShape, bboxOf, circlePoint } from './geometry.js';

const DEPS = 1e-9;
/** 折り代 ΔL = θ[rad] × (r + K·t)。t=厚み、angleDeg=折り角、r=内曲げ半径（既定 0）、k=中立係数（既定 0.5）。 */
export function foldAllowance(thickness, angleDeg, { k = 0.5, r = 0 } = {}) {
  if (![thickness, angleDeg, k, r].every(Number.isFinite) || thickness < 0 || angleDeg < 0) return 0;
  return angleDeg * Math.PI / 180 * (r + k * thickness);
}
/** 重ね補正。mode='fold'：折りで包む（追加長 = θ × Σ内側厚み）。mode='box'：箱状に包む（外寸の増分 = 2 × Σ内側厚み・片側は Σt）。 */
export function stackOffset(thicknesses, { mode = 'fold', angleDeg = 180 } = {}) {
  const sum = (thicknesses || []).filter(Number.isFinite).reduce((a, b) => a + b, 0);
  if (mode === 'box') return { total: 2 * sum, perSide: sum };
  const extra = angleDeg * Math.PI / 180 * sum; return { total: extra, perSide: extra / 2 };
}
/** 部品の輪郭（点列）と厚みから、コバ（断面）の帯 {inner, outer, thickness} を返す。outer は外側オフセット。 */
export function edgeBand(points, thickness, closed = true) {
  if (!(thickness > 0) || !points || points.length < (closed ? 3 : 2)) return null;
  const outer = offsetPolyline(points, thickness, closed, { join: 'round' });
  return outer.length ? { inner: points.map(p => ({ ...p })), outer, thickness } : null;
}

/** 駒合わせ：2 経路の長さと基準ピッチから、穴数 N を揃えた実ピッチを返す。prefer='A'|'B'|'both'。閉経路は len/N、開経路は (len−余白)/(N−1)。 */
export function matchPitch(lenA, lenB, pitch, { prefer = 'both', marginStart = 0, marginEnd = 0, closed = false, tolerancePct = 15 } = {}) {
  if (!(pitch > 0) || !(lenA >= 0) || !(lenB >= 0)) return null;
  const effA = closed ? lenA : lenA - marginStart - marginEnd, effB = closed ? lenB : lenB - marginStart - marginEnd;
  if (effA < DEPS || effB < DEPS) return null;
  const base = prefer === 'A' ? effA : prefer === 'B' ? effB : (effA + effB) / 2;
  const segments = Math.max(1, Math.round(base / pitch));
  const n = closed ? segments : segments + 1, div = closed ? n : n - 1;
  const pitchA = effA / div, pitchB = effB / div;
  const diffPct = Math.max(Math.abs(pitchA / pitch - 1), Math.abs(pitchB / pitch - 1)) * 100;
  return { n, pitchA, pitchB, diffPct, warn: diffPct > tolerancePct };
}
/** 経路の区切り位置（角 30° 超・直線↔曲線の継ぎ目）を弧長で返す（両端は含まない）。 */
export function routeBreaks(route) {
  const len = arcLength(route), out = new Set();
  for (const c of cornerHoles(route, 'place')) if (c.s > DEPS && c.s < len - DEPS) out.add(+c.s.toFixed(6));
  if (route.items) { let s = 0; for (let i = 0; i < route.items.length - 1; i++) { s += arcLength(route.items[i].shape); const a = route.items[i].shape.type, b = route.items[i + 1].shape.type; if ((a === 'line') !== (b === 'line')) out.add(+(route.reversed ? len - s : s).toFixed(6)); } }
  return [...out].sort((a, b) => a - b);
}
/** 駒合わせ：2 経路（resolvePath 済み）を区間ごとに合わせ、両側の穴位置と対応表を返す。区間数が合わないときは 1 区間として扱う。 */
export function matchRoutes(routeA, routeB, pitch, opts = {}) {
  const lenA = arcLength(routeA), lenB = arcLength(routeB);
  let bA = routeBreaks(routeA), bB = routeBreaks(routeB);
  if (bA.length !== bB.length) { bA = []; bB = []; }
  const edgesA = [0, ...bA, lenA], edgesB = [0, ...bB, lenB], holesA = [], holesB = [], segments = [];
  for (let i = 0; i + 1 < edgesA.length; i++) {
    const la = edgesA[i + 1] - edgesA[i], lb = edgesB[i + 1] - edgesB[i];
    const m = matchPitch(la, lb, pitch, { ...opts, closed: false, marginStart: i === 0 ? (opts.marginStart || 0) : 0, marginEnd: i + 2 === edgesA.length ? (opts.marginEnd || 0) : 0 });
    if (!m) continue;
    const posA = equalDivide(la, m.pitchA, 0).map(s => s + edgesA[i]), posB = equalDivide(lb, m.pitchB, 0).map(s => s + edgesB[i]);
    const startA = i === 0 ? (opts.marginStart || 0) : 0, endA = i + 2 === edgesA.length ? (opts.marginEnd || 0) : 0;
    const pa = startA || endA ? equalDivide(la - startA - endA, m.pitchA, 0).map(s => s + edgesA[i] + startA) : posA;
    const pb = startA || endA ? equalDivide(lb - startA - endA, m.pitchB, 0).map(s => s + edgesB[i] + startA) : posB; // 余白は B 側も同じ mm
    const dropEnd = i + 2 === edgesA.length && routeA.closed && !endA; // 閉経路：最終区間の終点は始点と同じ位置なので置かない
    for (let k = 0; k < Math.min(pa.length, pb.length); k++) {
      if (i > 0 && k === 0) continue; // 区間境界の穴は前の区間の終点と共有
      if (dropEnd && k === pa.length - 1) continue;
      holesA.push(pointAtLength(routeA, pa[k])); holesB.push(pointAtLength(routeB, pb[k]));
    }
    segments.push({ index: i, lenA: la, lenB: lb, ...m });
  }
  return { holesA, holesB, pairs: holesA.map((_, i) => ({ a: i, b: i })), segments, warn: segments.some(s => s.warn) };
}

/** パッチワーク：縫い合わせ線（seams）から共有辺の穴を最適化する。
 *  戻り値 {holesByPath: Map(pathId → [{x,y,s,angleDeg}]), pairs:[{seamId,a:{pathId,s},b:{pathId,s}}], warnings:[{seamId,segment,pitchA,pitchB,diffPct}]}。 */
export function optimizePatchHoles(doc, { pitch = 4, tolerancePct = 15, junctionClearMm = null } = {}) {
  const clear = junctionClearMm ?? pitch / 2, routes = new Map(), bounds = new Map();
  const route = id => { if (!routes.has(id)) { const p = doc.paths.find(p => p.id === id); routes.set(id, p ? resolvePath(doc, p) : null); } return routes.get(id); };
  const addBound = (pathId, s, kind) => { const r = route(pathId); if (!r) return; const len = arcLength(r); s = Math.max(0, Math.min(len, s)); const list = bounds.get(pathId) || []; const hit = list.find(b => Math.abs(b.s - s) < 1e-6); if (hit) { if (kind === 'corner') hit.kind = 'corner'; else if (hit.kind === 'end') hit.kind = kind; } else list.push({ s, kind }); bounds.set(pathId, list); };
  // 1. 区切り：経路の端・縫い合わせ範囲の端・角を集め、相手側へ写す
  for (const seam of doc.seams || []) for (const side of [seam.a, seam.b]) { const r = route(side.pathId); if (!r) continue; const len = arcLength(r); addBound(side.pathId, 0, 'end'); addBound(side.pathId, len, 'end'); addBound(side.pathId, side.from, 'junction'); addBound(side.pathId, side.to, 'junction'); for (const c of cornerHoles(r, 'place')) addBound(side.pathId, c.s, 'corner'); }
  const map = (seam, from, s) => { const [src, dst] = from === 'a' ? [seam.a, seam.b] : [seam.b, seam.a]; const t = (s - src.from) / Math.max(DEPS, src.to - src.from); const u = seam.reversed ? 1 - t : t; return dst.from + u * (dst.to - dst.from); };
  for (let pass = 0; pass < 2; pass++) for (const seam of doc.seams || []) for (const from of ['a', 'b']) { const src = from === 'a' ? seam.a : seam.b, dst = from === 'a' ? seam.b : seam.a; for (const b of bounds.get(src.pathId) || []) if (b.s > src.from + 1e-6 && b.s < src.to - 1e-6) addBound(dst.pathId, map(seam, from, b.s), b.kind === 'corner' ? 'corner' : 'junction'); }
  // 2. 縫い合わせごと・区間ごとに N を決めて穴を置く
  const holesByPath = new Map(), pairs = [], warnings = [];
  const placed = (pathId, s) => (holesByPath.get(pathId) || []).some(h => Math.abs(h.s - s) < 1e-6);
  const put = (pathId, s) => { const r = route(pathId); if (r && r.closed && Math.abs(s - arcLength(r)) < 1e-6) s = 0; if (!r || placed(pathId, s)) return; const list = holesByPath.get(pathId) || []; list.push(pointAtLength(r, s)); holesByPath.set(pathId, list); };
  for (const seam of doc.seams || []) {
    const ra = route(seam.a.pathId), rb = route(seam.b.pathId); if (!ra || !rb) continue;
    const inRange = (side, b) => b.s >= side.from - 1e-6 && b.s <= side.to + 1e-6;
    const ba = (bounds.get(seam.a.pathId) || []).filter(b => inRange(seam.a, b)).sort((x, y) => x.s - y.s);
    for (let i = 0; i + 1 < ba.length; i++) {
      const s0 = ba[i], s1 = ba[i + 1], t0 = map(seam, 'a', s0.s), t1 = map(seam, 'a', s1.s), lb = Math.abs(t1 - t0), la = s1.s - s0.s;
      if (la < DEPS) continue;
      const c0 = s0.kind === 'junction' ? clear : 0, c1 = s1.kind === 'junction' ? clear : 0;
      const ua = la - c0 - c1; if (ua < DEPS) continue;
      const existingA = (holesByPath.get(seam.a.pathId) || []).filter(h => h.s > s0.s + 1e-6 - (c0 ? 0 : 1e-6) && h.s < s1.s - 1e-6 + (c1 ? 0 : 1e-6) && h.s >= s0.s - 1e-6 && h.s <= s1.s + 1e-6);
      const tb0 = Math.min(t0, t1), tb1 = Math.max(t0, t1);
      const existingB = (holesByPath.get(seam.b.pathId) || []).filter(h => h.s >= tb0 - 1e-6 && h.s <= tb1 + 1e-6);
      if (existingA.length >= 2 || existingB.length >= 2) {
        // 片側に既に穴があれば、その位置を相手へ写して対応させる（両側にあるときは数が合えば順に対応）
        const fromA = existingA.length >= existingB.length;
        const src = fromA ? existingA : existingB, mapTo = fromA ? (s => map(seam, 'a', s)) : (s => map(seam, 'b', s));
        const pa = fromA ? src.map(h => h.s) : src.map(h => mapTo(h.s)), pb = fromA ? src.map(h => mapTo(h.s)) : src.map(h => h.s);
        const pitchA = pa.length > 1 ? (Math.max(...pa) - Math.min(...pa)) / (pa.length - 1) : pitch, pitchB = pb.length > 1 ? (Math.max(...pb) - Math.min(...pb)) / (pb.length - 1) : pitch;
        const diffPct = Math.max(Math.abs(pitchA / pitch - 1), Math.abs(pitchB / pitch - 1)) * 100;
        if (diffPct > tolerancePct) warnings.push({ seamId: seam.id, segment: i, pitchA, pitchB, diffPct });
        for (let k = 0; k < pa.length; k++) { put(seam.a.pathId, pa[k]); put(seam.b.pathId, pb[k]); pairs.push({ seamId: seam.id, a: { pathId: seam.a.pathId, s: pa[k] }, b: { pathId: seam.b.pathId, s: pb[k] } }); }
        continue;
      }
      let m = matchPitch(ua, lb * ua / la, pitch, { prefer: 'both', tolerancePct });
      if (!m) { warnings.push({ seamId: seam.id, segment: i, pitchA: 0, pitchB: 0, diffPct: 100 }); continue; }
      if (m.warn) { for (const n of [m.n - 1, m.n + 1]) { if (n < 2) continue; const alt = { ...m, n, pitchA: ua / (n - 1), pitchB: lb * ua / la / (n - 1) }; alt.diffPct = Math.max(Math.abs(alt.pitchA / pitch - 1), Math.abs(alt.pitchB / pitch - 1)) * 100; alt.warn = alt.diffPct > tolerancePct; if (alt.diffPct < m.diffPct) m = alt; } }
      if (m.warn) warnings.push({ seamId: seam.id, segment: i, pitchA: m.pitchA, pitchB: m.pitchB, diffPct: m.diffPct });
      for (let k = 0; k < m.n; k++) {
        const sa = s0.s + c0 + (ua / (m.n - 1)) * k, sb = map(seam, 'a', sa);
        put(seam.a.pathId, sa); put(seam.b.pathId, sb); pairs.push({ seamId: seam.id, a: { pathId: seam.a.pathId, s: sa }, b: { pathId: seam.b.pathId, s: sb } });
      }
    }
  }
  for (const list of holesByPath.values()) list.sort((x, y) => x.s - y.s);
  return { holesByPath, pairs, warnings };
}

/** ピース寸法の提案：仕上がり辺長をピッチの整数倍にし、縦横の分割数を揃えて正方形に近づける。候補は squareness 降順。 */
export function suggestPatchSize({ targetMm = null, targetW = null, targetH = null, pitch = 4, seamAllowanceMm = 3, style = 'butt', thickness = 1.5, k = 0.5 } = {}) {
  const tw = targetW ?? targetMm, th = targetH ?? targetMm; if (!(tw > 0) || !(th > 0) || !(pitch > 0)) return [];
  const allowance = style === 'felled' ? seamAllowanceMm + foldAllowance(thickness, 180, { k }) : seamAllowanceMm;
  const nw = Math.max(1, Math.round(tw / pitch)), nh = Math.max(1, Math.round(th / pitch)), out = [];
  for (const a of [nw - 1, nw, nw + 1]) for (const b of [nh - 1, nh, nh + 1]) {
    if (a < 1 || b < 1 || (Math.abs(tw - th) < 1e-9 && Math.abs(a - b) > 1)) continue; // 正方形指定のときだけ縦横の分割数を揃える
    const fw = a * pitch, fh = b * pitch;
    out.push({ nW: a, nH: b, finishedW: fw, finishedH: fh, cutW: fw + 2 * allowance, cutH: fh + 2 * allowance, actualPitch: pitch, allowance, squareness: Math.min(fw, fh) / Math.max(fw, fh), error: Math.abs(fw - tw) + Math.abs(fh - th) });
  }
  const seen = new Set();
  return out.filter(c => { const key = c.nW + 'x' + c.nH; if (seen.has(key)) return false; seen.add(key); return true; }).sort((x, y) => Math.abs(tw - th) < 1e-9 ? (y.squareness - x.squareness || x.error - y.error) : (x.error - y.error || y.squareness - x.squareness)).slice(0, 3); // 正方形指定は正方形らしさ優先、縦横指定は目標に近い順
}
/** 格子状のピース群を作る。戻り値 {pieces:[{points(closed), col,row}], seams:[{a:{piece,edge},b:{piece,edge}}], pitch}。edge は 0=上,1=右,2=下,3=左。 */
export function patchGrid({ cols = 3, rows = 3, pitch = 4, seamAllowanceMm = 3, pieceW = null, pieceH = null, targetMm = 40, style = 'butt', thickness = 1.5, gapMm = 6, origin = { x: 0, y: 0 } } = {}) {
  const best = suggestPatchSize({ targetW: pieceW ?? targetMm, targetH: pieceH ?? targetMm, pitch, seamAllowanceMm, style, thickness })[0];
  if (!best) return null;
  const pieces = [], seams = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = origin.x + c * (best.cutW + gapMm), y = origin.y + r * (best.cutH + gapMm);
    pieces.push({ col: c, row: r, points: [{ x, y }, { x: x + best.cutW, y }, { x: x + best.cutW, y: y + best.cutH }, { x, y: y + best.cutH }], closed: true });
  }
  const idx = (c, r) => r * cols + c;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (c + 1 < cols) seams.push({ a: { piece: idx(c, r), edge: 1 }, b: { piece: idx(c + 1, r), edge: 3 } }); if (r + 1 < rows) seams.push({ a: { piece: idx(c, r), edge: 2 }, b: { piece: idx(c, r + 1), edge: 0 } }); }
  return { pieces, seams, size: best, pitch };
}
/** 折り線（2 点）で部品の点列を分け、inner でない側を法線方向に ΔL だけ伸ばした新しい点列を返す（折り代の自動付加）。 */
export function extendAcrossFold(points, fold, deltaMm) {
  const v = { x: fold.x2 - fold.x1, y: fold.y2 - fold.y1 }, len = Math.hypot(v.x, v.y); if (len < DEPS || !(deltaMm > 0)) return points.map(p => ({ ...p }));
  const n = { x: -v.y / len, y: v.x / len }, side = p => (p.x - fold.x1) * n.x + (p.y - fold.y1) * n.y;
  const far = fold.inner ? 1 : -1; // inner=true は法線の正側を内側として、負側（折り線の先）を伸ばす
  return points.map(p => Math.sign(side(p)) === far ? { x: p.x + n.x * far * deltaMm, y: p.y + n.y * far * deltaMm } : { ...p });
}
/** 線分 2 本（部品の辺 A と相手 B）のうち、A を B の厚み/2 だけ内側へずらした駒合わせ用の縫い線を返す。inward は内側の向き（+1/−1）。 */
export function komaStitchLine(edge, thicknessB, inward = 1) {
  const v = { x: edge.x2 - edge.x1, y: edge.y2 - edge.y1 }, len = Math.hypot(v.x, v.y); if (len < DEPS) return null;
  const n = { x: -v.y / len * inward, y: v.x / len * inward }, d = thicknessB / 2;
  return { type: 'line', x1: edge.x1 + n.x * d, y1: edge.y1 + n.y * d, x2: edge.x2 + n.x * d, y2: edge.y2 + n.y * d };
}


/* ---- パッチワークの柄（アーガイル・市松）：囲まれた図形を柄のピースに分ける ---- */
const signedAreaOf = ps => ps.reduce((s, q, i) => { const r = ps[(i + 1) % ps.length]; return s + q.x * r.y - r.x * q.y; }, 0) / 2;
/** パッチワークの柄の登録表。tiles(bbox, cell) は bbox を隙間なく覆う凸多角形（辺で接する）の配列 [{points, parity}] を返す。 */
export const PATCH_PATTERNS = {
  ichimatsu: {
    ja: '市松', en: 'Ichimatsu (checker)',
    tiles(b, cell) {
      const cols = Math.ceil((b.maxX - b.minX) / cell), rows = Math.ceil((b.maxY - b.minY) / cell), out = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = b.minX + i * cell, y = b.minY + j * cell; out.push({ parity: (i + j) % 2, points: [{ x, y }, { x: x + cell, y }, { x: x + cell, y: y + cell }, { x, y: y + cell }] }); }
      return out;
    },
  },
  argyle: {
    ja: 'アーガイル', en: 'Argyle',
    tiles(b, cell) {
      const w = cell, h = cell * 1.5, kMax = Math.ceil((b.maxY - b.minY) / (h / 2)) + 1, iMax = Math.ceil((b.maxX - b.minX) / w) + 1, out = [];
      for (let k = -1; k <= kMax; k++) for (let i = -1; i <= iMax; i++) {
        const odd = ((k % 2) + 2) % 2, cx = b.minX + i * w + odd * w / 2, cy = b.minY + k * h / 2;
        if (cx + w / 2 < b.minX || cx - w / 2 > b.maxX || cy + h / 2 < b.minY || cy - h / 2 > b.maxY) continue;
        out.push({ parity: odd /* 辺で接する隣のひし形は必ず行が1つずれる＝行の偶奇で2色に塗り分けられる */, points: [{ x: cx, y: cy - h / 2 }, { x: cx + w / 2, y: cy }, { x: cx, y: cy + h / 2 }, { x: cx - w / 2, y: cy }] });
      }
      return out;
    },
  },
};
/** 多角形から、重なった頂点と一直線上の頂点を取り除く。 */
function cleanPolygon(points, eps = 1e-7) {
  let ps = points.filter((q, i) => distance(q, points[(i + points.length - 1) % points.length]) > eps);
  for (let changed = true; changed && ps.length >= 3;) {
    changed = false;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[(i + ps.length - 1) % ps.length], b = ps[i], c = ps[(i + 1) % ps.length];
      if (Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) <= eps * Math.max(1, distance(a, b) * distance(b, c))) { ps = ps.filter((_, j) => j !== i); changed = true; break; }
    }
  }
  return ps;
}
/** 凸な clip で任意の多角形 subject を切り抜く（Sutherland–Hodgman）。面積のない結果は []。 */
export function clipPolygonByConvex(subject, clip) {
  const win = signedAreaOf(clip) >= 0 ? clip : [...clip].reverse();
  let out = subject;
  for (let i = 0; i < win.length && out.length; i++) {
    const a = win[i], c = win[(i + 1) % win.length], input = out; out = [];
    const side = q => (c.x - a.x) * (q.y - a.y) - (c.y - a.y) * (q.x - a.x);
    const cut = (q, r) => { const d1 = side(q), d2 = side(r), t = d1 / (d1 - d2); return { x: q.x + (r.x - q.x) * t, y: q.y + (r.y - q.y) * t }; };
    for (let j = 0; j < input.length; j++) {
      const q = input[j], r = input[(j + 1) % input.length], qi = side(q) >= -1e-9, ri = side(r) >= -1e-9;
      if (qi && ri) out.push(r); else if (qi) out.push(cut(q, r)); else if (ri) { out.push(cut(q, r)); out.push(r); }
    }
  }
  out = cleanPolygon(out);
  return out.length >= 3 && Math.abs(signedAreaOf(out)) > 1e-9 ? out : [];
}
/** 実線だけで囲まれた閉じた経路（連結した線・閉じた折れ線・円など）の多角形を返す。点線（lineStyle 'dashed'）は辺に使わない。 */
export function closedRegions(shapes, tol = 0.01) {
  const solid = shapes.filter(s => s.lineStyle !== 'dashed' && ['line', 'arc', 'bezier', 'polyline', 'circle', 'path'].includes(s.type)), out = [];
  for (const chain of chainShapes(solid, tol)) {
    if (!chain.closed) continue;
    const pts = [];
    for (const it of chain.items) { let ps = flattenShape(it.shape, 0.05); if (it.reversed) ps = [...ps].reverse(); pts.push(...(pts.length && distance(pts.at(-1), ps[0]) < tol ? ps.slice(1) : ps)); }
    if (pts.length > 1 && distance(pts[0], pts.at(-1)) < tol) pts.pop();
    if (pts.length >= 3) out.push({ shapeIds: chain.shapeIds, points: pts, area: areaOf(pts) });
  }
  return out;
}
const insidePolygon = (p, ps) => { let inside = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) if ((ps[i].y > p.y) !== (ps[j].y > p.y) && p.x < (ps[j].x - ps[i].x) * (p.y - ps[i].y) / (ps[j].y - ps[i].y) + ps[i].x) inside = !inside; return inside; };
/** 点 p を内側に含む、最も内側（面積最小）の囲まれた図形。無ければ null。 */
export function regionAt(shapes, p, tol = 0.01) {
  return closedRegions(shapes, tol).filter(r => insidePolygon(p, r.points)).sort((a, b) => a.area - b.area)[0] || null;
}
/** 囲まれた図形（closedRegions の要素）を柄のマスで切り分け、ピース多角形を返す。マスの面積比が minAreaRatio 未満の端切れは除く。 */
export function fillRegionPattern(region, patternId, { cell = 20, minAreaRatio = 0.05, maxTiles = 4000 } = {}) {
  const pattern = PATCH_PATTERNS[patternId]; if (!pattern || !(cell > 0) || !region) return null;
  const xs = region.points.map(q => q.x), ys = region.points.map(q => q.y), box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const tiles = pattern.tiles(box, cell); if (tiles.length > maxTiles) return { tooMany: true, pieces: [], dropped: 0, tiles: tiles.length };
  const pieces = []; let dropped = 0;
  for (const tile of tiles) {
    const clipped = clipPolygonByConvex(region.points, tile.points); if (!clipped.length) continue;
    const area = areaOf(clipped), full = areaOf(tile.points);
    if (area < full * minAreaRatio) { dropped++; continue; }
    pieces.push({ points: clipped, area, parity: tile.parity, whole: Math.abs(area - full) < 1e-6 });
  }
  return { pieces, dropped, tiles: tiles.length };
}

/** 隣り合う多角形ピースの共有辺（一直線上で重なる辺）から縫い合わせを求める。
 *  pieces は閉じた多角形の頂点配列（最初の頂点から順に周る経路）。戻り値 [{a:{piece,from,to}, b:{piece,from,to}, reversed}]。
 *  from/to は各ピースの経路上の道のり(mm・昇順)。reversed は b の辺が a の辺と逆向きに走るとき true。重なりが minOverlap 未満は無視。 */
export function patchSeamsFromPieces(pieces, { minOverlap = 0.5, tol = 1e-3 } = {}) {
  const info = pieces.map(ps => { const cum = [0]; for (let i = 0; i < ps.length; i++) cum.push(cum[i] + distance(ps[i], ps[(i + 1) % ps.length])); const xs = ps.map(q => q.x), ys = ps.map(q => q.y); return { ps, cum, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }; });
  const seams = [];
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const P = info[i], Q = info[j];
    if (P.maxX < Q.minX - tol || Q.maxX < P.minX - tol || P.maxY < Q.minY - tol || Q.maxY < P.minY - tol) continue;
    for (let e = 0; e < P.ps.length; e++) {
      const a0 = P.ps[e], a1 = P.ps[(e + 1) % P.ps.length], lenE = P.cum[e + 1] - P.cum[e]; if (lenE < DEPS) continue;
      const ux = (a1.x - a0.x) / lenE, uy = (a1.y - a0.y) / lenE, along = q => (q.x - a0.x) * ux + (q.y - a0.y) * uy, off = q => Math.abs((q.x - a0.x) * uy - (q.y - a0.y) * ux);
      for (let f = 0; f < Q.ps.length; f++) {
        const b0 = Q.ps[f], b1 = Q.ps[(f + 1) % Q.ps.length], lenF = Q.cum[f + 1] - Q.cum[f]; if (lenF < DEPS || off(b0) > tol || off(b1) > tol) continue;
        const t0 = along(b0), t1 = along(b1), lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(lenE, Math.max(t0, t1));
        if (hi - lo < minOverlap) continue;
        const u = t => (t - t0) / (t1 - t0) * lenF, qa = u(lo), qb = u(hi);
        seams.push({ a: { piece: i, from: P.cum[e] + lo, to: P.cum[e] + hi, edge: e, lo, hi }, b: { piece: j, from: Q.cum[f] + Math.min(qa, qb), to: Q.cum[f] + Math.max(qa, qb), edge: f, lo: Math.min(qa, qb), hi: Math.max(qa, qb) }, reversed: t1 < t0 });
      }
    }
  }
  return seams;
}

/** 縫い穴を縁から置いてはいけない距離（mm）。革の縁が裂けるのを避けるため、菱目は縁から 2.5mm 以内に置かない。 */
export const PATCH_EDGE_MIN_MM = 2.5;
/** 多角形のピースを縁から d mm 内側へ縮めた縫い線の多角形（頂点は元と1対1）。つぶれる・辺が裏返るときは null。 */
export function insetPolygon(points, d) {
  if (!(d > 0) || points.length < 3) return null;
  const r = offsetPolyline(points, -d, true); if (r.length !== points.length) return null;
  if (!(areaOf(r) > 1e-6) || areaOf(r) >= areaOf(points) - 1e-9) return null;
  for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length], c = r[i], e = r[(i + 1) % r.length]; if ((b.x - a.x) * (e.x - c.x) + (b.y - a.y) * (e.y - c.y) <= 0) return null; }
  return r;
}
/** パッチワークのクロスステッチ用の縫い線：各ピースの縁から d mm 内側の縫い線（insets）と、隣り合うピースの縫い線どうしの縫い合わせ（seams）を返す。
 *  seams は縫い線の経路上の道のり（from/to）で、共有辺（外形）の重なりを縫い線へ垂直に写したもの。縫い線がつぶれたピースは対象外。 */
export function patchInsetStitch(polys, d, opts = {}) {
  const insets = polys.map(p => insetPolygon(p, d)?.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4) }))), cumOf = ps => { const c = [0]; for (let i = 0; i < ps.length; i++) c.push(c[i] + distance(ps[i], ps[(i + 1) % ps.length])); return c; };
  const cums = insets.map(ps => ps && cumOf(ps));
  const mapSide = (side) => {
    const O = polys[side.piece], I = insets[side.piece], k = side.edge, o0 = O[k], o1 = O[(k + 1) % O.length], i0 = I[k], i1 = I[(k + 1) % I.length];
    const lenO = distance(o0, o1), lenI = distance(i0, i1); if (lenO < DEPS || lenI < DEPS) return null;
    const ux = (o1.x - o0.x) / lenO, uy = (o1.y - o0.y) / lenO, wx = (i1.x - i0.x) / lenI, wy = (i1.y - i0.y) / lenI;
    const along = t => { const px = o0.x + ux * t, py = o0.y + uy * t; return Math.max(0, Math.min(lenI, (px - i0.x) * wx + (py - i0.y) * wy)); };
    const s0 = cums[side.piece][k] + along(side.lo), s1 = cums[side.piece][k] + along(side.hi), from = Math.min(s0, s1), to = Math.max(s0, s1);
    return to - from > (opts.minOverlap ?? 0.5) ? { piece: side.piece, from, to } : null;
  };
  const seams = [];
  for (const s of patchSeamsFromPieces(polys, opts)) { if (!insets[s.a.piece] || !insets[s.b.piece]) continue; const a = mapSide(s.a), b = mapSide(s.b); if (a && b) seams.push({ a, b, reversed: s.reversed }); }
  return { insets, seams };
}

/* ---- 交点の表示：端点どうしで接している点（結合）／途中で交差している点（未結合）---- */
/** 図形の端点（線・折れ線の頂点・円弧の両端・ベジェの両端・パスの節点）。円には端点が無い。 */
export function shapeEndpoints(s) {
  if (s.type === 'line') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
  if (s.type === 'polyline') return s.points.map(p => ({ x: p.x, y: p.y }));
  if (s.type === 'bezier') return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
  if (s.type === 'path') return s.nodes.map(n => ({ x: n.x, y: n.y }));
  if (s.type === 'arc') return [circlePoint(s, s.startDeg), circlePoint(s, s.endDeg)];
  return [];
}
/** 図形どうしの交点を2つに分ける。joined＝両方の図形の端点どうしで接している点、loose＝どちらかの図形の途中で交差・接している点（T字を含む）。
 *  同じ点に両方あれば loose を優先。同じ図形の中（折れ線の頂点など）は数えない。戻り値 {joined:[{x,y}], loose:[{x,y}]}。 */
export function classifyJunctions(shapes, tol = 0.01) {
  const ends = new Map(shapes.map(s => [s.id, shapeEndpoints(s)])), near = (id, p) => ends.get(id).some(q => distance(p, q) < tol);
  const edgesOf = s => s.type === 'polyline' ? s.points.slice(0, s.closed ? undefined : -1).map((p, i) => ({ type: 'line', x1: p.x, y1: p.y, x2: s.points[(i + 1) % s.points.length].x, y2: s.points[(i + 1) % s.points.length].y })) : [s];
  const edges = new Map(shapes.map(s => [s.id, edgesOf(s)])), boxes = new Map(shapes.map(s => [s.id, bboxOf(s)])), joined = new Map(), loose = new Map(), key = p => Math.round(p.x * 100) + ',' + Math.round(p.y * 100);
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
    const A = shapes[i], B = shapes[j], a = boxes.get(A.id), b = boxes.get(B.id);
    if (!a || !b || a.maxX < b.minX - tol || b.maxX < a.minX - tol || a.maxY < b.minY - tol || b.maxY < a.minY - tol) continue;
    for (const ea of edges.get(A.id)) for (const eb of edges.get(B.id)) {
      const ia = ea.type === 'arc' ? { ...ea, type: 'circle' } : ea, ib = eb.type === 'arc' ? { ...eb, type: 'circle' } : eb;
      for (const p of intersections(ia, ib)) {
        if (!(distToShape(ea, p) < 1e-7 && distToShape(eb, p) < 1e-7)) continue;
        (near(A.id, p) && near(B.id, p) ? joined : loose).set(key(p), { x: p.x, y: p.y });
      }
    }
  }
  for (const k of loose.keys()) joined.delete(k);
  return { joined: [...joined.values()], loose: [...loose.values()] };
}
/** 開いた線が折れ曲がっているとき、「曲がりの内側」がどちら側かを返す（挟まれた2直線の鋭角側など）。
 *  戻り値 +1＝画面で進行方向の左が内側、-1＝右が内側、0＝ほぼまっすぐで決められない。点列は画面座標（Y 下向き）。 */
export function bendInnerSign(points) {
  let turn = 0; for (let i = 1; i < points.length - 1; i++) { const a = points[i - 1], b = points[i], c = points[i + 1], u = { x: b.x - a.x, y: b.y - a.y }, v = { x: c.x - b.x, y: c.y - b.y }; if (Math.hypot(u.x, u.y) < 1e-9 || Math.hypot(v.x, v.y) < 1e-9) continue; turn += Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y); }
  return Math.abs(turn) < 0.02 ? 0 : turn > 0 ? -1 : 1; /* 画面（Y 下向き）で turn>0 は右曲がり＝内側は右 */
}
/* ---- オフセットの選択：1回クリック＝交点から交点まで、ダブルクリック＝つながった図形全体 ---- */
/** クリックした図形の「つながった線」（結合点は通過点）から、オフセットする範囲を求める。
 *  whole=false：他の図形との交点から交点までの区間（交点が無ければ全体）。whole=true：つながった図形全体（閉じていれば閉じた図形）。
 *  戻り値 {points, closed, shapeIds, whole, single}。points は平坦化した点列。single は全体が1つの図形のときその図形。 */
export function offsetSpan(shapes, hit, p, whole = false, tol = 0.01) {
  const chain = chainShapes(shapes, tol).find(c => c.shapeIds.includes(hit.id)); if (!chain) return null;
  const members = chain.items.map(i => i.shape), closed = chain.closed;
  let pts = []; chain.items.forEach((item, i) => { let ps = flattenShape(item.shape, 0.01); if (item.reversed) ps = [...ps].reverse(); pts.push(...(i ? ps.slice(1) : ps)); });
  if (closed && pts.length > 1 && distance(pts[0], pts.at(-1)) < tol) pts.pop();
  if (pts.length < 2) return null;
  const all = { points: pts, closed, shapeIds: chain.shapeIds, whole: true, single: members.length === 1 ? members[0] : null };
  if (whole) return all;
  const ring = closed ? [...pts, pts[0]] : pts, cum = [0]; for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + distance(ring[i - 1], ring[i]));
  const total = cum.at(-1); if (!(total > 0)) return null;
  const project = q => { let best = { s: 0, d: Infinity }; for (let i = 1; i < ring.length; i++) { const a = ring[i - 1], c = ring[i], len = cum[i] - cum[i - 1], t = len ? Math.max(0, Math.min(1, ((q.x - a.x) * (c.x - a.x) + (q.y - a.y) * (c.y - a.y)) / (len * len))) : 0, d = Math.hypot(q.x - (a.x + (c.x - a.x) * t), q.y - (a.y + (c.y - a.y) * t)); if (d < best.d) best = { s: cum[i - 1] + t * len, d }; } return best; };
  const others = shapes.filter(o => !chain.shapeIds.includes(o.id)), cuts = [];
  for (const q of allIntersections([...members, ...others], tol)) { if (!q.ids.some(id => chain.shapeIds.includes(id)) || !q.ids.some(id => !chain.shapeIds.includes(id))) continue; const pr = project(q); if (pr.d < 0.05) cuts.push(pr.s); }
  const sorted = [...new Set(cuts.map(s => Math.round((closed && total - s < 1e-4 ? 0 : s) * 1e4) / 1e4))].sort((x, y) => x - y);
  if (!sorted.length || (closed && sorted.length === 1)) return all;
  const sc = project(p).s; let a, c;
  if (closed) { const prev = sorted.filter(s => s <= sc), next = sorted.filter(s => s > sc); a = prev.length ? prev.at(-1) : sorted.at(-1) - total; c = next.length ? next[0] : sorted[0] + total; }
  else { const bounds = [0, ...sorted.filter(s => s > 1e-4 && s < total - 1e-4), total]; let k = 0; while (k + 2 < bounds.length && sc > bounds[k + 1]) k++; a = bounds[k]; c = bounds[k + 1]; }
  const at = s => { const u = ((s % total) + total) % total; const x = closed ? u : Math.max(0, Math.min(total, s)); let i = 1; while (i < ring.length - 1 && cum[i] < x - 1e-9) i++; const len = cum[i] - cum[i - 1], t = len ? (x - cum[i - 1]) / len : 0; return { x: ring[i - 1].x + (ring[i].x - ring[i - 1].x) * t, y: ring[i - 1].y + (ring[i].y - ring[i - 1].y) * t }; };
  const sub = [at(a)]; for (let k = -1; k <= 1; k++) for (let i = 0; i < ring.length - (closed ? 1 : 0); i++) { const s = cum[i] + k * total; if (s > a + 1e-6 && s < c - 1e-6) sub.push({ ...ring[i] }); } sub.push(at(c));
  const clean = sub.filter((q, i) => !i || distance(q, sub[i - 1]) > 1e-9);
  return clean.length >= 2 ? { points: clean, closed: false, shapeIds: chain.shapeIds, whole: false, single: null } : null;
}
/** オフセットの結果図形を返す（不成立は null）。d>0 は閉じた図形の外側／開いた線の進行方向の左、d<0 は内側／右。
 *  全体が1つの円・円弧・線などなら正確な図形、つながった線や区間は平坦化した折れ線（閉じていれば閉じた折れ線）。 */
export function offsetSpanResult(sel, d, { join = 'miter' } = {}) {
  if (!sel || !Number.isFinite(d) || d === 0) return null;
  if (sel.whole && sel.single && sel.single.type !== 'polyline') return offsetShape(sel.single, d);
  const points = offsetPolyline(sel.points, d, sel.closed, { join });
  return points.length >= (sel.closed ? 3 : 2) ? { type: 'polyline', points, closed: sel.closed } : null;
}
