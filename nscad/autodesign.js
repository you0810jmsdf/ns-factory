// 設計の自動化：レシピ（要件）→ 部品の寸法 → 用紙への配置 → 縫い穴・折り線 → 検図。純粋関数のみ。
import { foldAllowance, routeBreaks } from './design.js';
import { spineWidth } from './hardware.js';
import { newDoc, defaultTools, chainShapes, resolvePath, arcLength, bboxOf, distance, cornerHoles, equalDivide, pointAtLength } from './geometry.js';
import { buildPanels, collisions } from './sim3d.js';

export const CARD = { w: 85.6, h: 53.98, t: 0.76 };
export const REFILLS = { m5: { w: 62, h: 105 }, mini6: { w: 80, h: 126 }, a6: { w: 105, h: 148 }, bible: { w: 95, h: 170 }, a5: { w: 148, h: 210 }, a5slim: { w: 110, h: 210 } };
export const PAPERS = { a4: { w: 190, h: 277 }, a3: { w: 277, h: 400 } };
/** レシピの既定値。 */
export function defaultRecipe(kind = 'passcase') {
  return { kind, cards: 2, refill: 'mini6', ringD: 15, baseThick: 2, thickness: 1.5, stitchStyle: 'edge', stitchLine: 3, allowance: 6, pitch: 4, play: 3, k: 0.5, penHolder: true, penD: 12, paper: 'a4', binding: kind === 'notebook' ? 'ring' : 'sew' };
}
/** 縫い代（裁断線から縫い線まで）：外縫いは縫い線の位置、返し縫いは縫い代。 */
export function edgeMargin(recipe) { return recipe.stitchStyle === 'turned' ? recipe.allowance : recipe.stitchLine; }
/** レシピから部品一覧 [{id,name,w,h,thickness,role,stitchEdges:['left','bottom','right'],folds:[{x,angleDeg}]}] を返す。寸法はルール固定（README に式）。 */
export function planParts(recipe) {
  const r = { ...defaultRecipe(recipe.kind), ...recipe }, m = edgeMargin(r), parts = [];
  if (r.kind === 'passcase' || r.kind === 'cardcase') {
    const n = Math.max(1, Math.round(r.cards || 1)), innerW = CARD.w + r.play + n * CARD.t, innerH = CARD.h + r.play;
    const bodyW = innerW + 2 * m, bodyH = innerH + 2 * m;
    parts.push({ id: 'body', name: r.kind === 'cardcase' ? '本体（背面）' : '本体', nameKey: r.kind === 'cardcase' ? 'part.bodyBack' : 'part.body', w: bodyW, h: bodyH, thickness: r.thickness, role: 'body', stitchEdges: ['left', 'bottom', 'right'], folds: [] });
    parts.push({ id: 'pocket', name: 'ポケット', nameKey: 'part.pocket', w: bodyW, h: Math.round((innerH * 0.65 + m) * 10) / 10, thickness: r.thickness, role: 'pocket', stitchEdges: ['left', 'bottom', 'right'], folds: [] });
    if (r.kind === 'cardcase') parts.push({ id: 'pocket2', name: 'ポケット（内）', nameKey: 'part.pocketInner', w: bodyW, h: Math.round((innerH * 0.5 + m) * 10) / 10, thickness: r.thickness, role: 'pocket', stitchEdges: ['left', 'bottom', 'right'], folds: [] });
    return { recipe: r, parts, inner: { w: innerW, h: innerH } };
  }
  if (r.kind === 'notebook') {
    const ref = REFILLS[r.refill] || REFILLS.mini6, H = ref.h + 2 * 5, spine = r.spineOverride > 0 ? r.spineOverride : spineWidth(r.ringD, r.baseThick, r.thickness, 2), fa = foldAllowance(r.thickness, 180, { k: r.k });
    const W = 2 * (ref.w + r.play) + spine + fa, panel = ref.w + r.play;
    parts.push({ id: 'cover', name: '表紙', nameKey: 'part.cover', w: W, h: H, thickness: r.thickness, role: 'cover', stitchEdges: ['top', 'bottom', 'left', 'right'], folds: [{ x: panel, angleDeg: 90, inner: true }, { x: panel + spine, angleDeg: 90, inner: true }] });
    parts.push({ id: 'pocketL', name: '内ポケット（左）', nameKey: 'part.pocketL', w: panel - 2, h: H, thickness: r.thickness, role: 'pocket', stitchEdges: ['top', 'bottom', 'left'], folds: [] });
    parts.push({ id: 'pocketR', name: '内ポケット（右）', nameKey: 'part.pocketR', w: panel - 2, h: H, thickness: r.thickness, role: 'pocket', stitchEdges: ['top', 'bottom', 'right'], folds: [] });
    if (r.binding === 'ring') parts.push({ id: 'ringpad', name: 'リング台座（当て革）', nameKey: 'part.ringpad', w: spine + 8, h: H - 20, thickness: r.thickness, role: 'pad', stitchEdges: [], folds: [] });
    if (r.penHolder) parts.push({ id: 'pen', name: 'ペンホルダー', nameKey: 'part.pen', w: Math.round((r.penD * 3.5 + 12) * 10) / 10, h: 15, thickness: r.thickness, role: 'pen', stitchEdges: [], folds: [{ x: Math.round((r.penD * 3.5 + 12) * 5) / 10, angleDeg: 180, inner: true }] });
    return { recipe: r, parts, inner: { w: panel, h: H, spine, fa } };
  }
  if (r.kind === 'coincase') {
    const w = 80 + 2 * m, h = 70 + 2 * m;
    parts.push({ id: 'front', name: '前面', nameKey: 'part.front', w, h, thickness: r.thickness, role: 'body', stitchEdges: ['left', 'bottom', 'right'], folds: [] }, { id: 'back', name: '背面', nameKey: 'part.back', w, h: h + 30, thickness: r.thickness, role: 'body', stitchEdges: ['left', 'bottom', 'right'], folds: [{ x: null, y: h, angleDeg: 180, inner: true }] });
    return { recipe: r, parts, inner: { w: 80, h: 70 } };
  }
  return null;
}
/** 棚詰めで用紙に並べる。rotate90=true なら横長の部品は 90° 回す（繊維方向はオプション）。戻り値 {placed:[{...part,x,y,rot}], pages, overflow}。 */
export function layoutParts(parts, { paper = 'a4', gap = 6, rotate90 = true } = {}) {
  const P = PAPERS[paper] || PAPERS.a4, placed = []; let x = 0, y = 0, rowH = 0, page = 0, overflow = false;
  const items = [...parts].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  for (const part of items) {
    let w = part.w, h = part.h, rot = 0;
    if (rotate90 && w > P.w && h <= P.w) { [w, h] = [h, w]; rot = 90; }
    if (w > P.w || h > P.h) { overflow = true; }
    if (x + w > P.w + 1e-9) { x = 0; y += rowH + gap; rowH = 0; }
    if (y + h > P.h + 1e-9) { page++; x = 0; y = 0; rowH = 0; }
    placed.push({ ...part, x, y: y + page * (P.h + gap), rot, page });
    x += w + gap; rowH = Math.max(rowH, h);
  }
  return { placed, pages: page + 1, overflow, paper: P };
}
const rect = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
/** 配置済みの部品から文書を組み立てる：裁断線（型紙）・縫い線と穴（目印・内側 m）・折り線・部品名の文字・parts・recipe。 */
export function buildDoc(recipe, { paper = recipe.paper || 'a4', tools = defaultTools(), nameOf = null } = {}) {
  const plan = planParts(recipe); if (!plan) return null;
  const r = plan.recipe, m = edgeMargin(r), layout = layoutParts(plan.parts, { paper }), doc = newDoc(); doc.tools = tools;
  const tool = tools.find(t => Math.abs(t.pitch - r.pitch) < 1e-9 && t.kind === 'diamond') || tools[0];
  let sn = 1, pn = 1, hn = 1;
  for (const p of layout.placed) {
    const w = p.rot ? p.h : p.w, h = p.rot ? p.w : p.h, outline = { id: 's' + sn++, layer: 'pattern', type: 'polyline', closed: true, points: rect(p.x, p.y, w, h) };
    doc.shapes.push(outline);
    const label = nameOf ? nameOf(p) : p.name;
    doc.parts.push({ id: p.id, name: label, thickness: p.thickness, shapeIds: [outline.id], color: null, order: p.role === 'pocket' || p.role === 'pen' ? 1 : 0, role: p.role });
    doc.shapes.push({ id: 's' + sn++, layer: 'marks', type: 'text', x: p.x + 2, y: p.y + Math.min(h - 2, 8), text: `${label} ${Math.round(p.w * 10) / 10}×${Math.round(p.h * 10) / 10}`, sizeMm: 3, angleDeg: 0 });
    // 縫い線：指定した辺を内側 m に、連続する開いた折れ線で
    const edges = (p.stitchEdges || []).map(e => p.rot ? ({ left: 'top', right: 'bottom', top: 'right', bottom: 'left' })[e] : e);
    if (edges.length) {
      const L = { x: p.x + m, y: p.y + m }, R = { x: p.x + w - m, y: p.y + h - m };
      const order = ['top', 'right', 'bottom', 'left'], corners = { top: [{ x: L.x, y: L.y }, { x: R.x, y: L.y }], right: [{ x: R.x, y: L.y }, { x: R.x, y: R.y }], bottom: [{ x: R.x, y: R.y }, { x: L.x, y: R.y }], left: [{ x: L.x, y: R.y }, { x: L.x, y: L.y }] };
      const chosen = order.filter(e => edges.includes(e)), closed = chosen.length === 4;
      let pts = [];
      if (closed) pts = [corners.top[0], corners.top[1], corners.right[1], corners.bottom[1]];
      else { let start = order.findIndex((e, i) => chosen.includes(e) && !chosen.includes(order[(i + 3) % 4])); if (start < 0) start = 0; pts.push(corners[order[start]][0]); for (let k = 0; k < 4; k++) { const e = order[(start + k) % 4]; if (!chosen.includes(e)) break; pts.push(corners[e][1]); } }
      const line = { id: 's' + sn++, layer: 'marks', type: 'polyline', closed, points: pts }; doc.shapes.push(line);
      const path = { id: 'p' + pn++, shapeIds: [line.id], reversed: false, closed, segments: [], mark: 'tool' }; doc.paths.push(path);
      const route = resolvePath(doc, path), len = arcLength(route);
      // 角で区切って区間ごとに等分（角穴は区間境界として 1 回だけ置く。全長等分だと角の隣に 1mm 弱の穴が出る）
      const segEdges = [0, ...routeBreaks(route).filter(b => b > 1e-6 && b < len - 1e-6), len], positions = [];
      for (let i = 0; i + 1 < segEdges.length; i++) for (const s0 of equalDivide(segEdges[i + 1] - segEdges[i], r.pitch, 0)) { const s = segEdges[i] + s0; if (!positions.some(p => Math.abs(p - s) < 1e-6)) positions.push(s); }
      const cornerPts = cornerHoles(route, 'place');
      let points = positions.filter(s => !(closed && Math.abs(s - len) < 1e-6)).map(s => { const c = cornerPts.find(q => Math.abs(q.s - s) < 1e-6); return c || { ...pointAtLength(route, s), s }; });
      for (const q of points) doc.holes.push({ id: 'h' + hn++, pathId: path.id, s: closed && Math.abs(q.s - len) < 1e-7 ? 0 : q.s, x: q.x, y: q.y, angleDeg: q.angleDeg + tool.angleDeg, toolId: tool.id, mark: 'tool' });
      path.segments = [{ from: 0, to: len, toolId: tool.id, pitch: r.pitch, mode: 'variable' }];
    }
    for (const f of p.folds || []) {
      const fold = f.x !== null && f.x !== undefined ? (p.rot ? { x1: p.x - 2, y1: p.y + f.x, x2: p.x + w + 2, y2: p.y + f.x } : { x1: p.x + f.x, y1: p.y - 2, x2: p.x + f.x, y2: p.y + h + 2 }) : (p.rot ? { x1: p.x + f.y, y1: p.y - 2, x2: p.x + f.y, y2: p.y + h + 2 } : { x1: p.x - 2, y1: p.y + f.y, x2: p.x + w + 2, y2: p.y + f.y });
      doc.shapes.push({ id: 's' + sn++, layer: 'pattern', type: 'fold', ...fold, angleDeg: f.angleDeg, partId: p.id, inner: f.inner !== false });
    }
  }
  doc.recipe = { ...r }; doc.layoutInfo = { pages: layout.pages, overflow: layout.overflow, paper };
  return { doc, plan, layout };
}
/** 検図：繋がっていない線（端点が孤立した開図形）・用紙からのはみ出し・縫い合わせの穴数不一致・3D 干渉。[{type, ids, message}]。 */
export function check(doc, { paper = null } = {}) {
  const problems = [];
  const open = doc.shapes.filter(s => ['line', 'arc', 'bezier', 'path', 'polyline'].includes(s.type) && !(s.closed) && doc.layers.find(l => l.id === s.layer)?.id === 'pattern');
  const chains = chainShapes(open, 0.05);
  for (const c of chains) { if (c.closed) continue; const inPath = doc.paths.some(p => p.shapeIds.some(id => c.shapeIds.includes(id))); if (!inPath) problems.push({ type: 'open', ids: c.shapeIds, message: `open:${c.shapeIds.join(',')}` }); }
  if (paper) { const P = PAPERS[paper] || PAPERS.a4; for (const s of doc.shapes.filter(s => s.type !== 'fold' && s.type !== 'text')) { const b = bboxOf(s); if (b.minX < -1e-6 || b.minY < -1e-6 || b.maxX > P.w + 1e-6) problems.push({ type: 'outside', ids: [s.id], message: `outside:${s.id}` }); } }
  for (const seam of doc.seams || []) { const count = side => doc.holes.filter(h => h.pathId === side.pathId && h.s >= side.from - 1e-6 && h.s <= side.to + 1e-6).length; const a = count(seam.a), b = count(seam.b); if (a !== b) problems.push({ type: 'holes', ids: [seam.a.pathId, seam.b.pathId], message: `holes:${seam.id}:${a}/${b}` }); }
  const folds = doc.shapes.filter(s => s.type === 'fold');
  if (folds.length && doc.parts.length) { const panels = buildPanels(doc); for (const c of collisions(panels, folds, 1)) problems.push({ type: 'collision', ids: [c.a, c.b], message: `collision:${c.a}~${c.b}` }); }
  const near = (p, q) => distance(p, q) < 0.01;
  for (const s of doc.shapes.filter(s => s.type === 'line')) if (near({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 })) problems.push({ type: 'degenerate', ids: [s.id], message: `zero-length:${s.id}` });
  return problems;
}
/** 糸の長さの目安：経路ごとに 縫い長×4 + 100mm。 */
export function threadEstimate(doc) {
  let total = 0, count = 0;
  for (const p of doc.paths) { if (!doc.holes.some(h => h.pathId === p.id)) continue; const route = resolvePath(doc, p); if (!route) continue; total += arcLength(route) * 4 + 100; count++; }
  return { mm: total, paths: count };
}
