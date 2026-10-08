// AI 連携の契約：画面（app.js）と Worker（worker/src/ai_schema.js はこのファイルのコピー）が共有する。純粋データ・純粋関数のみ。
// op の追加はここだけを直し、`node tools/sync_ai_schema.js` で Worker 側へ写す。
export const AI_OPS = ['addShapes', 'addHoles', 'setThickness', 'highlight', 'setRecipe'];
const NUM = { type: 'number' };
const POINT = { type: 'object', properties: { x: NUM, y: NUM }, required: ['x', 'y'], additionalProperties: false };
const SHAPE_SCHEMAS = [
  { type: 'object', properties: { type: { const: 'line' }, x1: NUM, y1: NUM, x2: NUM, y2: NUM }, required: ['type', 'x1', 'y1', 'x2', 'y2'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'circle' }, cx: NUM, cy: NUM, r: NUM }, required: ['type', 'cx', 'cy', 'r'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'arc' }, cx: NUM, cy: NUM, r: NUM, startDeg: NUM, endDeg: NUM }, required: ['type', 'cx', 'cy', 'r', 'startDeg', 'endDeg'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'bezier' }, x1: NUM, y1: NUM, c1x: NUM, c1y: NUM, c2x: NUM, c2y: NUM, x2: NUM, y2: NUM }, required: ['type', 'x1', 'y1', 'c1x', 'c1y', 'c2x', 'c2y', 'x2', 'y2'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'polyline' }, points: { type: 'array', items: POINT, minItems: 2 }, closed: { type: 'boolean' } }, required: ['type', 'points', 'closed'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'text' }, x: NUM, y: NUM, text: { type: 'string' }, sizeMm: NUM, angleDeg: NUM }, required: ['type', 'x', 'y', 'text', 'sizeMm', 'angleDeg'], additionalProperties: false },
  { type: 'object', properties: { type: { const: 'fold' }, x1: NUM, y1: NUM, x2: NUM, y2: NUM, angleDeg: NUM, inner: { type: 'boolean' } }, required: ['type', 'x1', 'y1', 'x2', 'y2', 'angleDeg', 'inner'], additionalProperties: false },
];
export const ACTION_SCHEMA = {
  type: 'array',
  items: { anyOf: [
    { type: 'object', properties: { op: { const: 'addShapes' }, layer: { type: 'string' }, shapes: { type: 'array', items: { anyOf: SHAPE_SCHEMAS }, minItems: 1 } }, required: ['op', 'layer', 'shapes'], additionalProperties: false },
    { type: 'object', properties: { op: { const: 'addHoles' }, pathShapeIds: { type: 'array', items: { type: 'string' }, minItems: 1 }, toolId: { type: 'string' }, pitch: NUM, variable: { type: 'boolean' } }, required: ['op', 'pathShapeIds', 'toolId', 'pitch', 'variable'], additionalProperties: false },
    { type: 'object', properties: { op: { const: 'setThickness' }, partId: { type: 'string' }, thickness: NUM }, required: ['op', 'partId', 'thickness'], additionalProperties: false },
    { type: 'object', properties: { op: { const: 'highlight' }, shapeIds: { type: 'array', items: { type: 'string' }, minItems: 1 }, note: { type: 'string' } }, required: ['op', 'shapeIds', 'note'], additionalProperties: false },
    { type: 'object', properties: { op: { const: 'setRecipe' }, recipe: { type: 'object', additionalProperties: true } }, required: ['op', 'recipe'], additionalProperties: false },
  ] },
};
/** Claude の返答全体のスキーマ（output_config.format 用）。 */
export const RESPONSE_SCHEMA = { type: 'object', properties: { reply: { type: 'string' }, actions: ACTION_SCHEMA }, required: ['reply', 'actions'], additionalProperties: false };
const round2 = n => Math.round(n * 100) / 100;
const roundShape = s => { const o = {}; for (const [k, v] of Object.entries(s)) { if (k === 'hw' || k === 'image' || k === 'imageId') continue; o[k] = typeof v === 'number' ? round2(v) : Array.isArray(v) ? v.map(p => (p && typeof p === 'object') ? Object.fromEntries(Object.entries(p).map(([a, b]) => [a, typeof b === 'number' ? round2(b) : b])) : p) : v; } return o; };
/** AI に渡す図面の要約：図形は mm 2 桁、穴は経路ごとの本数とピッチ、部品の厚み、選択 id。画像は除く。5,000 文字を超えたら選択だけに絞る。 */
export function docToAiJson(doc, selection = new Set(), { limit = 5000 } = {}) {
  const build = shapes => JSON.stringify({
    unit: 'mm', layers: doc.layers.map(l => ({ id: l.id, name: l.name })),
    shapes: shapes.map(roundShape),
    paths: doc.paths.filter(p => p.shapeIds.some(id => shapes.some(s => s.id === id))).map(p => ({ id: p.id, shapeIds: p.shapeIds, closed: p.closed, holes: doc.holes.filter(h => h.pathId === p.id).length, pitch: p.segments[0]?.pitch ?? null, toolId: p.segments[0]?.toolId ?? null })),
    parts: (doc.parts || []).filter(p => p.shapeIds.some(id => shapes.some(s => s.id === id))).map(p => ({ id: p.id, name: p.name, thickness: p.thickness, shapeIds: p.shapeIds })),
    tools: doc.tools.map(t => ({ id: t.id, kind: t.kind, pitch: t.pitch, teeth: t.teeth })),
    selected: [...selection].filter(id => shapes.some(s => s.id === id)),
    recipe: doc.recipe || null,
  });
  const all = doc.shapes.filter(s => s.type !== 'image');
  let text = build(all);
  if (text.length > limit && selection.size) text = build(all.filter(s => selection.has(s.id)));
  if (text.length > limit) text = build(all.slice(0, Math.max(1, Math.floor(all.length * limit / text.length))));
  return text;
}
/** 受信した actions を検証して {ok:[...], errors:[...]} を返す。未知の op・存在しない id・不正な数値は弾く。 */
export function validateActions(actions, doc) {
  const ok = [], errors = [], fin = n => typeof n === 'number' && Number.isFinite(n);
  if (!Array.isArray(actions)) return { ok, errors: ['not-array'] };
  const shapeIds = new Set(doc.shapes.map(s => s.id)), layerIds = new Set(doc.layers.map(l => l.id)), toolIds = new Set(doc.tools.map(t => t.id)), partIds = new Set((doc.parts || []).map(p => p.id));
  actions.forEach((a, i) => {
    if (!a || typeof a !== 'object' || !AI_OPS.includes(a.op)) { errors.push(`#${i}: unknown op`); return; }
    if (a.op === 'addShapes') {
      if (!Array.isArray(a.shapes) || !a.shapes.length) { errors.push(`#${i}: shapes`); return; }
      const bad = a.shapes.find(s => !s || !['line', 'circle', 'arc', 'bezier', 'polyline', 'text', 'fold'].includes(s.type) || Object.entries(s).some(([k, v]) => ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'c1x', 'c1y', 'c2x', 'c2y', 'startDeg', 'endDeg', 'sizeMm', 'angleDeg'].includes(k) && !fin(v)) || (s.type === 'polyline' && (!Array.isArray(s.points) || s.points.length < 2 || s.points.some(p => !p || !fin(p.x) || !fin(p.y)))) || (s.type === 'circle' && !(s.r > 0)) || (s.type === 'text' && (typeof s.text !== 'string' || !s.text)));
      if (bad) { errors.push(`#${i}: bad shape`); return; }
      if (a.shapes.some(s => ((s.type === 'arc' || s.type === 'circle') && !(s.r > 0)) || (s.type === 'text' && !(s.sizeMm > 0 && s.sizeMm <= 200)))) { errors.push(`#${i}: bad size`); return; }
      ok.push({ op: 'addShapes', layer: layerIds.has(a.layer) ? a.layer : [...layerIds][0], shapes: a.shapes.map(s => ({ ...s })) });
    } else if (a.op === 'addHoles') {
      if (!Array.isArray(a.pathShapeIds) || !a.pathShapeIds.length || !a.pathShapeIds.every(id => shapeIds.has(id))) { errors.push(`#${i}: shape id`); return; }
      if (!toolIds.has(a.toolId) || !(a.pitch >= 0.5 && a.pitch <= 20)) { errors.push(`#${i}: tool/pitch`); return; }
      ok.push({ op: 'addHoles', pathShapeIds: [...a.pathShapeIds], toolId: a.toolId, pitch: a.pitch, variable: !!a.variable });
    } else if (a.op === 'setThickness') {
      if (!partIds.has(a.partId) || !fin(a.thickness) || a.thickness < 0) { errors.push(`#${i}: part/thickness`); return; }
      ok.push({ op: 'setThickness', partId: a.partId, thickness: a.thickness });
    } else if (a.op === 'highlight') {
      const ids = Array.isArray(a.shapeIds) ? a.shapeIds.filter(id => shapeIds.has(id)) : [];
      if (!ids.length) { errors.push(`#${i}: shape id`); return; }
      ok.push({ op: 'highlight', shapeIds: ids, note: String(a.note || '') });
    } else if (a.op === 'setRecipe') {
      if (!a.recipe || typeof a.recipe !== 'object') { errors.push(`#${i}: recipe`); return; }
      ok.push({ op: 'setRecipe', recipe: JSON.parse(JSON.stringify(a.recipe)) });
    }
  });
  return { ok, errors };
}
/** 概算料金（円）：入力・出力トークンと 1M トークンあたりの米ドル単価、為替。 */
export function estimateYen(inputTokens, outputTokens, { usdPerMtokIn = 4, usdPerMtokOut = 20, yenPerUsd = 150 } = {}) { return (inputTokens * usdPerMtokIn + outputTokens * usdPerMtokOut) / 1e6 * yenPerUsd; }
/** 文字数からトークン数のざっくり見積（日本語 1 文字≈1 トークン、英数字 4 文字≈1 トークン）。 */
export function roughTokens(text) { const s = String(text || ''); const ascii = (s.match(/[\x20-\x7e]/g) || []).length; return Math.ceil(ascii / 4) + (s.length - ascii); }
