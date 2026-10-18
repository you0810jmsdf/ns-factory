// 革の厚みを考慮した設計：折り代・重ね補正・コバ帯・駒合わせ・パッチワークの目打ち最適化・ピース寸法提案。
// 純粋関数のみ（DOM 禁止）。単位 mm・角度は度。
import { distance, offsetPolyline, arcLength, pointAtLength, resolvePath, cornerHoles, equalDivide, chainShapes, contourChain, flattenShape, areaOf, allIntersections, offsetShape, intersections, distToShape, bboxOf, circlePoint } from './geometry.js';

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
/** 片方の経路の穴（経路に沿った距離 sList）を、もう片方の経路の距離へ対応づける（駒合わせで、片方の目打ちの数をもう片方へ写すとき）。
 *  向き：始点・終点が近い側どうしを対応させる（向き合う線が逆向きに引かれていれば reversed＝true）。
 *  位置：曲がり角（routeBreaks）の数が同じなら角ごとの区間どうしを比例で、違えば全体の長さの比で対応させる。戻り値の s は、写し先の経路に沿った距離。 */
export function mapHoleDistances(routeSrc, routeDst, sList) {
  const lenS = arcLength(routeSrc), lenD = arcLength(routeDst);
  const a0 = pointAtLength(routeSrc, 0), a1 = pointAtLength(routeSrc, lenS), b0 = pointAtLength(routeDst, 0), b1 = pointAtLength(routeDst, lenD);
  const reversed = distance(a0, b1) + distance(a1, b0) < distance(a0, b0) + distance(a1, b1) - 1e-9;
  let bS = routeBreaks(routeSrc), bD = routeBreaks(routeDst);
  if (bS.length !== bD.length) { bS = []; bD = []; }
  const edgesS = [0, ...bS, lenS], edgesU = [0, ...(reversed ? bD.map(x => lenD - x).reverse() : bD), lenD]; /* U＝写し先を、対応させる向きに測った距離 */
  const mapOne = s => {
    let i = 0; while (i + 2 < edgesS.length && s > edgesS[i + 1] + DEPS) i++;
    const span = edgesS[i + 1] - edgesS[i], u = span > DEPS ? edgesU[i] + (s - edgesS[i]) * (edgesU[i + 1] - edgesU[i]) / span : edgesU[i];
    return Math.max(0, Math.min(lenD, u));
  };
  return { reversed, s: sList.map(s => { const u = mapOne(s); return reversed ? lenD - u : u; }) };
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
const TILE_EPS = 1e-6; /* マスの数を決めるときの浮動小数の誤差（マス数に対する比） */
/** パッチワークの柄の登録表。tiles(bbox, cell) は bbox を隙間なく覆う凸多角形（辺で接する）の配列 [{points, parity}] を返す。 */
export const PATCH_PATTERNS = {
  ichimatsu: {
    ja: '市松', en: 'Ichimatsu (checker)',
    tiles(b, cell) {
      /* 図形の中心を基準に並べる＝端の半端なピースが左右・上下で同じ大きさになる（左上から並べると右と下にだけ半端が集まる）。
         幅がちょうど整数倍のとき浮動小数の誤差で列が1つ増える（＝全部が半端にずれる）のを TILE_EPS で防ぐ */
      const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / cell - TILE_EPS)), rows = Math.max(1, Math.ceil((b.maxY - b.minY) / cell - TILE_EPS)), out = [];
      const x0 = (b.minX + b.maxX) / 2 - cols * cell / 2, y0 = (b.minY + b.maxY) / 2 - rows * cell / 2;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = x0 + i * cell, y = y0 + j * cell; out.push({ parity: (i + j) % 2, points: [{ x, y }, { x: x + cell, y }, { x: x + cell, y: y + cell }, { x, y: y + cell }] }); }
      return out;
    },
  },
  argyle: {
    ja: 'アーガイル', en: 'Argyle',
    tiles(b, cell) {
      /* 図形の中心にひし形の中心を置き、そこから上下左右へ並べる＝端の半端なひし形が左右・上下で対称になる */
      const w = cell, h = cell * 1.5, cx0 = (b.minX + b.maxX) / 2, cy0 = (b.minY + b.maxY) / 2, kMax = Math.ceil((b.maxY - b.minY) / 2 / (h / 2)) + 1, iMax = Math.ceil((b.maxX - b.minX) / 2 / w) + 1, out = [];
      for (let k = -kMax; k <= kMax; k++) for (let i = -iMax; i <= iMax; i++) {
        const odd = ((k % 2) + 2) % 2, cx = cx0 + i * w + odd * w / 2, cy = cy0 + k * h / 2;
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
  const chain = (whole ? contourChain(shapes, hit.id, { tol }) : null) || chainShapes(shapes, tol).find(c => c.shapeIds.includes(hit.id)); if (!chain) return null; /* 全体：分岐点では真っ直ぐ続く線を選んで先へ進む（枝は含めない） */
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

/* ── 回避：出っ張った図形を、すき間をあけて滑らかによける線 ───────────────────────────────── */
const polyLen = pts => pts.reduce((n, p, i) => i ? n + distance(p, pts[i - 1]) : 0, 0);
/** 線分 a-b と c-d の交点（端を含む）。{ x, y, t（a-b 上の位置 0〜1）, u（c-d 上の位置 0〜1） } か null。 */
function segCross(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }, q = { x: d.x - c.x, y: d.y - c.y }, den = r.x * q.y - r.y * q.x; if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den; if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { x: a.x + r.x * t, y: a.y + r.y * t, t, u };
}
/** 点列 pts の頂点 k（端以外）を、半径 R の円弧でなめらかに丸める。半径は、隣の辺の長さに収まる大きさまで自動で小さくする。使った半径も返す。 */
export function filletAt(pts, k, R) {
  const V = pts[k], A0 = pts[k - 1], B0 = pts[k + 1], u = { x: A0.x - V.x, y: A0.y - V.y }, w = { x: B0.x - V.x, y: B0.y - V.y }, lu = Math.hypot(u.x, u.y), lw = Math.hypot(w.x, w.y);
  if (!(R > 1e-9) || lu < 1e-9 || lw < 1e-9) return { points: pts.slice(), used: 0 };
  u.x /= lu; u.y /= lu; w.x /= lw; w.y /= lw; const cos = Math.max(-1, Math.min(1, u.x * w.x + u.y * w.y)), phi = Math.acos(cos); /* 2辺のはさむ角 */
  if (phi < 1e-3 || Math.PI - phi < 1e-3) return { points: pts.slice(), used: 0 }; /* ほぼ一直線・折り返しは丸めない */
  const tmax = Math.min(lu, lw) * 0.98, t = Math.min(R / Math.tan(phi / 2), tmax), r = t * Math.tan(phi / 2); /* 丸める長さ t・使う半径 r */
  const A = { x: V.x + u.x * t, y: V.y + u.y * t }, B = { x: V.x + w.x * t, y: V.y + w.y * t }, bis = { x: u.x + w.x, y: u.y + w.y }, lb = Math.hypot(bis.x, bis.y), dc = r / Math.sin(phi / 2), C = { x: V.x + bis.x / lb * dc, y: V.y + bis.y / lb * dc };
  const a0 = Math.atan2(A.y - C.y, A.x - C.x); let da = Math.atan2(B.y - C.y, B.x - C.x) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(da) / (Math.PI / 36))), arc = Array.from({ length: n + 1 }, (_, i) => ({ x: C.x + r * Math.cos(a0 + da * i / n), y: C.y + r * Math.sin(a0 + da * i / n) }));
  return { points: [...pts.slice(0, k), ...arc, ...pts.slice(k + 1)], used: r };
}
/** 基準の線 base（開いた点列）が、出っ張った図形 obstacle（閉じた点列）にぶつかるとき、図形のまわりに clearance だけすき間をあけて迂回する線を作る。
 *  迂回は、図形の重心がある側を回る。基準の線との継ぎ目（2か所）は、半径 radius の円弧で丸める。戻り値 { points, baseLength, length, extra（追加で必要な長さ）, radius（使った半径） }、ぶつからなければ null。 */
