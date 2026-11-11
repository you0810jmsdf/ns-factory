// 部品ライブラリ・寸法変数・クリップボード経由の転活用。純粋関数のみ。
import { evalExpr } from './hardware.js';
import { bboxOfDoc, resolvePath, projectOnPath, arcLength } from './geometry.js';
import { makeNextId } from './interop.js';
import { nextGroupId, groupIdOf } from './grouping.js';

/* ---- 部品ライブラリのファイル保存・読み込み・バックアップ（登録した部品はブラウザの中に保存されるので、ファイルとバックアップで守る） ---- */
export const LIBRARY_FILE_APP = "N's CAD parts library";
/** 登録した部品をファイル用の文字列にする。 */
export function libraryFileText(items, savedAt = new Date().toISOString()) { return JSON.stringify({ app: LIBRARY_FILE_APP, version: 2, savedAt, count: items.length, items }, null, 2); }
/** ファイルの文字列から部品を取り出す。古い形式（version 1・app なし）も読む。検証に通らない部品は skipped に数える。形式が違えば null。 */
export function parseLibraryFile(text) {
  let data; try { data = JSON.parse(text); } catch { return null; }
  if (!data || !Array.isArray(data.items) || (data.app && data.app !== LIBRARY_FILE_APP)) return null;
  const items = data.items.filter(it => it && typeof it === 'object' && checkLibraryItem(it).length === 0);
  return { items, skipped: data.items.length - items.length };
}
/** 今の部品に、読み込んだ部品を合流させる。同じ id は更新、無ければ追加。戻り値 {items, added, updated}。 */
export function mergeLibraryItems(current, incoming) {
  const items = current.map(x => x), idx = new Map(items.map((x, i) => [x.id, i])); let added = 0, updated = 0;
  for (const it of incoming) { if (idx.has(it.id)) { items[idx.get(it.id)] = it; updated++; } else { idx.set(it.id, items.length); items.push(it); added++; } }
  return { items, added, updated };
}
/** バックアップの一覧（新しい順）に、いまの部品の写しを足す。直前と同じ内容なら足さない。最大 max 件。 */
export function pushLibraryBackup(backups, items, at = new Date().toISOString(), max = 10) {
  const list = Array.isArray(backups) ? backups : [], json = JSON.stringify(items);
  if (list[0] && JSON.stringify(list[0].items) === json) return list;
  return [{ at, count: items.length, items: JSON.parse(json) }, ...list].slice(0, max);
}
/** バックアップの表示名「2026-10-10 17:30（12件）」。 */
export function libraryBackupLabel(b) { return String(b.at).slice(0, 16).replace('T', ' ') + '（' + b.count + '件）'; }
/** 寸法変数の範囲（項目の varLimits）から外れた変数を返す。例：リフィルの穴の位置 E は 3〜9mm。範囲の無い変数は何でもよい。戻り値 [{key, min, max}]。 */
export function varOutOfRange(item, vars = {}) {
  const v = { ...(item?.vars || {}), ...vars }, out = [];
  for (const [key, lim] of Object.entries(item?.varLimits || {})) { const x = Number(v[key]); if (!Number.isFinite(x) || x < lim[0] - 1e-9 || x > lim[1] + 1e-9) out.push({ key, min: lim[0], max: lim[1] }); }
  return out;
}
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
/** 角を丸めた長方形の外形（左上が原点・幅 W・高さ H・角の半径 R）を、4本の線と4つの円弧（時計回り・Y 下向き）で返す。R は短い辺の半分までに丸める。R が0以下なら null。 */
export function roundedRectShapes(W, H, R, layer = 'pattern') {
  const r = Math.min(R, W / 2, H / 2); if (!(r > 0)) return null;
  const line = (x1, y1, x2, y2) => ({ type: 'line', layer, x1, y1, x2, y2 }), arc = (cx, cy, startDeg, endDeg) => ({ type: 'arc', layer, cx, cy, r, startDeg, endDeg });
  return [line(r, 0, W - r, 0), arc(W - r, r, 270, 360), line(W, r, W, H - r), arc(W - r, H - r, 0, 90), line(W - r, H, r, H), arc(r, H - r, 90, 180), line(0, H - r, 0, r), arc(r, r, 180, 270)];
}
export function instantiateItem(item, vars = {}, at = { x: 0, y: 0 }, { scale = 1 } = {}) {
  const v = { ...(item.vars || {}), ...vars };
  let shapes = (item.shapes || []).map(s => instantiateShape(s, v));
  /* 項目の outlineRect（{w, h, r} は変数名）があり、角の半径が0より大きいときは、最初の図形（長方形の外形）を、角を丸めた外形に置き換える */
  if (item.outlineRect && shapes[0]) { const rr = roundedRectShapes(Number(v[item.outlineRect.w]), Number(v[item.outlineRect.h]), Number(v[item.outlineRect.r]), shapes[0].layer); if (rr) shapes = [...rr, ...shapes.slice(1)]; }
  const payload = { shapes, holes: (item.holes || []).map(h => ({ ...h })), paths: (item.paths || []).map(p => ({ ...p, shapeIds: [...p.shapeIds], segments: (p.segments || []).map(s => ({ ...s })) })), parts: (item.parts || []).map(p => ({ ...p, shapeIds: [...p.shapeIds] })), ...((item.fills || []).length ? { fills: item.fills.map(f => ({ ...f, ids: [...(f.ids || [])], points: f.points.map(p => ({ ...p })), holes: (f.holes || []).map(h => h.map(p => ({ ...p }))) })) } : {}) };   /* 領域の塗り（ロゴの黒など）：囲む図形の id は、置くときに新しい id へ付け替える（mergePayload） */
  /* fitWidth（変数名）と baseW（もとの幅 mm）がある項目は、変数の値を「置く幅（mm）」として、全体を同じ比率で拡大縮小する（ロゴ・刻印：幅を入れて置ける） */
  const fit = item.fitWidth && item.baseW > 0 && Number(v[item.fitWidth]) > 0 ? Number(v[item.fitWidth]) / item.baseW : 1;
  return transformPayload(payload, at, scale * fit);
}
/** payload（図形・穴）を平行移動し、必要なら原点中心に拡大縮小する。 */
export function transformPayload(payload, at = { x: 0, y: 0 }, scale = 1) {
  const mv = (x, y) => ({ x: x * scale + at.x, y: y * scale + at.y });
  const shapes = payload.shapes.map(s => { const o = { ...s }; for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2'], ['c1x', 'c1y'], ['c2x', 'c2y'], ['cx', 'cy']]) if (kx in o) { const p = mv(o[kx], o[ky]); o[kx] = p.x; o[ky] = p.y; } if ('r' in o) o.r *= scale; if ('sizeMm' in o) o.sizeMm *= scale; if ('offset' in o) o.offset *= scale; if (o.points) o.points = o.points.map(p => mv(p.x, p.y)); if (o.nodes) o.nodes = o.nodes.map(n => { const a = mv(n.x, n.y), i = mv(n.inX, n.inY), u = mv(n.outX, n.outY); return { ...n, x: a.x, y: a.y, inX: i.x, inY: i.y, outX: u.x, outY: u.y }; }); return o; });
  const holes = (payload.holes || []).map(h => { const p = mv(h.x, h.y); return { ...h, x: p.x, y: p.y, s: h.s * scale }; });
  const paths = (payload.paths || []).map(p => ({ ...p, segments: (p.segments || []).map(s => ({ ...s, from: s.from * scale, to: s.to * scale, pitch: s.pitch })) }));
  const mvPts = ps => (ps || []).map(q => mv(q.x, q.y)), fills = (payload.fills || []).map(f => ({ ...f, points: mvPts(f.points), holes: (f.holes || []).map(mvPts), ...(scale !== 1 && Number.isFinite(f.area) ? { area: +(f.area * scale * scale).toFixed(1) } : {}) }));   /* 領域の塗り（色・質感・金属）も、図形と同じに動かす */
  return { shapes, holes, paths, parts: payload.parts || [], ...(fills.length ? { fills } : {}), ...((payload.gapOk || []).length ? { gapOk: payload.gapOk } : {}) };
}
/** 文書と図形 id の集合から、転活用用の payload（図形・それに完結する経路と穴・部品・工具）を取り出す。座標は bbox の左上を原点にする。 */
export function extractSelection(doc, ids, { originAtBbox = true, holeIds = null, asIs = null } = {}) {
  const shapes = doc.shapes.filter(s => ids.has(s.id)), idSet = new Set(shapes.map(s => s.id));
  /* 選んだ穴（holeIds）が乗る経路で、線がぜんぶは選ばれていないもの（縫い線が、隠したガイドの層にあるとき）：その線を、見えない補助の線（holeLink）として運び、選んだ穴も運ぶ（事業主 2026-10-25「菱目が消えた」：全選択→コピー→貼り付けで、穴が0個になっていた） */
  const whole = doc.paths.filter(p => p.shapeIds.every(id => idSet.has(id))), wholeIds = new Set(whole.map(p => p.id));
  const liveIds = new Set(doc.shapes.map(s => s.id)), extra = holeIds && holeIds.size ? doc.paths.filter(p => !wholeIds.has(p.id) && p.shapeIds.length && p.shapeIds.every(id => liveIds.has(id)) && doc.holes.some(h => h.pathId === p.id && holeIds.has(h.id))) : [], extraIds = new Set(extra.map(p => p.id));
  const supportIds = new Set(extra.flatMap(p => p.shapeIds).filter(id => !idSet.has(id))), support = doc.shapes.filter(s => supportIds.has(s.id)).map(s => ({ ...JSON.parse(JSON.stringify(s)), ...(asIs && asIs(s) ? {} : { holeLink: true }) }));   /* asIs（図形 → 真偽）：表示を切っているだけの線（点線の表示を切っている）は、補助の線にせず、そのまま運ぶ（補助の線にすると、複製の縫い線が見えなくなり、穴が独立した穴になって、ピッチのずれの印が出なくなる・事業主 2026-11-08）。層を隠した線は、今までどおり補助の線 */
  const paths = [...whole, ...extra], pathIds = new Set(paths.map(p => p.id));
  const holes = doc.holes.filter(h => wholeIds.has(h.pathId) || (extraIds.has(h.pathId) && holeIds.has(h.id))), toolIds = new Set(holes.map(h => h.toolId));
  const parts = doc.parts.filter(p => p.shapeIds.some(id => idSet.has(id))).map(p => ({ ...p, shapeIds: p.shapeIds.filter(id => idSet.has(id)) }));
  const live = new Set(doc.shapes.map(s => s.id)), fills = (doc.fills || []).filter(f => !f.foldFlat && Array.isArray(f.ids)).map(f => ({ ...f, ids: f.ids.filter(id => live.has(id)) })).filter(f => f.ids.length && f.ids.every(id => idSet.has(id))).map(f => JSON.parse(JSON.stringify(f)));   /* 色付きでコピー（事業主 2026-10-25）：囲んでいる図形がぜんぶ選ばれている領域の塗りを、いっしょに持っていく（折りシミュレーションの塗りは、作りなおされるので除く） */
  const holeIdSet = new Set(holes.map(h => h.id)), gapOk = (doc.gapOk || []).filter(k => String(k).split('|').every(id => holeIdSet.has(id)));   /* 「わざと空けた」と覚えた空きのうち、運ぶ穴どうしのもの（複製でも、もう歯抜けとして出さない） */
  const tools = doc.tools.filter(t => toolIds.has(t.id)), b = originAtBbox && shapes.length ? bboxOfDoc({ ...doc, shapes, holes: [] }) : null; // 原点は図形だけの外接矩形の左上（穴の輪郭は含めない）
  const payload = { shapes: [...shapes.map(s => JSON.parse(JSON.stringify(s))), ...support], holes: holes.map(h => ({ ...h })), paths: paths.map(p => JSON.parse(JSON.stringify(p))), parts: parts.map(p => JSON.parse(JSON.stringify(p))), tools: tools.map(t => ({ ...t })), ...(fills.length ? { fills } : {}), layers: [...new Set([...shapes, ...support].map(s => s.layer))].map(id => ({ id, name: doc.layers.find(l => l.id === id)?.name || id })), ...(gapOk.length ? { gapOk } : {}) };
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
  const groupMap = new Map(); /* 元のグループ → 貼り付け先での新しいグループ（元の文書のグループとはつなげない） */
  const pasteGroup = g => { if (!groupMap.has(g)) groupMap.set(g, nextGroupId([...doc.shapes, ...[...groupMap.values()].map(groupId => ({ groupId }))])); return groupMap.get(g); };
  for (const s of moved.shapes) { const id = next(doc.shapes, 's'); shapeMap.set(s.id, id); const g = groupIdOf(s), { groupId, ...rest } = s; doc.shapes.push({ ...rest, ...(g ? { groupId: pasteGroup(g) } : {}), id, layer: doc.layers.some(l => l.id === s.layer) ? s.layer : doc.layers[0].id }); ids.push(id); }
  if ((moved.fills || []).length) { if (!Array.isArray(doc.fills)) doc.fills = []; for (const f of moved.fills) { const fids = (f.ids || []).map(x => shapeMap.get(x)).filter(Boolean); if (!fids.length) continue; doc.fills.push({ ...f, id: next(doc.fills, 'f'), ids: fids, ...(f.layer ? { layer: doc.layers.some(l => l.id === f.layer) ? f.layer : doc.layers[0].id } : {}) }); } }   /* 貼り付け先の図形に付け替えた、領域の塗り */
  for (const p of moved.paths) { const id = next(doc.paths, 'p'); pathMap.set(p.id, id); doc.paths.push({ ...p, id, shapeIds: p.shapeIds.map(x => shapeMap.get(x)).filter(Boolean), segments: (p.segments || []).map(sg => ({ ...sg, toolId: toolMap.get(sg.toolId) || sg.toolId })) }); }
  const holeMap = new Map();
  for (const h of moved.holes) { if (!pathMap.has(h.pathId)) continue; const id = next(doc.holes, 'h'); holeMap.set(h.id, id); doc.holes.push({ ...h, id, pathId: pathMap.get(h.pathId), toolId: toolMap.get(h.toolId) || h.toolId }); }
  if ((moved.gapOk || []).length) { const add = moved.gapOk.map(k => String(k).split('|').map(x => holeMap.get(x))).filter(pr => pr.length === 2 && pr.every(Boolean)).map(pr => pr.join('|')); if (add.length) doc.gapOk = [...new Set([...(doc.gapOk || []), ...add])]; }   /* 「わざと空けた」も、新しい穴の id に付け替えて引き継ぐ */
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

/* ---- 部品ライブラリの分類（見出し）。事業主 2026-11-07「部品ライブラリはグルーピングして整理したい」→「見出し付き一覧」 ---- */
/** 見出しの並び。登録した部品（user）が先頭、あとは使う順。 */
export const LIBRARY_GROUPS = ['user', 'refill', 'rollbahn', 'binder', 'small', 'logo', 'paper', 'reference', 'other'];
/** 部品の見出し。登録した部品（isUser）は 'user'。同梱の部品は、タグから決める（先に当たったものが優先）：logo → paper（用紙規格・穴のない用紙の枠。リフィル型紙とは別の見出し） → reference → rollbahn → refill → binder → pocket・pen・dring（small）→ other。 */
export function libraryGroupOf(item, isUser = false) {
  if (isUser) return 'user';
  const tags = new Set(Array.isArray(item?.tags) ? item.tags : []);
  if (tags.has('logo')) return 'logo';
  if (tags.has('paper')) return 'paper';
  if (tags.has('reference')) return 'reference';
  if (tags.has('rollbahn')) return 'rollbahn';
  if (tags.has('refill')) return 'refill';
  if (tags.has('binder')) return 'binder';
  if (['pocket', 'pen', 'dring'].some(t => tags.has(t))) return 'small';
  return 'other';
}
/** 部品を、見出しごとにまとめる。[{ key, items }]。見出しは LIBRARY_GROUPS の順・空の見出しは出さない・見出しの中は元の並び。isUserOf(item) が真なら登録した部品。 */
export function groupLibraryItems(items, isUserOf = () => false) {
  const by = new Map(LIBRARY_GROUPS.map(k => [k, []]));
  for (const it of items) by.get(libraryGroupOf(it, !!isUserOf(it))).push(it);
  return LIBRARY_GROUPS.filter(k => by.get(k).length).map(key => ({ key, items: by.get(key) }));
}

/* ---- 部品ライブラリの整理（事業主 2026-11-07「ライブラリのグルーピングはもっと自由度もって操作したい。順番もよく使う順に入れ替えたい」→「整理の窓」） ----
 *  整理の保存（layout）：{ v: 1, groups: [見出し id の並び], names: { 見出し id: 名前の上書き }, assign: { 部品 id: 見出し id }, order: { 見出し id: [部品 id の並び] } }。
 *  見出し id は、組み込みの見出し（LIBRARY_GROUPS）と、自分で作った見出し（'g-…'）。何も整理していない（空の保存の）ときは、groupLibraryItems と同じ並びになる。 */
export const LIBRARY_LAYOUT_KEY = 'leather-cad.library-layout';
export const LIBRARY_GROUP_NAME_MAX = 30;
export const emptyLibraryLayout = () => ({ v: 1, groups: [...LIBRARY_GROUPS], names: {}, assign: {}, order: {} });
/** 自分で作った見出しか（組み込みの見出しではない）。 */
export const isCustomGroup = key => !LIBRARY_GROUPS.includes(key);
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
/** 保存の中身を、使える形に整える（壊れた保存・知らない見出しは捨てる）。組み込みの見出しは、必ず全部入る。 */
export function normalizeLibraryLayout(raw) {
  const L = emptyLibraryLayout(); if (!isObj(raw)) return L;
  const seen = new Set(), groups = [];
  for (const k of Array.isArray(raw.groups) ? raw.groups : []) if (typeof k === 'string' && !seen.has(k) && (LIBRARY_GROUPS.includes(k) || /^g-[\w-]{1,24}$/.test(k))) { seen.add(k); groups.push(k); }
  for (const k of LIBRARY_GROUPS) if (!seen.has(k)) { seen.add(k); groups.push(k); }
  L.groups = groups;
  if (isObj(raw.names)) for (const [k, v] of Object.entries(raw.names)) if (seen.has(k) && typeof v === 'string' && v.trim()) L.names[k] = v.trim().slice(0, LIBRARY_GROUP_NAME_MAX);
  if (isObj(raw.assign)) for (const [id, k] of Object.entries(raw.assign)) if (typeof k === 'string' && seen.has(k)) L.assign[id] = k;
  if (isObj(raw.order)) for (const [k, list] of Object.entries(raw.order)) if (seen.has(k) && Array.isArray(list)) L.order[k] = [...new Set(list.filter(x => typeof x === 'string'))];
  return L;
}
/** 部品を、整理（layout）のとおりの見出し・並びにまとめる。[{ key, custom, name（名前の上書き。無ければ ''）, items }]。見出しは layout.groups の順。部品は、assign で決めた見出し（無ければタグからの自動）に入り、見出しの中は order の順（order に無い部品は、元の並びで、その後ろ）。keepEmpty が偽なら、空の見出しは出さない。 */
export function arrangeLibrary(items, isUserOf = () => false, layout = null, { keepEmpty = false } = {}) {
  const L = normalizeLibraryLayout(layout), has = new Set(L.groups), by = new Map(L.groups.map(k => [k, []]));
  for (const it of items) { const a = L.assign[it.id], k = a && has.has(a) ? a : libraryGroupOf(it, !!isUserOf(it)); by.get(k).push(it); }
  return L.groups.map(key => {
    const pos = new Map((L.order[key] || []).map((id, i) => [id, i])), rank = it => (pos.has(it.id) ? pos.get(it.id) : Infinity);
    const sorted = by.get(key).map((it, i) => ({ it, i })).sort((a, b) => (rank(a.it) - rank(b.it)) || (a.i - b.i)).map(x => x.it);
    return { key, custom: isCustomGroup(key), name: L.names[key] || '', items: sorted };
  }).filter(g => keepEmpty || g.items.length);
}
const cloneLayout = layout => JSON.parse(JSON.stringify(normalizeLibraryLayout(layout)));
/** 新しい見出しを作る。{ layout, id }（名前が空なら id は null で、整理は変わらない）。 */
export function addLibraryGroup(layout, name, id = 'g-' + Date.now().toString(36)) {
  const L = cloneLayout(layout), nm = String(name ?? '').trim().slice(0, LIBRARY_GROUP_NAME_MAX); if (!nm) return { layout: L, id: null };
  let gid = id; while (L.groups.includes(gid)) gid += 'x'; L.groups.push(gid); L.names[gid] = nm; return { layout: L, id: gid };
}
/** 見出しの名前を変える。空にすると、組み込みの見出しは、もとの名前に戻る（自作の見出しは、空にはできない）。 */
export function renameLibraryGroup(layout, key, name) {
  const L = cloneLayout(layout), nm = String(name ?? '').trim().slice(0, LIBRARY_GROUP_NAME_MAX); if (!L.groups.includes(key)) return L;
  if (nm) L.names[key] = nm; else if (!isCustomGroup(key)) delete L.names[key]; return L;
}
/** 自作の見出しを消す。中の部品は、タグからの自動の見出しへ戻る。組み込みの見出しは消せない。 */
export function deleteLibraryGroup(layout, key) {
  const L = cloneLayout(layout); if (!isCustomGroup(key) || !L.groups.includes(key)) return L;
  L.groups = L.groups.filter(k => k !== key); delete L.names[key]; delete L.order[key]; for (const id of Object.keys(L.assign)) if (L.assign[id] === key) delete L.assign[id]; return L;
}
/** 見出しを、1つ上（dir < 0）か下へ動かす。 */
export function moveLibraryGroup(layout, key, dir) {
  const L = cloneLayout(layout), i = L.groups.indexOf(key), j = i + (dir < 0 ? -1 : 1); if (i < 0 || j < 0 || j >= L.groups.length) return L;
  [L.groups[i], L.groups[j]] = [L.groups[j], L.groups[i]]; return L;
}
/** 部品を、見出し toKey の中の toIndex 番目（省略で最後）へ動かす。見出しをまたいでもよい。arranged は、いま画面に出ている並び＝arrangeLibrary(全部品, …, layout, { keepEmpty: true })。動かしたあとの並びを、全見出しぶん保存する。 */
export function moveLibraryItem(layout, arranged, itemId, toKey, toIndex = Infinity) {
  const L = cloneLayout(layout), lists = new Map(arranged.map(g => [g.key, g.items.map(i => i.id)]));
  if (!lists.has(toKey) || !L.groups.includes(toKey)) return L;
  let found = false; for (const ids of lists.values()) { const i = ids.indexOf(itemId); if (i >= 0) { ids.splice(i, 1); found = true; } }
  if (!found) return L;
  const dst = lists.get(toKey), at = Number.isFinite(toIndex) ? Math.max(0, Math.min(dst.length, toIndex)) : dst.length; dst.splice(at, 0, itemId);
  L.assign[itemId] = toKey; for (const [k, ids] of lists) if (L.groups.includes(k)) L.order[k] = ids; return L;
}
/** 部品を、同じ見出しの中で1つ上（dir < 0）か下へ。端では動かない。 */
export function stepLibraryItem(layout, arranged, itemId, dir) {
  const g = arranged.find(x => x.items.some(i => i.id === itemId)); if (!g) return cloneLayout(layout);
  const i = g.items.findIndex(x => x.id === itemId), j = i + (dir < 0 ? -1 : 1); if (j < 0 || j >= g.items.length) return cloneLayout(layout);
  return moveLibraryItem(layout, arranged, itemId, g.key, j);
}
