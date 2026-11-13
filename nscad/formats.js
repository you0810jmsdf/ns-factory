// 書き出し形式（SVG・DXF R12）・分割印刷・印刷補正。純粋関数のみ（DOM 禁止）。
// 内部座標は Y 下向き・mm。SVG は同じ向き、DXF は Y 上向きなので y → -y と円弧の始終角を入れ替える。
import { mirrorY, bboxOfDoc, bboxOf, holeAppearance, flattenShape, pathSegments, dimension, rotate, arcSweep, ownHolePathIds, holeIsOwn, outlinePolygon, diamondLoopSizes, textFontStack } from './geometry.js';

/** 内部 Y 下向きと DXF/PDF の Y 上向きを相互変換する（同じ関数で往復）。円弧端も交換。 */
export function flipFormatY(shape) { return mirrorY(shape); }
/** SVG は内部と同じ Y 下向き。正の掃引をそのまま sweep=1 にする。 */
export function svgSweep() { return 1; }

const f = n => (Math.round(n * 1000) / 1000).toString();
export function holesOnShapes(doc, shapes) { const ids = new Set(shapes.map(s => s.id)), guide = new Set(doc.shapes.filter(s => s.layer === 'guide').map(s => s.id)), okPaths = new Set(doc.paths.filter(p => p.shapeIds.every(id => ids.has(id) || guide.has(id))).map(p => p.id)); /* ガイドの線に乗った穴は、ガイドを隠しても出す（画面と同じ） */ const own = ownHolePathIds(doc), picked = doc.outHoleIds; /* picked：「選んだ図形だけ出力」で、選んだ菱目（穴）の id。乗っている補助の線が選ばれていなくても出す（2026-10-20 事業主：囲み選択で上の菱目だけ SVG に出なかった） */ return doc.holes.filter(h => (!doc.outSelOnly && holeIsOwn(h, own)) || okPaths.has(h.pathId) || (picked && picked.has(h.id))); /* outSelOnly（図形を選んでの出力）では、独立した穴も選んだ範囲だけ（2026-10-26 事業主「選択範囲だけSVG化できなくなっている」）。選んでいなければ、今までどおり独立した穴は常に出す */ }
/** 図形の色（5色）→ 出力用の色。SVG/PDF は 16進・CSS 名、DXF は ACI（AutoCAD Color Index）番号。 */
export const SHAPE_COLOR_HEX = { blue: '#2060ff', green: '#2a9d3f', red: '#e02020', white: '#ffffff', yellow: '#e6c300' };
export const SHAPE_COLOR_ACI = { blue: 5, green: 3, red: 1, white: 7, yellow: 2 };
/** 書き出し（SVG・PDF）用の線の色。「白」は色なし（既定の黒）にする：画面は黒い背景なので白が見えるが、白い紙・白い背景では消える（事業主の指摘 2026-10-19「SVG出力する一部の線が消える」）。 */
/** 印刷・PDF（紙）の線の太さ2段（事業主 2026-11-11「青線が点線に見える。寸法線はくっきり。どちらが主役かわからない」）：外形の線（型紙の輪郭・切り抜く線）は太く（MAIN_LINE_MM・主役）、寸法線・補助線・点線・文字は細く（strokeMm）。
 *  外形の線＝実線で、線・折れ線・曲線・円（菱目の線・寸法・文字・補助の層・点線を除く）。 */
export const MAIN_LINE_MM = 0.35;
export const isMainLine = s => !!s && ['line', 'polyline', 'path', 'arc', 'bezier', 'circle'].includes(s.type) && s.lineStyle !== 'dashed' && !['guide', 'marks', 'lcc-dim'].includes(s.layer) && !s.noOutput && !(s.type === 'polyline' && diamondLoopSizes([s]).length > 0);
export const exportHex = color => (color && color !== 'white' && SHAPE_COLOR_HEX[color]) || null;   /* PDF・印刷（紙）用：白は黒 */
/** 菱目（菱の線）の既定の色：縫い穴と同じ赤。カット線（黒か指定色）と色で区別する（レーザーは色で加工を変えるため・事業主の指示 2026-10-19「菱目とカット線は色は変える」）。 */
export const DIAMOND_RED = '#e00000';
/** SVG の線の色。mode：'color'＝図形に付けた色をそのまま（白も白）＋色の指定が無い菱の線は赤／'paper'＝紙・印刷用（白は黒・菱の線も黒＝今までの印刷）／'mono'＝全部黒（「白黒で出力」を指定したときだけ・事業主の指示 2026-10-19「白黒は白黒指定したときだけ」）。null は色指定なし（既定の黒）。 */
export function svgLineHex(s, mode, isDiamond) {
  if (mode === 'mono') return null;
  if (mode === 'paper') return exportHex(s.color);
  if (mode === 'color-white-black') return s.color === 'white' ? (isDiamond ? DIAMOND_RED : null) : svgLineHex(s, 'color', isDiamond);   /* 色はそのまま・白だけ黒（切る線）にする。白い菱目の線は、菱目の赤（事業主 2026-10-25「出力したらところどころ線が消えている」：白い線は白のレイヤーで出て、白い下地の Beamo では見えなかった → 「白い線を黒で出す」） */
  if (s.color && SHAPE_COLOR_HEX[s.color]) return SHAPE_COLOR_HEX[s.color];
  return isDiamond ? DIAMOND_RED : null;
}
/** 線種（実線／点線）から SVG の stroke-dasharray を返す（mm 単位、strokeMm に比例）。実線は null。 */
function dashArrayMm(lineStyle, strokeMm) { return lineStyle === 'dashed' ? `${f(strokeMm * 8)} ${f(strokeMm * 5)}` : null; }
/** #rrggbb を PDF の RG 用 0..1 の [r,g,b] に変換する。 */
function hexToRgb01(hex) { const v = parseInt(hex.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255].map(c => Math.round(c / 255 * 1000) / 1000); }
/** 色は #rgb/#rrggbb/#rrggbbaa だけ通す（属性への差し込み防止）。 */
/** SVG の文字の色：色を決めた文字（textColor＝#RRGGBB）はその色。決めていない文字・壊れた値・白黒指定（mono）は黒。紙に印刷（paper）のときは、白に近い色（明るさ 85% 超）は黒（紙で見えなくならない）。 */
export const svgTextHex = (s, lineColors) => { const c = typeof s.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(s.textColor) ? s.textColor : null; if (!c || lineColors === 'mono') return '#000'; const lum = (parseInt(c.slice(1, 3), 16) * 0.299 + parseInt(c.slice(3, 5), 16) * 0.587 + parseInt(c.slice(5, 7), 16) * 0.114) / 255; return lineColors === 'paper' && lum > 0.85 ? '#000' : c; };
export const safeColor = (c, fallback = '#d9c7a0') => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? String(c) : fallback;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeId = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');

