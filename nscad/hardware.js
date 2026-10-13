// 金具ライブラリ：寸法パラメータから 2D の外形記号・取り付け穴・3D 簡易立体を作る。純粋関数。
// 式（"innerW+2*wireD" など）は params を使った四則だけを許す安全な評価器で解く。
import { rotate } from './geometry.js';

/** params を使う四則の式を解く（数値・+ - * / ( ) ・識別子のみ。eval 禁止）。 */
export function evalExpr(expr, params = {}) {
  if (typeof expr === 'number') return expr;
  const s = String(expr).replace(/\s+/g, ''); if (!/^[\w.+\-*/()]+$/.test(s)) throw new Error('expr');
  let i = 0;
  const peek = () => s[i], num = () => { const m = s.slice(i).match(/^(\d+(?:\.\d+)?|[A-Za-z_]\w*)/); if (!m) throw new Error('expr'); i += m[0].length; if (/^[A-Za-z_]/.test(m[0])) { if (!(m[0] in params) || !Number.isFinite(params[m[0]])) throw new Error('param:' + m[0]); return params[m[0]]; } return Number(m[0]); };
  const factor = () => { if (peek() === '(') { i++; const v = expr3(); if (s[i++] !== ')') throw new Error('expr'); return v; } if (peek() === '-') { i++; return -factor(); } return num(); };
  const term = () => { let v = factor(); while (peek() === '*' || peek() === '/') { const op = s[i++], r = factor(); v = op === '*' ? v * r : v / r; } return v; };
  const expr3 = () => { let v = term(); while (peek() === '+' || peek() === '-') { const op = s[i++], r = term(); v = op === '+' ? v + r : v - r; } return v; };
  const v = expr3(); if (i !== s.length) throw new Error('expr'); return v;
}
/** リングの線径（mm）。平面・正面の棒の幅・側面の輪の太さ・3D のワイヤの太さがこれ。 */
const BINDER_WIRE_MM = 2;
/** 内径・外径のどちらからでも寸法をそろえる。両方あれば、その差を優先する。 */
export function ringSizeOf(spec, entry) {
  const o = typeof entry === 'number' ? spec?.rings?.options?.find(o => o.innerDiameterMm === entry || Math.round(ringSizeOf(null, o).inner * 10) / 10 === entry) || { innerDiameterMm: entry } : entry || {};
  const hasI = Number.isFinite(o.innerDiameterMm), hasO = Number.isFinite(o.outerDiameterMm), hasW = Number.isFinite(o.wireDiameterMm), source = hasI && hasO ? 'both' : hasO ? 'outer' : 'inner';
  const wire = hasI && hasO ? (o.outerDiameterMm - o.innerDiameterMm) / 2 : hasW ? o.wireDiameterMm : BINDER_WIRE_MM;
  const inner = hasI ? o.innerDiameterMm : hasO ? o.outerDiameterMm - wire * 2 : NaN, outer = hasO ? o.outerDiameterMm : inner + wire * 2;
  const wireSource = o.wireSource === 'assumed' ? 'assumed' : (hasI && hasO) || hasW ? 'measured' : 'assumed';
  return { inner, outer, wire, source, wireSource, ...(hasI && hasO && hasW && Math.abs(wire - o.wireDiameterMm) > 0.2 + 1e-9 ? { mismatch: true } : {}) };
}
/** 内径に合う線径。図も立体も同じ寸法を使う。 */
export function wireOf(spec, I) { return ringSizeOf(spec, I).wire; }
/** 古い台座も同じ断面の寸法へ読み替える。 */
export function binderBase(spec) { const p = spec.plate || {}, b = spec.base || {}; return { ...b, lengthMm: b.lengthMm ?? p.lengthMm, sectionWidthMm: b.sectionWidthMm ?? p.widthMm, crownHeightMm: b.crownHeightMm ?? p.thicknessMm, thicknessMm: b.thicknessMm ?? p.thicknessMm, cornerRMm: b.cornerRMm ?? p.cornerRMm, crownRadiusMm: b.crownRadiusMm ?? 0, edgeRadiusMm: b.edgeRadiusMm ?? 0 }; }
/** 台座の頂上で測った、左右のリングの根元どうしの距離。 */
export function binderRingBaseSpan(R, e) { return e <= 0 ? 0 : e >= R ? 2 * R : 2 * Math.sqrt(2 * R * e - e * e); }
const roundRect = (w, h, r) => { const pts = [], n = 4, R = Math.min(r || 0, w / 2, h / 2); if (R <= 0) return [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }]; const corners = [[w / 2 - R, h / 2 - R, 0], [-w / 2 + R, h / 2 - R, 90], [-w / 2 + R, -h / 2 + R, 180], [w / 2 - R, -h / 2 + R, 270]]; for (const [cx, cy, a0] of corners) for (let k = 0; k <= n; k++) { const a = (a0 + 90 * k / n) * Math.PI / 180; pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }); } return pts; };
/** 金具 1 件と上書きパラメータから、ローカル座標（中心 0,0）の {outline:[shape], holes:[shape], solid} を返す。binder は spec（data/binder）が要る。 */
export function hardwareFootprint(item, overrides = {}, binderSpec = null) {
  const p = { ...item.params, ...overrides }, E = x => evalExpr(x, p), fp = item.footprint2d, outline = [], holes = [];
  if (fp.kind === 'circle') outline.push({ type: 'circle', cx: 0, cy: 0, r: E(fp.d) / 2 });
  else if (fp.kind === 'rect') outline.push({ type: 'polyline', closed: true, points: roundRect(E(fp.w), E(fp.h), fp.r !== undefined ? E(fp.r) : 0) });
  else if (fp.kind === 'dring') { const w = E(fp.w), d = E(fp.wireD), h = w * 0.6; const pts = [{ x: -w / 2 - d, y: -h / 2 - d }, { x: w / 2 + d, y: -h / 2 - d }]; for (let k = 0; k <= 8; k++) { const a = (-90 + 180 * k / 8) * Math.PI / 180; pts.push({ x: w / 2 + d + 0 + (h / 2 + d) * Math.cos(a) * 0.0 + 0, y: 0 }); } outline.push({ type: 'polyline', closed: true, points: roundRect(w + 2 * d, h + 2 * d, (h + 2 * d) / 2) }); }
  else if (fp.kind === 'zipper') { const L = E(fp.len), tw = E(fp.tapeW), ew = E(fp.elementW); outline.push({ type: 'polyline', closed: true, points: roundRect(L, tw, 0) }, { type: 'line', x1: -L / 2, y1: -ew / 2, x2: L / 2, y2: -ew / 2 }, { type: 'line', x1: -L / 2, y1: ew / 2, x2: L / 2, y2: ew / 2 }); }
  else if (fp.kind === 'binder') {
    if (!binderSpec) throw new Error('binderSpec');
    const base = binderBase(binderSpec), L = base.lengthMm, W = base.sectionWidthMm, ringD = p.ringD || binderSpec.rings.diameterOptionsMm[0], v = binderViews(binderSpec, ringD), xs = v.ringXs;
    outline.push({ type: 'polyline', closed: true, points: roundRect(L, W, base.cornerRMm || 0) });
    for (const r of v.plan.rings) { const w = r.maxX - r.minX, h = r.maxY - r.minY, cx = (r.minX + r.maxX) / 2, cy = (r.minY + r.maxY) / 2; outline.push({ type: 'polyline', closed: true, points: roundRect(w, h, Math.min(w, h) / 2).map(q => ({ x: q.x + cx, y: q.y + cy })) }); } /* リングは真上から見た細い棒（線径×外径）。両端は線径の半分の半径で丸める（線径に自動で追従） */
    for (const q of v.plan.parts) { const b = q.box; outline.push(q.shape === 'circle' ? { type: 'circle', cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, r: q.r } : { type: 'polyline', closed: true, points: [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }] }); } /* 開閉機構の部品：レバーは四角・ボタンは円 */
    for (const rv of binderSpec.rivets) holes.push({ type: 'circle', cx: rv.xMm, cy: rv.yMm, r: rv.dMm / 2 });
    return { outline, holes, solid: { kind: 'binder', spec: binderSpec, ringD, w: L, h: W, z: v.D + base.crownHeightMm - (binderSpec.rings.embedMm ?? 0) }, ringCenters: xs.map(hx => ({ x: hx, y: 0 })) };
  }
  for (const h of item.holes || []) {
    const x = E(h.x), y = E(h.y);
    if (h.d !== undefined) holes.push({ type: 'circle', cx: x, cy: y, r: E(h.d) / 2 });
    else holes.push({ type: 'polyline', closed: true, points: roundRect(E(h.slotL), E(h.slotW), E(h.slotW) / 2).map(q => ({ x: q.x + x, y: q.y + y })) });
  }
  const sd = item.solid3d, solid = sd.kind === 'cylinder' ? { kind: 'cylinder', d: E(sd.d), z: E(sd.h) } : sd.kind === 'box' ? { kind: 'box', w: E(sd.w), h: E(sd.h), z: E(sd.z) } : { kind: 'box', w: 10, h: 10, z: 2 };
  return { outline, holes, solid };
}
/** ローカル図形を配置点・角度（度・時計回り）へ移す。 */
export function placeFootprint(fp, at, angleDeg = 0) {
  const move = s => { const r = rotate(s, angleDeg); const q = { ...r }; for (const [x, y] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2'], ['cx', 'cy']]) if (x in q) { q[x] += at.x; q[y] += at.y; } if (q.points) q.points = q.points.map(pt => ({ x: pt.x + at.x, y: pt.y + at.y })); return q; };
  return { outline: fp.outline.map(move), holes: fp.holes.map(move), solid: fp.solid, ringCenters: fp.ringCenters ? fp.ringCenters.map(c => { const r = rotate(c, angleDeg); return { x: r.x + at.x, y: r.y + at.y }; }) : undefined };
}
/** バインダー金具の立体（台座の箱＋リングの輪＋リベット）を面の配列で返す（sim3d の面形式）。openAngle は 0〜90°。 */
export function binderSolid(spec, ringD, openAngle = 0, { at = { x: 0, y: 0 }, z0 = 0, segments = 16 } = {}) {
  const base = binderBase(spec), L = base.lengthMm, W = base.sectionWidthMm, T = base.crownHeightMm, embed = spec.rings.embedMm ?? 0, faces = [];
  const box = (cx, cy, w, h, zb, zt) => { const c = [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 }]; faces.push({ kind: 'top', points: c.map(p => ({ x: p.x, y: p.y, z: zt })) }, { kind: 'bottom', points: [...c].reverse().map(p => ({ x: p.x, y: p.y, z: zb })) }); for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; faces.push({ kind: 'side', points: [{ x: a.x, y: a.y, z: zt }, { x: b.x, y: b.y, z: zt }, { x: b.x, y: b.y, z: zb }, { x: a.x, y: a.y, z: zb }] }); } };
  // 平らな板の台座：角R（cornerRMm）を付けた押し出し。角Rが 0 なら今までどおりの箱（面の並びも同じ）。実測の角R（例：A6 1.5mm）が3Dにも出る。
  if (!spec.base) { const pts = roundRect(L, W, base.cornerRMm || 0).map(p => ({ x: at.x + p.x, y: at.y + p.y })), zb = z0, zt = z0 + T; faces.push({ kind: 'top', points: pts.map(p => ({ x: p.x, y: p.y, z: zt })) }, { kind: 'bottom', points: [...pts].reverse().map(p => ({ x: p.x, y: p.y, z: zb })) }); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; faces.push({ kind: 'side', points: [{ x: a.x, y: a.y, z: zt }, { x: b.x, y: b.y, z: zt }, { x: b.x, y: b.y, z: zb }, { x: a.x, y: a.y, z: zb }] }); } }
  else {
    // 断面を長さ方向へ伸ばす。両端の蓋と、各辺の面で閉じる。
    const section = binderSection(base), point = (p, x) => ({ x: at.x + x, y: at.y + p.x, z: z0 + T - p.y });
    faces.push({ kind: 'side', points: section.map(p => point(p, -L / 2)) }, { kind: 'side', points: [...section].reverse().map(p => point(p, L / 2)) });
    for (let i = 0; i < section.length; i++) { const a = section[i], b = section[(i + 1) % section.length]; faces.push({ kind: 'side', points: [point(a, -L / 2), point(a, L / 2), point(b, L / 2), point(b, -L / 2)] }); }
  }
  let x = -spec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; xs.push(x); }
  const size = ringSizeOf(spec, ringD || spec.rings.diameterOptionsMm[0]), I = size.inner, wire = size.wire, R = (I + wire) / 2, O = size.outer, open = openAngle * Math.PI / 180;
  for (const hx of xs) for (const side of [-1, 1]) {
    // 半リング：台座中心から y 方向 side に開く。開くときは上端で ±open だけ離れる
    // 中心線の半径は（内径＋線径）/2。内外の面と左右の面で針金の厚みを表す。
    const pts = []; for (let k = 0; k <= segments; k++) { const a = -Math.PI / 2 + Math.PI * k / segments, lift = (Math.sin(a) + 1) / 2; pts.push([-1, 1].flatMap(radial => [-1, 1].map(axial => ({ x: at.x + hx + axial * wire / 2, y: at.y + side * ((R + radial * wire / 2) * Math.cos(a) + Math.sin(open) * R * lift), z: z0 + T + O / 2 + (R + radial * wire / 2) * Math.sin(a) - embed })))); }
    for (let k = 0; k < pts.length - 1; k++) for (const [i, j] of [[0, 1], [1, 3], [3, 2], [2, 0]]) faces.push({ kind: 'side', points: [pts[k][i], pts[k][j], pts[k + 1][j], pts[k + 1][i]] });
  }
  for (const q of binderMechParts(spec)) {   /* 開閉機構：台座の頂上に立つ箱（ボタンは多角柱） */
    const zb = z0 + T, zt = zb + q.h;
    if (q.shape === 'rect') box(at.x + q.x, at.y + q.y, q.w, q.l, zb, zt);
    else {
      const n = 12, ring = Array.from({ length: n }, (_, k) => ({ x: at.x + q.x + q.r * Math.cos(2 * Math.PI * k / n), y: at.y + q.y + q.r * Math.sin(2 * Math.PI * k / n) }));
      faces.push({ kind: 'top', points: ring.map(p => ({ ...p, z: zt })) }, { kind: 'bottom', points: [...ring].reverse().map(p => ({ ...p, z: zb })) });
      for (let k = 0; k < n; k++) { const a = ring[k], b = ring[(k + 1) % n]; faces.push({ kind: 'side', points: [{ ...a, z: zb }, { ...b, z: zb }, { ...b, z: zt }, { ...a, z: zt }] }); }
    }
  }
  /* ビス穴金具部（金属・灰色）：台座の下の膨らみに沿って bossT だけ外側へ張り出した、直径 bossDia の円盤（中心にビス穴）。取付穴の位置ごとに1つ。断面のデータがある規格だけ（事業主指示 2026-10-13：3Dでも実物どおりに） */
  const bossT = base.supporterThicknessMm, bossDia = base.supporterDiameterMm; let bossCount = 0;
  if (spec.base && base.sectionPoints && bossT > 0 && bossDia > 0 && spec.rivets.length) {
    const pts = binderSection(base), xs = pts.map(p => p.x), ys = pts.map(p => p.y); let corner = 0; pts.forEach((p, i) => { if (p.x > xs[corner] + 1e-9 || (Math.abs(p.x - xs[corner]) < 1e-9 && p.y < ys[corner])) corner = i; });
    const lower = pts.slice(corner + 1);
    if (lower.length >= 2) {
      const flip = offsetOpenPolyline(lower, 1).reduce((a, p) => a + p.y, 0) < lower.reduce((a, p) => a + p.y, 0) ? -1 : 1, band = offsetOpenPolyline(lower, flip * bossT);
      const zTop = y => z0 + T - yAtX(lower, y), zBot = y => z0 + T - yAtX(band, y), R = Math.min(bossDia / 2, Math.max(...xs)), NT = 36;
      for (const rv of spec.rivets) {
        const r = Math.min(rv.dMm / 2, R * 0.9), radii = [r, r + (R - r) / 3, r + 2 * (R - r) / 3, R], P = (rr, th, zf) => { const y = rv.yMm + rr * Math.sin(th); return { x: at.x + rv.xMm + rr * Math.cos(th), y: at.y + y, z: zf(y) }; };
        for (let j = 0; j < NT; j++) {
          const a = 2 * Math.PI * j / NT, b = 2 * Math.PI * (j + 1) / NT;
          for (let i = 0; i < 3; i++) faces.push({ kind: 'bottom', color: '#9a9a9a', points: [P(radii[i], a, zBot), P(radii[i + 1], a, zBot), P(radii[i + 1], b, zBot), P(radii[i], b, zBot)].reverse() });
          faces.push({ kind: 'side', color: '#9a9a9a', points: [P(R, a, zTop), P(R, b, zTop), P(R, b, zBot), P(R, a, zBot)] });
          faces.push({ kind: 'side', color: '#9a9a9a', points: [P(r, a, zBot), P(r, b, zBot), P(r, b, zTop), P(r, a, zTop)] });
        }
        bossCount++;
      }
    }
  }
  if (!bossCount) for (const rv of spec.rivets) box(at.x + rv.xMm, at.y + rv.yMm, rv.dMm, rv.dMm, z0 - 1, z0); /* ビス穴金具部が無い規格は、従来の小さな箱 */
  return faces.map(f => ({ ...f, panelId: 'binder', partId: 'binder', color: f.color || '#c8b060' }));
}
/** 必要な背幅：リング径 + 金具ベース厚 + 革厚×2 + 遊び。 */
export function spineWidth(ringD, baseThickness = 2, leatherThickness = 1.5, playMm = 2) { return ringD + baseThickness + 2 * leatherThickness + playMm; }
/** 開いた折れ線 pts を、各点の法線方向へ d だけずらす（角はなめらかな曲線向けの簡易ミター）。d の符号は法線（進行方向の右＝y 下向き系では左回り）による。 */
function offsetOpenPolyline(pts, d) {
  const n = pts.length, seg = []; for (let i = 0; i < n - 1; i++) { const dx = pts[i + 1].x - pts[i].x, dy = pts[i + 1].y - pts[i].y, l = Math.hypot(dx, dy) || 1; seg.push({ x: dy / l, y: -dx / l }); }
  return pts.map((p, i) => { const a = seg[Math.max(0, i - 1)], b = seg[Math.min(seg.length - 1, i)]; let nx = a.x + b.x, ny = a.y + b.y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; const k = Math.min(3, 1 / Math.max(0.3, nx * b.x + ny * b.y)); return { x: p.x + nx * d * k, y: p.y + ny * d * k }; });
}
/** x が単調に動く折れ線 pts の、x における y（端の外は端の値）。 */
function yAtX(pts, x) {
  const inc = pts[pts.length - 1].x >= pts[0].x, a = inc ? pts : pts.slice().reverse();
  if (x <= a[0].x) return a[0].y; if (x >= a[a.length - 1].x) return a[a.length - 1].y;
  for (let i = 1; i < a.length; i++) if (x <= a[i].x) { const p = a[i - 1], q = a[i], t = q.x === p.x ? 0 : (x - p.x) / (q.x - p.x); return p.y + (q.y - p.y) * t; }
  return a[a.length - 1].y;
}
/** x が単調な折れ線 pts のうち、x が [xa, xb] に入る部分（両端は補間した点）。 */
function sliceByX(pts, xa, xb) {
  const inc = pts[pts.length - 1].x >= pts[0].x, a = inc ? pts : pts.slice().reverse(), mid = a.filter(p => p.x > xa && p.x < xb);
  return [{ x: xa, y: yAtX(a, xa) }, ...mid, { x: xb, y: yAtX(a, xb) }];
}
/** 台座の断面の座標（中央 x=0・頂上 y=0・y 下向き・時計回り・先頭＝左上の縁）から、背幅シミュレーション用の多角形（背の内面中央を原点・y 上向き正）を作る。
 *  plate＝台座の断面そのもの。boss＝ビス穴金具部：台座の下の膨らみ（下面）に沿って、外側へ bossT だけオフセットした帯の配列（金具の寸法なので、リングサポータの厚みとは無関係・事業主指示 2026-10-13）。リングサポータは spineSim の supporterWrap（リングを包む帯）。
 *  ビス穴金具部は直径 bossDia の円で切り抜かれる：ビス穴の中心を通る断面では、中心から ±bossDia/2 の範囲で、ビス穴（直径 holeDia）の部分は空く。bossDia が 0 なら帯は断面の全幅。 */