export function detourPath(base, obstacle, { clearance = 3, radius = 2 } = {}) {
  if (!Array.isArray(base) || base.length < 2 || !Array.isArray(obstacle) || obstacle.length < 3 || !(clearance >= 0)) return null;
  const P = clearance > 0 ? offsetPolyline(obstacle, clearance, true, { join: 'round' }) : obstacle.map(p => ({ ...p })); if (P.length < 3) return null;
  if (P.length > 1 && distance(P[0], P.at(-1)) < 1e-9) P.pop();
  const hits = []; /* 基準の線と、すき間の輪郭の交点（基準の線の通し距離 s・輪郭上の位置 pos） */
  let acc = 0; for (let i = 0; i < base.length - 1; i++) { const a = base[i], b = base[i + 1], L = distance(a, b);
    for (let j = 0; j < P.length; j++) { const c = P[j], d = P[(j + 1) % P.length], x = segCross(a, b, c, d); if (x) hits.push({ x: x.x, y: x.y, seg: i, s: acc + L * x.t, j, u: x.u }); }
    acc += L; }
  if (hits.length < 2) return null;
  hits.sort((m, n) => m.s - n.s); const E = hits[0], X = hits.at(-1); if (X.s - E.s < 1e-6) return null;
  const ring = (from, to, dir) => { const pts = [{ x: from.x, y: from.y }]; let j = from.j; if (dir > 0) { while (true) { const nj = (j + 1) % P.length; pts.push({ ...P[nj] }); j = nj; if (j === to.j) break; } } else { while (true) { pts.push({ ...P[j] }); if (j === to.j) break; j = (j - 1 + P.length) % P.length; } } pts.push({ x: to.x, y: to.y }); return pts; }; /* 輪郭を、E から X まで一方向にたどる */
  const fwd = ring(E, X, 1), bwd = ring(E, X, -1), cen = obstacle.reduce((m, p) => ({ x: m.x + p.x / obstacle.length, y: m.y + p.y / obstacle.length }), { x: 0, y: 0 });
  const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), mid = pts => { const half = polyLen(pts) / 2; let acc2 = 0; for (let i = 1; i < pts.length; i++) { const l = distance(pts[i - 1], pts[i]); if (acc2 + l >= half) { const t = l ? (half - acc2) / l : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }; } acc2 += l; } return pts.at(-1); };
  const sc = side(E, X, cen), sf = side(E, X, mid(fwd)), sb = side(E, X, mid(bwd)); let around;
  if (Math.abs(sc) > 1e-9 && Math.sign(sf) !== Math.sign(sb)) around = Math.sign(sf) === Math.sign(sc) ? fwd : bwd; else around = polyLen(fwd) <= polyLen(bwd) ? fwd : bwd; /* 重心がある側。判定できなければ短い方 */
  const before = [...base.slice(0, E.seg + 1)], after = base.slice(X.seg + 1); /* E の手前・X の先の、基準の線の頂点 */
  let pts = [...before, ...around, ...after].filter((p, i, a) => !i || distance(p, a[i - 1]) > 1e-9); /* 同じ位置に重なった点を除く（丸める位置の隣が長さ0にならないように） */
  const kE = pts.findIndex(p => distance(p, E) < 1e-7), kX = pts.length - 1 - [...pts].reverse().findIndex(p => distance(p, X) < 1e-7); /* 継ぎ目 E・X の位置 */
  let used = 0;
  const f1 = kX > 0 && kX < pts.length - 1 && kX > kE ? filletAt(pts, kX, radius) : { points: pts, used: 0 }; pts = f1.points; used = Math.max(used, f1.used);
  const f0 = kE > 0 && kE < pts.length - 1 && kX > kE ? filletAt(pts, kE, radius) : { points: pts, used: 0 }; pts = f0.points; used = Math.max(used, f0.used);
  const dedup = pts.filter((p, i) => !i || distance(p, pts[i - 1]) > 1e-9), baseLength = polyLen(base), length = polyLen(dedup);
  return { points: dedup, baseLength, length, extra: length - baseLength, radius: used };
}

/* ───────── 三つ折り（C型・内側へ巻く）の断面：平面図の点線から断面を作り、断面で決めた位置を平面図へ戻す。目的は、断面から革の長さを決めること。 ───────── */
const FOLD_EPS = 1e-6;
/** 縦の点線（まっすぐな線 or 2点の折れ線）の x。縦でない・点線でないものは null。 */
function dashedVertical(s) {
  if (!s || s.lineStyle !== 'dashed') return null;
  if (s.type === 'line' && Math.abs(s.x1 - s.x2) < FOLD_EPS && Math.abs(s.y1 - s.y2) > FOLD_EPS) return { x: s.x1, len: Math.abs(s.y2 - s.y1) };
  if (s.type === 'polyline' && !s.closed && s.points?.length === 2 && Math.abs(s.points[0].x - s.points[1].x) < FOLD_EPS && Math.abs(s.points[0].y - s.points[1].y) > FOLD_EPS) return { x: s.points[0].x, len: Math.abs(s.points[1].y - s.points[0].y) };
  return null;
}
const dashedVerticalX = s => dashedVertical(s)?.x ?? null;
/** 紙の外形の範囲 { x0, x1, y0, y1 }。縦の点線・文字・寸法・折り線・画像・縫い穴の付属は紙に数えない。幅がなければ null。 */
export function foldPanelBox(shapes) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of shapes) { if (dashedVerticalX(s) != null || ['text', 'dimension', 'fold', 'image'].includes(s.type) || s.holeLink) continue; let b = null; try { b = bboxOf(s); } catch { b = null; } if (!b || ![b.minX, b.maxX, b.minY, b.maxY].every(Number.isFinite)) continue; x0 = Math.min(x0, b.minX); x1 = Math.max(x1, b.maxX); y0 = Math.min(y0, b.minY); y1 = Math.max(y1, b.maxY); }
  return x1 > x0 ? { x0, x1, y0, y1 } : null;
}
/** 図形から三つ折りの形を読む：縦の点線が6本（左3本＋右3本・外側2本の間＝丸く折るところ・真ん中＝折りの頂点）。
 *  返り値：{ ok, x0, x1（紙の左右の端）, flats[3]・bends[2]（紙の左から右への長さ）, xs（点線の x・小さい順）, flip }。
 *  左の折りより右の折りが長いときは、右から数える（flip）：内側へ巻く3枚が重ならないよう、先の折りを大きくするため。flats・bends は数える順。 */