/** 図形 1 つから SVG の path d 文字列を返す（円・円弧は arc コマンド、ベジェは C、path は区間ごと）。文字・寸法は null。 */
export function shapeToSvgD(s) {
  if (s.type === 'line') return `M${f(s.x1)} ${f(s.y1)}L${f(s.x2)} ${f(s.y2)}`;
  if (s.type === 'circle') return `M${f(s.cx - s.r)} ${f(s.cy)}A${f(s.r)} ${f(s.r)} 0 1 1 ${f(s.cx + s.r)} ${f(s.cy)}A${f(s.r)} ${f(s.r)} 0 1 1 ${f(s.cx - s.r)} ${f(s.cy)}Z`;
  if (s.type === 'arc') {
    const sweep = arcSweep(s), a0 = s.startDeg * Math.PI / 180, a1 = (s.startDeg + sweep) * Math.PI / 180;
    if (sweep >= 360) return shapeToSvgD({ ...s, type: 'circle' });
    return `M${f(s.cx + s.r * Math.cos(a0))} ${f(s.cy + s.r * Math.sin(a0))}A${f(s.r)} ${f(s.r)} 0 ${sweep > 180 ? 1 : 0} ${svgSweep()} ${f(s.cx + s.r * Math.cos(a1))} ${f(s.cy + s.r * Math.sin(a1))}`;
  }
  if (s.type === 'bezier') return `M${f(s.x1)} ${f(s.y1)}C${f(s.c1x)} ${f(s.c1y)} ${f(s.c2x)} ${f(s.c2y)} ${f(s.x2)} ${f(s.y2)}`;
  if (s.type === 'polyline') return s.points.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('') + (s.closed ? 'Z' : '');
  if (s.type === 'path') {
    const segs = pathSegments(s); if (!segs.length) return null;
    return `M${f(segs[0].x1)} ${f(segs[0].y1)}` + segs.map(g => g.type === 'line' ? `L${f(g.x2)} ${f(g.y2)}` : `C${f(g.c1x)} ${f(g.c1y)} ${f(g.c2x)} ${f(g.c2y)} ${f(g.x2)} ${f(g.y2)}`).join('') + (s.closed ? 'Z' : '');
  }
  return null;
}
/** 穴 1 つの SVG 要素文字列を返す（mark に従う：菱形は polygon、点・丸は circle、線分は line）。 */
/** 寸法の文字：label があればそれ（SVG）。DXF・PDF 用は英数字だけに落とす（× は x・日本語は外す・何も残らなければ数字）。 */
export const dimText = (s, d) => (typeof s.label === 'string' && s.label) ? s.label : f(d.value);
export const dimTextAscii = (s, d) => { const t = (typeof s.label === 'string' && s.label) ? s.label.replace(/\u00d7/g, 'x').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim() : ''; return t || f(d.value); };
export function holeToSvg(h, doc, color = '#e00000', fillDiamond = false, dotMm = 0, dotStroke = false) {
  const a = holeAppearance(h, doc); if (!a) return '';
  const half = h.depth === 'half', halfAttr = half ? ' data-depth="half" stroke-dasharray="0.4 0.3"' : '';   /* 駒合わせの B（コバ側）の穴＝半分の深さ（貫通させない）：塗らず、点線の輪郭に */
  if (dotMm > 0) return half ? `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(dotMm / 2)}" fill="none" stroke="${color}" data-depth="half"/>` : (dotStroke ? `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(dotMm / 2)}" fill="none" stroke="${color}"/>` : `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(dotMm / 2)}" fill="${color}" stroke="none"/>`);   /* 印刷・PDF の「縫い穴を点で印刷する」：形にかかわらず真ん中の●（直径 dotMm・事業主の希望 2026-10-19） */
  if (a.kind === 'dot' || a.kind === 'circle') return `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(a.width / 2)}" fill="none" stroke="${color}"${halfAttr}/>`;
  const pts = (a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }]).map(p => { const q = rotate(p, h.angleDeg); return `${f(q.x + h.x)},${f(q.y + h.y)}`; });
  return a.kind === 'slit' ? `<line x1="${pts[0].split(',')[0]}" y1="${pts[0].split(',')[1]}" x2="${pts[1].split(',')[0]}" y2="${pts[1].split(',')[1]}" stroke="${color}"${halfAttr}/>` : `<polygon points="${pts.join(' ')}" fill="${fillDiamond && !half ? color : 'none'}" stroke="${color}"${halfAttr}/>`;   /* 菱目：fillDiamond で塗る（事業主の希望 2026-10-18） */
}
/** 文書から SVG 文字列を返す。1 ユーザー単位＝1mm、width/height は mm、レイヤーごとに <g id>。線は黒 strokeMm、穴は赤。 */
/** textures：革の質感 { id: { avg: '#rrggbb', href: 'data:image/jpeg;base64,…'（無ければ平均色で塗る）, mm: その質感1枚の実寸（省略可） } }、textureMm：mm の無い質感に使う1枚の大きさ。fill のときだけ使う。 */
const METAL_FALLBACK = { gold: '#D4AF37', silver: '#C0C0C0', pinkgold: '#E5A593', blackgold: '#6B5B3A' };   /* 領域の塗りの金属の色（呼び出し側が色を渡さないとき） */
/** holeDot：0 より大きいと、穴も菱の線（菱形の polyline）も、真ん中の●（直径 holeDot mm）に置き換える（印刷・PDF は塗りの●。SVG の書き出しは holeDotStroke で、線だけの丸＝Beam Studio が画像でなく図形（ベクター）として読む：2026-10-30 事業主「点が図形ではなく画像として認識されている」）。 */
/** Beam Studio は、色ごとの層を、線の太さ1px（72DPI で約0.35mm）ぶん余分に見積もり、層の大きさに合わせて縮めて表示・加工する。細い層（点線・菱目だけの層など）は、幅が小さいぶん、縮みが大きく（幅15mm で約2.3%）、切る線との間隔が崩れる。
 *  beamFix のとき、層ごとに、縮むぶんを、あらかじめ拡大して出す（層の中心を基準に、1÷(幅÷(幅＋0.35mm))倍。幅・高さの小さいほう）。最小の幅・高さが 5mm 未満の層は、確かめていないので、そのまま（事業主の Beam Studio で、幅15mm の層で確認 2026-10-27）。 */