export function spineSectionPolys(sectionPoints, bossT, bossDia = 0, holeDia = 0, lift = 0) {
  if (!Array.isArray(sectionPoints) || sectionPoints.length < 4) return null;
  const xs = sectionPoints.map(p => p.x), ys = sectionPoints.map(p => p.y), maxX = Math.max(...xs), H = Math.max(...ys) - Math.min(...ys), y0 = Math.min(...ys);
  const toSim = p => ({ x: p.x, y: lift + bossT + (H - (p.y - y0)) }); /* 断面の下の膨らみの頂点を、ビス穴金具部の上面（y＝bossT）に置く */
  const plate = sectionPoints.map(toSim); if (!(bossT > 0)) return { plate, boss: [] };
  let corner = 0; sectionPoints.forEach((p, i) => { if (p.x > xs[corner] + 1e-9 || (Math.abs(p.x - xs[corner]) < 1e-9 && p.y < ys[corner])) corner = i; }); /* 右上の縁の点 */
  const lower = sectionPoints.slice(corner + 1); if (lower.length < 2) return { plate, boss: [] };
  const out = offsetOpenPolyline(lower, 1), flip = out.reduce((a, p) => a + p.y, 0) < lower.reduce((a, p) => a + p.y, 0) ? -1 : 1; /* 下向き（膨らみの外側）へずれる符号 */
  const band = offsetOpenPolyline(lower, flip * bossT);
  const piece = (xa, xb) => { const lo = sliceByX(lower, xa, xb), up = sliceByX(band, xa, xb); return [...lo, ...up.slice().reverse()].map(toSim); }; /* 縦の線で切った帯の一片 */
  const R = bossDia > 0 ? Math.min(bossDia / 2, maxX) : maxX, r = holeDia > 0 && bossDia > 0 ? Math.min(holeDia / 2, R) : 0;
  const boss = r > 0 ? (r < R ? [piece(-R, -r), piece(r, R)] : []) : [piece(-R, R)];
  return { plate, boss };
}
/** リングサポータ厚（固定）。事業主指示 2026-10-13：つねに 2.3〜2.5mm なので中央の 2.4 で固定する（画面の入力欄は廃止）。 */
export const SUPPORTER_T_MM = 2.4;
/** 多角形 pts を縦の2本の線（x=xa より右・x=xb より左を残す）で切る（Sutherland–Hodgman）。 */
function clipPolyByX(pts, xa, xb) {
  const clip = (poly, keep, edge) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ina = keep(a), inb = keep(b); if (ina) out.push(a); if (ina !== inb) out.push({ x: edge, y: a.y + (b.y - a.y) * (edge - a.x) / (b.x - a.x) }); } return out; };
  return clip(clip(pts, p => p.x >= xa - 1e-12, xa), p => p.x <= xb + 1e-12, xb);
}
/** リングサポータの帯（mm・y 上向き）：リングの外周（半径 rIn）に同心で、外へ厚み t の下半分の環（左端→下→右端）。halfW は背の内面の半幅で、これより外へは出さない（革に食い込まない）。 */
export function ringWrapPoly(cx, cy, rIn, t, halfW = Infinity, n = 48) {
  if (!(t > 0) || !(rIn > 0)) return [];
  const arc = rad => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI + Math.PI * i / n; return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) }; });
  const poly = [...arc(rIn), ...arc(rIn + t).reverse()];
  return Number.isFinite(halfW) ? clipPolyByX(poly, cx - halfW, cx + halfW) : poly;
}
/** 背幅の断面シミュレーション（純関数）。閉じた手帳の断面：台座（厚さ plateT）の上に外径 ringD+2*wireD の輪が立ち、表紙は背の両端で 90° 折れて輪の両脇を通る。
 *  内幅 = 輪の外径 + 2*遊び（輪と表紙内面のすき間）。背の型紙幅 = 内幅 + 2*折り代（θ(r + K t)・θ=90°）。輪の高さが表紙の張り出し（サポータ厚＋台座厚）を超える分は干渉として返す。
 *  params: {ringD（内径）, wireD（線径）, plateT, baseH（台座の全高・省略時は板厚）, embedMm（輪の食い込み深さ）, leatherT, supporterT（リングサポータ厚＝リングを包む帯の厚み・内幅に効く）, bossT（ビス穴金具部の高さ＝台座の下駄・金具の寸法なのでサポータ厚とは無関係。省略時は supporterT）, bossDia（ビス穴金具部の直径）, playMm, foldR（曲げ内半径）, k} → {innerW, outerRingD, foldEach, spineW, ringTop, coverGap, section} */
