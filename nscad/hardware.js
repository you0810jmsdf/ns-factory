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
    for (const r of v.plan.rings) outline.push({ type: 'polyline', closed: true, points: [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }] }); /* リングは真上から見た細い棒（線径×リング径）。寝た円ではない */
    for (const rv of binderSpec.rivets) holes.push({ type: 'circle', cx: rv.xMm, cy: rv.yMm, r: rv.dMm / 2 });
    return { outline, holes, solid: { kind: 'binder', spec: binderSpec, ringD, w: L, h: W, z: ringD + base.crownHeightMm - (binderSpec.rings.embedMm ?? 0) }, ringCenters: xs.map(hx => ({ x: hx, y: 0 })) };
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
  if (!spec.base) box(at.x, at.y, L, W, z0, z0 + T);
  else {
    // 断面を長さ方向へ伸ばす。両端の蓋と、各辺の面で閉じる。
    const section = binderSection(base), point = (p, x) => ({ x: at.x + x, y: at.y + p.x, z: z0 + T - p.y });
    faces.push({ kind: 'side', points: section.map(p => point(p, -L / 2)) }, { kind: 'side', points: [...section].reverse().map(p => point(p, L / 2)) });
    for (let i = 0; i < section.length; i++) { const a = section[i], b = section[(i + 1) % section.length]; faces.push({ kind: 'side', points: [point(a, -L / 2), point(a, L / 2), point(b, L / 2), point(b, -L / 2)] }); }
  }
  let x = -spec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; xs.push(x); }
  const R = ringD / 2, wire = 2, open = openAngle * Math.PI / 180;
  for (const hx of xs) for (const side of [-1, 1]) {
    // 半リング：台座中心から y 方向 side に開く。開くときは上端で ±open だけ離れる
    // 輪は台座の上に立つ直径 ringD の円。片側ずつ下端（−90°）から上端（+90°）へ。開くときは上端ほど外へ離す
    const pts = []; for (let k = 0; k <= segments; k++) { const a = -Math.PI / 2 + Math.PI * k / segments, lift = (Math.sin(a) + 1) / 2; pts.push({ x: at.x + hx, y: at.y + side * (R * Math.cos(a) + Math.sin(open) * R * lift), z: z0 + T + R + R * Math.sin(a) - embed }); }
    for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1]; faces.push({ kind: 'side', points: [{ x: a.x - wire / 2, y: a.y, z: a.z }, { x: a.x + wire / 2, y: a.y, z: a.z }, { x: b.x + wire / 2, y: b.y, z: b.z }, { x: b.x - wire / 2, y: b.y, z: b.z }] }); }
  }
  for (const rv of spec.rivets) box(at.x + rv.xMm, at.y + rv.yMm, rv.dMm, rv.dMm, z0 - 1, z0);
  return faces.map(f => ({ ...f, panelId: 'binder', partId: 'binder', color: '#c8b060' }));
}
/** 必要な背幅：リング径 + 金具ベース厚 + 革厚×2 + 遊び。 */
export function spineWidth(ringD, baseThickness = 2, leatherThickness = 1.5, playMm = 2) { return ringD + baseThickness + 2 * leatherThickness + playMm; }
/** 背幅の断面シミュレーション（純関数）。閉じた手帳の断面：台座（厚さ plateT）の上に外径 ringD+2*wireD の輪が立ち、表紙は背の両端で 90° 折れて輪の両脇を通る。
 *  内幅 = 輪の外径 + 2*遊び（輪と表紙内面のすき間）。背の型紙幅 = 内幅 + 2*折り代（θ(r + K t)・θ=90°）。輪の高さが表紙の張り出し（サポータ厚＋台座厚）を超える分は干渉として返す。
 *  params: {ringD（内径）, wireD（線径）, plateT, leatherT, supporterT, playMm, foldR（曲げ内半径）, k} → {innerW, outerRingD, foldEach, spineW, ringTop, coverGap, section} */