export const BEAM_STROKE_MM = 25.4 / 72;
/** Beam Studio が、この大きさの層を縮める比率（1 未満）と中心。最小の幅・高さが 5mm 未満（確かめていない）・大きさが無いときは null。 */
export function beamShrinkOf(b) {
  if (!b) return null; const w = b.maxX - b.minX, h = b.maxY - b.minY; if (!(Math.min(w, h) >= 5)) return null;
  const k = BEAM_STROKE_MM; return { r: Math.min(w / (w + k), h / (h + k)), cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
}
/** 層の中身 inner を、Beam Studio が縮めるぶんだけ、層の中心を基準にあらかじめ拡大して包む（縮んだあとに真の大きさ＝外周の位置に合う）。
 *  外周（型紙・カット）の層には使わない：Beam Studio は外周をそのまま読み込む（事業主の読み取り 2026-10-28「外周実線はいじらないでほしかった」）。 */
export function beamFixWrap(inner, b) {
  const L = beamShrinkOf(b); if (!L) return inner; const s = 1 / L.r, n = v => +v.toFixed(4);
  return `<g data-beamfix="1" transform="translate(${n(L.cx)} ${n(L.cy)}) scale(${+s.toFixed(5)}) translate(${n(-L.cx)} ${n(-L.cy)})">${inner}</g>`;
}
/** 触らない層（外周＝型紙の層。無ければ、いちばん大きな層）の id。boxes＝[{ id, box }]。
 *  事業主の Beam Studio の読み取り（2026-10-28）：外周の層は、SVG の大きさのまま読み込まれる（縮まない）。細い層（点線・菱目）だけが縮む（10-27 の実測）。
 *  → 外周の層は包まず、ほかの層は、その層の中心を基準に 1÷縮み 倍（＝真の大きさ＝外周の位置に合う）。 */
export function beamRefOf(boxes, preferId = 'pattern') {
  const pref = boxes.find(x => x.id === preferId && beamShrinkOf(x.box)); if (pref) return pref.id;
  let best = null; for (const x of boxes) { const S = beamShrinkOf(x.box); if (S && (!best || S.r > best.S.r)) best = { id: x.id, S }; } return best ? best.id : null;   /* 縮みがいちばん小さい（＝いちばん大きい）層 */
}
/** 文字を書体の輪郭の線（SVG の path の d）にする（事業主 2026-11-13「テキストをSVG出力すると別のフォントになる（BeamboxⅡ読み込み時）」→「文字を線に変換して出す」）。
 *  fonts＝書体の候補（fontkit の font・前ほど優先）。1字ずつ、その字を持つ最初の書体で描く（画面のブラウザと同じ考え）。どの書体にも無い字は、最初の書体で描く。
 *  座標は図面の mm（Y 下向き）。基準線の左端が (s.x, s.y)・字の大きさ s.sizeMm＝1em・s.angleDeg だけ (s.x, s.y) を中心に回す（画面・SVG の <text> と同じ）。空の文字・書体なしは ''。 */
export function textOutlineD(s, fonts) {
  const list = (fonts || []).filter(Boolean), text = String(s?.text ?? '').replace(/[\r\n]+/g, ' '); if (!list.length || !text.trim()) return '';
  const a = (s.angleDeg || 0) * Math.PI / 180, c = Math.cos(a), n = Math.sin(a), P = (lx, ly) => `${f(s.x + lx * c - ly * n)} ${f(s.y + lx * n + ly * c)}`;
  const runs = []; for (const ch of text) { const cp = ch.codePointAt(0), font = list.find(x => x.hasGlyphForCodePoint?.(cp)) || list[0], last = runs[runs.length - 1]; if (last && last.font === font) last.t += ch; else runs.push({ font, t: ch }); }   /* 同じ書体で続く字は、まとめて並べる（字詰め・合字が効く） */
  const CMD = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' }, out = []; let pen = 0;
  for (const { font, t } of runs) {
    const k = s.sizeMm / (font.unitsPerEm || 1000), run = font.layout(t);
    run.glyphs.forEach((g, i) => {
      const p = run.positions?.[i] || {}, ox = pen + (p.xOffset || 0) * k, oy = -(p.yOffset || 0) * k;
      for (const cm of g.path?.commands || []) { const q = cm.args || [], pts = []; for (let j = 0; j + 1 < q.length; j += 2) pts.push(P(ox + q[j] * k, oy - q[j + 1] * k)); if (CMD[cm.command]) out.push(CMD[cm.command] + pts.join(' ')); }   /* 書体の座標は Y 上向き → 図面は Y 下向き */
      pen += (p.xAdvance || 0) * k;
    });
  }
  return out.join('');
}
/** 書体の候補の並び（CSS の font-family）から、書体の名前だけを取り出す（serif などの一般名・system-ui は除く）。 */
export function fontFamilyNames(stack) { return String(stack || '').split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(x => x && !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+)$/i.test(x)); }
export function docToSvg(doc, { beamFix = false, includeHoles = true, strokeMm = 0.1, fill = false, marginMm = 1, layerIds = null, calibration = null, fontFamily = 'sans-serif', textures = null, textureMm = 30, metalColor = null, diamondFill = false, holeDot = 0, holeDotStroke = false, lineColors = 'color', printLines = false, mainMm = MAIN_LINE_MM, textPaths = null } = {}) {   /* textPaths：文字図形の id → 輪郭の線（path の d）。ある文字は <text> の代わりに <path> で出す */
  const layerShapes = doc.shapes.filter(s => (layerIds ? layerIds.includes(s.layer) : doc.layers.find(l => l.id === s.layer)?.visible)), shapes = layerShapes.filter(s => !s.holeLink); /* 穴をつなぐ補助の線（holeLink）は描かない。穴の判定には使う */
  const holes = includeHoles ? holesOnShapes(doc, layerShapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const x0 = b.minX - marginMm, y0 = b.minY - marginMm, w = b.maxX - b.minX + 2 * marginMm, h = b.maxY - b.minY + 2 * marginMm;
  const usedTex = new Set(); /* 画像を埋め込んだ質感の id（<defs> に pattern を作る） */
  const texPaint = (texId, color) => { const tex = texId && textures ? textures[texId] : null; if (tex?.href) { usedTex.add(texId); return `url(#tex-${safeId(texId)})`; } return tex ? safeColor(tex.avg) : (color ? safeColor(color) : null); };   /* 質感の塗り：画像（pattern）、無ければ平均色、それも無ければ革色 */
  const layerBox = id => bboxOfDoc({ ...doc, shapes: shapes.filter(s => s.layer === id), holes: [] }), holesBox = holes.length ? bboxOfDoc({ ...doc, shapes: [], holes }) : null;
  const beamRef = beamFix ? beamRefOf([...doc.layers.filter(l => shapes.some(s => s.layer === l.id)).map(l => ({ id: l.id, box: layerBox(l.id) })), ...(holesBox ? [{ id: 'holes', box: holesBox }] : [])]) : null;   /* Beam 補正の基準＝型紙の層（外周）。無ければいちばん大きな層 */
  const groups = doc.layers.filter(l => shapes.some(s => s.layer === l.id)).map(l => {
    const body = shapes.filter(s => s.layer === l.id).map(s => {
      if (s.type === 'text' && textPaths?.get?.(s.id)) return `<path d="${textPaths.get(s.id)}" data-text="${esc(s.text)}" fill="${svgTextHex(s, lineColors)}" stroke="none"/>`;   /* 線にした文字（textOutlineD）は、書体の名前に頼らない輪郭の線（事業主 2026-11-13「SVG出力すると別のフォントになる（BeamboxⅡ）」） */
      if (s.type === 'text') return `<text x="${f(s.x)}" y="${f(s.y)}" font-size="${f(s.sizeMm)}" font-family="${esc(s.font ? textFontStack(s.font) : fontFamily)}" fill="${svgTextHex(s, lineColors)}" stroke="none" transform="rotate(${f(s.angleDeg)} ${f(s.x)} ${f(s.y)})">${esc(s.text)}</text>`;   /* 書体を決めた文字（font）は、その書体。決めていない文字は、出力の既定（fontFamily） */
      if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return `<path d="M${f(d.a.x)} ${f(d.a.y)}L${f(d.b.x)} ${f(d.b.y)}${d.ext.map(([p, q]) => `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`).join('')}"/><text x="${f(d.textPos.x)}" y="${f(d.textPos.y)}" font-size="2.5" font-family="${esc(fontFamily)}" text-anchor="middle" fill="#000" stroke="none" transform="rotate(${f(d.angleDeg)} ${f(d.textPos.x)} ${f(d.textPos.y)})">${esc(dimText(s, d))}</text>`; }
      if (holeDot > 0 && s.type === 'polyline') { const dl = diamondLoopSizes([s]); if (dl.length) return `<circle id="${safeId(s.id)}" cx="${f(dl[0].x)}" cy="${f(dl[0].y)}" r="${f(holeDot / 2)}" ${holeDotStroke ? `fill="none" stroke="${svgLineHex(s, lineColors, true) || '#000'}"` : `fill="${svgLineHex(s, lineColors, true) || '#000'}" stroke="none"`}/>`; }   /* 菱の線（取り込んだ図面の菱形）も真ん中の● */
      const d = shapeToSvgD(s), part = fill ? (doc.parts || []).find(p => p.shapeIds.includes(s.id)) : null;
      const texId = fill ? (s.texture || part?.texture || null) : null, tex = texId && textures ? textures[texId] : null; /* 革の質感：図形自身の指定が優先、無ければ部品の指定 */
      if (tex?.href) usedTex.add(texId);
      const fillValue = tex?.href ? `url(#tex-${safeId(texId)})` : fill ? safeColor(tex ? tex.avg : part?.color || s.leather) : null; /* 部品の色が無ければ、型紙（図形自身）に付けた革色 */
      const isDia = s.type === 'polyline' && diamondLoopSizes([s]).length > 0, lineHex = printLines && !isDia ? null : svgLineHex(s, lineColors, isDia), strokeAttr = (lineHex ? ` stroke="${lineHex}"` : '') + (printLines && isMainLine(s) ? ` stroke-width="${f(mainMm)}"` : '');   /* printLines＝印刷・PDF：実線は黒（白黒プリンタで色のついた細線が網点＝点線に見えるのを防ぐ）・外形の線は太く */
      const dash = dashArrayMm(s.lineStyle, strokeMm), dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
      return d ? `<path id="${safeId(s.id)}" d="${d}"${strokeAttr}${dashAttr}${fill && (s.closed || s.type === 'circle') ? ` fill="${fillValue}"` : ''}${diamondFill && isDia && !(fill && s.closed) ? ` fill="${lineHex || '#000'}"` : ''}/>` : '';
    }).join('');
    const g = `<g id="${safeId('layer-' + l.id)}" data-name="${esc(l.name)}">${body}</g>`;
    return beamFix && l.id !== beamRef ? beamFixWrap(g, layerBox(l.id)) : g;   /* 外周（基準）の層は触らない */
  }).join('');
  const threadHex = h => { if (lineColors === 'mono') return '#000000'; const p = doc.paths.find(p => p.id === h.pathId); return (fill && p && p.threadHex) ? safeColor(p.threadHex, '#e00000') : '#e00000'; };
  const holeGroup0 = holes.length ? `<g id="holes" data-name="Stitch_Holes" stroke-width="${f(strokeMm)}">${holes.map(h => holeToSvg(h, doc, threadHex(h), diamondFill, holeDot, holeDotStroke)).join('')}</g>` : '', holeGroup = beamFix && holes.length && beamRef !== 'holes' ? beamFixWrap(holeGroup0, holesBox) : holeGroup0;
  const leatherGroups = new Map(); if (fill) for (const s of shapes) if ((s.leather || s.texture) && s.leatherGroup) { if (!leatherGroups.has(s.leatherGroup)) leatherGroups.set(s.leatherGroup, []); leatherGroups.get(s.leatherGroup).push(s); } /* 型紙の輪郭（端がつながった線の一周）に付けた革色は、一周をたどった多角形で線の下に塗る */
  const leatherFill = [...leatherGroups.values()].map(list => { const poly = outlinePolygon(list, list[0].id), paint = texPaint(list.find(q => q.texture)?.texture, list[0].leather); return poly && paint ? `<path d="M${poly.points.map(p => `${f(p.x)} ${f(p.y)}`).join('L')}Z" fill="${paint}" stroke="none"/>` : ''; }).join('');
  const ringD = ps => 'M' + ps.map(q => `${f(q.x)} ${f(q.y)}`).join('L') + 'Z';
  const regionFill = fill ? (doc.fills || []).map(r => { const color = r.texture ? texPaint(r.texture, r.leather) : r.leather ? safeColor(r.leather) : r.metal ? safeColor((metalColor && metalColor(r.metal)) || METAL_FALLBACK[r.metal], '#c9a96e') : null; return color ? `<path d="${[r.points, ...(r.holes || [])].map(ringD).join('')}" fill="${color}" fill-rule="evenodd" stroke="none"/>` : ''; }).join('') : '';   /* 線で囲まれた場所の塗り（くり抜きは evenodd） */
  const inner = `<g fill="none" stroke="#000" stroke-width="${f(strokeMm)}" stroke-linecap="round" stroke-linejoin="round">${leatherFill || regionFill ? `<g id="leather-fill">${regionFill}${leatherFill}</g>` : ''}${groups}${holeGroup}</g>`;
  const mmOf = id => (Number(textures[id].mm) > 0 ? Number(textures[id].mm) : textureMm > 0 ? textureMm : 30); /* 質感の繰り返し模様：1 ユーザー単位＝1mm。写真ごとの実寸（mm）があればそれ、無ければ textureMm */
  const defs = usedTex.size ? `<defs>${[...usedTex].map(id => { const mm = f(mmOf(id)); return `<pattern id="tex-${safeId(id)}" patternUnits="userSpaceOnUse" width="${mm}" height="${mm}"><image href="${esc(textures[id].href)}" x="0" y="0" width="${mm}" height="${mm}" preserveAspectRatio="none"/></pattern>`; }).join('')}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w * fx)}mm" height="${f(h * fy)}mm" viewBox="${f(x0 * fx)} ${f(y0 * fy)} ${f(w * fx)} ${f(h * fy)}">${defs}${fx === 1 && fy === 1 ? inner : `<g transform="scale(${f(fx)} ${f(fy)})">${inner}</g>`}</svg>`;
}
/** 校正係数：期待値 ÷ 実測値。実測が正でなければ null。 */
export function calibrationFactor(expectedMm, measuredMm) { return Number.isFinite(expectedMm) && Number.isFinite(measuredMm) && expectedMm > 0 && measuredMm > 0 ? expectedMm / measuredMm : null; }
/** SVG 文字列に縦横の補正係数を掛けた新しい SVG を返す（width/height/viewBox と transform）。文書を渡した場合は docToSvg に委ねる。 */
export function applyCalibration(svgOrDoc, fx = 1, fy = 1) {
  if (typeof svgOrDoc !== 'string') return docToSvg(svgOrDoc, { calibration: { fx, fy } });
  const m = svgOrDoc.match(/^<svg([^>]*) width="([\d.]+)mm" height="([\d.]+)mm" viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)">([\s\S]*)<\/svg>$/);
  if (!m) return svgOrDoc;
  const [, attrs, w, h, x0, y0, vw, vh, inner] = m;
  return `<svg${attrs} width="${f(w * fx)}mm" height="${f(h * fy)}mm" viewBox="${f(x0 * fx)} ${f(y0 * fy)} ${f(vw * fx)} ${f(vh * fy)}"><g transform="scale(${f(fx)} ${f(fy)})">${inner}</g></svg>`;
}
/** 印刷可能域 pageMm {w,h} と重なり overlapMm から、bbox を覆うページ配置 {cols,rows,pages:[{col,row,x,y,w,h}]} を返す。 */
export function pagesFor(bbox, pageMm = { w: 190, h: 277 }, overlapMm = 10) {
  const W = bbox.maxX - bbox.minX, H = bbox.maxY - bbox.minY, stepX = pageMm.w - overlapMm, stepY = pageMm.h - overlapMm;
  if (!(stepX > 0 && stepY > 0)) throw new RangeError('overlap');
  const cols = Math.max(1, Math.ceil((W - overlapMm) / stepX - 1e-9)), rows = Math.max(1, Math.ceil((H - overlapMm) / stepY - 1e-9));
  const pages = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pages.push({ col: c, row: r, x: bbox.minX + c * stepX, y: bbox.minY + r * stepY, w: pageMm.w, h: pageMm.h });
  return { cols, rows, pages };
}
/** 文書のbboxを縦横補正した物理mmに変換し、線端用の余白2mmを含む印刷配置を返す（pagesFor の薄いラッパー）。 */
export function printLayout(b, pageMm = { w: 190, h: 277 }, overlapMm = 10, calibration = null) {
  const fx = calibration?.fx ?? 1, fy = calibration?.fy ?? 1;
  if (![fx, fy].every(v => Number.isFinite(v) && v > 0)) throw new RangeError('calibration');
  return pagesFor({ minX: b.minX * fx - 2, minY: b.minY * fy - 2, maxX: b.maxX * fx + 2, maxY: b.maxY * fy + 2 }, pageMm, overlapMm);
}
/** 寸法の数字の箱（SVG・PDF の出力と同じ位置：寸法線の中心から 1.2mm 上に基準線・字の高さ 2.5mm の約0.72倍・幅は1文字 1.5mm）。bboxOf は寸法線の端までで数字は入らないので、印刷の範囲には別に足す。
 *  事業主 2026-11-11「左の寸法線、ガイド外に…」：上・右の外側の寸法で、数字が約1mm切れていた。 */