export function foldSectionSpec(shapes) {
  const byX = new Map(); for (const v of (shapes || []).map(dashedVertical).filter(Boolean)) { const k = Math.round(v.x * 1e6) / 1e6; byX.set(k, Math.max(byX.get(k) ?? 0, v.len)); }
  let xs = [...byX.keys()].sort((a, b) => a - b);
  if (xs.length > 6) { const longest = Math.max(...byX.values()); xs = xs.filter(x => byX.get(x) >= 0.95 * longest); }   /* 縫い目の点線の縦の辺など、短い縦線は折り線ではない：紙の高さいっぱいの長い線だけを使う */
  if (xs.length !== 6) return { ok: false, error: 'need6', count: byX.size };
  const box = foldPanelBox(shapes); if (!box) return { ok: false, error: 'noPanel' };
  const { x0, x1 } = box;
  if (x0 > xs[0] + FOLD_EPS || x1 < xs[5] - FOLD_EPS) return { ok: false, error: 'outside' };
  const flats = [xs[0] - x0, xs[3] - xs[2], x1 - xs[5]], bends = [xs[2] - xs[0], xs[5] - xs[3]];
  if (!(bends[0] > FOLD_EPS && bends[1] > FOLD_EPS)) return { ok: false, error: 'noBand' };
  const flip = bends[0] < bends[1];
  return { ok: true, x0, x1, xs, flip, flats: flip ? [...flats].reverse() : flats, bends: flip ? [...bends].reverse() : bends };
}
/** 断面を取る位置：指定の高さ setY（有限の数）があれば、紙の中なら { y, source:'set' }・紙の縁や外なら { error:'out' }。指定が無い（undefined・null）ときは foldCutLine（選んだ図形の中の横線）。 */
export function foldCutPick(shapes, setY) {
  if (setY === undefined || setY === null) return foldCutLine(shapes);
  const box = foldPanelBox(shapes || []), y = Number(setY);
  return Number.isFinite(y) && box && y > box.y0 + 0.01 && y < box.y1 - 0.01 ? { y, source: 'set' } : { error: 'out' };
}
/** 断面を取る位置の線：紙の中を幅の8割以上横切る、実線の横線（紙の縁・点線・短い線・縦や斜めの線は対象外）。1本ならその y。無ければ { none: true }。2本以上は { error: 'many', count }。 */
export function foldCutLine(shapes) {
  const list = shapes || [], box = foldPanelBox(list); if (!box) return { none: true };
  const found = list.filter(s => s.type === 'line' && s.lineStyle !== 'dashed' && Math.abs(s.y1 - s.y2) < FOLD_EPS && s.y1 > box.y0 + 0.01 && s.y1 < box.y1 - 0.01 && Math.abs(s.x2 - s.x1) >= 0.8 * (box.x1 - box.x0));
  return found.length === 0 ? { none: true } : found.length === 1 ? { y: found[0].y1, id: found[0].id } : { error: 'many', count: found.length };
}
/** 断面の中心線の s の位置を、厚みの境目（offset：外側の面は＋・内側の面は－）の面に沿って測った長さ。折りの弧では、通った弧の長さ×(offset÷半径) だけ中心線より長く（外側）・短く（内側）なる。平らな所は中心線と同じ。 */
export function foldSurfaceS(path, s, offset) {
  let out = s; for (const pc of path.pieces) if (pc.kind === 'arc') out += Math.max(0, Math.min(s, pc.s1) - pc.s0) * offset / pc.r;
  return out;
}
/** 縫い穴（中心線の s の位置 ss）を、断面の外側の面・内側の面へ落とし（投影し）て、折りごとの間隔を出す。折りの弧に両方の穴が入る隣どうしの組だけを数える。
 *  戻り値 { holes:[{s,outerS,innerS}]（s の順）, bends:[{pairs, flat, outer, inner, diff}]（折りの順＝断面の中心線の順）}。flat＝平らな間隔・outer／inner＝外側／内側の面での間隔（組の平均）・diff＝外側−内側（差＝平らな間隔×合計の厚み÷半径）。 */
export function foldHoleSpacing(path, ss, t) {
  const h = t / 2, holes = [...ss].sort((a, b) => a - b).map(s => ({ s, outerS: foldSurfaceS(path, s, h), innerS: foldSurfaceS(path, s, -h) }));
  const bends = path.pieces.filter(p => p.kind === 'arc').map(a => {
    const pairs = []; for (let i = 0; i + 1 < holes.length; i++) { const p = holes[i], q = holes[i + 1]; if (q.s - p.s > FOLD_EPS && p.s >= a.s0 - FOLD_EPS && q.s <= a.s1 + FOLD_EPS) pairs.push({ flat: q.s - p.s, outer: q.outerS - p.outerS, inner: q.innerS - p.innerS }); }
    const avg = k => pairs.length ? pairs.reduce((x, y) => x + y[k], 0) / pairs.length : 0;
    return { pairs: pairs.length, flat: avg('flat'), outer: avg('outer'), inner: avg('inner'), diff: avg('outer') - avg('inner') };
  });
  return { holes, bends };
}
/** 縫い穴の目印：穴ごとに、断面の外側の面・内側の面の上へ小さな円を1つずつ（role: 'hole'・side: 'outer' | 'inner'・s）。origin は中心線の始点の図面上の位置。 */
export function foldHoleMarks(path, ss, t, origin, r = 0.35) {
  const h = t / 2, out = [];
  for (const s of ss) { const q = pointOnFoldPath(path, s), nu = -Math.sin(q.heading), nv = Math.cos(q.heading);
    for (const [side, k] of [['outer', -h], ['inner', h]]) { const c = foldDoc(origin, q.u + k * nu, q.v + k * nv); out.push({ type: 'circle', role: 'hole', side, s, cx: c.x, cy: c.y, r }); } }
  return out;
}
/** 三つ折りの設計：完成形の断面を、ボタンが3枚を通る縦線（ボタン線）を基準に決める。dL・dR＝ボタン線から左・右の折りの外側までの距離、cL・cR＝左・右の革の切り口までの距離、rinL・rinR＝左・右の折りの内側の半径、t＝革1枚の厚み（plies 枚貼り合わせ）。
 *  折りの中心線の半径＝内側の半径＋合計の厚みの半分。折りの中心のボタン線からの距離＝外側までの距離−内側の半径−合計の厚み。平らは 1枚目＝cL＋右の折りの中心・2枚目＝両方の折りの中心の間・3枚目＝左の折りの中心＋cR。
 *  返り値：{ ok, T, flats[3], bends[2]（右の折り・左の折りの順＝革を端からたどる順）, rc[2]（中心線の半径）, a[2]（右・左の折りの中心のボタン線からの距離）, length, warnings[] }。
 *  shift（既定 0）＝ボタン線を右へずらす量。cEff＝ずらしたあとの、ボタン線から左・右の切り口までの距離。ずらしすぎて、ボタン線が切り口や折りの外に出るときは失敗 'shiftOut'。
 *  warnings：gapBottom＝1枚目と3枚目が重なる（右の内側の半径が左より厚みの半分以上大きくない）、pierceRight＝3枚目の右の切り口が右の折りを突き抜ける。失敗は { ok:false, error: 'badNumber' | 'flatShort' }。 */
/** tOuter・tInner＝表（外側の革）・裏（内側の革）それぞれの厚み（省略時はどちらも t）。合計 T＝表＋裏（どちらも省略なら t×plies）。dO・dI＝積み重ねの中心線から、表の革の中心・裏の革の中心までのずれ（表は外へ＋・裏は内へ−）。
 *  積み重ねの中心線の半径 rc＝内側の半径＋T/2。裏の革の中心の半径＝内側の半径＋tI/2・表の革の中心の半径＝内側の半径＋tI＋tO/2 なので、dO＝tI/2・dI＝−tO/2（両方 t なら ±t/2）。 */
