// 革の厚みを考慮した設計：折り代・重ね補正・コバ帯・駒合わせ・パッチワークの目打ち最適化・ピース寸法提案。
// 純粋関数のみ（DOM 禁止）。単位 mm・角度は度。
import { distance, offsetPolyline, arcLength, pointAtLength, resolvePath, cornerHoles, equalDivide } from './geometry.js';

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
  const put = (pathId, s) => { const r = route(pathId); if (!r || placed(pathId, s)) return; const list = holesByPath.get(pathId) || []; list.push(pointAtLength(r, s)); holesByPath.set(pathId, list); };
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