export function dimTextBox(s) {
  if (s?.type !== 'dimension') return null;
  const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset), label = typeof s.label === 'string' && s.label ? s.label : d.value.toFixed(2), W = [...label].length * 1.5, H = 1.9, a = d.angleDeg * Math.PI / 180, rx = Math.cos(a), ry = Math.sin(a), ux = Math.sin(a), uy = -Math.cos(a);
  const pts = [[-W / 2, 0], [W / 2, 0], [-W / 2, H], [W / 2, H]].map(([x, h]) => ({ x: d.textPos.x + rx * x + ux * h, y: d.textPos.y + ry * x + uy * h }));
  return { minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)), minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y)) };
}
/** 印刷（printPages）・PDF 書き出し（docToPdf）・印刷ガイド・枚数表示が、同じ計算でページを決める。b0＝図形・穴の範囲（bboxOfDoc）、shapes＝出す図形（寸法の数字の箱を範囲に足す）。
 *  印刷補正（fx・fy）を掛け、線の端の余裕は始まり側にだけ 2mm 取る。前のページで全部印刷される（新しい面に内容が無い）ページは出さない（空の2ページ目）。ページの x・y は、印刷した大きさ（補正を掛けた mm）。
 *  収まる条件：幅×fx＋2 ≦ pageMm.w かつ 高さ×fy＋2 ≦ pageMm.h。ox・oy＝あと何 mm 小さくすれば収まるか。 */
export function printPagesPlan(b0, shapes, pageMm, overlapMm = 10, calibration = null) {
  if (!b0) return null; const b = { ...b0 };
  for (const s of shapes || []) { const r = dimTextBox(s); if (r) { b.minX = Math.min(b.minX, r.minX); b.maxX = Math.max(b.maxX, r.maxX); b.minY = Math.min(b.minY, r.minY); b.maxY = Math.max(b.maxY, r.maxY); } }
  const fx = calibration?.fx ?? 1, fy = calibration?.fy ?? 1, layout = printLayout(b, pageMm, overlapMm, calibration), x0 = b.minX * fx - 2, y0 = b.minY * fy - 2, stepX = pageMm.w - overlapMm, stepY = pageMm.h - overlapMm, mx = b.maxX * fx, my = b.maxY * fy;
  const pages = layout.pages.filter(p => (p.col === 0 || mx > x0 + (p.col - 1) * stepX + pageMm.w) && (p.row === 0 || my > y0 + (p.row - 1) * stepY + pageMm.h));
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  return { b, fx, fy, pageMm, cols: layout.cols, rows: layout.rows, pages: pages.length ? pages : layout.pages.slice(0, 1), w, h, ox: Math.max(0, w * fx + 2 - pageMm.w), oy: Math.max(0, h * fy + 2 - pageMm.h) };
}
/** 1 ページ分の印刷用 SVG（viewBox をページ位置に合わせ、重なり部分に合わせ目の十字とページ番号を付ける）。 */
export function pageSvg(doc, page, { pageMm = { w: 190, h: 277 }, overlapMm = 10, calibration = null, label = '', includeHoles = true, fontFamily = 'sans-serif', holeDot = 0, printLines = false, mainMm = MAIN_LINE_MM, strokeMm = 0.1, ruler = false } = {}) {
  const fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const content = docToSvg(doc, { includeHoles, marginMm: 0, fontFamily, holeDot, lineColors: 'paper', printLines, mainMm, strokeMm }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const cross = (x, y) => `<path d="M${f(x - 4)} ${f(y)}L${f(x + 4)} ${f(y)}M${f(x)} ${f(y - 4)}L${f(x)} ${f(y + 4)}" stroke="#888" stroke-width="0.15" fill="none"/>`;
  const marks = [[page.x + overlapMm, page.y + overlapMm], [page.x + pageMm.w - overlapMm, page.y + overlapMm], [page.x + overlapMm, page.y + pageMm.h - overlapMm], [page.x + pageMm.w - overlapMm, page.y + pageMm.h - overlapMm]].map(([x, y]) => cross(x, y)).join('');
  const text = `<text x="${f(page.x + 2)}" y="${f(page.y + pageMm.h - 2)}" font-size="3" font-family="${esc(fontFamily)}" fill="#888">${esc(label)}</text>`;
  let rulerSvg = '';
  if (ruler) {   /* 100mm の目盛り（縮み印刷に気づくため）：図面などに触れない空きに置く（呼ぶ側が、最初のページだけ ruler を true にする） */
    const layerShapes = doc.shapes.filter(s => doc.layers.find(l => l.id === s.layer)?.visible && !s.holeLink), holes = includeHoles ? holesOnShapes(doc, layerShapes) : [], noteMm = [...RULER_NOTE].reduce((a, c) => a + (c.charCodeAt(0) < 128 ? 0.6 : 1.0), 0) * 2.2;
    const slot = rulerSlot({ shapes: layerShapes, holes, doc, page, pageMm, fx, fy, noteMm, crosses: [[overlapMm, overlapMm], [pageMm.w - overlapMm, overlapMm], [overlapMm, pageMm.h - overlapMm], [pageMm.w - overlapMm, pageMm.h - overlapMm]] });
    if (slot) { const parts = rulerParts(slot), ox = page.x * fx, oy = page.y * fy, txt = t => `<text x="${f(ox + t.x)}" y="${f(oy + t.y)}" font-size="${t.size}" font-family="${esc(fontFamily)}" fill="#000" transform="rotate(${t.angleDeg} ${f(ox + t.x)} ${f(oy + t.y)})">${esc(t.kind === 'label' ? t.text : RULER_NOTE)}</text>`;
      rulerSvg = `<g id="ruler100" stroke="#000" stroke-width="${f(strokeMm)}" fill="none">${parts.lines.map(([x1, y1, x2, y2]) => `<path d="M${f(ox + x1)} ${f(oy + y1)}L${f(ox + x2)} ${f(oy + y2)}"/>`).join('')}</g>${parts.texts.map(txt).join('')}`; } }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(pageMm.w * fx)}mm" height="${f(pageMm.h * fy)}mm" viewBox="${f(page.x * fx)} ${f(page.y * fy)} ${f(pageMm.w * fx)} ${f(pageMm.h * fy)}"><g transform="scale(${f(fx)} ${f(fy)})">${content}${marks}${text}</g>${rulerSvg}</svg>`;
}
/** L 字の校正スケール（100mm×100mm・10mm ごとの目盛・文字）を図形配列で返す。レイヤーは guide。 */
export function calibrationScale(origin = { x: 0, y: 0 }, layer = 'guide', lengthMm = 100) {
  const o = origin, shapes = [
    { type: 'line', x1: o.x, y1: o.y, x2: o.x + lengthMm, y2: o.y }, { type: 'line', x1: o.x, y1: o.y, x2: o.x, y2: o.y + lengthMm },
    { type: 'text', x: o.x + 2, y: o.y - 2, text: `X ${lengthMm}mm`, sizeMm: 3, angleDeg: 0 }, { type: 'text', x: o.x + 2, y: o.y + lengthMm + 4, text: `Y ${lengthMm}mm`, sizeMm: 3, angleDeg: 0 },
  ];
  for (let i = 0; i <= lengthMm; i += 10) { const l = i % 50 === 0 ? 5 : 3; shapes.push({ type: 'line', x1: o.x + i, y1: o.y, x2: o.x + i, y2: o.y + l }, { type: 'line', x1: o.x, y1: o.y + i, x2: o.x + l, y2: o.y + i }); }
  return shapes.map(s => ({ ...s, layer }));
}

