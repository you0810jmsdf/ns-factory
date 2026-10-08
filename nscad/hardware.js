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
    const L = binderSpec.plate.lengthMm, W = binderSpec.plate.widthMm, ringD = p.ringD || binderSpec.rings.diameterOptionsMm[0];
    outline.push({ type: 'polyline', closed: true, points: roundRect(L, W, binderSpec.plate.cornerRMm || 0) });
    let x = -binderSpec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of binderSpec.holes.pitchMm) { x += pitch; xs.push(x); }
    for (const hx of xs) outline.push({ type: 'circle', cx: hx, cy: 0, r: ringD / 2 });
    for (const rv of binderSpec.rivets) holes.push({ type: 'circle', cx: rv.xMm, cy: rv.yMm, r: rv.dMm / 2 });
    return { outline, holes, solid: { kind: 'binder', spec: binderSpec, ringD, w: L, h: W, z: ringD + binderSpec.plate.thicknessMm }, ringCenters: xs.map(hx => ({ x: hx, y: 0 })) };
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
  const L = spec.plate.lengthMm, W = spec.plate.widthMm, T = spec.plate.thicknessMm, faces = [];
  const box = (cx, cy, w, h, zb, zt) => { const c = [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 }]; faces.push({ kind: 'top', points: c.map(p => ({ x: p.x, y: p.y, z: zt })) }, { kind: 'bottom', points: [...c].reverse().map(p => ({ x: p.x, y: p.y, z: zb })) }); for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; faces.push({ kind: 'side', points: [{ x: a.x, y: a.y, z: zt }, { x: b.x, y: b.y, z: zt }, { x: b.x, y: b.y, z: zb }, { x: a.x, y: a.y, z: zb }] }); } };
  box(at.x, at.y, L, W, z0, z0 + T);
  let x = -spec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; xs.push(x); }
  const R = ringD / 2, wire = 2, open = openAngle * Math.PI / 180;
  for (const hx of xs) for (const side of [-1, 1]) {
    // 半リング：台座中心から y 方向 side に開く。開くときは上端で ±open だけ離れる
    // 輪は台座の上に立つ直径 ringD の円。片側ずつ下端（−90°）から上端（+90°）へ。開くときは上端ほど外へ離す
    const pts = []; for (let k = 0; k <= segments; k++) { const a = -Math.PI / 2 + Math.PI * k / segments, lift = (Math.sin(a) + 1) / 2; pts.push({ x: at.x + hx, y: at.y + side * (R * Math.cos(a) + Math.sin(open) * R * lift), z: z0 + T + R + R * Math.sin(a) }); }
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
function spineRound(n) { return Math.round(n * 100) / 100; }
/** バインダー規格の平面図（上から）SVG。穴中心・リング径・台座外形・リベット・寸法線。mm 単位。 */
export function binderPlanSvg(spec, ringD = null) {
  const L = spec.plate.lengthMm, W = spec.plate.widthMm, D = ringD || spec.rings.diameterOptionsMm[0], f = n => (Math.round(n * 100) / 100).toString();
  let x = -spec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; xs.push(x); }
  const pad = 12, w = L + 2 * pad, h = Math.max(W, D) + 2 * pad + 10;
  const parts = [`<rect x="${f(-L / 2)}" y="${f(-W / 2)}" width="${f(L)}" height="${f(W)}" rx="${f(spec.plate.cornerRMm || 0)}" fill="none" stroke="#000" stroke-width="0.2"/>`];
  for (const hx of xs) parts.push(`<circle cx="${f(hx)}" cy="0" r="${f(D / 2)}" fill="none" stroke="#000" stroke-width="0.2"/><circle cx="${f(hx)}" cy="0" r="0.6" fill="#000"/>`);
  for (const rv of spec.rivets) parts.push(`<circle cx="${f(rv.xMm)}" cy="${f(rv.yMm)}" r="${f(rv.dMm / 2)}" fill="none" stroke="#000" stroke-width="0.2" stroke-dasharray="1 0.5"/>`);
  const dy = Math.max(W, D) / 2 + 5;
  for (let i = 0; i + 1 < xs.length; i++) parts.push(`<line x1="${f(xs[i])}" y1="${f(dy)}" x2="${f(xs[i + 1])}" y2="${f(dy)}" stroke="#000" stroke-width="0.15"/><text x="${f((xs[i] + xs[i + 1]) / 2)}" y="${f(dy - 1)}" font-size="2.5" text-anchor="middle" font-family="sans-serif">${f(spec.holes.pitchMm[i])}</text>`);
  parts.push(`<text x="${f(-L / 2)}" y="${f(-Math.max(W, D) / 2 - 4)}" font-size="3" font-family="sans-serif">${spec.names.ja} ${spec.holes.count}穴 / ring ${f(D)}mm / span ${f(spec.holes.span1toLastMm)}mm</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(-h / 2)} ${f(w)} ${f(h)}"><g id="plan">${parts.join('')}</g></svg>`;
}
/** 側面図（リングの輪が見える向き）と正面図（台座の長手方向）。 */
export function binderSideSvg(spec, ringD = null) {
  const W = spec.plate.widthMm, T = spec.plate.thicknessMm, D = ringD || spec.rings.diameterOptionsMm[0], f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = Math.max(W, D) + 2 * pad, h = D + T + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(-h + pad)} ${f(w)} ${f(h)}"><g id="side"><rect x="${f(-W / 2)}" y="0" width="${f(W)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/><path d="M${f(-D / 2)} 0A${f(D / 2)} ${f(D / 2)} 0 0 1 ${f(D / 2)} 0" fill="none" stroke="#000" stroke-width="0.2"/><text x="${f(-W / 2)}" y="${f(-D - 2)}" font-size="2.5" font-family="sans-serif">ring ${f(D)}mm</text></g></svg>`;
}
export function binderFrontSvg(spec, ringD = null) {
  const L = spec.plate.lengthMm, T = spec.plate.thicknessMm, D = ringD || spec.rings.diameterOptionsMm[0], f = n => (Math.round(n * 100) / 100).toString(), pad = 8, w = L + 2 * pad, h = D + T + 2 * pad;
  let x = -spec.holes.span1toLastMm / 2; const xs = [x]; for (const pitch of spec.holes.pitchMm) { x += pitch; xs.push(x); }
  const rings = xs.map(hx => `<rect x="${f(hx - 1)}" y="${f(-D)}" width="2" height="${f(D)}" fill="none" stroke="#000" stroke-width="0.2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="${f(-w / 2)} ${f(-h + pad)} ${f(w)} ${f(h)}"><g id="front"><rect x="${f(-L / 2)}" y="0" width="${f(L)}" height="${f(T)}" fill="none" stroke="#000" stroke-width="0.2"/>${rings}</g></svg>`;
}
/** 規格 JSON の整合検査：必須キー・ピッチの合計＝span。問題を文字列配列で返す（空＝OK）。 */
export function checkBinderSpec(spec) {
  const out = [];
  for (const k of ['id', 'names', 'holes', 'refill', 'rings', 'plate', 'rivets', 'confidence']) if (!(k in spec)) out.push('missing:' + k);
  if (spec.holes) { if (spec.holes.pitchMm.length !== spec.holes.count - 1) out.push('pitch-count'); const sum = spec.holes.pitchMm.reduce((a, b) => a + b, 0); if (Math.abs(sum - spec.holes.span1toLastMm) > 0.1) out.push('span-mismatch'); }
  if (spec.rings && !spec.rings.diameterOptionsMm?.length) out.push('rings-empty');
  return out;
}