export function spineSim({ ringD = 20, wireD = 2, plateT = 2, baseH = plateT, embedMm = 0, leatherT = 1.5, supporterT = 0, bossT = supporterT, playMm = 1.5, foldR = 0, k = 0.5, spineShape = 'square', sectionPoints = null, bossDia = 0, holeDia = 0, liningT = 0 } = {}) {
  const num = v => Number.isFinite(v) && v >= 0;
  if (![ringD, wireD, plateT, baseH, embedMm, leatherT, supporterT, bossT, playMm, foldR, k, liningT].every(num) || ringD <= 0) return null;
  /* 背の形（事業主決定A・2026-10-12）：角背＝両端を 90° に折る（曲げ内半径は入力値）。丸背＝表紙がリングを包んで半円になる（曲げ内半径＝内幅の半分で自動・サポーターは表紙の内側に沿って曲がるので内幅に厚みを足す・背の革の長さ＝π×(r＋K×革厚)） */
  const round = spineShape === 'round', outerRingD = ringSizeOf(null, { innerDiameterMm: ringD, wireDiameterMm: wireD }).outer, /* 内幅（事業主決定・2026-10-13）：丸背＝リング外径＋サポータ厚×2＋内張の厚み×2（輪と表紙のすき間は使わない）。角背＝リング外径＋すき間×2（従来どおり） */
    innerW = round ? outerRingD + 2 * supporterT + 2 * liningT : outerRingD + 2 * playMm, lift = round ? liningT : 0; /* lift＝内張が底に積む分（丸背のみ） */
  const r = round ? innerW / 2 : foldR, foldEach = (Math.PI / 2) * (r + k * leatherT), spineW = round ? 2 * foldEach : innerW + 2 * foldEach;
  const ringTop = lift + bossT + baseH + outerRingD - embedMm, ringCy = lift + bossT + baseH + outerRingD / 2 - embedMm; // 背の内面からの輪の天井高さ・輪の中心の高さ
  const polys = spineSectionPolys(sectionPoints, bossT, bossDia, holeDia, lift); /* 台座の断面（レンズ形）と、膨らみの下のビス穴金具部（断面のデータがある規格だけ） */
  const section = { // 断面図用（mm・背の内面中央を原点・上向き正）
    plate: { x: -12, y: lift + bossT, w: 24, h: plateT },
    /* ビス穴金具部：断面のデータがある規格は polys.boss。無い規格は台座（幅24）の下の平らな下駄（高さ bossT）で、リングサポータ厚とは無関係（事業主指示 2026-10-13） */
    bossFlat: !polys && bossT > 0 ? { x: -12, y: lift, w: 24, h: bossT } : null,
    /* リングサポータ（事業主指示 2026-10-13）：リングを包む帯。リングの外周に同心で下半分を一定の厚み supporterT で包む（背の内面の半幅より外へは出ない）。角背・丸背・断面データの有無によらず同じ */
    supporterWrap: supporterT > 0 ? { cx: 0, cy: ringCy, rIn: outerRingD / 2, rOut: outerRingD / 2 + supporterT, poly: ringWrapPoly(0, ringCy, outerRingD / 2, supporterT, innerW / 2) } : null,
    liningArc: liningT > 0 && round ? { rOut: r, rIn: Math.max(0, r - liningT), c: r } : null, /* 内張：表紙の内側に沿う半円の帯 */
    polys,
    ring: { cx: 0, cy: ringCy, rOuter: outerRingD / 2, rInner: ringD / 2 },
    fold: { r, t: leatherT, round }, /* 背の革の曲げ（内側の半径・革厚・丸背か）。断面の絵で角を丸く描く */
    coverL: { x: -innerW / 2 - leatherT, y: 0, w: leatherT, h: ringTop + 10 }, coverR: { x: innerW / 2, y: 0, w: leatherT, h: ringTop + 10 }, spine: { x: -innerW / 2 - leatherT, y: -leatherT, w: innerW + 2 * leatherT, h: leatherT },
  };
  return { innerW: spineRound(innerW), outerRingD: spineRound(outerRingD), foldEach: spineRound(foldEach), spineW: spineRound(spineW), ringTop: spineRound(ringTop), foldR: spineRound(r), shape: round ? 'round' : 'square', section };
}
/** 実測の背幅（型紙の幅）から遊びを逆算する。戻り値 playMm（負なら実測が理論値より狭い）。 */
export function spinePlayFromMeasured(measuredSpineW, params = {}) {
  const base = spineSim({ ...params, playMm: 0 }); if (!base || !Number.isFinite(measuredSpineW)) return null;
  return spineRound((measuredSpineW - base.spineW) / 2);
}
/** 断面図 SVG（mm・1:1）。 */
export function spineSectionSvg(result, { label = '' } = {}) {
  if (!result) return ''; const s = result.section, f = n => (Math.round(n * 100) / 100).toString();
  const minX = s.coverL.x - 6, maxX = s.coverR.x + s.coverR.w + 6, minY = -s.spine.h - 6, maxY = result.ringTop + 14, W = maxX - minX, H = maxY - minY;
  const rect = (r, fill) => `<rect x="${f(r.x)}" y="${f(-(r.y + r.h))}" width="${f(r.w)}" height="${f(r.h)}" fill="${fill}" stroke="#000" stroke-width="0.2"/>`;
  /* 背の革は1枚のU字：内側の角は曲げの内半径 r・外側の角は r＋革厚 t（内半径は内幅の半分まで）。y は上向き正→SVG は上下逆（Y＝−y） */
  const iw = result.innerW, t = s.fold?.t ?? s.spine.h, r = Math.min(Math.max(s.fold?.r ?? 0, 0), iw / 2), top = s.coverL.h, R = r + t, xo = iw / 2 + t, xi = iw / 2;
  const leather = `<path id="spine-leather" d="M${f(-xo)} ${f(-top)}L${f(-xo)} ${f(-r)}A${f(R)} ${f(R)} 0 0 0 ${f(-xi + r)} ${f(t)}L${f(xi - r)} ${f(t)}A${f(R)} ${f(R)} 0 0 0 ${f(xo)} ${f(-r)}L${f(xo)} ${f(-top)}L${f(xi)} ${f(-top)}L${f(xi)} ${f(-r)}A${f(r)} ${f(r)} 0 0 1 ${f(xi - r)} 0L${f(-xi + r)} 0A${f(r)} ${f(r)} 0 0 1 ${f(-xi)} ${f(-r)}L${f(-xi)} ${f(-top)}Z" fill="#d9c7a0" stroke="#000" stroke-width="0.2"/>`;
  const arcBand = (a, fill = '#c4ad7f') => a ? (c => `<path d="M${f(a.rOut)} ${f(-c)}A${f(a.rOut)} ${f(a.rOut)} 0 0 1 0 ${f(-(c - a.rOut))}A${f(a.rOut)} ${f(a.rOut)} 0 0 1 ${f(-a.rOut)} ${f(-c)}L${f(-a.rIn)} ${f(-c)}A${f(a.rIn)} ${f(a.rIn)} 0 0 0 0 ${f(-(c - a.rIn))}A${f(a.rIn)} ${f(a.rIn)} 0 0 0 ${f(a.rIn)} ${f(-c)}Z" fill="${fill}" stroke="#000" stroke-width="0.2"/>`)(a.c ?? a.rOut) : ''; /* c＝半円の中心の高さ（背の内面の底から） */
  const poly = (pts, fill, id = '') => `<polygon${id ? ` id="${id}"` : ''} points="${pts.map(p => `${f(p.x)},${f(-p.y)}`).join(' ')}" fill="${fill}" stroke="#000" stroke-width="0.2"/>`;
  /* リングサポータ（茶・リングを包む帯）→ ビス穴金具部（灰・台座の下）→ 台座（灰）→ リングの順に重ねる */
  const wrapEl = s.supporterWrap?.poly?.length ? poly(s.supporterWrap.poly, '#c4ad7f', 'spine-supporter-wrap') : '';
  const bossEl = s.polys?.boss ? s.polys.boss.map(q => poly(q, '#9a9a9a', 'spine-boss')).join('') : s.bossFlat ? rect(s.bossFlat, '#9a9a9a') : '', plateEl = s.polys?.plate ? poly(s.polys.plate, '#9a9a9a') : rect(s.plate, '#9a9a9a');
  const body = [leather, arcBand(s.liningArc, '#e8dcc0'), wrapEl, bossEl, plateEl,
    `<circle cx="${f(s.ring.cx)}" cy="${f(-s.ring.cy)}" r="${f(s.ring.rOuter)}" fill="none" stroke="#b08d2a" stroke-width="${f(s.ring.rOuter - s.ring.rInner)}"/>`,
    `<line x1="${f(-result.innerW / 2)}" y1="${f(-(result.ringTop + 6))}" x2="${f(result.innerW / 2)}" y2="${f(-(result.ringTop + 6))}" stroke="#e00" stroke-width="0.2"/>`,
    `<text x="0" y="${f(-(result.ringTop + 8))}" font-size="3" text-anchor="middle" font-family="sans-serif">${label || ''} inner ${f(result.innerW)} / spine ${f(result.spineW)} mm</text>`].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}mm" height="${f(H)}mm" viewBox="${f(minX)} ${f(-maxY)} ${f(W)} ${f(H)}">${body}</svg>`;
}
/** 閉じた手帳を天（真上）から見た断面（mm・Y 下向き・左端＝背の外面・Y が大きい側が手前＝表側の表紙）。背の革・表裏の表紙・サポータ・台座・リング（内外2円）・リフィルの束を図形で返す。
 *  p は spineSim と同じ引数に加え {stackT（リフィルの束の厚み）, refillW（リフィル幅）, holeEdge（穴中心からリフィル縁まで）, coverW（背の内面からの表紙の長さ。省略で束の先から4mm）, plateW（台座の幅）}。
 *  戻り値 {shapes, thickness（手帳の厚み）, coverW, ringX（背の外面からリング中心まで）, ringFits（束がリングの内径に収まるか）}。不正な数値は null。 */