// ---- DXF R12（AC1009）----
const dxfNum = n => (Math.round(n * 10000) / 10000).toString();
function dxfLine(layer, a, b) { return ['0', 'LINE', '8', layer, '10', dxfNum(a.x), '20', dxfNum(-a.y), '30', '0', '11', dxfNum(b.x), '21', dxfNum(-b.y), '31', '0']; }
function dxfPolyline(layer, pts, closed, bulges = null) {
  const out = ['0', 'POLYLINE', '8', layer, '66', '1', '70', closed ? '1' : '0'];
  pts.forEach((p, i) => { out.push('0', 'VERTEX', '8', layer, '10', dxfNum(p.x), '20', dxfNum(-p.y), '30', '0'); if (bulges && bulges[i]) out.push('42', dxfNum(bulges[i])); });
  out.push('0', 'SEQEND', '8', layer); return out;
}
/** エンティティ先頭（'0',TYPE,'8',layer）の直後に図形の色（62＝ACI番号）・線種（6＝線種名）を挿入する。対象が無ければそのまま。 */
function withStyle(codes, s) {
  const extra = [];
  if (s.color && SHAPE_COLOR_ACI[s.color]) extra.push('62', String(SHAPE_COLOR_ACI[s.color]));
  if (s.lineStyle === 'dashed') extra.push('6', 'DASHED');
  return extra.length ? [...codes.slice(0, 4), ...extra, ...codes.slice(4)] : codes;
}
/** 図形から DXF エンティティのコード列を返す。 */
export function shapeToDxf(s, layer, { tolerance = 0.02 } = {}) {
  if (s.type === 'line') return withStyle(dxfLine(layer, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }), s);
  if (s.type === 'circle') return withStyle(['0', 'CIRCLE', '8', layer, '10', dxfNum(s.cx), '20', dxfNum(-s.cy), '30', '0', '40', dxfNum(s.r)], s);
  if (s.type === 'arc') { const sweep = arcSweep(s); if (sweep >= 360) return shapeToDxf({ ...s, type: 'circle' }, layer); const end = s.startDeg + sweep; return withStyle(['0', 'ARC', '8', layer, '10', dxfNum(s.cx), '20', dxfNum(-s.cy), '30', '0', '40', dxfNum(s.r), '50', dxfNum(((-end % 360) + 360) % 360), '51', dxfNum(((-s.startDeg % 360) + 360) % 360)], s); }
  if (s.type === 'polyline') return withStyle(dxfPolyline(layer, s.points, !!s.closed), s);
  if (s.type === 'bezier' || s.type === 'path') { const pts = flattenShape(s, tolerance); const closed = !!s.closed; return withStyle(dxfPolyline(layer, closed && pts.length > 1 ? pts.slice(0, -1) : pts, closed), s); }
  if (s.type === 'text') return ['0', 'TEXT', '8', layer, '10', dxfNum(s.x), '20', dxfNum(-s.y), '30', '0', '40', dxfNum(s.sizeMm), '1', String(s.text).replace(/[\r\n]/g, ' '), '50', dxfNum(-s.angleDeg)];
  if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return [...dxfLine(layer, d.a, d.b), ...d.ext.flatMap(([p, q]) => dxfLine(layer, p, q)), '0', 'TEXT', '8', layer, '10', dxfNum(d.textPos.x), '20', dxfNum(-d.textPos.y), '30', '0', '40', '2.5', '1', dimTextAscii(s, d), '50', dxfNum(-d.angleDeg), '72', '1', '11', dxfNum(d.textPos.x), '21', dxfNum(-d.textPos.y), '31', '0']; }
  return [];
}
/** 穴 1 つの DXF エンティティ（mark に従う。dot は POINT または小円）。 */
export function holeToDxf(h, doc, { dotAsPoint = false } = {}) {
  const a = holeAppearance(h, doc); if (!a) return [];
  const layer = 'Stitch_Holes';
  if (a.kind === 'dot' && dotAsPoint) return ['0', 'POINT', '8', layer, '10', dxfNum(h.x), '20', dxfNum(-h.y), '30', '0'];
  if (a.kind === 'dot' || a.kind === 'circle') return ['0', 'CIRCLE', '8', layer, '10', dxfNum(h.x), '20', dxfNum(-h.y), '30', '0', '40', dxfNum(a.width / 2)];
  const local = a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }];
  const pts = local.map(p => { const q = rotate(p, h.angleDeg); return { x: q.x + h.x, y: q.y + h.y }; });
  return a.kind === 'slit' ? dxfLine(layer, pts[0], pts[1]) : dxfPolyline(layer, pts, true);
}
/** 文書から DXF R12（ASCII）文字列を返す。Y は上向きに変換。原点合わせは外接矩形の左下を (0,0) にする。 */
export function docToDxfR12(doc, { includeHoles = true, dotAsPoint = false, originAtCorner = true, tolerance = 0.02, calibration = null } = {}) {
  const layerShapes = doc.shapes.filter(s => doc.layers.find(l => l.id === s.layer)?.visible), shapes = layerShapes.filter(s => !s.holeLink);
  const holes = includeHoles ? holesOnShapes(doc, layerShapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const fx = calibration?.fx || 1, fy = calibration?.fy || 1, dx = originAtCorner ? -b.minX : 0, dy = originAtCorner ? -b.maxY : 0;
  const move = o => { if (o.type === 'circle' || o.type === 'arc') return { ...o, cx: (o.cx + dx) * fx, cy: (o.cy + dy) * fy, r: o.r * (fx + fy) / 2 }; const q = { ...o }; for (const [x, y] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2'], ['c1x', 'c1y'], ['c2x', 'c2y']]) if (x in q) { q[x] = (q[x] + dx) * fx; q[y] = (q[y] + dy) * fy; } if (q.points) q.points = q.points.map(p => ({ x: (p.x + dx) * fx, y: (p.y + dy) * fy })); if (q.nodes) q.nodes = q.nodes.map(n => ({ ...n, x: (n.x + dx) * fx, y: (n.y + dy) * fy, inX: (n.inX + dx) * fx, inY: (n.inY + dy) * fy, outX: (n.outX + dx) * fx, outY: (n.outY + dy) * fy })); return q; };
  const layerName = l => safeId(l.name === l.id ? l.id : l.name) || l.id;
  const layers = doc.layers.filter(l => shapes.some(s => s.layer === l.id)).map(layerName);
  const tableLayers = [...layers, ...(holes.length ? ['Stitch_Holes'] : [])];
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$EXTMIN', '10', dxfNum((b.minX + dx) * fx), '20', dxfNum(-(b.maxY + dy) * fy), '30', '0', '9', '$EXTMAX', '10', dxfNum((b.maxX + dx) * fx), '20', dxfNum(-(b.minY + dy) * fy), '30', '0', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '2',
    '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'LTYPE', '2', 'DASHED', '70', '0', '3', 'Dashed line', '72', '65', '73', '2', '40', '0.75', '49', '0.5', '74', '0', '49', '-0.25', '74', '0',
    '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(tableLayers.length)];
  for (const name of tableLayers) out.push('0', 'LAYER', '2', name, '70', '0', '62', name === 'Stitch_Holes' ? '1' : '7', '6', 'CONTINUOUS');
  out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  for (const l of doc.layers) for (const s of shapes.filter(s => s.layer === l.id)) out.push(...shapeToDxf(move(s), layerName(l), { tolerance }));
  const holeDoc = { ...doc, holes: holes.map(h => ({ ...h, x: (h.x + dx) * fx, y: (h.y + dy) * fy })) };
  for (const h of holeDoc.holes) out.push(...holeToDxf(h, holeDoc, { dotAsPoint }));
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\r\n') + '\r\n';
}
// ---- PDF（直接生成・ASCII のみ・xref はバイトオフセット）----
const PT = 72 / 25.4, PAPER = { a4: [595.276, 841.89], a3: [841.89, 1190.551] };
/* ===== 100mm の目盛り（印刷の縮み確認）：事業主 2026-11-11「受講生が縮小印刷に気づけるよう、型紙PDFに100mmの目盛りを入れる」（案A）。
   PDF の「印刷のとき拡大・縮小しない」の指定は、Edge では読まれず、「ページに合わせる」が初期値で縮んで印刷される。縮んだら、目盛りが100mmにならないので、気づける。 ===== */
export const RULER_NOTE = 'この線が100mmになるように、実際のサイズ（100%）で印刷してください';
export const RULER_NOTE_EN = 'Print at 100% (actual size): this line must measure 100 mm';
/** 目盛りを置く場所を決める。ページ（印刷した大きさの mm・左上が原点）の中で、図面の線・穴・文字・寸法・位置合わせの十字に触れない空きを探す（横向き→縦向きの順・右下から）。
 *  items＝{ shapes, holes, doc }（図面の座標）、page＝{x, y}（印刷した大きさでのページの原点）、pageMm＝{w, h}、fx・fy＝印刷補正、noteMm＝一文の長さ（mm）、crosses＝[[x, y]]（ページの座標）。
 *  戻り値 { orient: 'h'|'v', x, y, u（線の方向の長さ）, v（直角の方向の長さ）} か、空きが無ければ null。 */
export function rulerSlot({ shapes, holes = [], doc, page, pageMm, fx = 1, fy = 1, noteMm = 80, crosses = [] }) {
  const gw = Math.ceil(pageMm.w) + 2, gh = Math.ceil(pageMm.h) + 2, occ = new Uint8Array(gw * gh);
  const P = p => ({ x: p.x * fx - page.x, y: p.y * fy - page.y });
  const mark = (x, y, r = 1) => { const cx = Math.floor(x), cy = Math.floor(y); for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) if (i >= 0 && j >= 0 && i < gw && j < gh) occ[j * gw + i] = 1; };
  const rect = (x0, y0, x1, y1, pad = 1) => { for (let j = Math.floor(y0 - pad); j <= Math.floor(y1 + pad); j++) for (let i = Math.floor(x0 - pad); i <= Math.floor(x1 + pad); i++) if (i >= 0 && j >= 0 && i < gw && j < gh) occ[j * gw + i] = 1; };
  const seg = (a, b) => { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5)); for (let k = 0; k <= n; k++) mark(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n); };
  const quad = pts => { const q = pts.map(P); rect(Math.min(...q.map(p => p.x)), Math.min(...q.map(p => p.y)), Math.max(...q.map(p => p.x)), Math.max(...q.map(p => p.y)), 1); };
  for (const s of shapes) {
    if (s.type === 'text') { const w = [...String(s.text)].reduce((a, c) => a + (c.charCodeAt(0) < 128 ? 0.6 : 1.0), 0) * s.sizeMm, a = (s.angleDeg || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); quad([[0, -s.sizeMm], [w, -s.sizeMm], [w, s.sizeMm * 0.3], [0, s.sizeMm * 0.3]].map(([x, y]) => ({ x: s.x + x * c - y * sn, y: s.y + x * sn + y * c }))); continue; }
    if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); seg(P(d.a), P(d.b)); for (const [p, q] of d.ext) seg(P(p), P(q)); const t = dimTextBox(s); if (t) quad([{ x: t.minX, y: t.minY }, { x: t.maxX, y: t.minY }, { x: t.maxX, y: t.maxY }, { x: t.minX, y: t.maxY }]); continue; }
    if (s.type === 'image' || s.noOutput) continue;
    let pts; try { pts = flattenShape(s, 0.3); } catch { continue; }
    for (let i = 1; i < pts.length; i++) seg(P(pts[i - 1]), P(pts[i]));
  }
  /* 型紙の輪郭（実線で一周つながるもの）の内側も、ふさぐ（型紙の中に目盛りを置くと、切り抜く範囲に入ってしまう）。輪郭の外にできたすき間（型紙と型紙のあいだ）は、空きのまま */
  const fillPoly = pts => { const ys = pts.map(p => p.y), j0 = Math.max(0, Math.floor(Math.min(...ys))), j1 = Math.min(gh - 1, Math.ceil(Math.max(...ys))); for (let j = j0; j <= j1; j++) { const yc = j + 0.5, xs = []; for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; if ((p.y <= yc && q.y > yc) || (q.y <= yc && p.y > yc)) xs.push(p.x + (yc - p.y) / (q.y - p.y) * (q.x - p.x)); } xs.sort((u, v) => u - v); for (let m = 0; m + 1 < xs.length; m += 2) for (let i = Math.max(0, Math.floor(xs[m])); i <= Math.min(gw - 1, Math.floor(xs[m + 1])); i++) occ[j * gw + i] = 1; } };
  const solid = shapes.filter(isMainLine), covered = new Set();
  for (const sh of solid) { if (covered.has(sh.id)) continue; let poly = null; try { poly = outlinePolygon(solid, sh.id); } catch { poly = null; } if (!poly) continue; for (const id of poly.ids) covered.add(id); fillPoly(poly.points.map(P)); }
  for (const h of holes) { const p = P(h); mark(p.x, p.y, 1); }
  for (const [x, y] of crosses) rect(x - 5, y - 5, x + 5, y + 5, 0);
  const S = new Int32Array((gw + 1) * (gh + 1)); for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) S[(j + 1) * (gw + 1) + i + 1] = occ[j * gw + i] + S[j * (gw + 1) + i + 1] + S[(j + 1) * (gw + 1) + i] - S[j * (gw + 1) + i];
  const free = (x, y, w, h) => { const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y)), x1 = Math.min(gw, Math.ceil(x + w)), y1 = Math.min(gh, Math.ceil(y + h)); return S[y1 * (gw + 1) + x1] - S[y0 * (gw + 1) + x1] - S[y1 * (gw + 1) + x0] + S[y0 * (gw + 1) + x0] === 0; };
  const U = Math.max(116, Math.ceil(noteMm) + 6), V = 10;
  for (const orient of ['h', 'v']) {
    const w = orient === 'h' ? U : V, h = orient === 'h' ? V : U;
    for (let y = Math.floor(pageMm.h - h - 1); y >= 1; y--) for (let x = Math.floor(pageMm.w - w - 1); x >= 1; x--) if (free(x, y, w, h)) return { orient, x, y, u: U, v: V };
  }
  return null;
}
/** 目盛りの絵（ページの座標・mm）。lines＝[x1,y1,x2,y2]、texts＝[{x,y,text,size,angleDeg,kind}]（kind: 'label'＝「100mm」・'note'＝一文）。 */
export function rulerParts(slot) {
  const { orient, x: X0, y: Y0, v: V } = slot, map = (u, v) => orient === 'h' ? { x: X0 + u, y: Y0 + v } : { x: X0 + (V - v), y: Y0 + u }, ang = orient === 'h' ? 0 : 90;
  const L = (u1, v1, u2, v2) => { const a = map(u1, v1), b = map(u2, v2); return [a.x, a.y, b.x, b.y]; };
  const lines = [L(2, 3, 102, 3), L(2, 1.5, 2, 4.5), L(102, 1.5, 102, 4.5)]; for (let u = 12; u < 102; u += 10) lines.push(L(u, 2.2, u, 3.8));
  const lab = map(104.5, 4.2), note = map(2, 8.8);
  return { lines, texts: [{ ...lab, text: '100mm', size: 2.5, angleDeg: ang, kind: 'label' }, { ...note, text: '', size: 2.2, angleDeg: ang, kind: 'note' }] };
}
/** 文書から PDF（Uint8Array）を返す。用紙 A4/A3（landscape 可）、余白 10mm、STEP 5 の分割と印刷補正を反映。文字は ASCII のみ（それ以外は、textImages＝図形 id → 白黒画像（1ビット）が渡されていれば画像として置き、無ければ警告に数えて省略）。 */
/** holeDot：0 より大きいと、穴も菱の線も真ん中の●（直径 holeDot mm・塗り）にする（印刷の「縫い穴を点で印刷する」と同じ）。 */
export function docToPdf(doc, { paper = 'a4', landscape = false, marginMm = 10, overlapMm = 10, includeHoles = true, calibration = null, strokeMm = 0.1, holeDot = 0, textImages = null, printLines = false, mainMm = MAIN_LINE_MM, ruler = false } = {}) {
  const [pw, ph] = landscape ? [...PAPER[paper] || PAPER.a4].reverse() : (PAPER[paper] || PAPER.a4), fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const pageMm = { w: pw / PT - 2 * marginMm, h: ph / PT - 2 * marginMm };
  const layerShapes = doc.shapes.filter(s => doc.layers.find(l => l.id === s.layer)?.visible), shapes = layerShapes.filter(s => !s.holeLink), holes = includeHoles ? holesOnShapes(doc, layerShapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const layout = printPagesPlan(b, shapes, pageMm, overlapMm, calibration);   /* 印刷と同じページ割り（寸法の数字・印刷補正を含み、空のページは出さない）。ページの x・y は印刷した大きさ（補正を掛けた mm） */
  let skipped = 0;
  const n = v => (Math.round(v * 1000) / 1000).toString();
  let rulerPlaced = false;   /* 100mm の目盛りを置けたか */
  const images = new Map(); let pageImgs = new Set();   /* 画像の部品（図形 id ごとに1つ・どのページでも使い回す）と、いまのページで使う画像 */
  const pageContent = page => {
    const X = x => n((x * fx - page.x + marginMm) * PT), Y = y => n(ph - (y * fy - page.y + marginMm) * PT), Xp = x => n((x - page.x + marginMm) * PT), Yp = y => n(ph - (y - page.y + marginMm) * PT);   /* X・Y＝図面の座標 → 用紙の位置。Xp・Yp＝ページの座標（印刷した大きさ）→ 用紙の位置（合わせ目の十字用） */
    const ops = [`${n(strokeMm * PT)} w 1 J 1 j`];
    const K = 0.5523, dot = (cx, cy, r) => { const k = r * K; return `${X(cx + r)} ${Y(cy)} m ${X(cx + r)} ${Y(cy + k)} ${X(cx + k)} ${Y(cy + r)} ${X(cx)} ${Y(cy + r)} c ${X(cx - k)} ${Y(cy + r)} ${X(cx - r)} ${Y(cy + k)} ${X(cx - r)} ${Y(cy)} c ${X(cx - r)} ${Y(cy - k)} ${X(cx - k)} ${Y(cy - r)} ${X(cx)} ${Y(cy - r)} c ${X(cx + k)} ${Y(cy - r)} ${X(cx + r)} ${Y(cy - k)} ${X(cx + r)} ${Y(cy)} c f`; };   /* 塗った●（4本の曲線。X・Y に印刷補正が入るので、補正が縦横で違えば●も同じに伸びる） */
    const imageOp = (s, im) => {   /* 日本語など ASCII 以外の文字：白黒画像（ImageMask・1ビット）。基準点（左・基準線）から、画像の左下までのずれ（offX・offY mm）を、文字の向きに回して置く */
      if (!images.has(s.id)) { let data = ''; for (let i = 0; i < im.bits.length; i += 8192) data += String.fromCharCode(...im.bits.subarray(i, i + 8192)); images.set(s.id, { name: 'Im' + (images.size + 1), id: add(`<< /Type /XObject /Subtype /Image /Width ${im.wPx} /Height ${im.hPx} /ImageMask true /BitsPerComponent 1 /Decode [0 1] /Length ${data.length} >>
stream
${data}
endstream`) }); }
      const e = images.get(s.id); pageImgs.add(s.id);
      const th = -(s.angleDeg || 0) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), Wt = im.wMm * fx * PT, Ht = im.hMm * fy * PT, ox = im.offX * fx * PT, oy = im.offY * fy * PT, ax = Number(X(s.x)), ay = Number(Y(s.y));
      return `q 0 0 0 rg ${n(c * Wt)} ${n(sn * Wt)} ${n(-sn * Ht)} ${n(c * Ht)} ${n(ax + c * ox - sn * oy)} ${n(ay + sn * ox + c * oy)} cm /${e.name} Do Q`;
    };
    const pathOps = s => {
      if (holeDot > 0 && s.type === 'polyline') { const dl = diamondLoopSizes([s]); if (dl.length) { const rgb = exportHex(s.color) ? hexToRgb01(exportHex(s.color)) : null; const d = dot(dl[0].x, dl[0].y, holeDot / 2); return rgb ? `${rgb.join(' ')} rg ${d} 0 0 0 rg` : d; } }   /* 菱の線は真ん中の● */
      if (s.type === 'text') { if (/[^\x20-\x7e]/.test(s.text)) { const im = textImages?.get?.(s.id); if (!im) { skipped++; return ''; } return imageOp(s, im); } return `BT /F1 ${n(s.sizeMm * PT)} Tf 1 0 0 1 ${X(s.x)} ${Y(s.y)} Tm (${s.text.replace(/[\\()]/g, c => '\\' + c)}) Tj ET`; }
      if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return `${X(d.a.x)} ${Y(d.a.y)} m ${X(d.b.x)} ${Y(d.b.y)} l ${d.ext.map(([p, q]) => `${X(p.x)} ${Y(p.y)} m ${X(q.x)} ${Y(q.y)} l`).join(' ')} S BT /F1 ${n(2.5 * PT)} Tf 1 0 0 1 ${X(d.textPos.x)} ${Y(d.textPos.y)} Tm (${dimTextAscii(s, d).replace(/[\\()]/g, c => '\\' + c)}) Tj ET`; }
      if (s.type === 'fold' || s.type === 'image') return '';
      const pts = flattenShape(s, 0.02); if (pts.length < 2) return '';
      const rgb = !printLines && exportHex(s.color) ? hexToRgb01(exportHex(s.color)) : null;   /* printLines：実線は黒 */
      const colorOn = (rgb ? `${rgb.join(' ')} RG ` : '') + (printLines && isMainLine(s) ? `${n(mainMm * PT)} w ` : ''), colorOff = (rgb ? ' 0 0 0 RG' : '') + (printLines && isMainLine(s) ? ` ${n(strokeMm * PT)} w` : '');
      const dashOn = s.lineStyle === 'dashed' ? `[${n(3 * PT)} ${n(2 * PT)}] 0 d ` : '', dashOff = s.lineStyle === 'dashed' ? ' [] 0 d' : '';
      return `${colorOn}${dashOn}${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')}${s.closed || s.type === 'circle' ? ' h' : ''} S${dashOff}${colorOff}`;
    };
    for (const s of shapes) ops.push(pathOps(s));
    if (ruler && page === layout.pages[0]) {   /* 100mm の目盛り（縮み印刷に気づくため）：最初のページの、図面などに触れない空きに置く */
      const note = textImages?.get?.('__ruler_note'), noteMm = note ? note.wMm : RULER_NOTE_EN.length * 2.2 * 0.52, crosses = [[overlapMm, overlapMm], [pageMm.w - overlapMm, overlapMm], [overlapMm, pageMm.h - overlapMm], [pageMm.w - overlapMm, pageMm.h - overlapMm]];
      const slot = rulerSlot({ shapes, holes, doc, page, pageMm, fx, fy, noteMm, crosses }); rulerPlaced = !!slot;
      if (slot) { const parts = rulerParts(slot); ops.push('q 0 0 0 RG 0 0 0 rg ' + n(strokeMm * PT) + ' w'); for (const [x1, y1, x2, y2] of parts.lines) ops.push(`${Xp(x1)} ${Yp(y1)} m ${Xp(x2)} ${Yp(y2)} l S`);
        const tm = (t, text) => { const a = t.angleDeg === 90 ? '0 -1 1 0' : '1 0 0 1'; return `BT /F1 ${n(t.size * PT)} Tf ${a} ${Xp(t.x)} ${Yp(t.y)} Tm (${text.replace(/[\\()]/g, c => '\\' + c)}) Tj ET`; };
        for (const t of parts.texts) { if (t.kind === 'label') ops.push(tm(t, t.text)); else if (note) { const sc = { ...note, wMm: note.wMm / fx, hMm: note.hMm / fy, offX: note.offX / fx, offY: note.offY / fy }; ops.push(imageOp({ id: '__ruler_note', x: (t.x + page.x) / fx, y: (t.y + page.y) / fy, angleDeg: t.angleDeg }, sc)); } else ops.push(tm({ ...t, size: 2.2 }, RULER_NOTE_EN)); }
        ops.push('Q'); } }
    ops.push('1 0 0 RG'); if (holeDot > 0) ops.push('1 0 0 rg');
    for (const h of holes) { const a = holeAppearance(h, doc); if (!a) continue; if (holeDot > 0) { ops.push(dot(h.x, h.y, holeDot / 2)); continue; } if (a.kind === 'dot' || a.kind === 'circle') { const r = a.width / 2, pts = Array.from({ length: 17 }, (_, i) => ({ x: h.x + r * Math.cos(i / 8 * Math.PI), y: h.y + r * Math.sin(i / 8 * Math.PI) })); ops.push(`${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')} S`); } else { const local = a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }]; const pts = local.map(p => { const q = rotate(p, h.angleDeg); return { x: q.x + h.x, y: q.y + h.y }; }); ops.push(`${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')}${a.kind === 'slit' ? '' : ' h'} S`); } }
    ops.push('0 0 0 RG'); if (holeDot > 0) ops.push('0 0 0 rg');
    // 合わせ目の十字
    for (const [x, y] of [[page.x + overlapMm, page.y + overlapMm], [page.x + pageMm.w - overlapMm, page.y + overlapMm], [page.x + overlapMm, page.y + pageMm.h - overlapMm], [page.x + pageMm.w - overlapMm, page.y + pageMm.h - overlapMm]]) ops.push(`${Xp(x - 4)} ${Yp(y)} m ${Xp(x + 4)} ${Yp(y)} l ${Xp(x)} ${Yp(y - 4)} m ${Xp(x)} ${Yp(y + 4)} l S`);   /* 十字は、ページの座標（印刷した大きさ）で描く */
    return ops.filter(Boolean).join('\n');
  };
  const objects = [];
  const add = body => { objects.push(body); return objects.length; };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pagesId = objects.length + 1; objects.push(null);
  const pageIds = layout.pages.map(page => { pageImgs = new Set(); const content = pageContent(page); const xo = pageImgs.size ? ` /XObject << ${[...pageImgs].map(i => `/${images.get(i).name} ${images.get(i).id} 0 R`).join(' ')} >>` : ''; const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${n(pw)} ${n(ph)}] /Resources << /Font << /F1 ${fontId} 0 R >>${xo} >> /Contents ${cId} 0 R >>`); });
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R /ViewerPreferences << /PrintScaling /None >> >>`);   /* 印刷のとき、拡大・縮小しない（実際のサイズ）：閲覧ソフトの「ページに合わせる」で、297mm が約287mmに縮み、約10mm短く印刷されていた（事業主の報告 2026-11-11） */
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offsets = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return Object.assign(bytes, { pages: layout.pages.length, skippedText: skipped, rulerPlaced });
}
/** DXF R12 文字列から LINE/CIRCLE/ARC/POLYLINE/TEXT を読み戻す（往復テストと取り込みの土台）。Y は下向きに戻す。 */
export function dxfToShapes(text) {
  const lines = text.split(/\r?\n/), shapes = []; let i = 0;
  const pairs = []; while (i + 1 < lines.length) { pairs.push([lines[i].trim(), lines[i + 1]]); i += 2; }
  let k = 0; const next = () => pairs[k++];
  const readEntity = () => { const e = {}; while (k < pairs.length && pairs[k][0] !== '0') { const [c, v] = next(); if (!(c in e)) e[c] = v; else e[c + '_'] = v; } return e; };
  while (k < pairs.length) {
    const [c, v] = next(); if (c !== '0') continue;
    if (v === 'LINE') { const e = readEntity(); shapes.push({ type: 'line', layer: e['8'], x1: +e['10'], y1: -e['20'], x2: +e['11'], y2: -e['21'] }); }
    else if (v === 'CIRCLE') { const e = readEntity(); shapes.push({ type: 'circle', layer: e['8'], cx: +e['10'], cy: -e['20'], r: +e['40'] }); }
    else if (v === 'ARC') { const e = readEntity(); const start = -(+e['51']), end = -(+e['50']); shapes.push({ type: 'arc', layer: e['8'], cx: +e['10'], cy: -e['20'], r: +e['40'], startDeg: ((start % 360) + 360) % 360, endDeg: ((start % 360) + 360) % 360 + (((end - start) % 360) + 360) % 360 }); }
    else if (v === 'POLYLINE') { const e = readEntity(); const pts = []; while (k < pairs.length && pairs[k][1] === 'VERTEX') { next(); const ve = readEntity(); pts.push({ x: +ve['10'], y: -ve['20'] }); } if (k < pairs.length && pairs[k][1] === 'SEQEND') { next(); readEntity(); } shapes.push({ type: 'polyline', layer: e['8'], points: pts, closed: (+e['70'] & 1) === 1 }); }
    else if (v === 'TEXT') { const e = readEntity(); shapes.push({ type: 'text', layer: e['8'], x: +e['10'], y: -e['20'], text: e['1'], sizeMm: +e['40'], angleDeg: -(+e['50'] || 0) }); }
    else if (v === 'POINT') { const e = readEntity(); shapes.push({ type: 'point', layer: e['8'], x: +e['10'], y: -e['20'] }); }
  }
  return shapes;
}