export function foldDesignPlan({ t, plies = 2, tOuter, tInner, dL, dR, cL, cR, rinL, rinR, shift = 0 } = {}) {
  const pos = [dL, dR, rinL, rinR];
  if (![t, ...pos, cL, cR].every(v => typeof v === 'number' && Number.isFinite(v)) || !(t > 0) || !pos.every(v => v > 0) || cL < 0 || cR < 0) return { ok: false, error: 'badNumber' };
  if (typeof shift !== 'number' || !Number.isFinite(shift)) return { ok: false, error: 'badNumber' };
  const dl = dL + shift, dr = dR - shift, cl = cL + shift, cr = cR - shift;   /* ボタン線を右へ shift ずらす＝左の距離は＋shift・右の距離は−shift（平らの長さ・折りの形は変わらない） */
  if (!(dl > 0 && dr > 0) || cl < 0 || cr < 0) return { ok: false, error: 'shiftOut' };
  const tO = tOuter ?? t, tI = tInner ?? t; if (![tO, tI].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0)) return { ok: false, error: 'badNumber' };
  const T = tOuter === undefined && tInner === undefined ? t * plies : tO + tI, rc1 = rinR + T / 2, rc2 = rinL + T / 2, a1 = dr - rinR - T, a2 = dl - rinL - T, flats = [cl + a1, a1 + a2, a2 + cr];
  if (!flats.every(v => v > FOLD_EPS)) return { ok: false, error: 'flatShort', flats };
  const bends = [Math.PI * rc1, Math.PI * rc2], warnings = [], dx = cr - a1, v3 = 2 * (rc1 - rc2) - rc1;   /* v3＝3枚目の高さの、右の折りの中心からのずれ */
  if (rc1 - rc2 < T / 2 - 1e-9) warnings.push('gapBottom');
  if (dx > 0 && Math.max(Math.hypot(dx, v3 + T / 2), Math.hypot(dx, v3 - T / 2)) > rinR + 1e-9) warnings.push('pierceRight');
  return { ok: true, T, tO: tOuter === undefined && tInner === undefined ? T / plies : tO, tI: tOuter === undefined && tInner === undefined ? T / plies : tI, dO: (tOuter === undefined && tInner === undefined ? T / plies : tI) / 2, dI: -(tOuter === undefined && tInner === undefined ? T / plies : tO) / 2, flats, bends, rc: [rc1, rc2], a: [a1, a2], cEff: [cl, cr], length: flats.reduce((x, y) => x + y, 0) + bends[0] + bends[1], warnings };
}
const FD_NUMS = { dl: '①', dr: '②', w: '③', cl: '④', cr: '⑤', rl: '⑥', rr: '⑦', to: '⑧', ti: '⑨', shift: '⑩', ring: '⑪', stack: '⑫' };
/** 三つ折りの設計の寸法線（欄の番号①〜⑫）。いま描いている断面の上に重ねて見せる図形を、図面の座標（mm）で返す（事業主指示 2026-10-15：欄を選ぶと実際の図で該当する寸法が分かるように）。
 *  d＝doc.foldDesign（dL・dR・cL・cR・rinL・rinR・tOuter・tInner・origin・flipV・ring）。key＝'dl' など（FD_NUMS のキー）。refill＝リフィルの束の短い辺の2点（図面の座標）。⑫に使う。
 *  返り値 [{ type:'line', a, b, arrows:'none'|'end'|'both', dash }, { type:'dot', x, y }, { type:'text', x, y, text }]。計画が成り立たないとき・知らない key は null。 */
export function foldDimensions(d, key, { refill = null } = {}) {
  const num = FD_NUMS[key]; if (!d || !num || !d.origin) return null;
  const p = foldDesignPlan(d); if (!p.ok) return null;
  const { T } = p, tI = p.tI, tO = p.tO, rc1 = p.rc[0], rc2 = p.rc[1], ub = d.cL, o = d.origin, f1 = p.flats[0], u2 = p.flats[0] - p.flats[1], v2 = 2 * rc1 - rc2, flipY = d.flipV !== false;
  const pt = (u, v) => { const y = o.y - v; return { x: o.x + u, y: flipY ? 2 * (o.y - rc1) - y : y }; };
  const items = [], line = (a, b, arrows = 'none', dash = false) => items.push({ type: 'line', a: pt(...a), b: pt(...b), arrows, dash }), text = (u, v) => items.push({ type: 'text', ...pt(u, v), text: num });
  const vBot = -T / 2 - 9, vBot2 = vBot - 11, vTop = 2 * rc1 + T / 2 + 9, rad = (deg, r, c) => [c[0] + r * Math.cos(deg * Math.PI / 180), c[1] + r * Math.sin(deg * Math.PI / 180)];
  const C1 = [f1, rc1], C2 = [u2, v2], lo = ub - d.dL, hi = ub + d.dR;
  switch (key) {
    case 'dl': line([ub, vBot], [lo, vBot], 'both'); line([lo, v2], [lo, vBot - 2], 'none', true); line([ub, -T / 2], [ub, vBot - 2], 'none', true); text((ub + lo) / 2, vBot - 6); break;
    case 'dr': line([ub, vBot], [hi, vBot], 'both'); line([hi, rc1], [hi, vBot - 2], 'none', true); line([ub, -T / 2], [ub, vBot - 2], 'none', true); text((ub + hi) / 2, vBot - 6); break;
    case 'w': line([lo, vBot2], [hi, vBot2], 'both'); line([lo, v2], [lo, vBot2 - 2], 'none', true); line([hi, rc1], [hi, vBot2 - 2], 'none', true); text((lo + hi) / 2, vBot2 - 6); break;
    case 'cl': line([ub, vTop], [0, vTop], 'both'); line([0, T / 2], [0, vTop + 2], 'none', true); line([ub, 2 * rc1 + T / 2], [ub, vTop + 2], 'none', true); text(ub / 2, vTop + 6); break;
    case 'cr': line([ub, vTop], [ub + d.cR, vTop], 'both'); line([ub + d.cR, 2 * rc1 - 2 * rc2 + T / 2], [ub + d.cR, vTop + 2], 'none', true); line([ub, 2 * rc1 + T / 2], [ub, vTop + 2], 'none', true); text(ub + d.cR / 2, vTop + 6); break;
    case 'rl': { const e = rad(200, d.rinL, C2); line(C2, e, 'end'); items.push({ type: 'dot', ...pt(...C2) }); const l = rad(200, d.rinL + 5, C2); text(l[0], l[1]); break; }
    case 'rr': { const e = rad(-55, d.rinR, C1); line(C1, e, 'end'); items.push({ type: 'dot', ...pt(...C1) }); const l = rad(-55, d.rinR + 5, C1); text(l[0], l[1]); break; }
    case 'to': { line(rad(22, d.rinR + tI, C1), rad(22, d.rinR + T, C1), 'both'); const l = rad(22, d.rinR + T + 5, C1); text(l[0], l[1]); break; }
    case 'ti': { line(rad(-22, d.rinR, C1), rad(-22, d.rinR + tI, C1), 'both'); const l = rad(-22, d.rinR + T + 5, C1); text(l[0], l[1]); break; }
    case 'shift': line([ub - 9, vTop + 8], [ub + 9, vTop + 8], 'both'); line([ub, 2 * rc1 + T / 2], [ub, vTop + 10], 'none', true); text(ub, vTop + 14); break;
    case 'ring': {
      const s = d.ring?.s ?? p.flats[0] + p.bends[0] / 2, path = foldSectionPath({ flats: p.flats, bends: p.bends }), q = pointOnFoldPath(path, s), nu = -Math.sin(q.heading), nv = Math.cos(q.heading), fu = q.u + nu * T / 2, fv = q.v + nv * T / 2;
      items.push({ type: 'dot', ...pt(fu, fv) }); line([fu - nu * 6, fv - nv * 6], [fu + nu * 6, fv + nv * 6], 'both'); text(fu - nu * 11, fv - nv * 11); break;
    }
    case 'stack': {
      if (!refill || refill.length < 2) return items;
      const [a, b] = refill, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, px = -dy / len * 5, py = dx / len * 5;
      items.push({ type: 'line', a: { x: a.x + px, y: a.y + py }, b: { x: b.x + px, y: b.y + py }, arrows: 'both', dash: false }, { type: 'text', x: (a.x + b.x) / 2 + px * 2.2, y: (a.y + b.y) / 2 + py * 2.2, text: num }); break;
    }
  }
  return items;
}
/** 三つ折りの設計の取っ手（実際の断面の上で、つかんで横へドラッグすると欄の数値が変わる点・事業主指示 2026-10-15）。図面の座標（mm）。
 *  返り値 [{ key, dim, x, y }]：key＝取っ手の種類（btn＝ボタン線・dl／dr＝左／右の折りの外側・cl／cr＝左／右の切り口・rl／rr＝左／右の折りの内側の半径）、dim＝光らせる寸法線の key（foldDimensions）。計画が成り立たないとき null。 */