export function spineSim({ ringD = 20, wireD = 2, plateT = 2, leatherT = 1.5, supporterT = 0, playMm = 1.5, foldR = 0, k = 0.5 } = {}) {
  const num = v => Number.isFinite(v) && v >= 0;
  if (![ringD, wireD, plateT, leatherT, supporterT, playMm, foldR, k].every(num) || ringD <= 0) return null;
  const outerRingD = ringD + 2 * wireD, innerW = outerRingD + 2 * playMm, foldEach = (Math.PI / 2) * (foldR + k * leatherT), spineW = innerW + 2 * foldEach;
  const ringTop = supporterT + plateT + outerRingD; // 背の内面からの輪の天井高さ
  const section = { // 断面図用（mm・背の内面中央を原点・上向き正）
    plate: { x: -12, y: supporterT, w: 24, h: plateT }, supporter: supporterT > 0 ? { x: -innerW / 2, y: 0, w: innerW, h: supporterT } : null,
    ring: { cx: 0, cy: supporterT + plateT + outerRingD / 2, rOuter: outerRingD / 2, rInner: ringD / 2 },
    coverL: { x: -innerW / 2 - leatherT, y: 0, w: leatherT, h: ringTop + 10 }, coverR: { x: innerW / 2, y: 0, w: leatherT, h: ringTop + 10 }, spine: { x: -innerW / 2 - leatherT, y: -leatherT, w: innerW + 2 * leatherT, h: leatherT },
  };
  return { innerW: spineRound(innerW), outerRingD: spineRound(outerRingD), foldEach: spineRound(foldEach), spineW: spineRound(spineW), ringTop: spineRound(ringTop), section };
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
  const body = [rect(s.spine, '#d9c7a0'), rect(s.coverL, '#d9c7a0'), rect(s.coverR, '#d9c7a0'), s.supporter ? rect(s.supporter, '#c4ad7f') : '', rect(s.plate, '#9a9a9a'),
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
  const t = leatherT, T = sim.innerW + 2 * t, mid = T / 2, rIn = sim.innerW / 2, xc = t + rIn; /* 背は半円：中心 (xc, mid)・内半径 rIn・外半径 rIn+t。表裏の表紙は xc から右へ接続する */
  const plateLeft = xc - Math.sqrt(Math.max(0, rIn * rIn - (plateW / 2) ** 2)), ringX = plateLeft + supporterT + plateT + sim.outerRingD / 2, tipX = ringX + refillW - holeEdge; /* 台座は丸い内面に両端で当たる位置 */
  const coverW = p.coverW > 0 ? p.coverW : tipX + 4 - xc;
  const rect = (x1, y1, x2, y2, role, hidden = false) => ({ type: 'polyline', closed: true, role, ...(hidden ? { hidden } : {}), points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
  const arc = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return { x: xc + r * Math.cos(a), y: mid + r * Math.sin(a) }; }), segs = 36;
  const spine = { type: 'polyline', closed: true, role: 'spine', points: [...arc(rIn + t, -Math.PI / 2, -3 * Math.PI / 2, segs), ...arc(rIn, -3 * Math.PI / 2, -Math.PI / 2, segs)] }; /* 外周を上→左→下、内周を下→左→上 */
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
function spineRound(n) { return Math.round(n * 100) / 100; }
/** バインダー金具の3つの見え方を、1か所の寸法から作る（平面＝真上から・正面＝台座の長手方向の横から・側面＝台座の端から）。置いた外形・3つの図・3D は、どれもここから／ここと同じ寸法で作り、食い違わないようにする。
 *  座標は mm。平面は（長さ方向 x・台座の幅方向 y）、正面は（x・高さ y＝上がマイナス・台座の上面が 0）、側面は（幅方向 x・高さ y）。リングは台座の上面に立つ丸い輪（外径＝リング径）で、真上からは線径×リング径の細い棒、横からは棒、端からは輪に見える。 */
export function binderViews(spec, ringD = null) {
  const base = binderBase(spec), L = base.lengthMm, W = base.sectionWidthMm, T = base.crownHeightMm, D = ringD || spec.rings.diameterOptionsMm[0], wire = BINDER_WIRE_MM, embed = spec.rings.embedMm ?? 0;
  let x = -spec.holes.span1toLastMm / 2; const ringXs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; ringXs.push(x); }
  const box = (minX, maxX, minY, maxY) => ({ minX, maxX, minY, maxY });
  return {
    L, W, T, D, wire, ringXs,
    plan: { plate: box(-L / 2, L / 2, -W / 2, W / 2), rings: ringXs.map(hx => box(hx - wire / 2, hx + wire / 2, -D / 2, D / 2)) },
    front: { plate: box(-L / 2, L / 2, 0, T), rings: ringXs.map(hx => box(hx - wire / 2, hx + wire / 2, -(D - embed), 0)) },
    side: { plate: box(-W / 2, W / 2, 0, T), ring: { cx: 0, cy: -D / 2 + embed, rOuter: D / 2, rInner: D / 2 - wire }, ...(spec.base ? { section: binderSection(base) } : {}) },
  };
}
/** 平面図（真上から）。リングは台座に直角に立つので、線径×リング径の細い棒が並ぶ。 */
export function binderPlanSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { L, W, D, plan } = v, f = n => (Math.round(n * 100) / 100).toString(), xs = v.ringXs;
  const pad = 12, w = L + 2 * pad, h = Math.max(W, D) + 2 * pad + 10;
  const parts = [`<rect x="${f(-L / 2)}" y="${f(-W / 2)}" width="${f(L)}" height="${f(W)}" rx="${f(binderBase(spec).cornerRMm || 0)}" fill="none" stroke="#000" stroke-width="0.2"/>`];
  for (const r of plan.rings) parts.push(`<rect x="${f(r.minX)}" y="${f(r.minY)}" width="${f(r.maxX - r.minX)}" height="${f(r.maxY - r.minY)}" fill="none" stroke="#000" stroke-width="0.2"/><circle cx="${f((r.minX + r.maxX) / 2)}" cy="0" r="0.6" fill="#000"/>`);
  for (const rv of spec.rivets) parts.push(`<circle cx="${f(rv.xMm)}" cy="${f(rv.yMm)}" r="${f(rv.dMm / 2)}" fill="none" stroke="#000" stroke-width="0.2" stroke-dasharray="1 0.5"/>`);
  const dy = Math.max(W, D) / 2 + 5;
  for (let i = 0; i + 1 < xs.length; i++) parts.push(`<line x1="${f(xs[i])}" y1="${f(dy)}" x2="${f(xs[i + 1])}" y2="${f(dy)}" stroke="#000" stroke-width="0.15"/><text x="${f((xs[i] + xs[i + 1]) / 2)}" y="${f(dy - 1)}" font-size="2.5" text-anchor="middle" font-family="sans-serif">${f(spec.holes.pitchMm[i])}</text>`);
  parts.push(`<text x="${f(-L / 2)}" y="${f(-Math.max(W, D) / 2 - 4)}" font-size="3" font-family="sans-serif">${spec.names.ja} ${spec.holes.count}穴 / ring ${f(D)}mm / span ${f(spec.holes.span1toLastMm)}mm</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)}"><g id="plan">${parts.join('')}</g></svg>`;
}
/** 側面図（台座の端から）。リングは台座の上面に立つ丸い輪（外径＝リング径・太さ＝線径）。 */
export function binderSideSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { W, T, D, side } = v, f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = Math.max(W, D) + 2 * pad, embed = spec.rings.embedMm ?? 0, h = D - embed + Math.max(T, embed) + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(spec.base || spec.rings.embedMm ? -(D - (spec.rings.embedMm ?? 0)) - pad : -h + pad)} ${f(w)} ${f(h)}"><g id="side">${side.section ? `<polygon points="${side.section.map(p => f(p.x) + ',' + f(p.y)).join(' ')}" fill="none" stroke="#000" stroke-width="0.2"/>` : `<rect x="${f(side.plate.minX)}" y="0" width="${f(W)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/>`}<circle cx="${f(side.ring.cx)}" cy="${f(side.ring.cy)}" r="${f(side.ring.rOuter)}" fill="none" stroke="#000" stroke-width="0.2"/><circle cx="${f(side.ring.cx)}" cy="${f(side.ring.cy)}" r="${f(side.ring.rInner)}" fill="none" stroke="#000" stroke-width="0.2"/><text x="${f(-W / 2)}" y="${f(-D + (spec.rings.embedMm ?? 0) - 2)}" font-size="2.5" font-family="sans-serif">ring ${f(D)}mm</text></g></svg>`;
}
/** 正面図（台座の長手方向の横から）。リングは台座の上面に立つ細い棒（線径×リング径）。 */
export function binderFrontSvg(spec, ringD = null) {
  const v = binderViews(spec, ringD), { L, T, D, front } = v, f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = L + 2 * pad, h = D - (spec.rings.embedMm ?? 0) + T + 2 * pad;
  const rings = front.rings.map(r => `<rect x="${f(r.minX)}" y="${f(r.minY)}" width="${f(r.maxX - r.minX)}" height="${f(r.maxY - r.minY)}" fill="none" stroke="#000" stroke-width="0.2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(spec.base || spec.rings.embedMm ? -(D - (spec.rings.embedMm ?? 0)) - pad : -h + pad)} ${f(w)} ${f(h)}"><g id="front"><rect x="${f(-L / 2)}" y="0" width="${f(L)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/>${rings}</g></svg>`;
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
  const v = binderViews(spec, ringD), { T, D, wire, W, L } = v, z = binderZRange(spec, v.D), zmid = (z.min + z.max) / 2, dOf = zz => dc - (zz - zmid);
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