export function closedBinderTop(p = {}) {
  const sim = spineSim(p); if (!sim) return null;
  const { leatherT = 1.5, supporterT = 0, plateT = 2 } = p, stackT = p.stackT ?? 6, refillW = p.refillW ?? 110, holeEdge = p.holeEdge ?? 6, plateW = Math.min(p.plateW ?? 24, sim.innerW);
  if (![stackT, refillW, holeEdge, plateW].every(v => Number.isFinite(v) && v >= 0) || refillW <= holeEdge) return null;
  /* 背は、曲げの内半径 r で角を丸めたU字：内側の角の半径 r・外側の角の半径 r＋革厚（r は内幅の半分まで。それ以上は半円）。表裏の表紙は xc＝革厚＋r から右へ接続する。曲げの内半径 foldR を指定しない古い呼び出しは、今までどおり半円（r＝内幅の半分） */
  const t = leatherT, T = sim.innerW + 2 * t, mid = T / 2, rIn = sim.innerW / 2, r = p.foldR === undefined ? rIn : Math.min(Math.max(Number(p.foldR) || 0, 0), rIn), xc = t + r;
  const dyc = plateW / 2 - (rIn - r), plateLeft = dyc <= 0 ? t : xc - Math.sqrt(Math.max(0, r * r - dyc * dyc)), /* 台座は、背の内面の平らな部分に当たるか、角の丸みに両端で当たる位置 */
 ringX = plateLeft + supporterT + (p.baseH ?? plateT) + sim.outerRingD / 2 - (p.embedMm ?? 0), tipX = ringX + refillW - holeEdge; /* 台座は丸い内面に両端で当たる位置 */
  const coverW = p.coverW > 0 ? p.coverW : tipX + 4 - xc;
  const rect = (x1, y1, x2, y2, role, hidden = false) => ({ type: 'polyline', closed: true, role, ...(hidden ? { hidden } : {}), points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
  const arc = (cy, rad, a0, a1) => rad > 0 ? Array.from({ length: 19 }, (_, i) => { const a = a0 + (a1 - a0) * i / 18; return { x: xc + rad * Math.cos(a), y: cy + rad * Math.sin(a) }; }) : [{ x: xc, y: cy }], R = r + t, cyTop = t + r, cyBottom = T - t - r;
  const spine = { type: 'polyline', closed: true, role: 'spine', points: [...arc(cyTop, R, -Math.PI / 2, -Math.PI), ...arc(cyBottom, R, -Math.PI, -3 * Math.PI / 2), ...arc(cyBottom, r, Math.PI / 2, Math.PI), ...arc(cyTop, r, Math.PI, 3 * Math.PI / 2)] }; /* 外周（上→左→下）、内周（下→左→上）。角の円弧の間は直線 */
  const shapes = [spine, rect(xc, 0, xc + coverW, t, 'back-cover'), rect(xc, T - t, xc + coverW, T, 'front-cover')];
  if (supporterT > 0) shapes.push(rect(plateLeft, mid - plateW / 2, plateLeft + supporterT, mid + plateW / 2, 'supporter'));
  shapes.push(rect(plateLeft + supporterT, mid - plateW / 2, plateLeft + supporterT + plateT, mid + plateW / 2, 'plate'),
    { type: 'circle', cx: ringX, cy: mid, r: sim.outerRingD / 2, role: 'ring-outer' }, { type: 'circle', cx: ringX, cy: mid, r: p.ringD / 2, role: 'ring-inner' },
    rect(ringX - holeEdge, mid - stackT / 2, tipX, mid + stackT / 2, 'refills'));
  return { shapes, thickness: Math.round(T * 100) / 100, coverW: Math.round(coverW * 100) / 100, ringX: Math.round(ringX * 100) / 100, xc: Math.round(xc * 100) / 100, plateLeft: Math.round(plateLeft * 100) / 100, ringFits: stackT <= p.ringD, sim };
}
/** 閉じた手帳の3面図（第三角法）：天を正面の上、右側面を正面の右に置く。mm・Y 下向き・正面の左上が原点。隠れる部分は hidden（破線）。
 *  p は closedBinderTop の引数に加え {refillH（リフィル高さ）, coverH（表紙の高さ。省略でリフィル高さ+6）, ringPos（リング中心の高さ方向の位置の配列。省略時は中央に等間隔 3 個）, plateL（台座の長さ）, gap（図の間隔）}。
 *  戻り値 {shapes, width, height, views:{front,top,side}, thickness, coverW}。不正な数値は null。 */
export function closedBinderViews(p = {}) {
  const top = closedBinderTop(p); if (!top) return null;
  const t = p.leatherT ?? 1.5, T = top.thickness, Wf = top.xc + top.coverW, refillH = p.refillH ?? 210, H = p.coverH > 0 ? p.coverH : refillH + 6, gap = p.gap ?? 14, plateL = Math.min(p.plateL ?? 170, H), wire = p.wireD ?? 2;
  if (![refillH, H, gap, plateL, wire].every(v => Number.isFinite(v) && v > 0)) return null;
  const rpos = Array.isArray(p.ringPos) && p.ringPos.length ? p.ringPos : [H / 2 - 35, H / 2, H / 2 + 35], outerD = top.sim.outerRingD, sx = Wf + gap, topY = -gap - T;
  const rect = (x1, y1, x2, y2, role, hidden) => ({ type: 'polyline', closed: true, role, ...(hidden ? { hidden: true } : {}), points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
  const shapes = [];
  /* 天：断面をそのまま、正面の上に */
  for (const s of top.shapes) shapes.push(s.type === 'circle' ? { ...s, cy: s.cy + topY } : { ...s, points: s.points.map(q => ({ x: q.x, y: q.y + topY })) });
  /* 正面：表紙の外形。背（左 t）と表紙の線。隠れ線＝台座・リング（真横から見ると細長い長方形）・リフィルの縁 */
  shapes.push(rect(0, 0, Wf, H, 'front-outline'), { type: 'line', role: 'spine-line', x1: top.xc, y1: 0, x2: top.xc, y2: H }); /* 丸い背が表紙に変わる線 */
  const px = top.plateLeft + (p.supporterT ?? 0); shapes.push(rect(px, H / 2 - plateL / 2, px + (p.plateT ?? 2), H / 2 + plateL / 2, 'plate', true));
  for (const y of rpos) shapes.push(rect(top.ringX - outerD / 2, y - wire, top.ringX + outerD / 2, y + wire, 'ring', true));
  const rh = Math.min(refillH, H); shapes.push(rect(top.ringX - (p.holeEdge ?? 6), (H - rh) / 2, Wf - 4 + 0, (H + rh) / 2, 'refills', true));
  /* 右側面（小口側から）：手前＝表の表紙が左。表紙の厚み・リフィルの束の端 */
  shapes.push(rect(sx, 0, sx + T, H, 'side-outline'), { type: 'line', role: 'cover-line', x1: sx + t, y1: 0, x2: sx + t, y2: H }, { type: 'line', role: 'cover-line', x1: sx + T - t, y1: 0, x2: sx + T - t, y2: H });
  const stack = p.stackT ?? 6, sm = T / 2; shapes.push(rect(sx + T - sm - stack / 2, (H - rh) / 2, sx + T - sm + stack / 2, (H + rh) / 2, 'refills'));
  /* 寸法 */
  shapes.push({ type: 'dimension', role: 'dim', x1: 0, y1: H, x2: Wf, y2: H, offset: -8 }, { type: 'dimension', role: 'dim', x1: 0, y1: 0, x2: 0, y2: H, offset: 8 }, { type: 'dimension', role: 'dim', x1: sx, y1: H, x2: sx + T, y2: H, offset: -8 });
  return { shapes, width: sx + T, height: H - topY, views: { front: { x: 0, y: 0, w: Wf, h: H }, top: { x: 0, y: topY, w: Wf, h: T }, side: { x: sx, y: 0, w: T, h: H } }, thickness: T, coverW: top.coverW, ringFits: top.ringFits };
}
/** closedBinderViews の結果をプレビュー用 SVG にする（mm・1:1。隠れ線は破線）。 */
export function closedBinderViewsSvg(res) {
  if (!res) return ''; const f = n => (Math.round(n * 100) / 100).toString(), fill = { spine: '#d9c7a0', 'back-cover': '#d9c7a0', 'front-cover': '#d9c7a0', supporter: '#c4ad7f', plate: '#9a9a9a', refills: '#f2f2f2' };
  const ys = res.shapes.flatMap(s => s.type === 'circle' ? [s.cy - s.r, s.cy + s.r] : s.points ? s.points.map(q => q.y) : [s.y1, s.y2]), minY = Math.min(...ys) - 4, W = res.width + 24, H = Math.max(...ys) - minY + 20;
  const body = res.shapes.filter(s => s.type !== 'dimension').map(s => { const dash = s.hidden ? ' stroke-dasharray="2 1.5"' : ''; return s.type === 'circle' ? `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.r)}" fill="none" stroke="#b08d2a" stroke-width="0.4"/>` : s.type === 'line' ? `<line x1="${f(s.x1)}" y1="${f(s.y1)}" x2="${f(s.x2)}" y2="${f(s.y2)}" stroke="#000" stroke-width="0.2"/>` : `<polygon points="${s.points.map(q => f(q.x) + ',' + f(q.y)).join(' ')}" fill="${s.hidden ? 'none' : fill[s.role] || 'none'}" stroke="#000" stroke-width="0.2"${dash}/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}mm" height="${f(H)}mm" viewBox="-4 ${f(minY)} ${f(W)} ${f(H)}">${body}</svg>`;
}
/** 同じ入力条件で内径だけを変え、最小の内径との差を比べる。計算できない入力は空の表にする。 */
export function binderRingCompare(spec, params = {}) {
  const rows = [];
  for (const ringD of spec.rings.diameterOptionsMm) {
    const size = ringSizeOf(spec, ringD), p = { ...params, ringD: size.inner, wireD: spec.rings.options ? size.wire : params.wireD }, sim = spineSim(p), top = closedBinderTop(p); if (!sim || !top) return [];
    rows.push({ ringD, outerD: sim.outerRingD, wire: p.wireD ?? 2, innerW: sim.innerW, spineW: sim.spineW, thickness: top.thickness, coverW: top.coverW, openWidth: spineRound(sim.spineW + 2 * top.coverW), ringTop: sim.ringTop });
  }
  const min = rows.reduce((a, b) => !a || b.ringD < a.ringD ? b : a, null);
  return rows.map(r => ({ ...r, deltaSpine: spineRound(r.spineW - min.spineW), deltaOpen: spineRound(r.openWidth - min.openWidth) }));
}
function spineRound(n) { return Math.round(n * 100) / 100; }
/** バインダー金具の3つの見え方を、1か所の寸法から作る（平面＝真上から・正面＝台座の長手方向の横から・側面＝台座の端から）。置いた外形・3つの図・3D は、どれもここから／ここと同じ寸法で作り、食い違わないようにする。
 *  座標は mm。平面は（長さ方向 x・台座の幅方向 y）、正面は（x・高さ y＝上がマイナス・台座の上面が 0）、側面は（幅方向 x・高さ y）。リングは台座の上面に立つ丸い輪（内径＝リング径）で、真上からは線径×外径の細い棒、横からは棒、端からは輪に見える。 */
/** 開閉機構の部品（レバー・ボタン）を、描きやすい形に整える。spec.mechanism.parts の各項目：{ kind: 'lever'|'button', xMm, yMm（台座の中心から・平面の座標）, widthMm（長さ方向）, lengthMm（台座の幅方向）, heightMm（台座の頂上から上へ）, diameterMm（ボタンなど円のとき） }。
 *  位置・高さが無い・大きさが無い項目は飛ばす。部品が無い規格は []。戻り値の各項目：{ kind, shape: 'rect'|'circle', x, y, w, l, h, r? }（円は w＝l＝直径）。 */
export function binderMechParts(spec) {
  const out = [], num = v => (v == null ? NaN : Number(v));
  for (const q of spec?.mechanism?.parts || []) {
    const x = num(q.xMm), y = num(q.yMm), h = num(q.heightMm), d = num(q.diameterMm), w = num(q.widthMm), l = num(q.lengthMm), kind = q.kind === 'button' ? 'button' : 'lever';
    if (!(Number.isFinite(x) && Number.isFinite(y) && h > 0)) continue;
    if (d > 0) out.push({ kind, shape: 'circle', x, y, w: d, l: d, h, r: d / 2 }); else if (w > 0 && l > 0) out.push({ kind, shape: 'rect', x, y, w, l, h });
  }
  return out;
}
export function binderViews(spec, ringD = null) {
  const base = binderBase(spec), L = base.lengthMm, W = base.sectionWidthMm, T = base.crownHeightMm, size = ringSizeOf(spec, ringD || spec.rings.diameterOptionsMm[0]), I = size.inner, wire = size.wire, D = size.outer, embed = spec.rings.embedMm ?? 0;
  let x = -spec.holes.span1toLastMm / 2; const ringXs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; ringXs.push(x); }
  const box = (minX, maxX, minY, maxY) => ({ minX, maxX, minY, maxY }), mech = binderMechParts(spec), part = (p, b) => ({ kind: p.kind, shape: p.shape, ...(p.r ? { r: p.r } : {}), box: b });
  return {
    L, W, T, D, I, wire, ringXs,
    plan: { plate: box(-L / 2, L / 2, -W / 2, W / 2), rings: ringXs.map(hx => box(hx - wire / 2, hx + wire / 2, -D / 2, D / 2)), parts: mech.map(p => part(p, box(p.x - p.w / 2, p.x + p.w / 2, p.y - p.l / 2, p.y + p.l / 2))) },
    front: { plate: box(-L / 2, L / 2, 0, T), rings: ringXs.map(hx => box(hx - wire / 2, hx + wire / 2, -(D - embed), 0)), parts: mech.map(p => part(p, box(p.x - p.w / 2, p.x + p.w / 2, -p.h, 0))) },
    side: { plate: box(-W / 2, W / 2, 0, T), ring: { cx: 0, cy: -D / 2 + embed, rOuter: D / 2, rInner: I / 2 }, ...(spec.base ? { section: binderSection(base) } : {}), parts: mech.map(p => part(p, box(p.y - p.l / 2, p.y + p.l / 2, -p.h, 0))) },
  };
}
/** 開閉機構の部品1つの SVG（四角は rect・円は circle）。class="mech"。 */
const mechSvg = q => { const b = q.box, f = n => (Math.round(n * 100) / 100).toString(); return q.shape === 'circle' ? `<circle class="mech" cx="${f((b.minX + b.maxX) / 2)}" cy="${f((b.minY + b.maxY) / 2)}" r="${f(q.r)}" fill="none" stroke="#000" stroke-width="0.2"/>` : `<rect class="mech" x="${f(b.minX)}" y="${f(b.minY)}" width="${f(b.maxX - b.minX)}" height="${f(b.maxY - b.minY)}" fill="none" stroke="#000" stroke-width="0.2"/>`; };
/** 部品が、リングより高いときだけ、絵の上を広げる（部品が無い規格の図は変わらない）。 */
const liftSvg = (svg, lift) => lift > 0 ? svg.replace(/height="([\d.]+)mm" viewBox="(\S+) (\S+) (\S+) (\S+)"/, (_, h, a, b, c, d) => `height="${Math.round((Number(h) + lift) * 100) / 100}mm" viewBox="${a} ${Math.round((Number(b) - lift) * 100) / 100} ${c} ${Math.round((Number(d) + lift) * 100) / 100}"`) : svg;
/** 平面図（真上から）。リングは台座に直角に立つので、線径×外径の細い棒が並ぶ。 */
export function binderPlanSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { L, W, D, plan } = v, f = n => (Math.round(n * 100) / 100).toString(), xs = v.ringXs;
  const pad = 12, w = L + 2 * pad, h = Math.max(W, D) + 2 * pad + 10;
  const parts = [`<rect x="${f(-L / 2)}" y="${f(-W / 2)}" width="${f(L)}" height="${f(W)}" rx="${f(binderBase(spec).cornerRMm || 0)}" fill="none" stroke="#000" stroke-width="0.2"/>`];
  for (const r of plan.rings) parts.push(`<rect x="${f(r.minX)}" y="${f(r.minY)}" width="${f(r.maxX - r.minX)}" height="${f(r.maxY - r.minY)}" fill="none" stroke="#000" stroke-width="0.2"/><circle cx="${f((r.minX + r.maxX) / 2)}" cy="0" r="0.6" fill="#000"/>`);
  for (const rv of spec.rivets) parts.push(`<circle cx="${f(rv.xMm)}" cy="${f(rv.yMm)}" r="${f(rv.dMm / 2)}" fill="none" stroke="#000" stroke-width="0.2" stroke-dasharray="1 0.5"/>`);
  for (const q of plan.parts) parts.push(mechSvg(q));
  const dy = Math.max(W, D) / 2 + 5;
  for (let i = 0; i + 1 < xs.length; i++) parts.push(`<line x1="${f(xs[i])}" y1="${f(dy)}" x2="${f(xs[i + 1])}" y2="${f(dy)}" stroke="#000" stroke-width="0.15"/><text x="${f((xs[i] + xs[i + 1]) / 2)}" y="${f(dy - 1)}" font-size="2.5" text-anchor="middle" font-family="sans-serif">${f(spec.holes.pitchMm[i])}</text>`);
  parts.push(`<text x="${f(-L / 2)}" y="${f(-Math.max(W, D) / 2 - 4)}" font-size="3" font-family="sans-serif">${spec.names.ja} ${spec.holes.count}穴 / ring ${f(v.I)}mm / span ${f(spec.holes.span1toLastMm)}mm</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)}"><g id="plan">${parts.join('')}</g></svg>`;
}
/** 側面図（台座の端から）。リングは台座の上面に立つ丸い輪（内径＝リング径・太さ＝線径）。 */
export function binderSideSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { W, T, D, side } = v, f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = Math.max(W, D) + 2 * pad, embed = spec.rings.embedMm ?? 0, h = D - embed + Math.max(T, embed) + 2 * pad;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(spec.base || spec.rings.embedMm ? -(D - (spec.rings.embedMm ?? 0)) - pad : -h + pad)} ${f(w)} ${f(h)}"><g id="side">${side.section ? `<polygon points="${side.section.map(p => f(p.x) + ',' + f(p.y)).join(' ')}" fill="none" stroke="#000" stroke-width="0.2"/>` : `<rect x="${f(side.plate.minX)}" y="0" width="${f(W)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/>`}<circle cx="${f(side.ring.cx)}" cy="${f(side.ring.cy)}" r="${f(side.ring.rOuter)}" fill="none" stroke="#000" stroke-width="0.2"/><circle cx="${f(side.ring.cx)}" cy="${f(side.ring.cy)}" r="${f(side.ring.rInner)}" fill="none" stroke="#000" stroke-width="0.2"/><text x="${f(-W / 2)}" y="${f(-D + (spec.rings.embedMm ?? 0) - 2)}" font-size="2.5" font-family="sans-serif">ring ${f(v.I)}mm</text></g></svg>`;
  const mech = side.parts.map(mechSvg).join(''), top = Math.max(0, ...side.parts.map(q => -q.box.minY)), lift = Math.max(0, top - (D - (spec.rings.embedMm ?? 0)));
  return liftSvg(mech ? svg.replace('</g></svg>', mech + '</g></svg>') : svg, lift);
}
/** 正面図（台座の長手方向の横から）。リングは台座の上面に立つ細い棒（線径×外径）。 */
export function binderFrontSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { L, T, D, front } = v, f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = L + 2 * pad, h = D - (spec.rings.embedMm ?? 0) + T + 2 * pad;
  const rings = front.rings.map(r => `<rect x="${f(r.minX)}" y="${f(r.minY)}" width="${f(r.maxX - r.minX)}" height="${f(r.maxY - r.minY)}" fill="none" stroke="#000" stroke-width="0.2"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(spec.base || spec.rings.embedMm ? -(D - (spec.rings.embedMm ?? 0)) - pad : -h + pad)} ${f(w)} ${f(h)}"><g id="front"><rect x="${f(-L / 2)}" y="0" width="${f(L)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/>${rings}</g></svg>`;
  const mech = front.parts.map(mechSvg).join(''), top = Math.max(0, ...front.parts.map(q => -q.box.minY)), lift = Math.max(0, top - (D - (spec.rings.embedMm ?? 0)));
  return liftSvg(mech ? svg.replace('</g></svg>', mech + '</g></svg>') : svg, lift);
}
/** 規格 JSON の整合検査：必須キー・ピッチの合計＝span。問題を文字列配列で返す（空＝OK）。 */
export function checkBinderSpec(spec) {
  const out = [];
  for (const k of ['id', 'names', 'holes', 'refill', 'rings', 'plate', 'rivets', 'confidence']) if (!(k in spec)) out.push('missing:' + k);
  if (spec.holes) { if (spec.holes.pitchMm.length !== spec.holes.count - 1) out.push('pitch-count'); const sum = spec.holes.pitchMm.reduce((a, b) => a + b, 0); if (Math.abs(sum - spec.holes.span1toLastMm) > 0.1) out.push('span-mismatch'); }
  if (spec.rings && !spec.rings.diameterOptionsMm?.length) out.push('rings-empty');
  return out;
}

/** 置いた金具の外形（折れ線）から、中心 at と角度（度・時計回り・-90〜90）を割り出す。長いほうの軸の向きを角度とする（手で動かした・回した後でも使える）。 */
export function hwPoseOfOutline(shape) {
  const pts = shape?.points || [];
  if (pts.length < 3) return { at: { x: 0, y: 0 }, angleDeg: 0 };
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let sxx = 0, syy = 0, sxy = 0; for (const p of pts) { const dx = p.x - cx, dy = p.y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  let deg = 0.5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI;
  if (deg > 90) deg -= 180; if (deg <= -90) deg += 180;
  return { at: { x: cx, y: cy }, angleDeg: deg };
}
const NUM_KEYS = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'c1x', 'c1y', 'c2x', 'c2y', 'startDeg', 'endDeg'];
const sameShape = (a, b, tol) => a.type === b.type && NUM_KEYS.every(k => (k in a) === (k in b) && (!(k in a) || Math.abs(a[k] - b[k]) <= tol))
  && ((a.points || []).length === (b.points || []).length) && (a.points || []).every((p, i) => Math.abs(p.x - b.points[i].x) <= tol && Math.abs(p.y - b.points[i].y) <= tol);
/** 2つの図形の並びが（順番を問わず）同じ形か。数値は tol(mm) 以内の違いなら同じとみなす。手で直したかの判定に使う。 */
export function sameShapes(a, b, tol = 0.05) {
  if (a.length !== b.length) return false;
  const left = [...b];
  for (const s of a) { const i = left.findIndex(t => sameShape(s, t, tol)); if (i < 0) return false; left.splice(i, 1); }
  return true;
}

/** バインダーの3D（binderSolid）の高さ方向（z）の範囲。リベットの出っ張りから、リングの上端まで。三面図の立体で金具を奥行きの中央に置くときの基準。 */
export function binderZRange(spec, ringD = null) {
  const zs = binderSolid(spec, ringD || spec.rings.diameterOptionsMm[0], 0).flatMap(f => f.points.map(p => p.z));
  return { min: Math.min(...zs), max: Math.max(...zs) };
}
/** 正面の紙（真上から見た平面図）に置いた金具から、三面図の「上の紙」と「右の紙」に置く図形を作る。角度は 0度か 90度（±0.5度）だけ。それ以外は null。
 *  at は金具の中心（正面の紙の x・y）、dc は立体の奥行きの中央（mm）。上の図は（x, 奥行き）、右の図は（奥行き, y）の座標で、奥行きは手前が 0・奥が大きい。
 *  奥行きは 3D の金具（threeViewHardwareFaces）と同じ式：手前から数えて dc −（z − zmid）。z は金具の高さ（台座の上面が T、リングの上端が T+D）。
 *  図形は { type: 'polyline'（閉じた四角）| 'circle', role: 'plate' | 'ring' }。リングは長手方向に直角に立つので、台座の向きが 0度なら上の図で棒・右の図で円、90度なら逆になる（円は全部のリングが重なるので外径と内径の2つだけ）。 */
export function binderViewShapes(spec, ringD, at, angleDeg, dc) {
  const rad = angleDeg * Math.PI / 180, eps = Math.sin(0.5 * Math.PI / 180), cs = Math.cos(rad), sn = Math.sin(rad);
  const quarter = Math.abs(sn) < eps ? 0 : Math.abs(cs) < eps ? 90 : null; if (quarter === null) return null;
  const v = binderViews(spec, ringD), { T, D, wire, W, L } = v, z = binderZRange(spec, v.I), zmid = (z.min + z.max) / 2, dOf = zz => dc - (zz - zmid);
  const plateD = [dOf(T), dOf(0)], ringDepth = [dOf(T + D - (spec.rings.embedMm ?? 0)), dOf(T)], ringCenterD = dOf(T + D / 2 - (spec.rings.embedMm ?? 0)), halfX = quarter === 0 ? L / 2 : W / 2, halfY = quarter === 0 ? W / 2 : L / 2;
  const rect = (x0, x1, y0, y1, role) => ({ type: 'polyline', closed: true, role, points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] });
  const rings = (cx, cy) => [{ type: 'circle', role: 'ring', cx, cy, r: D / 2 }, { type: 'circle', role: 'ring', cx, cy, r: D / 2 - wire }];
  const top = [rect(at.x - halfX, at.x + halfX, plateD[0], plateD[1], 'plate')], side = [rect(plateD[0], plateD[1], at.y - halfY, at.y + halfY, 'plate')];
  if (v.side.section) {
    const points = v.side.section.map(p => quarter === 0 ? { x: dOf(T - p.y), y: at.y + p.x * cs } : { x: at.x - p.x * sn, y: dOf(T - p.y) });
    (quarter === 0 ? side : top)[0] = { type: 'polyline', closed: true, role: 'plate', points };
  }
  if (quarter === 0) { for (const hx of v.ringXs) top.push(rect(at.x + hx * cs - wire / 2, at.x + hx * cs + wire / 2, ringDepth[0], ringDepth[1], 'ring')); side.push(...rings(ringCenterD, at.y)); }
  else { top.push(...rings(at.x, ringCenterD)); for (const hx of v.ringXs) side.push(rect(ringDepth[0], ringDepth[1], at.y + hx * sn - wire / 2, at.y + hx * sn + wire / 2, 'ring')); }
  for (const q of binderMechParts(spec)) {   /* 開閉機構の部品：手前へ頂上から高さぶん立つ。円は、棒と同じく、直径の四角として描く */
    const cx = at.x + q.x * cs - q.y * sn, cy = at.y + q.x * sn + q.y * cs, wx = quarter === 0 ? q.w : q.l, ly = quarter === 0 ? q.l : q.w, dep = [dOf(T + q.h), dOf(T)];
    top.push(rect(cx - wx / 2, cx + wx / 2, dep[0], dep[1], 'part')); side.push(rect(dep[0], dep[1], cy - ly / 2, cy + ly / 2, 'part'));
  }
  return { top, side };
}

/** 台座の断面（mm・Y下向き）。時計回りの点列で、末尾から先頭へ結んで閉じる。
 *  手で直した点列はそのまま優先。丸みは寸法内に収め、円弧のずれは0.025mm以内。
 *  上下面は直角方向に板厚だけ離す。鋭い山の内側は、平行な面の交点でつなぐ。 */
export function binderSection(base) {
  if (base.sectionPoints !== undefined) return base.sectionPoints;
  const { sectionWidthMm: W, crownHeightMm: H, thicknessMm: t, crownRadiusMm: Rc = 0, edgeRadiusMm: Re = 0 } = base;
  if (![W, H, t, Rc, Re].every(Number.isFinite) || W <= 0 || t <= 0 || H < t || Rc < 0 || Re < 0) throw new RangeError('台座の幅・高さ・厚さ・丸みを確認してください');
  const a = W / 2;
  if (H === t) return [{ x: -a, y: 0 }, { x: a, y: 0 }, { x: a, y: t }, { x: -a, y: t }];
  // 両端の上下の丸みが重ならず、背の高い断面でも端の直線を残せる半径。
  const e = Math.min(Re, t / 2, a / 2, t * (a / H) / 2);
  const radius = angle => Math.min(Rc, (a - e * (1 - Math.sin(angle))) / Math.sin(angle));
  const height = angle => { const s = Math.sin(angle), c = Math.cos(angle), r = radius(angle); return (a * s + t - r - e * (1 + s)) / c + r + e; };
  // 山の傾きを求める。端を丸めて減る高さも含め、下面の最下端をHに合わせる。
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (height(mid) < H) lo = mid; else hi = mid; }
  const angle = (lo + hi) / 2, s = Math.sin(angle), c = Math.cos(angle), r = radius(angle), y = a * Math.tan(angle) - r * (1 / c - 1);
  const arc = (cx, cy, R, start, end) => {
    const pts = [], step = 4 * Math.asin(Math.sqrt(Math.min(1, 0.025 / (2 * R)))), n = Math.max(1, Math.ceil(Math.abs(end - start) / step));
    const angles = Array.from({ length: n + 1 }, (_, i) => start + (end - start) * i / n);
    // 幅・高さの極値は必ず点にする（折れ線にしても寸法が変わらない）。
    for (let k = -2; k <= 2; k++) { const v = k * Math.PI / 2; if (v > Math.min(start, end) && v < Math.max(start, end)) angles.push(v); }
    angles.sort((u, v) => (end > start ? u - v : v - u));
    for (const v of angles) pts.push({ x: cx + R * Math.cos(v), y: cy + R * Math.sin(v) });
    return pts;
  };
  // 右半分を頂上から下面へたどり、左半分は鏡写しで戻る。
  const right = r > 0 ? arc(0, r, r, -Math.PI / 2, -Math.PI / 2 + angle) : [{ x: 0, y: 0 }];
  right[0] = { x: 0, y: 0 };
  if (e > 0) {
    right.push(...arc(a - e, y + e * c / (1 + s), e, -Math.PI / 2 + angle, 0));
    right.push(...arc(a - e, H - e, e, 0, Math.PI / 2 + angle));
  } else right.push({ x: a, y }, { x: a, y: H });
  if (r > t) {
    right.push(...arc(0, r, r - t, -Math.PI / 2 + angle, -Math.PI / 2));
    right[right.length - 1] = { x: 0, y: t };
  } else right.push({ x: 0, y: r + (t - r) / c });
  const points = [...right, ...right.slice(1, -1).reverse().map(p => ({ x: -p.x, y: p.y }))];
  // 円弧と直線のつなぎ目が一致する場合だけ、重なった点を除く。
  const clean = points.filter((p, i) => { const q = points[(i + points.length - 1) % points.length]; return Math.hypot(p.x - q.x, p.y - q.y) > 1e-12; });
  const first = clean.reduce((best, p, i) => p.x < clean[best].x || (p.x === clean[best].x && p.y < clean[best].y) ? i : best, 0);
  return [...clean.slice(first), ...clean.slice(0, first)];
}

/** 背幅シミュレーションの背幅から、表紙の展開図の寸法を決める（事業主決定A・2026-10-12）。
  横幅＝2×(リフィル幅＋小口の余白)＋背幅、高さ＝リフィル高＋上下の余白×2。折り線は背の両端（x）。金具は背の中央。 */
export function coverLayout({ refillW, refillH, spineW, marginTB = 5, marginEdge = 5 }) {
  const r2 = v => Math.round(v * 100) / 100, panel = r2(refillW + marginEdge), W = r2(2 * panel + spineW), H = r2(refillH + 2 * marginTB);
  return { W, H, panel, spineW: r2(spineW), folds: [panel, r2(panel + spineW)], center: { x: r2(panel + spineW / 2), y: r2(H / 2) } };
}
