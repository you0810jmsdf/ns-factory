// 取り込み（SVG・DXF）。純粋関数のみ。SVG は自前の軽量 XML 字句解析（DOM に挿入しない）。内部は Y 下向き・mm。
import { arcSweep } from './geometry.js';

const EPS_I = 1e-9;
// ---- 行列（a b c d e f：x' = a x + c y + e, y' = b x + d y + f）----
const I = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, p) => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
/** SVG の transform 属性を行列にする（translate/scale/rotate/matrix/skewX/skewY）。 */
export function parseTransform(str) {
  let m = [...I];
  for (const [, name, args] of String(str || '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
    let t = [...I];
    if (name === 'translate') t = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (name === 'scale') t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
    else if (name === 'rotate') { const a = (v[0] || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); t = [c, s, -s, c, 0, 0]; if (v.length >= 3) t = mul(mul([1, 0, 0, 1, v[1], v[2]], t), [1, 0, 0, 1, -v[1], -v[2]]); }
    else if (name === 'matrix' && v.length === 6) t = v;
    else if (name === 'skewX') t = [1, 0, Math.tan((v[0] || 0) * Math.PI / 180), 1, 0, 0];
    else if (name === 'skewY') t = [1, Math.tan((v[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
    m = mul(m, t);
  }
  return m;
}
/** 長さの文字列を mm に換算（mm/cm/in/pt/pc/px=96dpi・単位なしは px）。 */
export function lengthToMm(str) {
  const m = String(str ?? '').trim().match(/^([-\d.e+]+)\s*(mm|cm|in|pt|pc|px)?$/i); if (!m) return null;
  const v = Number(m[1]), u = (m[2] || 'px').toLowerCase(); return { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96 }[u] * v;
}
// ---- 軽量 XML 字句解析（要素・属性・入れ子だけ。テキストは <text> 用に拾う）----
function parseXml(text) {
  const root = { name: 'root', attrs: {}, children: [], text: '' }, stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  for (const m of text.matchAll(re)) {
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    if (m[2]) {
      const attrs = {}; for (const a of (m[3] || '').matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = (a[2] ?? a[3]).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const el = { name: m[2].replace(/^.*:/, ''), attrs, children: [], text: '' }; stack.at(-1).children.push(el); if (!m[4]) stack.push(el); continue;
    }
    if (m[5] && stack.length > 1) stack.at(-1).text += m[5].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return root;
}
// ---- path d の解析 ----
function tokens(d) { return [...String(d).matchAll(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)].map(m => m[0]); }
/** SVG の円弧（端点表記）を中心表記に変換（仕様 F.6・半径補正込み）。戻り値 {cx,cy,rx,ry,phi,theta1,dtheta} または null（退化）。 */
export function arcEndpointToCenter(p1, p2, rx, ry, phiDeg, largeArc, sweep) {
  rx = Math.abs(rx); ry = Math.abs(ry); if (rx < EPS_I || ry < EPS_I || (Math.abs(p1.x - p2.x) < EPS_I && Math.abs(p1.y - p2.y) < EPS_I)) return null;
  const phi = phiDeg * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi), dx = (p1.x - p2.x) / 2, dy = (p1.y - p2.y) / 2;
  const x1 = c * dx + s * dy, y1 = -s * dx + c * dy, lambda = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const sign = largeArc !== sweep ? 1 : -1, num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = sign * Math.sqrt(Math.max(0, num / den)), cx1 = k * rx * y1 / ry, cy1 = -k * ry * x1 / rx;
  const cx = c * cx1 - s * cy1 + (p1.x + p2.x) / 2, cy = s * cx1 + c * cy1 + (p1.y + p2.y) / 2;
  const ang = (ux, uy, vx, vy) => { const d = ux * vx + uy * vy, l = Math.hypot(ux, uy) * Math.hypot(vx, vy); let a = Math.acos(Math.max(-1, Math.min(1, d / l))); if (ux * vy - uy * vx < 0) a = -a; return a; };
  const theta1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry); let dtheta = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI; else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  return { cx, cy, rx, ry, phi: phiDeg, theta1: theta1 * 180 / Math.PI, dtheta: dtheta * 180 / Math.PI };
}
/** 楕円弧（中心表記）を 3 次ベジェ列に変換（90° ごと）。 */
function ellipseArcToBeziers(a) {
  const out = [], n = Math.max(1, Math.ceil(Math.abs(a.dtheta) / 90 - 1e-9)), step = a.dtheta / n, phi = a.phi * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
  const pt = (t) => { const x = a.rx * Math.cos(t), y = a.ry * Math.sin(t); return { x: a.cx + c * x - s * y, y: a.cy + s * x + c * y }; };
  const dpt = (t) => { const x = -a.rx * Math.sin(t), y = a.ry * Math.cos(t); return { x: c * x - s * y, y: s * x + c * y }; };
  for (let i = 0; i < n; i++) {
    const t0 = (a.theta1 + step * i) * Math.PI / 180, t1 = t0 + step * Math.PI / 180, k = 4 / 3 * Math.tan((t1 - t0) / 4), p0 = pt(t0), p3 = pt(t1), d0 = dpt(t0), d1 = dpt(t1);
    out.push({ type: 'bezier', x1: p0.x, y1: p0.y, c1x: p0.x + k * d0.x, c1y: p0.y + k * d0.y, c2x: p3.x - k * d1.x, c2y: p3.y - k * d1.y, x2: p3.x, y2: p3.y });
  }
  return out;
}
/** path の d 文字列から図形配列（line／bezier／polyline）を返す。座標はそのまま（呼び出し側で変換）。 */
export function parsePathD(d) {
  const tk = tokens(d), out = []; let i = 0, cmd = '', cur = { x: 0, y: 0 }, start = { x: 0, y: 0 }, lastC = null, lastQ = null, poly = null;
  const num = () => Number(tk[i++]);
  const flush = () => { if (poly && poly.points.length === 2) out.push({ type: 'line', x1: poly.points[0].x, y1: poly.points[0].y, x2: poly.points[1].x, y2: poly.points[1].y }); else if (poly && poly.points.length > 2) out.push({ type: 'polyline', points: poly.points, closed: false }); poly = null; };
  const lineTo = p => { if (!poly) poly = { points: [{ ...cur }] }; poly.points.push({ ...p }); cur = p; lastC = lastQ = null; };
  const curveTo = (c1, c2, p) => { flush(); out.push({ type: 'bezier', x1: cur.x, y1: cur.y, c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x2: p.x, y2: p.y }); cur = p; lastC = c2; lastQ = null; };
  while (i < tk.length) {
    const t = tk[i]; if (/^[A-Za-z]$/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { if (poly && (Math.abs(poly.points[0].x - start.x) > EPS_I || Math.abs(poly.points[0].y - start.y) > EPS_I)) { if (Math.abs(cur.x - start.x) > EPS_I || Math.abs(cur.y - start.y) > EPS_I) lineTo({ ...start }); flush(); } else if (poly) { const pts = poly.points; poly = null; while (pts.length > 1 && Math.abs(pts.at(-1).x - start.x) < EPS_I && Math.abs(pts.at(-1).y - start.y) < EPS_I) pts.pop(); if (pts.length >= 3) out.push({ type: 'polyline', points: pts, closed: true }); else if (pts.length === 2) out.push({ type: 'line', x1: pts[0].x, y1: pts[0].y, x2: pts[1].x, y2: pts[1].y }); } else if (Math.abs(cur.x - start.x) > EPS_I || Math.abs(cur.y - start.y) > EPS_I) out.push({ type: 'line', x1: cur.x, y1: cur.y, x2: start.x, y2: start.y }); cur = { ...start }; lastC = lastQ = null; continue; } }
    const rel = cmd === cmd.toLowerCase(), c = cmd.toUpperCase(), base = rel ? cur : { x: 0, y: 0 };
    if (c === 'M') { flush(); const p = { x: base.x + num(), y: base.y + num() }; cur = p; start = p; lastC = lastQ = null; cmd = rel ? 'l' : 'L'; }
    else if (c === 'L') lineTo({ x: base.x + num(), y: base.y + num() });
    else if (c === 'H') lineTo({ x: base.x + num(), y: cur.y });
    else if (c === 'V') lineTo({ x: cur.x, y: base.y + num() });
    else if (c === 'C') { const c1 = { x: base.x + num(), y: base.y + num() }, c2 = { x: base.x + num(), y: base.y + num() }, p = { x: base.x + num(), y: base.y + num() }; curveTo(c1, c2, p); }
    else if (c === 'S') { const c1 = lastC ? { x: 2 * cur.x - lastC.x, y: 2 * cur.y - lastC.y } : { ...cur }, c2 = { x: base.x + num(), y: base.y + num() }, p = { x: base.x + num(), y: base.y + num() }; curveTo(c1, c2, p); }
    else if (c === 'Q' || c === 'T') { let q; if (c === 'Q') q = { x: base.x + num(), y: base.y + num() }; else q = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : { ...cur }; const p = { x: base.x + num(), y: base.y + num() }; const c1 = { x: cur.x + 2 / 3 * (q.x - cur.x), y: cur.y + 2 / 3 * (q.y - cur.y) }, c2 = { x: p.x + 2 / 3 * (q.x - p.x), y: p.y + 2 / 3 * (q.y - p.y) }; curveTo(c1, c2, p); lastQ = q; }
    else if (c === 'A') { const flag = () => { const tkn = tk[i]; if (/^[01]/.test(tkn) && tkn.length > 1 && !/[.eE]/.test(tkn)) tk.splice(i, 1, tkn[0], tkn.slice(1)); return !!num(); }; const rx = num(), ry = num(), phi = num(), large = flag(), sweep = flag(), p = { x: base.x + num(), y: base.y + num() }; const arc = arcEndpointToCenter(cur, p, rx, ry, phi, large, sweep); flush(); if (!arc) out.push({ type: 'line', x1: cur.x, y1: cur.y, x2: p.x, y2: p.y }); else if (Math.abs(arc.rx - arc.ry) < 1e-6 && Math.abs(arc.phi) < EPS_I) out.push({ type: 'arc', cx: arc.cx, cy: arc.cy, r: arc.rx, startDeg: arc.dtheta >= 0 ? arc.theta1 : arc.theta1 + arc.dtheta, endDeg: arc.dtheta >= 0 ? arc.theta1 + arc.dtheta : arc.theta1 }); else out.push(...ellipseArcToBeziers(arc)); cur = p; lastC = lastQ = null; }
    else { i++; }
  }
  flush(); return out;
}
/** 図形に行列を適用（非一様変換は円・円弧をベジェへ）。 */
function transformShape(s, m) {
  const tolU = 1e-6 * Math.max(1, Math.abs(m[0]), Math.abs(m[3])), uniform = Math.abs(m[0] - m[3]) < tolU && Math.abs(m[1] + m[2]) < tolU, mirror = Math.abs(m[0] + m[3]) < tolU && Math.abs(m[1] - m[2]) < tolU, scale = Math.hypot(m[0], m[1]);
  if (s.type === 'circle' || s.type === 'arc') {
    if (!uniform && !mirror) { const a = { cx: s.cx, cy: s.cy, rx: s.r, ry: s.r, phi: 0, theta1: s.type === 'arc' ? s.startDeg : 0, dtheta: s.type === 'arc' ? arcSweep(s) : 360 }; return ellipseArcToBeziers(a).flatMap(b => transformShape(b, m)); }
    const c = apply(m, { x: s.cx, y: s.cy }); if (s.type === 'circle') return [{ ...s, cx: c.x, cy: c.y, r: s.r * scale }];
    const p0 = apply(m, { x: s.cx + s.r * Math.cos(s.startDeg * Math.PI / 180), y: s.cy + s.r * Math.sin(s.startDeg * Math.PI / 180) }), p1 = apply(m, { x: s.cx + s.r * Math.cos((s.startDeg + arcSweep(s)) * Math.PI / 180), y: s.cy + s.r * Math.sin((s.startDeg + arcSweep(s)) * Math.PI / 180) });
    let a0 = Math.atan2(p0.y - c.y, p0.x - c.x) * 180 / Math.PI, a1 = Math.atan2(p1.y - c.y, p1.x - c.x) * 180 / Math.PI;
    if (mirror) [a0, a1] = [a1, a0];
    if (s.type === 'arc' && arcSweep(s) >= 360 - 1e-9) a1 = a0 + 360; // 全周の円弧は長さ 0 にしない
    return [{ ...s, cx: c.x, cy: c.y, r: s.r * scale, startDeg: a0, endDeg: a1 }];
  }
  if (s.type === 'line') { const a = apply(m, { x: s.x1, y: s.y1 }), b = apply(m, { x: s.x2, y: s.y2 }); return [{ ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }]; }
  if (s.type === 'bezier') { const q = ['x1', 'c1x', 'c2x', 'x2'].map((k, i) => apply(m, { x: s[k], y: s[['y1', 'c1y', 'c2y', 'y2'][i]] })); return [{ ...s, x1: q[0].x, y1: q[0].y, c1x: q[1].x, c1y: q[1].y, c2x: q[2].x, c2y: q[2].y, x2: q[3].x, y2: q[3].y }]; }
  if (s.type === 'polyline') return [{ ...s, points: s.points.map(p => apply(m, p)) }];
  if (s.type === 'text') { const p = apply(m, { x: s.x, y: s.y }); return [{ ...s, x: p.x, y: p.y, sizeMm: s.sizeMm * scale, angleDeg: s.angleDeg + Math.atan2(m[1], m[0]) * 180 / Math.PI }]; }
  return [s];
}
/** SVG 文字列から図形配列（mm・Y 下向き）と情報 {shapes, layers, warnings} を返す。 */
export function svgToShapes(text, { defaultLayer = 'pattern' } = {}) {
  const root = parseXml(text), svg = root.children.find(e => e.name === 'svg'); if (!svg) return { shapes: [], layers: [], warnings: ['no-svg'] };
  const warnings = [], shapes = [], layers = new Set();
  const vb = (svg.attrs.viewBox || '').split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const wMm = lengthToMm(svg.attrs.width), hMm = lengthToMm(svg.attrs.height);
  let base = [...I];
  // viewBox のユーザー座標をそのまま mm に換算する（原点は動かさない。自前の SVG を読み戻すと内部座標が一致する）
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { const sx = wMm ? wMm / vb[2] : 25.4 / 96, sy = hMm ? hMm / vb[3] : sx; base = [sx, 0, 0, sy, 0, 0]; }
  else { const k = 25.4 / 96; base = [k, 0, 0, k, 0, 0]; if (!wMm) warnings.push('no-size'); }
  const walk = (el, m, layer) => {
    for (const ch of el.children) {
      const mm = mul(m, parseTransform(ch.attrs.transform)), id = ch.attrs.id, lay = ch.name === 'g' && id ? id.replace(/^layer-/, '') : layer;
      if (ch.name === 'g' && id) layers.add(lay);
      const a = ch.attrs, n = k => Number(a[k] ?? 0); let local = [];
      if (ch.name === 'path') local = parsePathD(a.d || '');
      else if (ch.name === 'line') local = [{ type: 'line', x1: n('x1'), y1: n('y1'), x2: n('x2'), y2: n('y2') }];
      else if (ch.name === 'rect') { const x = n('x'), y = n('y'), w = n('width'), h = n('height'); if (w > 0 && h > 0) local = [{ type: 'polyline', closed: true, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] }]; }
      else if (ch.name === 'circle') { if (n('r') > 0) local = [{ type: 'circle', cx: n('cx'), cy: n('cy'), r: n('r') }]; }
      else if (ch.name === 'ellipse') { const rx = n('rx'), ry = n('ry'); if (rx > 0 && ry > 0) local = ellipseArcToBeziers({ cx: n('cx'), cy: n('cy'), rx, ry, phi: 0, theta1: 0, dtheta: 360 }); }
      else if (ch.name === 'polyline' || ch.name === 'polygon') { const v = (a.points || '').split(/[\s,]+/).filter(Boolean).map(Number); const pts = []; for (let k = 0; k + 1 < v.length; k += 2) pts.push({ x: v[k], y: v[k + 1] }); if (pts.length >= 2) local = [{ type: 'polyline', closed: ch.name === 'polygon', points: pts }]; }
      else if (ch.name === 'text') { const txt = (ch.text + ch.children.map(c => c.text).join('')).trim(); if (txt) local = [{ type: 'text', x: n('x'), y: n('y'), text: txt, sizeMm: Number(a['font-size']) || 4, angleDeg: 0 }]; }
      for (const s of local) for (const t of transformShape(s, mm)) shapes.push({ ...t, layer: lay });
      if (ch.children.length && ch.name !== 'text') walk(ch, mm, lay);
    }
  };
  walk(svg, base, defaultLayer);
  return { shapes, layers: [...layers], warnings };
}

// ---- DXF（ASCII・R12〜2018）----
const dxfPairs = text => { const lines = text.split(/\r?\n/), pairs = []; for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([lines[i].trim(), lines[i + 1].trim()]); return pairs; };
function readEntity(pairs, k) { const e = { _multi: {} }; while (k.i < pairs.length && pairs[k.i][0] !== '0') { const [c, v] = pairs[k.i++]; if (c === '42') (e._multi['42_index'] = e._multi['42_index'] || []).push((e._multi['10'] || []).length - 1); (e._multi[c] = e._multi[c] || []).push(v); if (!(c in e)) e[c] = v; } return e; }
/** bulge 付きの折れ線を線分と円弧に展開する。 */
function bulgePolyline(pts, bulges, closed) {
  const out = [], n = closed ? pts.length : pts.length - 1; let plain = [];
  const flushPlain = () => { if (plain.length >= 2) out.push({ type: 'polyline', closed: false, points: plain }); plain = []; };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], bulge = bulges[i] || 0;
    if (Math.abs(bulge) < 1e-12) { if (!plain.length) plain.push({ ...a }); plain.push({ ...b }); continue; }
    flushPlain();
    const theta = 4 * Math.atan(bulge), d = Math.hypot(b.x - a.x, b.y - a.y), r = d / (2 * Math.sin(Math.abs(theta) / 2)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const h = d * (1 - bulge * bulge) / (4 * bulge), nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d; // 弦の左法線方向の符号付き距離（|bulge|>1 は反対側）
    const cx = mx + nx * h, cy = my + ny * h; // DXF（Y 上向き）：bulge 正は反時計回り
    const a0 = Math.atan2(a.y - cy, a.x - cx) * 180 / Math.PI, a1 = Math.atan2(b.y - cy, b.x - cx) * 180 / Math.PI;
    out.push({ type: 'arc', cx, cy, r, startDeg: bulge > 0 ? a0 : a1, endDeg: bulge > 0 ? a1 : a0, _ccw: true });
  }
  flushPlain();
  if (closed && out.length === 1 && out[0].type === 'polyline' && bulges.every(b => !b)) { out[0].closed = true; out[0].points = out[0].points.slice(0, -1); }
  return out;
}
/** B スプライン（制御点・ノット・次数）を de Boor で等間隔にサンプルして折れ線にする。 */
export function sampleSpline(ctrl, knots, degree, samples = 64) {
  const n = ctrl.length - 1; if (n < degree || !knots.length) return ctrl.map(p => ({ ...p }));
  const deBoor = (u) => {
    let k = knots.findIndex((kv, idx) => idx >= degree && idx <= n && u >= kv && u < knots[idx + 1]); if (k < 0) k = n;
    const d = []; for (let j = 0; j <= degree; j++) d.push({ ...ctrl[j + k - degree] });
    for (let r = 1; r <= degree; r++) for (let j = degree; j >= r; j--) { const i = j + k - degree, den = knots[i + degree - r + 1] - knots[i], alpha = den ? (u - knots[i]) / den : 0; d[j] = { x: (1 - alpha) * d[j - 1].x + alpha * d[j].x, y: (1 - alpha) * d[j - 1].y + alpha * d[j].y }; }
    return d[degree];
  };
  const u0 = knots[degree], u1 = knots[n + 1], pts = [];
  for (let i = 0; i <= samples; i++) pts.push(deBoor(u0 + (u1 - u0) * i / samples - (i === samples ? 1e-12 : 0)));
  return pts;
}
/** DXF 文字列から図形配列（mm・Y 下向きに変換）と情報 {shapes, units, warnings} を返す。LINE/CIRCLE/ARC/LWPOLYLINE/POLYLINE/SPLINE/TEXT/MTEXT/INSERT（BLOCK 展開）。 */
export function dxfToShapesFull(text, { assumeUnits = 'mm' } = {}) {
  const pairs = dxfPairs(text), k = { i: 0 }, shapes = [], warnings = [], blocks = new Map(); let section = '', units = null, blockName = null, blockBase = { x: 0, y: 0 };
  const unitScale = u => ({ 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 8: 2.54e-5, 9: 0.0254 }[u] ?? null);
  const entities = [];
  while (k.i < pairs.length) {
    const [c, v] = pairs[k.i++]; if (c !== '0' && c !== '9') continue;
    if (c === '9') { if (v === '$INSUNITS' && pairs[k.i] && pairs[k.i][0] === '70') units = Number(pairs[k.i][1]); continue; }
    if (v === 'SECTION') { const [, name] = pairs[k.i] || []; section = name; continue; }
    if (v === 'ENDSEC') { section = ''; continue; }
    if (section === 'BLOCKS' && v === 'BLOCK') { const e = readEntity(pairs, k); blockName = e['2']; blockBase = { x: Number(e['10'] || 0), y: Number(e['20'] || 0) }; blocks.set(blockName, { base: blockBase, entities: [] }); continue; }
    if (section === 'BLOCKS' && v === 'ENDBLK') { blockName = null; continue; }
    if (section !== 'ENTITIES' && section !== 'BLOCKS') continue;
    if (['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE', 'SPLINE', 'TEXT', 'MTEXT', 'INSERT', 'POINT'].includes(v)) {
      const e = readEntity(pairs, k); e._type = v;
      if (v === 'POLYLINE') { e._vertices = []; while (k.i < pairs.length && pairs[k.i][1] === 'VERTEX') { k.i++; e._vertices.push(readEntity(pairs, k)); } if (k.i < pairs.length && pairs[k.i][1] === 'SEQEND') { k.i++; readEntity(pairs, k); } }
      (blockName ? blocks.get(blockName).entities : entities).push(e);
    }
  }
  const scale = unitScale(units) ?? (assumeUnits === 'mm' ? 1 : 25.4); if (units === null) warnings.push('units-assumed');
  const convert = (e, m) => {
    const P = (x, y) => apply(m, { x: Number(x), y: Number(y) }), layer = e['8'] || 'pattern', out = [];
    const flip = s => { // Y 上向き → 下向き。円弧は方向が逆転するので始終角を入れ替える。
      if (s.type === 'line') return { ...s, y1: -s.y1, y2: -s.y2 }; if (s.type === 'circle') return { ...s, cy: -s.cy };
      if (s.type === 'arc') return { ...s, cy: -s.cy, startDeg: -s.endDeg, endDeg: -s.startDeg }; if (s.type === 'polyline') return { ...s, points: s.points.map(p => ({ x: p.x, y: -p.y })) };
      if (s.type === 'text') return { ...s, y: -s.y, angleDeg: -s.angleDeg }; if (s.type === 'bezier') return { ...s, y1: -s.y1, c1y: -s.c1y, c2y: -s.c2y, y2: -s.y2 }; return s;
    };
    const sc = Math.hypot(m[0], m[1]);
    if (e._type === 'LINE') { const a = P(e['10'], e['20']), b = P(e['11'], e['21']); out.push({ type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    else if (e._type === 'CIRCLE') { const c = P(e['10'], e['20']); out.push({ type: 'circle', cx: c.x, cy: c.y, r: Number(e['40']) * sc }); }
    else if (e._type === 'ARC') { const c = P(e['10'], e['20']), rot = Math.atan2(m[1], m[0]) * 180 / Math.PI; out.push({ type: 'arc', cx: c.x, cy: c.y, r: Number(e['40']) * sc, startDeg: Number(e['50']) + rot, endDeg: Number(e['51']) + rot, _ccw: true }); }
    else if (e._type === 'LWPOLYLINE') { const xs = e._multi['10'] || [], ys = e._multi['20'] || [], bs = e._multi['42'] || []; const pts = xs.map((x, i) => P(x, ys[i])); const closed = (Number(e['70'] || 0) & 1) === 1; const bulges = xs.map(() => 0); (e._multi['42'] || []).forEach((v, k) => { const idx = (e._multi['42_index'] || [])[k]; if (idx >= 0 && idx < bulges.length) bulges[idx] = Number(v) || 0; });
      // bulge は頂点ごとの順序で並ぶが、省略された頂点もあるため 42 の出現位置を 10 の順で対応させる
      const bulgeByVertex = []; let vi = -1; for (let j = 0; j < pairs.length; j++) break; // 位置対応は readEntity では失われるため簡易：42 が頂点数と同数のときだけ採用
      if (bs.length === xs.length) bulgeByVertex.push(...bs.map(Number)); else bulgeByVertex.push(...xs.map(() => 0));
      out.push(...bulgePolyline(pts, bulgeByVertex, closed)); void bulges; }
    else if (e._type === 'POLYLINE') { const pts = e._vertices.map(v => P(v['10'], v['20'])), bulges = e._vertices.map(v => Number(v['42'] || 0)), closed = (Number(e['70'] || 0) & 1) === 1; if (pts.length >= 2) out.push(...bulgePolyline(pts, bulges, closed)); }
    else if (e._type === 'SPLINE') { const xs = e._multi['10'] || [], ys = e._multi['20'] || [], knots = (e._multi['40'] || []).map(Number), degree = Number(e['71'] || 3); const ctrl = xs.map((x, i) => P(x, ys[i])); const pts = sampleSpline(ctrl, knots, degree); if (pts.length >= 2) out.push({ type: 'polyline', closed: false, points: pts }); }
    else if (e._type === 'TEXT' || e._type === 'MTEXT') { const p = P(e['10'], e['20']); const txt = (e._type === 'MTEXT' ? (e._multi['3'] || []).join('') + (e['1'] || '') : (e['1'] || '')).replace(/\\P/g, ' ').replace(/\{[^}]*\}|\\[A-Za-z][^;]*;/g, ''); if (txt) out.push({ type: 'text', x: p.x, y: p.y, text: txt, sizeMm: Number(e['40'] || 2.5) * sc, angleDeg: Number(e['50'] || 0) + Math.atan2(m[1], m[0]) * 180 / Math.PI }); }
    else if (e._type === 'INSERT') { const b = blocks.get(e['2']); if (!b) { warnings.push('block-missing:' + e['2']); return []; } const ins = { x: Number(e['10'] || 0), y: Number(e['20'] || 0) }, sx = Number(e['41'] || 1), sy = Number(e['42'] || 1), rot = Number(e['50'] || 0) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot); const local = mul(mul([1, 0, 0, 1, ins.x, ins.y], [cr, sr, -sr, cr, 0, 0]), mul([sx, 0, 0, sy, 0, 0], [1, 0, 0, 1, -b.base.x, -b.base.y])); const mm2 = mul(m, local); /* 単位換算は m の 1 回だけ */ for (const be of b.entities) out.push(...convert(be, mm2).map(s => ({ ...s, _flipped: true }))); return out.map(s => ({ ...s, layer: s.layer || layer })); }
    return out.map(s => ({ ...(s._flipped ? s : flip(s)), layer })).map(s => { const { _ccw, _flipped, ...rest } = s; void _ccw; void _flipped; return rest; });
  };
  const m = [scale, 0, 0, scale, 0, 0];
  for (const e of entities) shapes.push(...convert(e, m));
  return { shapes, units, warnings };
}