/* ───────── ピースを分けて保存（事業主 2026-11-12「各パッチをバラバラにして保存（SVG・レーザー加工用）できる機能が欲しい」）─────────
 *  ピース1枚の SVG：切る線＝黒、縫い穴＝赤（菱目と同じ色分け）、番号＝青（彫る線）。レーザーは色で加工を変えるため。座標は図面のまま（ピースの位置は動かさない）。 */
export function patchPieceSvg({ points, holes = [], strokes = [], title = '' }, doc, { strokeMm = 0.1, marginMm = 2 } = {}) {
  const xs = [...points.map(p => p.x), ...holes.map(h => h.x), ...strokes.flat().map(p => p.x)], ys = [...points.map(p => p.y), ...holes.map(h => h.y), ...strokes.flat().map(p => p.y)];
  const x0 = Math.min(...xs) - marginMm, y0 = Math.min(...ys) - marginMm, w = Math.max(...xs) - Math.min(...xs) + 2 * marginMm, h = Math.max(...ys) - Math.min(...ys) + 2 * marginMm, d = pts => 'M' + pts.map(p => `${f(p.x)} ${f(p.y)}`).join('L');
  const cut = `<g id="cut" data-name="Cut" fill="none" stroke="#000000" stroke-width="${f(strokeMm)}" stroke-linejoin="round"><path d="${d(points)}Z"/></g>`;
  const holeG = holes.length ? `<g id="holes" data-name="Stitch_Holes" stroke-width="${f(strokeMm)}">${holes.map(q => holeToSvg(q, doc, '#e00000')).join('')}</g>` : '';
  const eng = strokes.length ? `<g id="engrave" data-name="Number" fill="none" stroke="#0000ff" stroke-width="${f(strokeMm)}" stroke-linecap="round" stroke-linejoin="round">${strokes.map(l => `<path d="${d(l)}"/>`).join('')}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}">${title ? `<title>${esc(title)}</title>` : ''}${cut}${holeG}${eng}</svg>`;
}
/** 複数のファイルを1つの ZIP（圧縮なし）にする。files＝[{ name, data（文字列か Uint8Array） }]。名前は UTF-8（日本語可）。戻り値は Uint8Array。 */
const zipUtf8 = s => { const out = []; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xC0 | c >> 6, 0x80 | c & 63); else if (c < 0x10000) out.push(0xE0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63); else out.push(0xF0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63); } return Uint8Array.from(out); };
const ZIP_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = ZIP_CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
export function zipStore(files, date = new Date()) {
  const y = Math.max(1980, date.getFullYear()), dosDate = ((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(), dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const parts = [], central = []; let offset = 0;
  const u16 = v => [v & 255, v >> 8 & 255], u32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255];
  for (const file of files) {
    const name = zipUtf8(file.name), data = typeof file.data === 'string' ? zipUtf8(file.data) : file.data, crc = crc32(data);
    const local = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, data);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0), end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]), all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0; for (const c of all) { out.set(c, p); p += c.length; } return out;
}
