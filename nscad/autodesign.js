// 設計の自動化：レシピ（要件）→ 部品の寸法 → 用紙への配置 → 縫い穴・折り線 → 検図。純粋関数のみ。
import { foldAllowance, routeBreaks } from './design.js';
import { spineWidth } from './hardware.js';
import { newDoc, defaultTools, chainShapes, resolvePath, arcLength, bboxOf, distance, cornerHoles, equalDivide, pointAtLength, rotate, translate } from './geometry.js';
import { buildPanels, collisions } from './sim3d.js';

export const CARD = { w: 85.6, h: 53.98, t: 0.76 };
export const REFILLS = { m5: { w: 62, h: 105 }, mini6: { w: 80, h: 126 }, a6: { w: 105, h: 148 }, bible: { w: 95, h: 170 }, a5: { w: 148, h: 210 }, a5slim: { w: 110, h: 210 } };
export const PAPERS = { a4: { w: 190, h: 277 }, a3: { w: 277, h: 400 } };
/** レシピの既定値。 */
export function defaultRecipe(kind = 'passcase') {
  const r = { kind, cards: 2, refill: 'mini6', ringD: 15, baseThick: 2, thickness: 1.5, stitchStyle: 'edge', stitchLine: 3, allowance: 6, pitch: 4, play: 3, k: 0.5, penHolder: true, penD: 12, paper: 'a4', binding: kind === 'notebook' ? 'ring' : 'sew' };
  if (kind === 'cup') Object.assign(r, { cupTopD: 80, cupBottomD: 70, cupHeight: 100, thickness: 2, stitchLine: 3, endMargin: 2, pitch: 4, laminateGap: 2.5, binding: 'butt' });   /* laminateGap：底面の2重円の間（駒合わせの外の円から、2枚を縫い合わせる内の円まで・事業主 2026-11-14「外の円から2.5mm内側」） */
    /* 事業主 2026-11-14 推奨どおり：ペン立て（上の外径 80・底の外径 70・高さ 100・革厚 2）・側面の両端は突き合わせ・底は側面の内側に入れて駒合わせ縫い */
  if (kind === 'ring') Object.assign(r, { innerD: 16, ringSize: 0, ringWidth: 20, ringLayers: 2, thickness: 2.3, endMargin: 2, sideInset: 1, pitch: 3, holeKind: 'round', binding: 'butt' });   /* 2026-11-12 のメルカリの指輪（内径16mm・幅2cm・2枚重ね・丸目 3mm）と同じ形になる値 */
  return r;
}
/** 指輪の号数 → 内径 (mm)。日本の号数：1号 13.0mm から、1号ごとに 1/3mm ずつ太くなる（10号＝16.0mm・内周 約50.3mm）。 */
export const fingerInnerD = size => 13 + (size - 1) / 3;
/** 内径 (mm) → いちばん近い号数（表示用）。 */
export const fingerSizeOf = d => Math.round((d - 13) * 3 + 1);
/** 指輪で使う内径：号数が入っていれば号数から、なければ内径の欄から。 */
export const fingerDiameter = r => (r.ringSize > 0 ? fingerInnerD(r.ringSize) : r.innerD);
/** 丸穴（丸キリ）の道具：同じピッチの丸穴が道具一覧に無ければ足す（呼び出し元の一覧は変えない）。 */
function roundToolFor(doc, pitch) {
  let t = doc.tools.find(x => x.kind === 'round' && Math.abs(x.pitch - pitch) < 1e-9);
  if (!t) { t = { id: `round-${pitch}-2`, name: `round-${pitch}-2`, kind: 'round', pitch, teeth: 2, holeW: 1, holeH: 1, holeD: 1, angleDeg: 0, mark: 'tool' }; doc.tools = [...doc.tools, t]; }
  return t;
}
/** カップの側面の展開（部品の中の座標・左上が 0,0）。上・底の外径から革厚の中心の直径（外径−厚み）を出し、
 *  円錐台なら扇形（扇の要から底までの半径 Rb＝斜辺×底の直径÷直径の差・開き角＝180×底の直径÷Rb 度）、上と底が同じなら長方形。
 *  rows：bottom＝底の縫い線（底の端から革厚ちょうど・駒合わせ。外側の底革の上面の高さ／事業主 2026-11-14）／seamA・seamB＝両端の縫い線（端から endMargin・突き合わせ・底の列と1ピッチあける）。 */