export function foldHandles(d) {
  if (!d || !d.origin) return null; const p = foldDesignPlan(d); if (!p.ok) return null;
  const { T } = p, rc1 = p.rc[0], rc2 = p.rc[1], ub = d.cL, o = d.origin, f1 = p.flats[0], u2 = p.flats[0] - p.flats[1], v2 = 2 * rc1 - rc2, flipY = d.flipV !== false;
  const pt = (u, v) => { const y = o.y - v; return { x: o.x + u, y: flipY ? 2 * (o.y - rc1) - y : y }; };
  return [
    { key: 'btn', dim: 'shift', ...pt(ub, 2 * rc1 + T / 2 + 8) }, { key: 'dl', dim: 'dl', ...pt(ub - d.dL, v2) }, { key: 'dr', dim: 'dr', ...pt(ub + d.dR, rc1) },
    { key: 'cl', dim: 'cl', ...pt(0, 0) }, { key: 'cr', dim: 'cr', ...pt(ub + d.cR, 2 * rc1 - 2 * rc2) },
    { key: 'rl', dim: 'rl', ...pt(u2 - d.rinL, v2) }, { key: 'rr', dim: 'rr', ...pt(f1 + d.rinR, rc1) },
  ];
}
/** 曲げ部の菱目ピッチ：基準の平らな間隔 pitch（革の中心線＝平らに伸ばした長さで測る）を、折りごとに外側の面・内側の面へ割り当てた間隔。
 *  同じ角度で並べるので、外側＝pitch×(中心線の半径＋合計の厚みの半分)÷半径・内側＝pitch×(半径−厚みの半分)÷半径・差＝pitch×厚み÷半径。1ピッチの角度＝pitch÷半径（度）・count＝折りの弧の長さ÷pitch。
 *  plan は foldDesignPlan の結果。折りは右・左の順（革を端からたどる順）。plan が失敗・pitch が正の数でないときは null。 */
export function foldBendPitch(plan, pitch, plies = 2) {
  if (!plan || !plan.ok || !(typeof pitch === 'number' && Number.isFinite(pitch) && pitch > 0)) return null;
  const dO = plan.dO ?? plan.T / plies / 2, dI = plan.dI ?? -plan.T / plies / 2;   /* 表（外側の革）・裏（内側の革）それぞれの中心線：積み重ねの中心線から、各革の厚みの中心までずれた所（面ではない・事業主指示 2026-10-15） */
  return plan.rc.map((rc, i) => ({ side: i === 0 ? 'right' : 'left', rc, flat: pitch, outer: pitch * (rc + dO) / rc, inner: pitch * (rc + dI) / rc, diff: pitch * (dO - dI) / rc, angleDeg: pitch / rc * 180 / Math.PI, count: plan.bends[i] / pitch }));
}
/** 表（折りの外側の革）・裏（内側の革）の展開：2枚貼り合わせの三つ折りを、1枚ずつの平らな型紙にする（事業主指示 2026-10-15）。
 *  平らな3枚の長さは同じ。丸折りの幅は、その革の中心（貼り合わせ線から半枚の厚みだけ外側・内側）の半径で伸縮する（表＝半径＋、裏＝半径−）。
 *  菱目は、貼り合わせ線（革の中心線＝基準の平らな長さ）に沿って、余白 margin の内側にピッチ pitch を均等に調整して並べ（同じ個数・同じ位置）、それぞれの革の長さに割り当て直す。
 *  平らな部分の間隔は表も裏も同じで、曲げ部の間隔だけが革ごとに違う（間隔＝基準の間隔×(中心線の半径＋ずれ)÷中心線の半径）。buttons＝貼り合わせ線に沿ったボタンの位置の配列（任意・割り当て直す）。
 *  返り値：[{ key:'outer'|'inner', delta, length, xs[6], holes[]（革の左端からの位置）, flatStep, rowFrom, rowTo, buttons[], bends:[{ side:'right'|'left', count, firstIndex, pitch, flat }] }]（表・裏の順）。入力が不正なときは null。 */
