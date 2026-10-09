// Leathercraft CAD の保存形式 .lcc（UTF-8 JSON：meta／layers／shapes／backdrops／printareas）を N's CAD 文書へ変換する。
// 座標は mm・Y 下向き・角度は時計回り正（N's CAD と同じ）。S_HOLE（縫い穴）は PrevStId/NextStId の連結ごとに経路へ付け直す。
import { newDoc, distToShape, chainShapes, projectOnPath, arcLength, bboxOf } from './geometry.js';
import { parsePathD } from './importers.js';
const normDeg = a => ((a % 360) + 360) % 360;
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pt = a => Array.isArray(a) && a.length >= 2 ? { x: num(a[0]), y: num(a[1]) } : { x: 0, y: 0 };
/** .lcc の工具記号（pr.bt）→ N's CAD の工具種別。D=菱目・R=丸・E=ヨーロッパ目・F=平目。不明は菱目。 */
export const LCC_TOOL_KIND = { D: 'diamond', R: 'round', E: 'european', F: 'flat' };
/** .lcc の色（Aqua=輪郭・Lime=パッチ線・Orange=寸法・Yellow=目印）→ N's CAD の図形色（5色のうち4色。白は目打ち穴用で図形には使わない）。 */
export const LCC_SHAPE_COLOR = { Aqua: 'blue', Lime: 'green', Orange: 'yellow', Yellow: 'yellow' };
/** 文字列または JSON を受け取り、.lcc らしければ解析結果を返す。違えば null。 */
export function parseLcc(input) {
  let d = input;
  if (typeof input === 'string') { try { d = JSON.parse(input.replace(/^﻿/, '')); } catch { return null; } }
  if (!d || typeof d !== 'object' || !Array.isArray(d.shapes) || d.meta?.file_type !== 'LeathercraftCAD') return null;
  return d;
}
/** 1 図形を N's CAD 図形の配列へ（穴は除く）。ellipse 弧や未知型は path（SVG d）を平坦化して受ける。 */
export function lccShapeToShapes(s) {
  const t = s.type, w = num(s.w), h = num(s.h), sp = pt(s.sp), ep = pt(s.ep), ct = pt(s.ct);
  const viaPath = () => (typeof s.path === 'string' && s.path.trim() ? parsePathD(s.path) : []);
  if (t === 'LINE') return [{ type: 'line', x1: sp.x, y1: sp.y, x2: ep.x, y2: ep.y }];
  if (t === 'BEZIER') { const c1 = pt(s.bz1), c2 = pt(s.bz2); return [{ type: 'bezier', x1: sp.x, y1: sp.y, c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x2: ep.x, y2: ep.y }]; }
  if (t === 'ARC') {
    const sta = num(s.sta), swa = num(s.swa);
    if (w > 0 && Math.abs(w - h) < 1e-6 && Math.abs(swa) > 1e-9) { const start = swa >= 0 ? sta : sta + swa; return [{ type: 'arc', cx: ct.x, cy: ct.y, r: w, startDeg: normDeg(start), endDeg: normDeg(start) + Math.min(360, Math.abs(swa)) }]; }
    return viaPath();
  }
  if (t === 'ELLIPSE') { if (w > 0 && Math.abs(w - h) < 1e-6) return [{ type: 'circle', cx: ct.x, cy: ct.y, r: w / 2 }]; return viaPath(); }
  if (t === 'DOT') return [{ type: 'circle', cx: ct.x, cy: ct.y, r: Math.max(0.1, (w || 0.9) / 2) }];
  if (t === 'TEXT') { const text = String(s.tx || '').trim(), size = num(s.fs) || 5; if (!text) return viaPath(); return [{ type: 'text', x: sp.x, y: sp.y + size * 0.9, text: text.slice(0, 1000), sizeMm: size, angleDeg: normDeg(num(s.rt)) }]; }
  if (t === 'DIMENSION') { if (s.dk === 'linear' && Array.isArray(s.dp1) && Array.isArray(s.dp2)) { const a = pt(s.dp1), b = pt(s.dp2); return [{ type: 'dimension', x1: a.x, y1: a.y, x2: b.x, y2: b.y, offset: -num(s.doff) || 8 }]; } return viaPath(); }
  return viaPath(); // OTHER など
}
/** S_HOLE を穴候補へ：{x,y,angleDeg,width,height,kind,pitch,prev,next,id}。 */
export function lccHole(s) {
  const ct = pt(s.ct), bt = String(s.pr?.bt || s.st || 'D').toUpperCase();
  return { id: String(s.id), x: ct.x, y: ct.y, angleDeg: normDeg(num(s.rt)), width: Math.max(0.2, num(s.w) || 1), height: Math.max(0.1, num(s.h) || 2), kind: LCC_TOOL_KIND[bt] || 'diamond', pitch: num(s.pr?.p) || 0, prev: String(s.PrevStId ?? '-1'), next: String(s.NextStId ?? '-1') };
}
/** 穴候補を Prev/Next の連結順に並べた鎖の配列に分ける（連結のないものは 1 個の鎖）。 */
export function holeChains(holes) {
  const byId = new Map(holes.map(h => [h.id, h])), seen = new Set(), chains = [];
  for (const h of holes) {
    if (seen.has(h.id)) continue;
    let head = h; const guard = new Set([h.id]); while (byId.has(head.prev) && !guard.has(head.prev)) { head = byId.get(head.prev); guard.add(head.id); }
    if (seen.has(head.id)) head = h; // 先頭が別の鎖で消費済みなら自分から始める
    const chain = []; let cur = head; while (cur && !seen.has(cur.id)) { seen.add(cur.id); chain.push(cur); cur = byId.get(cur.next); }
    if (chain.length) chains.push(chain);
  }
  return chains;
}
/** .lcc（文字列または JSON）→ { doc, stats, warnings }。doc は validateDoc を通る N's CAD 文書。 */
export function lccToDoc(input, { attachMaxMm = 1.5, name = '', tools = [] } = {}) {
  const d = parseLcc(input); if (!d) throw new Error('not-lcc');
  const doc = newDoc(), warnings = [];
  const layerNames = (d.layers || []).map((l, i) => ({ idx: String(l.id ?? i), name: String(l.nam || `layer ${i + 1}`) }));
  // .lcc は 1 レイヤーに全図形がフラットに入っていることが多く、代わりに色で用途を区別している（革の色ではない）。
  // 実測：Aqua＝輪郭（カット線）、Lime＝パッチ分割線、Orange＝寸法（線・文字）、Yellow＝目印。それ以外は元のレイヤー番号へ。
  const COLOR_LAYER = { Aqua: { id: 'lcc-outline', name: '輪郭（Aqua）' }, Lime: { id: 'lcc-patch', name: 'パッチ線（Lime）' }, Orange: { id: 'lcc-dim', name: '寸法（Orange）' }, Yellow: { id: 'lcc-mark', name: '目印（Yellow）' } };
  // レイヤー振り分け（上）とは別に、N's CAD の図形プロパティ色（5色）にも復元する。White（目打ち穴）は S_HOLE 側で別処理のため対象外。
  const colorOf = s => LCC_SHAPE_COLOR[s.color];
  const layerId = s => {
    const col = COLOR_LAYER[s.color];
    if (col) { if (!doc.layers.some(x => x.id === col.id)) doc.layers.push({ id: col.id, name: col.name, visible: true, locked: false }); return col.id; }
    const key = String(s.layer ?? '0'); const l = layerNames.find(x => x.idx === key); if (!l) return 'pattern'; const id = 'lc' + key; if (!doc.layers.some(x => x.id === id)) doc.layers.push({ id, name: l.name, visible: true, locked: false }); return id;
  };
  let n = 0; const sid = () => 's' + (++n);
  const holes = [];
  for (const s of d.shapes) {
    if (!s || typeof s !== 'object') continue;
    if (s.type === 'S_HOLE') { holes.push(lccHole(s)); continue; }
    const layer = s.type === 'DOT' ? 'marks' : layerId(s);
    const out = lccShapeToShapes(s); if (!out.length) warnings.push(`skip:${s.type}:${s.id}`);
    const color = colorOf(s);
    for (const sh of out) doc.shapes.push({ id: sid(), layer, ...(color ? { color } : {}), ...sh });
  }
  // 穴：鎖ごとに近い図形へ付ける。近い図形が無い鎖は中心を結ぶ折れ線（marks 層）を作って付ける。
  const chains = holeChains(holes); let attached = 0, viaChain = 0;
  const stitchable = s => !['text', 'dimension', 'fold', 'image'].includes(s.type) && s.layer !== 'marks';
  const toolFor = h => { const kind = h.kind, pitch = h.pitch || 4; const own = (tools || []).find(t => t.kind === kind && Math.abs(t.pitch - pitch) < 0.06); if (own) { if (!doc.tools.some(t => t.id === own.id)) doc.tools.push({ ...own }); return doc.tools.find(t => t.id === own.id); } // 登録済み（現物）の工具があればそれを使う
    const id = `lcc-${kind}-${pitch}-${h.width}x${h.height}`; let tool = doc.tools.find(t => t.id === id); if (!tool) { tool = { id, name: `${kind} ${pitch}mm`, kind, pitch, teeth: 1, holeW: h.width, holeH: h.height, holeD: Math.min(h.width, h.height), angleDeg: kind === 'round' ? 0 : 45, mark: 'tool' }; doc.tools.push(tool); } return tool; };
  const byId = new Map(doc.shapes.map(s => [s.id, s])), groupCache = new Map();
  // 連結は近傍（bbox を 20mm 広げた範囲）の図形だけで作る（全図形で chainShapes すると O(n²) で数万図形が止まる）
  const groupOf = shape => { if (groupCache.has(shape.id)) return groupCache.get(shape.id); const b = bboxOf(shape), pad = 20, near = doc.shapes.filter(stitchable).filter(s => { const c = bboxOf(s); return c.maxX >= b.minX - pad && c.minX <= b.maxX + pad && c.maxY >= b.minY - pad && c.minY <= b.maxY + pad; }); const g = chainShapes(near).find(x => x.shapeIds.includes(shape.id)) || chainShapes([shape])[0]; for (const id of g.shapeIds) groupCache.set(id, g); return g; };
  const pathFor = shape => { let path = doc.paths.find(p => p.shapeIds.includes(shape.id)); if (!path) { const chain = groupOf(shape); path = { id: 'p' + (doc.paths.length + 1), shapeIds: chain.shapeIds, reversed: false, closed: chain.closed, segments: [], mark: 'tool' }; doc.paths.push(path); } return path; };
  const routeCache = new Map();
  const place = (h, path) => { let rc = routeCache.get(path.id); if (!rc) { const route = chainShapes(path.shapeIds.map(id => byId.get(id) || doc.shapes.find(x => x.id === id)))[0]; if (!route) return false; rc = { route, len: arcLength(route) }; routeCache.set(path.id, rc); } const { route, len } = rc; const q = projectOnPath({ ...route, reversed: path.reversed }, h); doc.holes.push({ id: 'h' + (doc.holes.length + 1), pathId: path.id, s: Math.max(0, Math.min(len, q.s)), x: h.x, y: h.y, angleDeg: h.angleDeg, toolId: toolFor(h).id, mark: 'tool' }); return true; };
  for (const chain of chains) {
    const mid = chain[Math.floor(chain.length / 2)];
    const hit = doc.shapes.filter(stitchable).reduce((best, s) => { const dist = distToShape(s, mid); return dist < (best ? best.d : attachMaxMm) ? { s, d: dist } : best; }, null);
    if (hit) { const grp = groupOf(hit.s), near = h => grp.shapeIds.some(id => distToShape(byId.get(id), h) <= attachMaxMm * 2); if (chain.every(near)) { const path = pathFor(hit.s); for (const h of chain) if (place(h, path)) attached++; continue; } }
    if (chain.length >= 2) { const poly = { id: sid(), layer: 'marks', type: 'polyline', points: chain.map(h => ({ x: h.x, y: h.y })), closed: false }; doc.shapes.push(poly); byId.set(poly.id, poly); const path = pathFor(poly); for (const h of chain) if (place(h, path)) { attached++; viaChain++; } }
    else { const h = chain[0]; doc.shapes.push({ id: sid(), layer: 'marks', type: 'circle', cx: h.x, cy: h.y, r: Math.max(0.1, h.width / 2) }); warnings.push(`hole-as-mark:${h.id}`); }
  }
  const stats = lccStats(d, { name });
  return { doc, stats: { ...stats, holesAttached: attached, holesViaChain: viaChain }, warnings };
}
/** 1 ファイルの傾向：型ごとの数・穴ピッチ／寸法／工具・角R・文字サイズ／書体・外形サイズ・レイヤー名・版。 */
export function lccStats(d, { name = '' } = {}) {
  const count = {}, pitch = {}, holeSize = {}, toolKind = {}, cornerR = {}, textSize = {}, fonts = {}, layers = (d.layers || []).map(l => String(l.nam || '')), bump = (m, k) => { m[k] = (m[k] || 0) + 1; };
  const pts = [];
  for (const s of d.shapes || []) {
    bump(count, s.type);
    if (s.type === 'S_HOLE') { const h = lccHole(s); if (h.pitch) bump(pitch, String(h.pitch)); bump(holeSize, `${h.width}x${h.height}`); bump(toolKind, h.kind); pts.push({ x: h.x, y: h.y }); continue; }
    if (s.type === 'ARC') { const w = num(s.w), h = num(s.h); if (w > 0 && Math.abs(w - h) < 1e-6 && w <= 30) bump(cornerR, String(Math.round(w * 10) / 10)); }
    if (s.type === 'TEXT' && String(s.tx || '').trim()) { bump(textSize, String(num(s.fs))); bump(fonts, String(s.ff || '')); }
    for (const k of ['sp', 'ep', 'ct']) if (Array.isArray(s[k]) && (s[k][0] || s[k][1])) pts.push(pt(s[k]));
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const bbox = pts.length ? { w: Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10, h: Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10 } : null;
  return { name, version: String(d.meta?.version || ''), count, pitch, holeSize, toolKind, cornerR, textSize, fonts, layers, bbox, backdrops: (d.backdrops || []).length };
}
/** 多数の stats をまとめて「作風」にする：最頻ピッチ・穴寸法・工具・角R・文字サイズ・書体・外形サイズの中央値。 */
export function aggregateStyle(list) {
  const sum = key => { const m = {}; for (const s of list) for (const [k, v] of Object.entries(s[key] || {})) m[k] = (m[k] || 0) + v; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ value: k, count: v })); };
  const top = (key, n = 5) => sum(key).slice(0, n);
  const sizes = list.map(s => s.bbox).filter(Boolean), med = arr => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const shapes = list.reduce((a, s) => a + Object.entries(s.count || {}).filter(([k]) => k !== 'S_HOLE').reduce((x, [, v]) => x + v, 0), 0), holes = list.reduce((a, s) => a + (s.count?.S_HOLE || 0), 0);
  return { files: list.length, shapes, holes, pitch: top('pitch'), holeSize: top('holeSize'), toolKind: top('toolKind', 4), cornerR: top('cornerR', 8), textSize: top('textSize'), fonts: top('fonts', 4), bboxMedian: sizes.length ? { w: med(sizes.map(b => b.w)), h: med(sizes.map(b => b.h)) } : null };
}
/** 作風を AI 相談や既定値に使う短い文（ja/en）にする。 */
export function styleSummary(style, lang = 'ja') {
  if (!style || !style.files) return '';
  const p = style.pitch?.[0]?.value, hs = style.holeSize?.[0]?.value, tk = style.toolKind?.[0]?.value, r = (style.cornerR || []).slice(0, 3).map(x => x.value + 'mm').join('/'), ts = style.textSize?.[0]?.value, f = style.fonts?.[0]?.value, b = style.bboxMedian;
  return lang === 'ja'
    ? `事業主の過去設計 ${style.files} 件の傾向：縫い穴ピッチ ${p ?? '?'}mm（${tk ?? '?'}・穴 ${hs ?? '?'}mm）、よく使う角R ${r || '?'}、文字 ${ts ?? '?'}mm ${f || ''}、部品外形の中央値 ${b ? `${b.w}×${b.h}mm` : '?'}。`
    : `Owner's past ${style.files} designs: stitch pitch ${p ?? '?'} mm (${tk ?? '?'}, hole ${hs ?? '?'} mm), common corner radii ${r || '?'}, text ${ts ?? '?'} mm ${f || ''}, median part size ${b ? `${b.w}×${b.h} mm` : '?'}.`;
}