export function cupSideShape(r) {
  const t = r.thickness, sl = r.stitchLine, bl = t, e = r.endMargin, pitch = r.pitch, Dt = r.cupTopD - t, Db = r.cupBottomD - t, diff = Dt - Db, slant = Math.hypot(r.cupHeight, diff / 2);
  let outline, rows, theta = 0, Rb = Infinity, Rt = Infinity;
  if (Math.abs(diff) < 0.01) {   /* 筒：横＝底の円周・縦＝高さ（上が y=0・底が y=h） */
    const W = Math.PI * Db, h = slant;
    outline = [{ type: 'polyline', closed: true, points: rect(0, 0, W, h) }];
    rows = { bottom: { type: 'polyline', closed: false, points: [{ x: 0, y: h - bl }, { x: W, y: h - bl }] }, seamA: { type: 'polyline', closed: false, points: [{ x: e, y: h - bl - pitch }, { x: e, y: sl }] }, seamB: { type: 'polyline', closed: false, points: [{ x: W - e, y: h - bl - pitch }, { x: W - e, y: sl }] } };
  } else {   /* 扇形：要を (0,0) に、下向きに開く */
    Rb = slant * Db / Math.abs(diff); Rt = slant * Dt / Math.abs(diff); theta = 180 * Db / Rb;
    const a0 = 90 - theta / 2, a1 = 90 + theta / 2, rIn = Math.min(Rb, Rt), rOut = Math.max(Rb, Rt), dir = Rt > Rb ? 1 : -1, rad = a => a * Math.PI / 180;
    const P = (rho, a, n = 0, side = 1) => ({ x: rho * Math.cos(rad(a)) - side * n * Math.sin(rad(a)), y: rho * Math.sin(rad(a)) + side * n * Math.cos(rad(a)) });
    const arc = rr => ({ type: 'arc', cx: 0, cy: 0, r: rr, startDeg: (a0 + 360) % 360, endDeg: (a0 + 360) % 360 + theta });
    outline = [arc(rIn), { type: 'line', x1: P(rIn, a1).x, y1: P(rIn, a1).y, x2: P(rOut, a1).x, y2: P(rOut, a1).y }, arc(rOut), { type: 'line', x1: P(rOut, a0).x, y1: P(rOut, a0).y, x2: P(rIn, a0).x, y2: P(rIn, a0).y }];
    const r1 = Rb + dir * (bl + pitch), r2 = Rt - dir * sl;
    rows = { bottom: arc(Rb + dir * bl), seamA: { type: 'polyline', closed: false, points: [P(r1, a0, e, 1), P(r2, a0, e, 1)] }, seamB: { type: 'polyline', closed: false, points: [P(r1, a1, e, -1), P(r2, a1, e, -1)] } };
  }
  const boxes = outline.map(bboxOf), minX = Math.min(...boxes.map(b => b.minX)), minY = Math.min(...boxes.map(b => b.minY)), maxX = Math.max(...boxes.map(b => b.maxX)), maxY = Math.max(...boxes.map(b => b.maxY));
  const move = s => translate(s, -minX, -minY);
  return { outline: outline.map(move), rows: Object.fromEntries(Object.entries(rows).map(([k, s]) => [k, move(s)])), w: maxX - minX, h: maxY - minY, slant, theta, Rb, Rt, bottomLen: arcLength(rows.bottom) };
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
  if (r.kind === 'ring') {
    /* 指輪（事業主 2026-11-14「指輪作図機能」・案A：作家本人以外は🔒）：帯を輪にして、両端を突き合わせて縫う。
       内側の帯の長さ＝内径の円周（π×D）。2枚重ねのとき、外側の帯は内側の帯の厚みの外を回るので π×(D＋2×厚み)。
       両端から endMargin の所に、幅の端から sideInset 内側まで、丸目の穴を1列ずつ（突き合わせて、端どうしを縫い合わせる）。 */
    const D = fingerDiameter(r), W = r.ringWidth, t = r.thickness, rows = [{ y: r.endMargin }, { y: null }];
    const band = (id, nameKey, name, h) => ({ id, name, nameKey, w: W, h: Math.round(h * 100) / 100, thickness: t, role: 'body', stitchEdges: [], folds: [], holeRows: rows.map(q => ({ y: q.y === null ? Math.round(h * 100) / 100 - r.endMargin : q.y })) });
    parts.push(band('ringInner', 'part.ringInner', r.ringLayers >= 2 ? '内側の帯' : '帯', Math.PI * D));
    if (r.ringLayers >= 2) parts.push(band('ringOuter', 'part.ringOuter', '外側の帯', Math.PI * (D + 2 * t)));
    return { recipe: r, parts, inner: { d: D, size: fingerSizeOf(D), w: W } };
  }
  if (r.kind === 'cup') {
    /* カップ（事業主 2026-11-14「カップ作図機能」・縫って作る筒・すり鉢）：側面（扇形）の両端を突き合わせて縫い、底の円を側面の内側に入れて駒合わせで縫う。
       底の直径＝底の外径−2×革厚。駒合わせの穴の数は、側面の底の列と底の円の列で同じにする（底の円の方が周が短いので、底の穴の間隔は狭くなる）。 */
    /* 底は2枚重ね（事業主 2026-11-14「底は２枚重ねとして２枚を縫い合わせ、外側の一枚のみが側面と駒合わせ縫い」）：2枚とも直径＝底の外径−2×革厚。
       底面の縫い目は2重円（「底面は縫い目が２重円になる」）：外の円＝駒合わせ（底の端から革厚ちょうど・側面の下の列と同じ穴数）、内の円＝2枚の縫い合わせ（外の円から laminateGap 内側・2枚で同じ穴数）。 */
    const t = r.thickness, D = r.cupBottomD, rd = D / 2 - t, rk = rd - t, rl = rk - (r.laminateGap ?? 2.5);
    if (!(r.cupTopD > t && D > t && r.cupHeight > 0 && rl > 1)) return null;
    const side = cupSideShape(r), n = Math.max(3, Math.round(side.bottomLen / r.pitch)), m = Math.max(3, Math.round(2 * Math.PI * rl / r.pitch)), r2 = v => Math.round(v * 100) / 100;
    if (side.theta >= 350 || !(side.w > 0 && side.h > 0)) return null;
    side.rows.bottom.holes = { mode: 'centered', n };   /* 突き合わせの継ぎ目が、穴と穴のちょうど間に来る */
    side.rows.seamA.holes = side.rows.seamB.holes = { tool: 'round' };   /* 側面の両端は突き合わせてクロスステッチ＝丸キリの丸穴（事業主 2026-11-14）。左右の列は同じ長さなので穴の数・高さがそろう */
    const circ = (rr, k) => ({ type: 'circle', cx: rd, cy: rd, r: rr, holes: { mode: 'closed', n: k } }), disc = rows => ({ outline: [{ type: 'circle', cx: rd, cy: rd, r: rd }], rows, w: 2 * rd, h: 2 * rd });
    parts.push({ id: 'cupSide', name: '側面', nameKey: 'part.cupSide', w: r2(side.w), h: r2(side.h), thickness: t, role: 'body', stitchEdges: [], folds: [], local: side });
    parts.push({ id: 'cupBottomOuter', name: '底（外側）', nameKey: 'part.cupBottomOuter', w: r2(2 * rd), h: r2(2 * rd), thickness: t, role: 'body', stitchEdges: [], folds: [], local: disc({ koma: circ(rk, n), lam: circ(rl, m) }) });
    parts.push({ id: 'cupBottomInner', name: '底（内側）', nameKey: 'part.cupBottomInner', w: r2(2 * rd), h: r2(2 * rd), thickness: t, role: 'body', stitchEdges: [], folds: [], local: disc({ lam: circ(rl, m) }) });
    return { recipe: r, parts, seams: [{ a: 'cupSide:bottom', b: 'cupBottomOuter:koma', style: 'butt' }, { a: 'cupSide:seamA', b: 'cupSide:seamB', style: 'butt' }, { a: 'cupBottomOuter:lam', b: 'cupBottomInner:lam', style: 'overlap' }], inner: { bottomD: r2(2 * rd), holes: n, laminateHoles: m, komaR: r2(rk), laminateR: r2(rl), slant: r2(side.slant), angleDeg: r2(side.theta), Rb: r2(side.Rb), Rt: r2(side.Rt) } };
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
  const P = PAPERS[paper] || PAPERS.a4, placed = []; let x = 0, y = 0, rowH = 0, page = 0, overflow = false, cols = [];
  const items = [...parts].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  for (const part of items) {
    let w = part.w, h = part.h, rot = 0;
    if (rotate90 && w > P.w && h <= P.w) { [w, h] = [h, w]; rot = 90; }
    if (w > P.w || h > P.h) { overflow = true; }
    if (x + w > P.w + 1e-9) {   /* 横に入らないとき：同じ段の列の下が空いていれば、そこに縦に積む（カップの底2枚を、扇形の横に並べて A4 1枚に収める・2026-11-14） */
      const c = cols.find(q => w <= q.w + 1e-9 && q.bottom + gap + h <= y + rowH + 1e-9);
      if (c) { placed.push({ ...part, x: c.x, y: c.bottom + gap + page * (P.h + gap), rot, page }); c.bottom += gap + h; continue; }
      x = 0; y += rowH + gap; rowH = 0; cols = [];
    }
    if (y + h > P.h + 1e-9) { page++; x = 0; y = 0; rowH = 0; cols = []; }
    placed.push({ ...part, x, y: y + page * (P.h + gap), rot, page });
    cols.push({ x, w, bottom: y + h }); x += w + gap; rowH = Math.max(rowH, h);
  }
  return { placed, pages: page + 1, overflow, paper: P };
}
const rect = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
/** 配置済みの部品から文書を組み立てる：裁断線（型紙）・縫い線と穴（ガイド・内側 m）・折り線・部品名の文字・parts・recipe。 */
export function buildDoc(recipe, { paper = recipe.paper || 'a4', tools = defaultTools(), nameOf = null } = {}) {
  const plan = planParts(recipe); if (!plan) return null;
  const r = plan.recipe, m = edgeMargin(r), layout = layoutParts(plan.parts, { paper }), doc = newDoc(); doc.tools = tools;
  const kindOf = r.holeKind === 'round' ? 'round' : 'diamond', tool = (r.toolId && tools.find(t => t.id === r.toolId && t.kind === kindOf)) || tools.find(t => Math.abs(t.pitch - r.pitch) < 1e-9 && t.kind === kindOf) || tools.find(t => t.kind === kindOf) || tools[0];   /* toolId：レシピの「目打ち」欄で選んだ菱目（事業主 2026-11-14「菱目がデカい。変えられないの？」） */
  let sn = 1, pn = 1, hn = 1;
  const rowPaths = new Map();
  for (const p of layout.placed) {
    if (p.local) {   /* 長方形でない部品（カップの扇形・底の円）：部品の中の座標で作った形を、回して用紙に置く */
      const place = s => { let q = s; if (p.rot) q = translate(rotate(q, 90), p.local.h, 0);   /* 丸める前の高さで戻す（丸めた値だと 0.002mm ほど用紙の外に出る） */ return translate(q, p.x, p.y); }, w = p.rot ? p.h : p.w, h = p.rot ? p.w : p.h;
      const outline = p.local.outline.map(s => ({ id: 's' + sn++, layer: 'pattern', ...place(s) })); doc.shapes.push(...outline);
      const label = nameOf ? nameOf(p) : p.name;
      doc.parts.push({ id: p.id, name: label, thickness: p.thickness, shapeIds: outline.map(s => s.id), color: null, order: 0, role: p.role });
      doc.shapes.push({ id: 's' + sn++, layer: 'guide', type: 'text', x: p.x + w / 2 - 10, y: p.y + h / 2, text: `${label} ${Math.round(p.w * 10) / 10}×${Math.round(p.h * 10) / 10}`, sizeMm: 3, angleDeg: 0 });
      for (const [key, raw] of Object.entries(p.local.rows || {})) {
        const { holes: spec, ...geo } = raw, line = { id: 's' + sn++, layer: 'guide', ...place(geo) }; doc.shapes.push(line);
        const closed = line.type === 'circle', path = { id: 'p' + pn++, shapeIds: [line.id], reversed: false, closed, segments: [], mark: 'tool' }; doc.paths.push(path);
        const route = resolvePath(doc, path), len = arcLength(route);
        const at = spec?.mode === 'centered' ? Array.from({ length: spec.n }, (_, i) => (i + 0.5) * len / spec.n) : spec?.mode === 'closed' ? Array.from({ length: spec.n }, (_, i) => i * len / spec.n) : equalDivide(len, r.pitch, 0);
        const rowTool = spec?.tool === 'round' ? roundToolFor(doc, r.pitch) : tool;
        for (const s of at) { const q = pointAtLength(route, s); doc.holes.push({ id: 'h' + hn++, pathId: path.id, s, x: q.x, y: q.y, angleDeg: q.angleDeg + rowTool.angleDeg, toolId: rowTool.id, mark: 'tool' }); }
        path.segments = [{ from: 0, to: len, toolId: rowTool.id, pitch: spec?.n ? len / spec.n : r.pitch, mode: 'variable' }];
        rowPaths.set(p.id + ':' + key, { pathId: path.id, len });
      }
      continue;
    }
    const w = p.rot ? p.h : p.w, h = p.rot ? p.w : p.h, outline = { id: 's' + sn++, layer: 'pattern', type: 'polyline', closed: true, points: rect(p.x, p.y, w, h) };
    doc.shapes.push(outline);
    const label = nameOf ? nameOf(p) : p.name;
    doc.parts.push({ id: p.id, name: label, thickness: p.thickness, shapeIds: [outline.id], color: null, order: p.role === 'pocket' || p.role === 'pen' ? 1 : 0, role: p.role });
    doc.shapes.push({ id: 's' + sn++, layer: 'guide', type: 'text', x: p.x + 2, y: p.y + Math.min(h - 2, 8), text: `${label} ${Math.round(p.w * 10) / 10}×${Math.round(p.h * 10) / 10}`, sizeMm: 3, angleDeg: 0 });
    // 縫い線：指定した辺を内側 m に、連続する開いた折れ線で
    const edges = (p.stitchEdges || []).map(e => p.rot ? ({ left: 'top', right: 'bottom', top: 'right', bottom: 'left' })[e] : e);
    if (edges.length) {
      const L = { x: p.x + m, y: p.y + m }, R = { x: p.x + w - m, y: p.y + h - m };
      const order = ['top', 'right', 'bottom', 'left'], corners = { top: [{ x: L.x, y: L.y }, { x: R.x, y: L.y }], right: [{ x: R.x, y: L.y }, { x: R.x, y: R.y }], bottom: [{ x: R.x, y: R.y }, { x: L.x, y: R.y }], left: [{ x: L.x, y: R.y }, { x: L.x, y: L.y }] };
      const chosen = order.filter(e => edges.includes(e)), closed = chosen.length === 4;
      let pts = [];
      if (closed) pts = [corners.top[0], corners.top[1], corners.right[1], corners.bottom[1]];
      else { let start = order.findIndex((e, i) => chosen.includes(e) && !chosen.includes(order[(i + 3) % 4])); if (start < 0) start = 0; pts.push(corners[order[start]][0]); for (let k = 0; k < 4; k++) { const e = order[(start + k) % 4]; if (!chosen.includes(e)) break; pts.push(corners[e][1]); } }
      const line = { id: 's' + sn++, layer: 'guide', type: 'polyline', closed, points: pts }; doc.shapes.push(line);
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
    for (const row of p.holeRows || []) {   /* 指輪の帯の両端など：端から row.y の所に、幅の両側 sideInset を残して穴を1列（ピッチで等分） */
      const side = r.sideInset || 0, a = p.rot ? { x: p.x + row.y, y: p.y + side } : { x: p.x + side, y: p.y + row.y }, b = p.rot ? { x: p.x + row.y, y: p.y + p.w - side } : { x: p.x + p.w - side, y: p.y + row.y };
      const line = { id: 's' + sn++, layer: 'guide', type: 'polyline', closed: false, points: [a, b] }; doc.shapes.push(line);
      const path = { id: 'p' + pn++, shapeIds: [line.id], reversed: false, closed: false, segments: [], mark: 'tool' }; doc.paths.push(path);
      const route = resolvePath(doc, path), len = arcLength(route);
      for (const s of equalDivide(len, r.pitch, 0)) { const q = pointAtLength(route, s); doc.holes.push({ id: 'h' + hn++, pathId: path.id, s, x: q.x, y: q.y, angleDeg: q.angleDeg + tool.angleDeg, toolId: tool.id, mark: 'tool' }); }
      path.segments = [{ from: 0, to: len, toolId: tool.id, pitch: r.pitch, mode: 'variable' }];
    }
    for (const f of p.folds || []) {
      const fold = f.x !== null && f.x !== undefined ? (p.rot ? { x1: p.x - 2, y1: p.y + f.x, x2: p.x + w + 2, y2: p.y + f.x } : { x1: p.x + f.x, y1: p.y - 2, x2: p.x + f.x, y2: p.y + h + 2 }) : (p.rot ? { x1: p.x + f.y, y1: p.y - 2, x2: p.x + f.y, y2: p.y + h + 2 } : { x1: p.x - 2, y1: p.y + f.y, x2: p.x + w + 2, y2: p.y + f.y });
      doc.shapes.push({ id: 's' + sn++, layer: 'pattern', type: 'fold', ...fold, angleDeg: f.angleDeg, partId: p.id, inner: f.inner !== false });
    }
  }
  if (r.kind === 'ring' && plan.inner?.d > 0) {   /* 内径の円（ガイド）：帯の右に置く。指の太さ・号数を目で確かめる用 */
    const rad = plan.inner.d / 2, right = Math.max(...layout.placed.map(q => q.x + (q.rot ? q.h : q.w)));
    doc.shapes.push({ id: 's' + sn++, layer: 'guide', type: 'circle', cx: right + 6 + rad, cy: rad, r: rad });
  }
  for (const seam of plan.seams || []) {   /* 縫い合わせ（駒合わせ・突き合わせ）：検図で、両側の穴の数がそろっているかを見る */
    const a = rowPaths.get(seam.a), b = rowPaths.get(seam.b); if (!a || !b) continue;
    doc.seams.push({ id: 'seam' + (doc.seams.length + 1), a: { pathId: a.pathId, from: 0, to: a.len }, b: { pathId: b.pathId, from: 0, to: b.len }, style: seam.style, reversed: false });
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
