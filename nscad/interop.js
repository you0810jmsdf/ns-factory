// 他ソフト連携：Leathercraft CAD（第三者製）と Beam Studio（FLUX）向けの書き出しプリセットと取り込み補助。純粋関数のみ。
import { bboxOfDoc, bboxOf, holeAppearance, offsetShape, distance, distToShape, projectOnPath, chainShapes } from './geometry.js';
import { shapeToSvgD, docToDxfR12 } from './formats.js';

const fmt3 = n => (Math.round(n * 1000) / 1000).toString();
const escX = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Leathercraft CAD の線種レイヤー名と本アプリのレイヤーの既定対応表。 */
export const LC_LAYER_MAP = { LineType_01: 'pattern', LineType_02: 'marks', LineType_03: 'guide', 0: 'pattern', Cut: 'pattern', Stitch: 'marks', Guide: 'guide' };
export const LC_EXPORT_MAP = { pattern: 'LineType_01', marks: 'LineType_02', guide: 'LineType_03' };
/** Beam Studio 用 SVG：カット線＝黒（kerf/2 外側へ）、縫い穴＝赤の小円、刻印（目印レイヤー・文字）＝青、ガイドは含めない。 */
export function beamStudioSvg(doc, { kerfMm = 0.15, includeHoles = true, cutLayerIds = ['pattern'], engraveLayerIds = ['marks'], strokeMm = 0.1 } = {}) {
  const visible = s => doc.layers.find(l => l.id === s.layer)?.visible;
  const cut = doc.shapes.filter(s => visible(s) && cutLayerIds.includes(s.layer) && !['text', 'dimension', 'fold'].includes(s.type));
  const engrave = doc.shapes.filter(s => visible(s) && (engraveLayerIds.includes(s.layer) || (s.type === 'text' && !cutLayerIds.includes(s.layer) && s.layer !== 'guide')) && s.type !== 'fold' && s.type !== 'dimension');
  const holes = holesOnCut(doc, cut, includeHoles);
  const kerfed = cut.map(s => (kerfMm > 0 && (s.closed || s.type === 'circle')) ? (offsetShape(s, kerfMm / 2) || s) : s);
  const all = [...kerfed, ...engrave], b = bboxOfDoc({ ...doc, shapes: all.length ? all : cut, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const x0 = b.minX - 1, y0 = b.minY - 1, w = b.maxX - b.minX + 2, h = b.maxY - b.minY + 2;
  const cutBody = kerfed.map(s => { const d = shapeToSvgD(s); return d ? `<path d="${d}"/>` : ''; }).join('');
  const holeBody = holes.map(hole => { const a = holeAppearance(hole, doc); if (!a) return ''; return `<circle cx="${fmt3(hole.x)}" cy="${fmt3(hole.y)}" r="${fmt3(Math.max(0.05, Math.min(a.width, a.height || a.width) / 2))}"/>`; }).join('');
  const engraveBody = engrave.map(s => { if (s.type === 'text') return `<text x="${fmt3(s.x)}" y="${fmt3(s.y)}" font-size="${fmt3(s.sizeMm)}" font-family="sans-serif" fill="#0000ff" stroke="none" transform="rotate(${fmt3(s.angleDeg)} ${fmt3(s.x)} ${fmt3(s.y)})">${escX(s.text)}</text>`; const d = shapeToSvgD(s); return d ? `<path d="${d}"${s.closed || s.type === 'circle' ? ' fill="#0000ff"' : ''}/>` : ''; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt3(w)}mm" height="${fmt3(h)}mm" viewBox="${fmt3(x0)} ${fmt3(y0)} ${fmt3(w)} ${fmt3(h)}"><g id="cut" fill="none" stroke="#000000" stroke-width="${fmt3(strokeMm)}" stroke-linecap="round" stroke-linejoin="round">${cutBody}</g><g id="holes" fill="none" stroke="#ff0000" stroke-width="${fmt3(strokeMm)}">${holeBody}</g><g id="engrave" fill="none" stroke="#0000ff" stroke-width="${fmt3(strokeMm)}">${engraveBody}</g></svg>`;
}
/** Leathercraft CAD 互換 DXF（R12）：レイヤー名を LineType_NN に、縫い穴は Stitch_Holes、外接矩形の左下を原点に。 */
export function leathercraftDxf(doc, { originAtCorner = true, includeHoles = true, layerMap = LC_EXPORT_MAP } = {}) {
  const renamed = { ...doc, layers: doc.layers.map(l => ({ ...l, name: layerMap[l.id] || l.name })) };
  return docToDxfR12(renamed, { originAtCorner, includeHoles, dotAsPoint: false });
}
/** Leathercraft CAD の DXF/SVG から読んだ図形群を仕分ける：LineType_NN→レイヤー、Stitch_Holes の小円・小さな菱形→穴候補。 */
export function importLeathercraft(shapes, { layerMap = LC_LAYER_MAP, maxHoleMm = 4 } = {}) {
  const out = [], holeCandidates = [];
  for (const s of shapes) {
    const layer = String(s.layer ?? '');
    if (/^stitch_holes$/i.test(layer) || /^holes$/i.test(layer)) {
      const b = bboxOf(s), w = b.maxX - b.minX, h = b.maxY - b.minY;
      if (w <= maxHoleMm && h <= maxHoleMm) {
        if (s.type === 'circle') holeCandidates.push({ x: s.cx, y: s.cy, angleDeg: 0, width: s.r * 2, height: s.r * 2, kind: 'circle' });
        else if (s.type === 'polyline' && s.points.length === 4) { const pts = s.points, cx = pts.reduce((a, p) => a + p.x, 0) / 4, cy = pts.reduce((a, p) => a + p.y, 0) / 4; const far = pts.reduce((best, p) => distance(p, { x: cx, y: cy }) > distance(best, { x: cx, y: cy }) ? p : best); const near = pts.reduce((best, p) => distance(p, { x: cx, y: cy }) < distance(best, { x: cx, y: cy }) ? p : best); holeCandidates.push({ x: cx, y: cy, angleDeg: Math.atan2(far.y - cy, far.x - cx) * 180 / Math.PI, width: 2 * distance(far, { x: cx, y: cy }), height: 2 * distance(near, { x: cx, y: cy }), kind: 'diamond' }); }
        else if (s.type === 'point') holeCandidates.push({ x: s.x, y: s.y, angleDeg: 0, width: 0.5, height: 0.5, kind: 'dot' });
        else out.push({ ...s, layer: 'marks' });
        continue;
      }
      out.push({ ...s, layer: 'marks' }); continue;
    }
    if (s.type === 'point') continue;
    const mapped = layerMap[layer] || (/^LineType_(\d+)$/i.test(layer) ? (Number(layer.match(/(\d+)$/)[1]) <= 1 ? 'pattern' : Number(layer.match(/(\d+)$/)[1]) === 2 ? 'marks' : 'guide') : layer || 'pattern');
    out.push({ ...s, layer: mapped });
  }
  return { shapes: out, holeCandidates };
}
/** 折れ線の中で円弧近似されている区間を円弧に戻す。tol は点と円の許容距離(mm)。戻り値は line/arc/polyline の配列。 */
export function recoverArcs(poly, tol = 0.02, minPoints = 5) {
  const pts = poly.points; if (!pts || pts.length < minPoints) return [poly];
  const circleThrough = (a, b, c) => { const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(d) < 1e-9) return null; const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d, uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d; return { cx: ux, cy: uy, r: Math.hypot(a.x - ux, a.y - uy) }; };
  const at = k => pts[k % pts.length]; // 閉図形では末尾の次が先頭
  const fits = (i, j) => { const c = circleThrough(at(i), at(Math.floor((i + j) / 2)), at(j)); if (!c || c.r > 1e5) return null; for (let k = i; k <= j; k++) if (Math.abs(Math.hypot(at(k).x - c.cx, at(k).y - c.cy) - c.r) > tol) return null; return c; };
  const out = []; let run = [pts[0]], i = 0;
  const n = poly.closed ? pts.length : pts.length - 1;
  const pushRun = () => { if (run.length === 2) out.push({ type: 'line', x1: run[0].x, y1: run[0].y, x2: run[1].x, y2: run[1].y }); else if (run.length > 2) out.push({ type: 'polyline', closed: false, points: run }); run = []; };
  while (i < n) {
    let j = i + minPoints - 1, best = null; if (j > n) { j = n; }
    let c = j - i >= minPoints - 1 ? fits(i, j) : null;
    if (c) { best = { j, c }; let jj = j + 1; while (jj <= n) { const cc = fits(i, jj); if (!cc) break; best = { j: jj, c: cc }; jj++; } }
    if (best) {
      pushRun();
      const a0 = Math.atan2(pts[i].y - best.c.cy, pts[i].x - best.c.cx) * 180 / Math.PI, a1 = Math.atan2(pts[best.j % pts.length].y - best.c.cy, pts[best.j % pts.length].x - best.c.cx) * 180 / Math.PI;
      const mid = at(Math.floor((i + best.j) / 2)), am = Math.atan2(mid.y - best.c.cy, mid.x - best.c.cx) * 180 / Math.PI;
      const cw = (((am - a0) % 360) + 360) % 360 <= (((a1 - a0) % 360) + 360) % 360; // 中点が始→終の時計回り掃引内にあれば時計回り
      out.push(cw ? { type: 'arc', cx: best.c.cx, cy: best.c.cy, r: best.c.r, startDeg: a0, endDeg: a1 } : { type: 'arc', cx: best.c.cx, cy: best.c.cy, r: best.c.r, startDeg: a1, endDeg: a0 });
      i = best.j; run = [pts[i % pts.length]]; continue;
    }
    run.push(pts[(i + 1) % pts.length]); i++;
  }
  pushRun();
  return out.length ? out.map(s => ({ ...s, layer: poly.layer })) : [poly];
}
/** 図形集合に経路が完全に含まれる穴だけを返す（穴ごとの全走査を避ける）。 */
export function holesOnCut(doc, shapes, includeHoles = true) {
  if (!includeHoles) return [];
  const ids = new Set(shapes.map(s => s.id)), okPaths = new Set(doc.paths.filter(p => p.shapeIds.every(id => ids.has(id))).map(p => p.id));
  return doc.holes.filter(h => okPaths.has(h.pathId));
}
/** ID 採番：配列を 1 回だけ読んで Set に入れ、以後は単調に進める（O(n²) 回避）。呼び元が採番直後に push する前提。 */
export function makeNextId() {
  const cache = new Map();
  return (list, prefix) => { let c = cache.get(list); if (!c) { c = { ids: new Set(list.map(x => x.id)), n: {} }; cache.set(list, c); } let n = c.n[prefix] || 1; while (c.ids.has(prefix + n)) n++; c.n[prefix] = n + 1; const id = prefix + n; c.ids.add(id); return id; };
}

/** 穴候補を最寄りの図形（1.5mm 以内）の経路に取り付ける。必要なら経路と工具を作る。戻り値 {attached, orphan}。文書を直接変更する。 */
export function attachHoles(doc, candidates, { maxDistMm = 1.5, freshId } = {}) {
  const next = freshId || makeNextId();
  let attached = 0, orphan = 0;
  const stitchable = s => !['text', 'dimension', 'fold'].includes(s.type);
  for (const c of candidates) {
    const hit = doc.shapes.filter(stitchable).reduce((best, s) => { const d = distToShape(s, c); return d < (best ? best.d : maxDistMm) ? { s, d } : best; }, null);
    if (!hit) { orphan++; continue; }
    let path = doc.paths.find(p => p.shapeIds.includes(hit.s.id));
    if (!path) { const chain = chainShapes([hit.s])[0]; path = { id: next(doc.paths, 'p'), shapeIds: chain.shapeIds, reversed: false, closed: chain.closed, segments: [], mark: 'tool' }; doc.paths.push(path); }
    const route = chainShapes(path.shapeIds.map(id => doc.shapes.find(s => s.id === id)))[0]; if (!route) { orphan++; continue; }
    const kind = c.kind === 'circle' ? 'round' : 'diamond', w = Math.max(0.2, c.width), h = Math.max(0.1, c.height);
    let tool = doc.tools.find(t => t.id.startsWith('imported-') && t.kind === kind && Math.abs(t.holeW - w) < 1e-6 && Math.abs(t.holeH - h) < 1e-6);
    if (!tool) { tool = { id: next(doc.tools, 'imported-'), name: 'imported ' + kind, kind, pitch: 4, teeth: 1, holeW: w, holeH: h, holeD: w, angleDeg: 0, mark: 'tool' }; doc.tools.push(tool); }
    const q = projectOnPath({ ...route, reversed: path.reversed }, c);
    doc.holes.push({ id: next(doc.holes, 'h'), pathId: path.id, s: q.s, x: c.x, y: c.y, angleDeg: c.angleDeg, toolId: tool.id, mark: c.kind === 'dot' ? 'dot' : 'tool' });
    attached++;
  }
  return { attached, orphan };
}