export function foldUnfoldPlan(p, { pitch, margin, buttons = [], plies = 2 } = {}) {
  if (!p || !p.ok || !(typeof pitch === 'number' && pitch > 0) || !(typeof margin === 'number' && margin >= 0) || !(margin * 2 < p.length)) return null;
  const [f1, f2] = p.flats, [b1, b2] = p.bends, xsBase = [f1, f1 + b1 / 2, f1 + b1, f1 + b1 + f2, f1 + b1 + f2 + b2 / 2, f1 + b1 + f2 + b2];
  /* 菱目は、実際の目打ちのピッチ pitch のまま（平らな所は pitch ちょうど）。端の余り（行の長さを pitch で割った余り）は両端へ等分する。曲げ部は、革の中心線で pitch の間隔にした穴を、各革の半径で割り当てる（表は広く・裏は狭く・平均は pitch）。 */
  const usable = p.length - 2 * margin, n = Math.floor(usable / pitch + 1e-9), step = pitch, lead = margin + (usable - n * pitch) / 2, EPS = 1e-9; if (n < 1) return null;
  const base = Array.from({ length: n + 1 }, (_, i) => lead + i * step);
  const bands = [[xsBase[0], xsBase[2]], [xsBase[3], xsBase[5]]];
  return [['outer', 1], ['inner', -1]].map(([key, sign]) => {
    const delta = sign > 0 ? (p.dO ?? (p.T / plies) / 2) : (p.dI ?? -(p.T / plies) / 2), w = foldBendWarp({ xs: xsBase }, [p.rc[0] + delta, p.rc[1] + delta], 0); if (!w.ok) return null;
    const bends = bands.map(([lo, hi], k) => {
      const inBand = base.map((u, i) => (u >= lo - EPS && u <= hi + EPS ? i : -1)).filter(i => i >= 0), first = inBand.findIndex((i, j) => j + 1 < inBand.length && inBand[j + 1] === i + 1);
      return { side: k === 0 ? 'right' : 'left', count: inBand.length, firstIndex: first < 0 ? -1 : inBand[first], pitch: step * (p.rc[k] + delta) / p.rc[k], flat: step };
    });
    return { key, delta, length: p.length + w.total, xs: w.xs, holes: base.map(w.map), flatStep: step, rowFrom: w.map(margin), rowTo: w.map(p.length - margin), buttons: buttons.map(w.map), bends };
  });
}
/** 丸折りの半径（弧の長さ÷π）。平面図の左から順に [左, 右]。 */
export const foldBendRadii = spec => [(spec.xs[2] - spec.xs[0]) / Math.PI, (spec.xs[5] - spec.xs[3]) / Math.PI];
/** 丸折りの半径を [左, 右]（平面図の左から順・mm）に変えたとき、平面図の横位置をどう動かすか。丸折りの幅（弧の長さ）＝π×半径。
 *  左の折りの内側は幅に合わせて伸び縮み・その右は同じ量だけ平行に動く（右の折りも同じ）。thickness＝貼り合わせた合計の厚み（半径がその半分以下だと内側の革が潰れるので失敗）。
 *  返り値：{ ok, changed, map(x), xs[6]（新しい点線の位置）, deltas[2], total（革の長さの増減） }。失敗は { ok:false, error: 'badNumber' | 'tooSmall', min }。 */
export function foldBendWarp(spec, radii, thickness = 0) {
  if (!Array.isArray(radii) || radii.length !== 2 || !radii.every(r => typeof r === 'number' && Number.isFinite(r) && r > 0)) return { ok: false, error: 'badNumber' };
  const min = thickness / 2 + 0.1; if (radii.some(r => r < min)) return { ok: false, error: 'tooSmall', min };
  const xs = spec.xs, oldW = [xs[2] - xs[0], xs[5] - xs[3]], newW = radii.map(r => Math.PI * r), d = [newW[0] - oldW[0], newW[1] - oldW[1]];
  const nx = [xs[0], xs[0] + newW[0] / 2, xs[0] + newW[0], xs[3] + d[0], xs[3] + d[0] + newW[1] / 2, xs[3] + d[0] + newW[1]];
  const map = x => x <= xs[0] ? x : x <= xs[2] ? xs[0] + (x - xs[0]) * newW[0] / oldW[0] : x <= xs[3] ? x + d[0] : x <= xs[5] ? nx[3] + (x - xs[3]) * newW[1] / oldW[1] : x + d[0] + d[1];
  return { ok: true, changed: Math.abs(d[0]) + Math.abs(d[1]) > 1e-9, map, xs: nx, deltas: d, total: d[0] + d[1] };
}
/** 線の両端（開いた図形の始点・終点）。円・閉じた図形・長さのない図形には端が無い。 */
function openEnds(s) {
  if (!s || s.type === 'circle' || s.closed) return [];
  let len = 0; try { len = arcLength(s); } catch { len = 0; }
  if (!(len > 1e-9)) return [];
  return [pointAtLength(s, 0), pointAtLength(s, len)];
}
/** 切れ目：触れていない（0.01mm 以内に別の図形の端が無い）端点と、max(mm) 以内にある別の図形の端点の組。ほぼつながって見えて、実は離れている所を見つける（事業主指示 2026-10-14）。
 *  shapes は線として扱う図形（穴の目印の補助線などは呼ぶ側で除く）。戻り値は [{ a:{id,end,x,y}, b:{id,end,x,y}, d, x, y }]（a は配列の前のほうの図形・x,y は隙間の真ん中）。 */
