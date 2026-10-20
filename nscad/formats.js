// 書き出し形式（SVG・DXF R12）・分割印刷・印刷補正。純粋関数のみ（DOM 禁止）。
// 内部座標は Y 下向き・mm。SVG は同じ向き、DXF は Y 上向きなので y → -y と円弧の始終角を入れ替える。
import { mirrorY, bboxOfDoc, bboxOf, holeAppearance, flattenShape, pathSegments, dimension, rotate, arcSweep, ownHolePathIds, holeIsOwn, outlinePolygon, diamondLoopSizes } from './geometry.js';

/** 内部 Y 下向きと DXF/PDF の Y 上向きを相互変換する（同じ関数で往復）。円弧端も交換。 */
export function flipFormatY(shape) { return mirrorY(shape); }
/** SVG は内部と同じ Y 下向き。正の掃引をそのまま sweep=1 にする。 */
export function svgSweep() { return 1; }

const f = n => (Math.round(n * 1000) / 1000).toString();
export function holesOnShapes(doc, shapes) { const ids = new Set(shapes.map(s => s.id)), guide = new Set(doc.shapes.filter(s => s.layer === 'guide').map(s => s.id)), okPaths = new Set(doc.paths.filter(p => p.shapeIds.every(id => ids.has(id) || guide.has(id))).map(p => p.id)); /* ガイドの線に乗った穴は、ガイドを隠しても出す（画面と同じ） */ const own = ownHolePathIds(doc), picked = doc.outHoleIds; /* picked：「選んだ図形だけ出力」で、選んだ菱目（穴）の id。乗っている補助の線が選ばれていなくても出す（2026-10-20 事業主：囲み選択で上の菱目だけ SVG に出なかった） */ return doc.holes.filter(h => holeIsOwn(h, own) || okPaths.has(h.pathId) || (picked && picked.has(h.id))); }
/** 図形の色（5色）→ 出力用の色。SVG/PDF は 16進・CSS 名、DXF は ACI（AutoCAD Color Index）番号。 */
export const SHAPE_COLOR_HEX = { blue: '#2060ff', green: '#2a9d3f', red: '#e02020', white: '#ffffff', yellow: '#e6c300' };
export const SHAPE_COLOR_ACI = { blue: 5, green: 3, red: 1, white: 7, yellow: 2 };
/** 書き出し（SVG・PDF）用の線の色。「白」は色なし（既定の黒）にする：画面は黒い背景なので白が見えるが、白い紙・白い背景では消える（事業主の指摘 2026-10-19「SVG出力する一部の線が消える」）。 */
export const exportHex = color => (color && color !== 'white' && SHAPE_COLOR_HEX[color]) || null;   /* PDF・印刷（紙）用：白は黒 */
/** 菱目（菱の線）の既定の色：縫い穴と同じ赤。カット線（黒か指定色）と色で区別する（レーザーは色で加工を変えるため・事業主の指示 2026-10-19「菱目とカット線は色は変える」）。 */
export const DIAMOND_RED = '#e00000';
/** SVG の線の色。mode：'color'＝図形に付けた色をそのまま（白も白）＋色の指定が無い菱の線は赤／'paper'＝紙・印刷用（白は黒・菱の線も黒＝今までの印刷）／'mono'＝全部黒（「白黒で出力」を指定したときだけ・事業主の指示 2026-10-19「白黒は白黒指定したときだけ」）。null は色指定なし（既定の黒）。 */
export function svgLineHex(s, mode, isDiamond) {
  if (mode === 'mono') return null;
  if (mode === 'paper') return exportHex(s.color);
  if (s.color && SHAPE_COLOR_HEX[s.color]) return SHAPE_COLOR_HEX[s.color];
  return isDiamond ? DIAMOND_RED : null;
}
/** 線種（実線／点線）から SVG の stroke-dasharray を返す（mm 単位、strokeMm に比例）。実線は null。 */
function dashArrayMm(lineStyle, strokeMm) { return lineStyle === 'dashed' ? `${f(strokeMm * 8)} ${f(strokeMm * 5)}` : null; }
/** #rrggbb を PDF の RG 用 0..1 の [r,g,b] に変換する。 */
function hexToRgb01(hex) { const v = parseInt(hex.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255].map(c => Math.round(c / 255 * 1000) / 1000); }
/** 色は #rgb/#rrggbb/#rrggbbaa だけ通す（属性への差し込み防止）。 */
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
export function holeToSvg(h, doc, color = '#e00000', fillDiamond = false, dotMm = 0) {
  const a = holeAppearance(h, doc); if (!a) return '';
  if (dotMm > 0) return `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(dotMm / 2)}" fill="${color}" stroke="none"/>`;   /* 印刷・PDF の「縫い穴を点で印刷する」：形にかかわらず真ん中の●（直径 dotMm・事業主の希望 2026-10-19） */
  if (a.kind === 'dot' || a.kind === 'circle') return `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(a.width / 2)}" fill="none" stroke="${color}"/>`;
  const pts = (a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }]).map(p => { const q = rotate(p, h.angleDeg); return `${f(q.x + h.x)},${f(q.y + h.y)}`; });
  return a.kind === 'slit' ? `<line x1="${pts[0].split(',')[0]}" y1="${pts[0].split(',')[1]}" x2="${pts[1].split(',')[0]}" y2="${pts[1].split(',')[1]}" stroke="${color}"/>` : `<polygon points="${pts.join(' ')}" fill="${fillDiamond ? color : 'none'}" stroke="${color}"/>`;   /* 菱目：fillDiamond で塗る（事業主の希望 2026-10-18） */
}
/** 文書から SVG 文字列を返す。1 ユーザー単位＝1mm、width/height は mm、レイヤーごとに <g id>。線は黒 strokeMm、穴は赤。 */
/** textures：革の質感 { id: { avg: '#rrggbb', href: 'data:image/jpeg;base64,…'（無ければ平均色で塗る）, mm: その質感1枚の実寸（省略可） } }、textureMm：mm の無い質感に使う1枚の大きさ。fill のときだけ使う。 */
const METAL_FALLBACK = { gold: '#D4AF37', silver: '#C0C0C0', pinkgold: '#E5A593', blackgold: '#6B5B3A' };   /* 領域の塗りの金属の色（呼び出し側が色を渡さないとき） */
/** holeDot：0 より大きいと、穴も菱の線（菱形の polyline）も、真ん中の●（直径 holeDot mm）に置き換える（印刷・PDF だけが使う。画面・SVG 書き出しは渡さない）。 */
export function docToSvg(doc, { includeHoles = true, strokeMm = 0.1, fill = false, marginMm = 1, layerIds = null, calibration = null, fontFamily = 'sans-serif', textures = null, textureMm = 30, metalColor = null, diamondFill = false, holeDot = 0, lineColors = 'color' } = {}) {
  const layerShapes = doc.shapes.filter(s => (layerIds ? layerIds.includes(s.layer) : doc.layers.find(l => l.id === s.layer)?.visible)), shapes = layerShapes.filter(s => !s.holeLink); /* 穴をつなぐ補助の線（holeLink）は描かない。穴の判定には使う */
  const holes = includeHoles ? holesOnShapes(doc, layerShapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const x0 = b.minX - marginMm, y0 = b.minY - marginMm, w = b.maxX - b.minX + 2 * marginMm, h = b.maxY - b.minY + 2 * marginMm;
  const usedTex = new Set(); /* 画像を埋め込んだ質感の id（<defs> に pattern を作る） */
  const texPaint = (texId, color) => { const tex = texId && textures ? textures[texId] : null; if (tex?.href) { usedTex.add(texId); return `url(#tex-${safeId(texId)})`; } return tex ? safeColor(tex.avg) : (color ? safeColor(color) : null); };   /* 質感の塗り：画像（pattern）、無ければ平均色、それも無ければ革色 */
  const groups = doc.layers.filter(l => shapes.some(s => s.layer === l.id)).map(l => {
    const body = shapes.filter(s => s.layer === l.id).map(s => {
      if (s.type === 'text') return `<text x="${f(s.x)}" y="${f(s.y)}" font-size="${f(s.sizeMm)}" font-family="${esc(fontFamily)}" fill="#000" stroke="none" transform="rotate(${f(s.angleDeg)} ${f(s.x)} ${f(s.y)})">${esc(s.text)}</text>`;
      if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return `<path d="M${f(d.a.x)} ${f(d.a.y)}L${f(d.b.x)} ${f(d.b.y)}${d.ext.map(([p, q]) => `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`).join('')}"/><text x="${f(d.textPos.x)}" y="${f(d.textPos.y)}" font-size="2.5" font-family="${esc(fontFamily)}" text-anchor="middle" fill="#000" stroke="none" transform="rotate(${f(d.angleDeg)} ${f(d.textPos.x)} ${f(d.textPos.y)})">${esc(dimText(s, d))}</text>`; }
      if (holeDot > 0 && s.type === 'polyline') { const dl = diamondLoopSizes([s]); if (dl.length) return `<circle id="${safeId(s.id)}" cx="${f(dl[0].x)}" cy="${f(dl[0].y)}" r="${f(holeDot / 2)}" fill="${svgLineHex(s, lineColors, true) || '#000'}" stroke="none"/>`; }   /* 菱の線（取り込んだ図面の菱形）も真ん中の● */
      const d = shapeToSvgD(s), part = fill ? (doc.parts || []).find(p => p.shapeIds.includes(s.id)) : null;
      const texId = fill ? (s.texture || part?.texture || null) : null, tex = texId && textures ? textures[texId] : null; /* 革の質感：図形自身の指定が優先、無ければ部品の指定 */
      if (tex?.href) usedTex.add(texId);
      const fillValue = tex?.href ? `url(#tex-${safeId(texId)})` : fill ? safeColor(tex ? tex.avg : part?.color || s.leather) : null; /* 部品の色が無ければ、型紙（図形自身）に付けた革色 */
      const isDia = s.type === 'polyline' && diamondLoopSizes([s]).length > 0, lineHex = svgLineHex(s, lineColors, isDia), strokeAttr = lineHex ? ` stroke="${lineHex}"` : '';
      const dash = dashArrayMm(s.lineStyle, strokeMm), dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
      return d ? `<path id="${safeId(s.id)}" d="${d}"${strokeAttr}${dashAttr}${fill && (s.closed || s.type === 'circle') ? ` fill="${fillValue}"` : ''}${diamondFill && isDia && !(fill && s.closed) ? ` fill="${lineHex || '#000'}"` : ''}/>` : '';
    }).join('');
    return `<g id="${safeId('layer-' + l.id)}" data-name="${esc(l.name)}">${body}</g>`;
  }).join('');
  const threadHex = h => { if (lineColors === 'mono') return '#000000'; const p = doc.paths.find(p => p.id === h.pathId); return (fill && p && p.threadHex) ? safeColor(p.threadHex, '#e00000') : '#e00000'; };
  const holeGroup = holes.length ? `<g id="holes" data-name="Stitch_Holes" stroke-width="${f(strokeMm)}">${holes.map(h => holeToSvg(h, doc, threadHex(h), diamondFill, holeDot)).join('')}</g>` : '';
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
/** 1 ページ分の印刷用 SVG（viewBox をページ位置に合わせ、重なり部分に合わせ目の十字とページ番号を付ける）。 */
export function pageSvg(doc, page, { pageMm = { w: 190, h: 277 }, overlapMm = 10, calibration = null, label = '', includeHoles = true, fontFamily = 'sans-serif', holeDot = 0 } = {}) {
  const fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const content = docToSvg(doc, { includeHoles, marginMm: 0, fontFamily, holeDot, lineColors: 'paper' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const cross = (x, y) => `<path d="M${f(x - 4)} ${f(y)}L${f(x + 4)} ${f(y)}M${f(x)} ${f(y - 4)}L${f(x)} ${f(y + 4)}" stroke="#888" stroke-width="0.15" fill="none"/>`;
  const marks = [[page.x + overlapMm, page.y + overlapMm], [page.x + pageMm.w - overlapMm, page.y + overlapMm], [page.x + overlapMm, page.y + pageMm.h - overlapMm], [page.x + pageMm.w - overlapMm, page.y + pageMm.h - overlapMm]].map(([x, y]) => cross(x, y)).join('');
  const text = `<text x="${f(page.x + 2)}" y="${f(page.y + pageMm.h - 2)}" font-size="3" font-family="${esc(fontFamily)}" fill="#888">${esc(label)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(pageMm.w * fx)}mm" height="${f(pageMm.h * fy)}mm" viewBox="${f(page.x * fx)} ${f(page.y * fy)} ${f(pageMm.w * fx)} ${f(pageMm.h * fy)}"><g transform="scale(${f(fx)} ${f(fy)})">${content}${marks}${text}</g></svg>`;
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
/** 文書から PDF（Uint8Array）を返す。用紙 A4/A3（landscape 可）、余白 10mm、STEP 5 の分割と印刷補正を反映。文字は ASCII のみ（それ以外は警告に数えて省略）。 */
/** holeDot：0 より大きいと、穴も菱の線も真ん中の●（直径 holeDot mm・塗り）にする（印刷の「縫い穴を点で印刷する」と同じ）。 */
export function docToPdf(doc, { paper = 'a4', landscape = false, marginMm = 10, overlapMm = 10, includeHoles = true, calibration = null, strokeMm = 0.1, holeDot = 0 } = {}) {
  const [pw, ph] = landscape ? [...PAPER[paper] || PAPER.a4].reverse() : (PAPER[paper] || PAPER.a4), fx = calibration?.fx || 1, fy = calibration?.fy || 1;
  const pageMm = { w: pw / PT - 2 * marginMm, h: ph / PT - 2 * marginMm };
  const layerShapes = doc.shapes.filter(s => doc.layers.find(l => l.id === s.layer)?.visible), shapes = layerShapes.filter(s => !s.holeLink), holes = includeHoles ? holesOnShapes(doc, layerShapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const bbox ={ minX: b.minX - 2, minY: b.minY - 2, maxX: b.maxX + 2, maxY: b.maxY + 2 }, layout = pagesFor(bbox, pageMm, overlapMm);
  let skipped = 0;
  const n = v => (Math.round(v * 1000) / 1000).toString();
  const pageContent = page => {
    const X = x => n(((x - page.x) * fx + marginMm) * PT), Y = y => n(ph - ((y - page.y) * fy + marginMm) * PT);
    const ops = [`${n(strokeMm * PT)} w 1 J 1 j`];
    const K = 0.5523, dot = (cx, cy, r) => { const k = r * K; return `${X(cx + r)} ${Y(cy)} m ${X(cx + r)} ${Y(cy + k)} ${X(cx + k)} ${Y(cy + r)} ${X(cx)} ${Y(cy + r)} c ${X(cx - k)} ${Y(cy + r)} ${X(cx - r)} ${Y(cy + k)} ${X(cx - r)} ${Y(cy)} c ${X(cx - r)} ${Y(cy - k)} ${X(cx - k)} ${Y(cy - r)} ${X(cx)} ${Y(cy - r)} c ${X(cx + k)} ${Y(cy - r)} ${X(cx + r)} ${Y(cy - k)} ${X(cx + r)} ${Y(cy)} c f`; };   /* 塗った●（4本の曲線。X・Y に印刷補正が入るので、補正が縦横で違えば●も同じに伸びる） */
    const pathOps = s => {
      if (holeDot > 0 && s.type === 'polyline') { const dl = diamondLoopSizes([s]); if (dl.length) { const rgb = exportHex(s.color) ? hexToRgb01(exportHex(s.color)) : null; const d = dot(dl[0].x, dl[0].y, holeDot / 2); return rgb ? `${rgb.join(' ')} rg ${d} 0 0 0 rg` : d; } }   /* 菱の線は真ん中の● */
      if (s.type === 'text') { if (/[^\x20-\x7e]/.test(s.text)) { skipped++; return ''; } return `BT /F1 ${n(s.sizeMm * PT)} Tf 1 0 0 1 ${X(s.x)} ${Y(s.y)} Tm (${s.text.replace(/[\\()]/g, c => '\\' + c)}) Tj ET`; }
      if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return `${X(d.a.x)} ${Y(d.a.y)} m ${X(d.b.x)} ${Y(d.b.y)} l ${d.ext.map(([p, q]) => `${X(p.x)} ${Y(p.y)} m ${X(q.x)} ${Y(q.y)} l`).join(' ')} S BT /F1 ${n(2.5 * PT)} Tf 1 0 0 1 ${X(d.textPos.x)} ${Y(d.textPos.y)} Tm (${dimTextAscii(s, d).replace(/[\\()]/g, c => '\\' + c)}) Tj ET`; }
      if (s.type === 'fold' || s.type === 'image') return '';
      const pts = flattenShape(s, 0.02); if (pts.length < 2) return '';
      const rgb = exportHex(s.color) ? hexToRgb01(exportHex(s.color)) : null;
      const colorOn = rgb ? `${rgb.join(' ')} RG ` : '', colorOff = rgb ? ' 0 0 0 RG' : '';
      const dashOn = s.lineStyle === 'dashed' ? `[${n(3 * PT)} ${n(2 * PT)}] 0 d ` : '', dashOff = s.lineStyle === 'dashed' ? ' [] 0 d' : '';
      return `${colorOn}${dashOn}${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')}${s.closed || s.type === 'circle' ? ' h' : ''} S${dashOff}${colorOff}`;
    };
    for (const s of shapes) ops.push(pathOps(s));
    ops.push('1 0 0 RG'); if (holeDot > 0) ops.push('1 0 0 rg');
    for (const h of holes) { const a = holeAppearance(h, doc); if (!a) continue; if (holeDot > 0) { ops.push(dot(h.x, h.y, holeDot / 2)); continue; } if (a.kind === 'dot' || a.kind === 'circle') { const r = a.width / 2, pts = Array.from({ length: 17 }, (_, i) => ({ x: h.x + r * Math.cos(i / 8 * Math.PI), y: h.y + r * Math.sin(i / 8 * Math.PI) })); ops.push(`${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')} S`); } else { const local = a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }]; const pts = local.map(p => { const q = rotate(p, h.angleDeg); return { x: q.x + h.x, y: q.y + h.y }; }); ops.push(`${X(pts[0].x)} ${Y(pts[0].y)} m ${pts.slice(1).map(p => `${X(p.x)} ${Y(p.y)} l`).join(' ')}${a.kind === 'slit' ? '' : ' h'} S`); } }
    ops.push('0 0 0 RG'); if (holeDot > 0) ops.push('0 0 0 rg');
    // 合わせ目の十字
    for (const [x, y] of [[page.x + overlapMm, page.y + overlapMm], [page.x + pageMm.w - overlapMm, page.y + overlapMm], [page.x + overlapMm, page.y + pageMm.h - overlapMm], [page.x + pageMm.w - overlapMm, page.y + pageMm.h - overlapMm]]) ops.push(`${X(x - 4)} ${Y(y)} m ${X(x + 4)} ${Y(y)} l ${X(x)} ${Y(y - 4)} m ${X(x)} ${Y(y + 4)} l S`);
    return ops.filter(Boolean).join('\n');
  };
  const objects = [];
  const add = body => { objects.push(body); return objects.length; };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pagesId = objects.length + 1; objects.push(null);
  const pageIds = layout.pages.map(page => { const content = pageContent(page); const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${n(pw)} ${n(ph)}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${cId} 0 R >>`); });
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offsets = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return Object.assign(bytes, { pages: layout.pages.length, skippedText: skipped });
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
