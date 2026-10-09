// 部品ライブラリ・寸法変数・クリップボード経由の転活用。純粋関数のみ。
import { evalExpr } from './hardware.js';
import { bboxOfDoc, resolvePath, projectOnPath, arcLength } from './geometry.js';
import { makeNextId } from './interop.js';

/** 寸法変数の入力欄の刻み（mm）。項目が varSteps で指定した変数はその刻み、無ければ 0.5。 */
export function varStep(item, key) { const s = item?.varSteps?.[key]; return Number.isFinite(s) && s > 0 ? s : 0.5; }
export const CLIP_PREFIX = 'nscad-clip:';
const NUMERIC_KEYS = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'c1x', 'c1y', 'c2x', 'c2y', 'cx', 'cy', 'r', 'startDeg', 'endDeg', 'sizeMm', 'angleDeg', 'offset'];
/** 図形の座標（数値または式の文字列）を変数で実体化する。points/nodes の要素も対象。 */
export function instantiateShape(shape, vars = {}) {
  const ev = v => typeof v === 'string' ? evalExpr(v, vars) : v, out = { ...shape };
  for (const k of NUMERIC_KEYS) if (k in out) out[k] = ev(out[k]);
  if (out.points) out.points = out.points.map(p => ({ x: ev(p.x), y: ev(p.y) }));
  if (out.nodes) out.nodes = out.nodes.map(n => ({ ...n, x: ev(n.x), y: ev(n.y), inX: ev(n.inX), inY: ev(n.inY), outX: ev(n.outX), outY: ev(n.outY) }));
  return out;
}
/** ライブラリ項目（vars 既定値＋図形）を変数で実体化し、位置へ移した {shapes, holes, paths, parts} を返す。 */
export function instantiateItem(item, vars = {}, at = { x: 0, y: 0 }, { scale = 1 } = {}) {
  const v = { ...(item.vars || {}), ...vars };
  const shapes = (item.shapes || []).map(s => instantiateShape(s, v));
  const payload = { shapes, holes: (item.holes || []).map(h => ({ ...h })), paths: (item.paths || []).map(p => ({ ...p, shapeIds: [...p.shapeIds], segments: (p.segments || []).map(s => ({ ...s })) })), parts: (item.parts || []).map(p => ({ ...p, shapeIds: [...p.shapeIds] })) };
  return transformPayload(payload, at, scale);
}
/** payload（図形・穴）を平行移動し、必要なら原点中心に拡大縮小する。 */
export function transformPayload(payload, at = { x: 0, y: 0 }, scale = 1) {
  const mv = (x, y) => ({ x: x * scale + at.x, y: y * scale + at.y });
  const shapes = payload.shapes.map(s => { const o = { ...s }; for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2'], ['c1x', 'c1y'], ['c2x', 'c2y'], ['cx', 'cy']]) if (kx in o) { const p = mv(o[kx], o[ky]); o[kx] = p.x; o[ky] = p.y; } if ('r' in o) o.r *= scale; if ('sizeMm' in o) o.sizeMm *= scale; if ('offset' in o) o.offset *= scale; if (o.points) o.points = o.points.map(p => mv(p.x, p.y)); if (o.nodes) o.nodes = o.nodes.map(n => { const a = mv(n.x, n.y), i = mv(n.inX, n.inY), u = mv(n.outX, n.outY); return { ...n, x: a.x, y: a.y, inX: i.x, inY: i.y, outX: u.x, outY: u.y }; }); return o; });
  const holes = (payload.holes || []).map(h => { const p = mv(h.x, h.y); return { ...h, x: p.x, y: p.y, s: h.s * scale }; });
  const paths = (payload.paths || []).map(p => ({ ...p, segments: (p.segments || []).map(s => ({ ...s, from: s.from * scale, to: s.to * scale, pitch: s.pitch })) }));
  return { shapes, holes, paths, parts: payload.parts || [] };
}
/** 文書と図形 id の集合から、転活用用の payload（図形・それに完結する経路と穴・部品・工具）を取り出す。座標は bbox の左上を原点にする。 */
export function extractSelection(doc, ids, { originAtBbox = true } = {}) {
  const shapes = doc.shapes.filter(s => ids.has(s.id)), idSet = new Set(shapes.map(s => s.id));
  const paths = doc.paths.filter(p => p.shapeIds.every(id => idSet.has(id))), pathIds = new Set(paths.map(p => p.id));
  const holes = doc.holes.filter(h => pathIds.has(h.pathId)), toolIds = new Set(holes.map(h => h.toolId));
  const parts = doc.parts.filter(p => p.shapeIds.some(id => idSet.has(id))).map(p => ({ ...p, shapeIds: p.shapeIds.filter(id => idSet.has(id)) }));
  const tools = doc.tools.filter(t => toolIds.has(t.id)), b = originAtBbox && shapes.length ? bboxOfDoc({ ...doc, shapes, holes: [] }) : null; // 原点は図形だけの外接矩形の左上（穴の輪郭は含めない）
  const payload = { shapes: shapes.map(s => JSON.parse(JSON.stringify(s))), holes: holes.map(h => ({ ...h })), paths: paths.map(p => JSON.parse(JSON.stringify(p))), parts: parts.map(p => JSON.parse(JSON.stringify(p))), tools: tools.map(t => ({ ...t })), layers: [...new Set(shapes.map(s => s.layer))].map(id => ({ id, name: doc.layers.find(l => l.id === id)?.name || id })) };
  return b ? { ...transformPayload(payload, { x: -b.minX, y: -b.minY }, 1), tools: payload.tools, layers: payload.layers, origin: { x: b.minX, y: b.minY } } : { ...payload, origin: { x: 0, y: 0 } };
}
/** payload をクリップボード用の文字列にする。 */
export function encodeClipboard(payload, source = '') { return CLIP_PREFIX + JSON.stringify({ v: 1, source, payload }); }
/** クリップボード文字列から payload を取り出す。形式が違えば null。 */
export function decodeClipboard(text) {
  if (typeof text !== 'string' || !text.startsWith(CLIP_PREFIX)) return null;
  try { const data = JSON.parse(text.slice(CLIP_PREFIX.length)); return data && data.payload && Array.isArray(data.payload.shapes) ? { source: data.source || '', payload: data.payload } : null; } catch { return null; }
}
/** payload を文書に合流させる（id を振り直し・同名レイヤーが無ければ作る・工具も足す）。戻り値は新しい図形 id 配列。文書を直接変更する。 */
export function mergePayload(doc, payload, { at = { x: 0, y: 0 }, scale = 1, freshId, source = '' } = {}) {
  const next = freshId || makeNextId();
  const moved = transformPayload(payload, at, scale), shapeMap = new Map(), pathMap = new Map(), toolMap = new Map(), ids = [];
  for (const l of payload.layers || []) if (!doc.layers.some(x => x.id === l.id)) doc.layers.push({ id: l.id, name: l.name || l.id, visible: true, locked: false });
  for (const t of payload.tools || []) { const same = doc.tools.find(x => x.id === t.id && x.pitch === t.pitch && x.kind === t.kind); if (same) { toolMap.set(t.id, same.id); continue; } const id = doc.tools.some(x => x.id === t.id) ? next(doc.tools, 'tool') : t.id; doc.tools.push({ ...t, id }); toolMap.set(t.id, id); }
  for (const s of moved.shapes) { const id = next(doc.shapes, 's'); shapeMap.set(s.id, id); doc.shapes.push({ ...s, id, layer: doc.layers.some(l => l.id === s.layer) ? s.layer : doc.layers[0].id }); ids.push(id); }
  for (const p of moved.paths) { const id = next(doc.paths, 'p'); pathMap.set(p.id, id); doc.paths.push({ ...p, id, shapeIds: p.shapeIds.map(x => shapeMap.get(x)).filter(Boolean), segments: (p.segments || []).map(sg => ({ ...sg, toolId: toolMap.get(sg.toolId) || sg.toolId })) }); }
  for (const h of moved.holes) { if (!pathMap.has(h.pathId)) continue; const id = next(doc.holes, 'h'); doc.holes.push({ ...h, id, pathId: pathMap.get(h.pathId), toolId: toolMap.get(h.toolId) || h.toolId }); }
  for (const part of moved.parts || []) { const sids = part.shapeIds.map(x => shapeMap.get(x)).filter(Boolean); if (!sids.length) continue; doc.parts.push({ ...part, id: next(doc.parts, 'part'), shapeIds: sids }); }
  // 経路の穴の弧長位置を解決し直す（拡大縮小やレイヤー差で狂わないように）
  for (const [, pid] of pathMap) { const saved = doc.paths.find(p => p.id === pid), route = saved && resolvePath(doc, saved); if (!route) { doc.holes = doc.holes.filter(h => h.pathId !== pid); doc.paths = doc.paths.filter(p => p.id !== pid); continue; } const len = arcLength(route); for (const h of doc.holes.filter(h => h.pathId === pid)) { const q = projectOnPath(route, h); h.s = Math.min(len, q.s); } }
  if (!Array.isArray(doc.provenance)) doc.provenance = [];
  if (source) doc.provenance.push({ source, shapeIds: ids, at: new Date().toISOString() });
  return ids;
}
/** ライブラリ項目の検証（必須キー・図形の式が既定変数で解けること）。問題の配列を返す。 */
export function checkLibraryItem(item) {
  const out = [];
  for (const k of ['id', 'name', 'shapes']) if (!(k in item)) out.push('missing:' + k);
  try { instantiateItem(item); } catch (err) { out.push('expr:' + err.message); }
  return out;
}