export function findGaps(shapes, max = 2, tol = 0.01) {
  const ends = []; (shapes || []).forEach((s, i) => openEnds(s).forEach((p, end) => ends.push({ id: s.id, i, end, x: p.x, y: p.y })));
  const free = e => !ends.some(o => o.i !== e.i && Math.hypot(o.x - e.x, o.y - e.y) <= tol), seen = new Set(), out = [];
  for (const e of ends) {
    if (!free(e)) continue;
    let best = null, bd = Infinity;
    for (const o of ends) { if (o.i === e.i) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d > tol && d <= max && d < bd) { bd = d; best = o; } }
    if (!best) continue;
    const [a, b] = e.i < best.i ? [e, best] : [best, e], key = `${a.i}.${a.end}-${b.i}.${b.end}`; if (seen.has(key)) continue; seen.add(key);
    out.push({ a: { id: a.id, end: a.end, x: a.x, y: a.y }, b: { id: b.id, end: b.end, x: b.x, y: b.y }, d: bd, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return out;
}
const MOVABLE_END = ['line', 'polyline', 'path', 'bezier'];   /* 端を自由に動かせる図形（円弧は端を動かすと形が変わるので動かさない） */
/** 図形 s の end（0＝始点・1＝終点）を点 p へ動かした新しい図形。 */
function moveEnd(s, end, p) {
  if (s.type === 'line' || s.type === 'bezier') return end ? { ...s, x2: p.x, y2: p.y } : { ...s, x1: p.x, y1: p.y };
  if (s.type === 'polyline') { const pts = s.points.map(q => ({ ...q })); pts[end ? pts.length - 1 : 0] = { ...pts[end ? pts.length - 1 : 0], x: p.x, y: p.y }; return { ...s, points: pts }; }
  const nodes = s.nodes.map(n => ({ ...n })), k = end ? nodes.length - 1 : 0, n = nodes[k], dx = p.x - n.x, dy = p.y - n.y;
  nodes[k] = { ...n, x: n.x + dx, y: n.y + dy, inX: n.inX + dx, inY: n.inY + dy, outX: n.outX + dx, outY: n.outY + dy }; return { ...s, nodes };
}
/** 隙間を閉じる：選んだ図形（selectedIds）が関わる切れ目を、動かせる側の端を相手の端へ動かして閉じる。選ぶ・選ばないが分かれるときは選んだ側を動かす（両方選んでいれば先の図形）。
 *  movable（図形 id の集合）を渡すと、その図形だけを動かす（ロックした層の図形を動かさない）。円弧どうしなど動かせない組は閉じず skipped に数える。戻り値 { changes:[{id,next}], closed, skipped, maxGap }。 */
export function closeGaps(shapes, selectedIds, max = 2, tol = 0.01, movable = null) {
  const work = new Map(), byId = new Map((shapes || []).map(s => [s.id, s])); let closed = 0, skipped = 0, maxGap = 0;
  for (const g of findGaps(shapes, max, tol)) {
    if (!selectedIds.has(g.a.id) && !selectedIds.has(g.b.id)) continue;
    const can = x => MOVABLE_END.includes(byId.get(x.id).type) && (!movable || movable.has(x.id)), sides = [[g.a, g.b], [g.b, g.a]].filter(([m]) => can(m)), chosen = sides.find(([m]) => selectedIds.has(m.id)) || sides[0];
    if (!chosen) { skipped++; continue; }
    const [mover, target] = chosen; work.set(mover.id, moveEnd(work.get(mover.id) || byId.get(mover.id), mover.end, { x: target.x, y: target.y })); closed++; maxGap = Math.max(maxGap, g.d);
  }
  return { changes: [...work].map(([id, next]) => ({ id, next })), closed, skipped, maxGap };
}
/** 三つ折りの縦の基準線（点線6本）を引く位置を決める。紙の左端から「平ら1・丸折り1・平ら2・丸折り2」の幅（mm・丸折りは弧の長さ）を並べ、3枚目の平らは紙の右端までの残り。
 *  丸折りの両端と真ん中（折りの頂点）に1本ずつ＝foldSectionSpec が読む形。点線は紙の高さいっぱい。
 *  返り値：{ ok, xs[6], flats[3], bends[2], lines[], replaceIds[] }（replaceIds＝すでにある紙の高さいっぱいの縦の点線・置き換える）。失敗は { ok:false, error: 'noPanel' | 'badNumber' | 'tooWide' }。 */
export function foldBaselines(shapes, { flat1, bend1, flat2, bend2 } = {}) {
  const box = foldPanelBox(shapes || []); if (!box) return { ok: false, error: 'noPanel' };
  const v = [flat1, bend1, flat2, bend2]; if (!v.every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)) return { ok: false, error: 'badNumber' };
  const x = [box.x0 + flat1]; x.push(x[0] + bend1 / 2, x[0] + bend1); x.push(x[2] + flat2); x.push(x[3] + bend2 / 2, x[3] + bend2);
  const flat3 = box.x1 - x[5]; if (!(flat3 > FOLD_EPS)) return { ok: false, error: 'tooWide', width: box.x1 - box.x0 };
  const height = box.y1 - box.y0, replaceIds = shapes.filter(s => { const d = dashedVertical(s); return d && d.len >= 0.95 * height; }).map(s => s.id);
  const lines = x.map(px => ({ type: 'line', layer: 'guide', lineStyle: 'dashed', x1: px, y1: box.y0, x2: px, y2: box.y1 }));
  return { ok: true, xs: x, flats: [flat1, flat2, flat3], bends: [bend1, bend2], lines, replaceIds };
}
/** 断面の中心線（革の中心）。座標は (u 右, v 上)・始点 (0,0)・右向き。平ら f1 → 半円 b1（弧の長さ）→ 平ら f2 → 半円 b2 → 平ら f3。折りはどちらも反時計回り（内側へ巻く＝C型）。
 *  返り値：{ pieces: [{ kind:'line', p0, p1, th, s0, s1 } | { kind:'arc', c, r, a0, a1, s0, s1 }], length, flats, bends }。s は始点からの長さ（革の中心に沿った長さ）。 */
export function foldSectionPath({ flats, bends }) {
  const pieces = []; let s = 0, p = { u: 0, v: 0 }, th = 0;
  const line = len => { if (!(len > FOLD_EPS)) return; const q = { u: p.u + len * Math.cos(th), v: p.v + len * Math.sin(th) }; pieces.push({ kind: 'line', p0: p, p1: q, th, s0: s, s1: s + len }); s += len; p = q; };
  const turn = len => { const r = len / Math.PI, c = { u: p.u - r * Math.sin(th), v: p.v + r * Math.cos(th) }, a0 = th - Math.PI / 2; pieces.push({ kind: 'arc', c, r, a0, a1: a0 + Math.PI, s0: s, s1: s + len }); s += len; p = { u: c.u + r * Math.cos(a0 + Math.PI), v: c.v + r * Math.sin(a0 + Math.PI) }; th += Math.PI; };
  line(flats[0]); turn(bends[0]); line(flats[1]); turn(bends[1]); line(flats[2]);
  return { pieces, length: s, flats: [...flats], bends: [...bends] };
}
/** 中心線の s の位置の点と向き：{ u, v, heading }（heading はラジアン）。s は 0〜length に丸める。 */
export function pointOnFoldPath(path, s) {
  const t = Math.max(0, Math.min(path.length, s)), pc = path.pieces.find(x => t <= x.s1 + FOLD_EPS) || path.pieces.at(-1);
  if (pc.kind === 'line') { const d = t - pc.s0; return { u: pc.p0.u + d * Math.cos(pc.th), v: pc.p0.v + d * Math.sin(pc.th), heading: pc.th }; }
  const a = pc.a0 + (t - pc.s0) / pc.r; return { u: pc.c.u + pc.r * Math.cos(a), v: pc.c.v + pc.r * Math.sin(a), heading: a + Math.PI / 2 };
}
/** 点 (u, v) にいちばん近い中心線上の位置：{ s, dist }。 */
export function projectOnFoldPath(path, u, v) {
  let best = { s: 0, dist: Infinity };
  const consider = (s, pu, pv) => { const d = Math.hypot(u - pu, v - pv); if (d < best.dist) best = { s, dist: d }; };
  for (const pc of path.pieces) {
    if (pc.kind === 'line') { const dx = pc.p1.u - pc.p0.u, dy = pc.p1.v - pc.p0.v, len2 = dx * dx + dy * dy, k = Math.max(0, Math.min(1, ((u - pc.p0.u) * dx + (v - pc.p0.v) * dy) / len2)); consider(pc.s0 + k * Math.sqrt(len2), pc.p0.u + k * dx, pc.p0.v + k * dy); }
    else {
      const phi = Math.atan2(v - pc.c.v, u - pc.c.u), rel = ((phi - pc.a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (rel <= Math.PI) consider(pc.s0 + rel * pc.r, pc.c.u + pc.r * Math.cos(phi), pc.c.v + pc.r * Math.sin(phi));
      consider(pc.s0, pc.c.u + pc.r * Math.cos(pc.a0), pc.c.v + pc.r * Math.sin(pc.a0)); consider(pc.s1, pc.c.u + pc.r * Math.cos(pc.a1), pc.c.v + pc.r * Math.sin(pc.a1));
    }
  }
  return best;
}
const foldDoc = (origin, u, v) => ({ x: origin.x + u, y: origin.y - v });   /* (u 右, v 上) → 図面の座標（y は下向き） */
/** 断面の厚みの境目（中心線からのずれ k と role）。外側の面（edgeR）〜内側の面（edgeL）まで plies+1 本。間の線は貼り合わせ線（glue）。 */
const foldEdges = (h, plies, glueK) => plies === 2 && Number.isFinite(glueK) ? [['edgeL', h], ['glue', glueK], ['edgeR', -h]] : Array.from({ length: plies + 1 }, (_, i) => [i === 0 ? 'edgeL' : i === plies ? 'edgeR' : 'glue', h - 2 * h * i / plies]);   /* glueK＝貼り合わせ線の位置（中心線から内側へ＋）。表裏で厚みが違うと中心ではない */
/** 貼り合わせた革 plies 枚（合計の厚み t）の、1枚ごとの長さ（外側の革から順に）。中心線の長さに、折り1か所ごと π×（その革の中心の、中心線からのずれ）を足す。外側の革ほど長く、内側ほど短い。 */
export function foldPlyLengths(path, t, plies = 1) {
  const bends = path.pieces.filter(p => p.kind === 'arc').length;
  return Array.from({ length: plies }, (_, j) => path.length + bends * Math.PI * (t / 2 - (j + 0.5) * t / plies));
}
/** 表（外側の革）と裏（内側の革）の図面から、1枚の三つ折り断面図の形を求める（事業主の選択 2026-10-19・案A）。
 *  outer・inner＝{ flats:[3], bends:[2] }（図面の左から：平ら・丸折り・平ら・丸折り・平ら。図面に描いた長さ＝革の中立面の長さ）。tO・tI＝表・裏の厚み。base＝'outer'｜'inner'（基準にするほう。断面の形は基準から求め、もう一方は差を出す）。
 *  outerHoles・innerHoles＝図面の左端からの菱目の位置（mm）。
 *  考え方：平らは、表も裏も同じ長さ。丸折りは、貼り合わせ線での長さ G＝π×半径。表の丸折り＝G＋π×tO/2・裏の丸折り＝G−π×tI/2。貼り合わせ線は、断面の中心から（tO−tI）/2 だけ内側へずれる。
 *  返り値：{ ok, flip, T, glueK, path（断面の中心線・foldSectionPath）, flats[3]・bends[2]（中心線の長さ・flip のときは右から数えた順）, radii[2]（図面の左から：貼り合わせ線・内側の面・外側の面の半径）,
 *  report:{ base, flats:[{outer,inner,want,diff}], bends:[{outer,inner,want,diff}]（図面の左から）, lenOuter, lenInner（図面の全長）, wantOther（もう一方のあるべき全長）, diffTotal }, outerS・innerS（菱目の中心線上の s・昇順） }。
 *  差（diff）＝もう一方（基準でないほう）の実際の長さ − あるべき長さ。失敗は { ok:false, error:'badNumber' } か { ok:false, error:'tight', index（図面の左から数えた折りの番号・1 から）}（内側の面の半径が 0.05 以下）。 */
export function foldStackPlan({ outer, inner, tO, tI, base = 'outer', outerHoles = [], innerHoles = [] } = {}) {
  const num = (a, n, min) => Array.isArray(a) && a.length === n && a.every(v => Number.isFinite(v) && v >= min);
  if (!outer || !inner || !num(outer.flats, 3, 0) || !num(inner.flats, 3, 0) || !num(outer.bends, 2, FOLD_EPS) || !num(inner.bends, 2, FOLD_EPS) || ![tO, tI].every(v => Number.isFinite(v) && v > 0)) return { ok: false, error: 'badNumber' };
  const baseOuter = base !== 'inner', gO = outer.bends.map(b => b - Math.PI * tO / 2), gI = inner.bends.map(b => b + Math.PI * tI / 2), gB = baseOuter ? gO : gI, fB = baseOuter ? outer.flats : inner.flats;   /* gO・gI＝表・裏それぞれから求めた、貼り合わせ線での丸折りの長さ */
  const rg = gB.map(g => g / Math.PI), tight = rg.findIndex(r => !(r - tI > 0.05)); if (tight >= 0) return { ok: false, error: 'tight', index: tight + 1 };
  const flip = gB[0] < gB[1], orient = a => flip ? [...a].reverse() : [...a], kg = (tO - tI) / 2, T = tO + tI;
  const flats = orient(fB), bends = orient(rg.map(r => Math.PI * (r + kg))), path = foldSectionPath({ flats, bends });
  const sum = a => a.reduce((x, y) => x + y, 0), wantBend = baseOuter ? gO.map(g => g - Math.PI * tI / 2) : gI.map(g => g + Math.PI * tO / 2), other = baseOuter ? inner : outer;
  const rf = outer.flats.map((o, i) => ({ outer: o, inner: inner.flats[i], want: fB[i], diff: other.flats[i] - fB[i] })), rb = outer.bends.map((o, i) => ({ outer: o, inner: inner.bends[i], want: wantBend[i], diff: other.bends[i] - wantBend[i] }));
  const lenOuter = sum(outer.flats) + sum(outer.bends), lenInner = sum(inner.flats) + sum(inner.bends), wantOther = sum(fB) + sum(wantBend);
  /* 菱目：図面の位置を、その革の図面の区間（平ら・丸折り）ごとに、断面の中心線の同じ区間へ比例して写す */
  const segC = [flats[0], bends[0], flats[1], bends[1], flats[2]], cumC = segC.reduce((a, v) => [...a, a.at(-1) + v], [0]);
  const mapHoles = (list, ply) => {
    const segD = [ply.flats[0], ply.bends[0], ply.flats[1], ply.bends[1], ply.flats[2]], d = flip ? [...segD].reverse() : segD, L = sum(segD), cumD = d.reduce((a, v) => [...a, a.at(-1) + v], [0]);
    return (list || []).filter(Number.isFinite).map(u => { const x = Math.max(0, Math.min(L, flip ? L - u : u)); let k = 0; while (k < 4 && x > cumD[k + 1] + 1e-9) k++; const f = d[k] > 0 ? (x - cumD[k]) / d[k] : 0; return cumC[k] + Math.max(0, Math.min(1, f)) * segC[k]; }).sort((a, b) => a - b);
  };
  return { ok: true, flip, T, glueK: kg, glueLen: sum(fB) + sum(gB), path, flats, bends, radii: rg.map(r => ({ glue: r, inner: r - tI, outer: r + tO })), report: { base: baseOuter ? 'outer' : 'inner', flats: rf, bends: rb, lenOuter, lenInner, wantOther, diffTotal: (baseOuter ? lenInner : lenOuter) - wantOther }, outerS: mapHoles(outerHoles, outer), innerS: mapHoles(innerHoles, inner) };
}
/** 断面の厚み t の2本線（role: edgeL＝折りの内側・edgeR＝外側）と、両端のふた（cap0＝始点・cap1＝終点）。origin は中心線の始点の図面上の位置。直線と円弧（図面の円弧は角度が増える向き）の配列。 */
export function foldSectionShapes(path, t, origin, plies = 1, glueK) {
  const out = [], h = t / 2;
  path.pieces.forEach((pc, i) => {
    if (pc.kind === 'line') {
      const nu = -Math.sin(pc.th), nv = Math.cos(pc.th);
      for (const [role, k] of foldEdges(h, plies, glueK)) { const a = foldDoc(origin, pc.p0.u + k * nu, pc.p0.v + k * nv), b = foldDoc(origin, pc.p1.u + k * nu, pc.p1.v + k * nv); out.push({ type: 'line', role, piece: i, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    } else {
      const c = foldDoc(origin, pc.c.u, pc.c.v);
      for (const [role, k] of foldEdges(h, plies, glueK)) { const r = Math.max(0.05, pc.r - k); out.push({ type: 'arc', role, piece: i, cx: c.x, cy: c.y, r, startDeg: -pc.a1 * 180 / Math.PI, endDeg: -pc.a0 * 180 / Math.PI }); }
    }
  });
  const ends = [['cap0', pointOnFoldPath(path, 0)], ['cap1', pointOnFoldPath(path, path.length)]];
  for (const [role, q] of ends) { const nu = -Math.sin(q.heading), nv = Math.cos(q.heading), a = foldDoc(origin, q.u - h * nu, q.v - h * nv), b = foldDoc(origin, q.u + h * nu, q.v + h * nv); out.push({ type: 'line', role, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
  return out;
}
/** s の位置に、厚みをまたぐ短い線（ボタンなどの目印）。両側に extra(mm) ずつはみ出す。 */
export function foldSectionMark(path, s, t, origin, extra = 1.5) {
  const q = pointOnFoldPath(path, s), nu = -Math.sin(q.heading), nv = Math.cos(q.heading), k = t / 2 + extra, a = foldDoc(origin, q.u + k * nu, q.v + k * nv), b = foldDoc(origin, q.u - k * nu, q.v - k * nv);
  return { type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
