// 座標・長さは mm、Y 下向き。角度は度、時計回りが正。
const EPS = 1e-9;
/** 2 点 {x,y} を受け取り、距離を返す。 */
export function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
/** 2 ベクトルを受け取り、内積を返す。 */
export function dot(a, b) { return a.x * b.x + a.y * b.y; }
/** 点／図形／穴、角度(度)、任意の中心(mm)から、時計回りに回転した新データを返す。 */
export function rotate(p, deg, origin = { x: 0, y: 0 }) {
  if (p.type || 'angleDeg' in p) return transformGeometry(p, q => rotate(q, deg, origin), a => a + deg);
  const a = deg * Math.PI / 180, x = p.x - origin.x, y = p.y - origin.y;
  return { x: origin.x + x * Math.cos(a) - y * Math.sin(a), y: origin.y + x * Math.sin(a) + y * Math.cos(a) };
}

/** 図形／点／穴と座標・角度変換から独立した変換結果を返す。反射時は円弧端を交換する。 */
function transformGeometry(s, point, angle = a => a, reflected = false) {
  const out = { ...s };
  for (const [x, y] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2'], ['c1x', 'c1y'], ['c2x', 'c2y'], ['cx', 'cy']]) {
    if (x in s && y in s) { const p = point({ x: s[x], y: s[y] }); out[x] = p.x; out[y] = p.y; }
  }
  if (s.points) out.points = s.points.map(point);
  if (s.nodes) out.nodes = s.nodes.map(n => { const a = point({ x: n.x, y: n.y }), i = point({ x: n.inX, y: n.inY }), o = point({ x: n.outX, y: n.outY }); return { ...n, x: a.x, y: a.y, inX: i.x, inY: i.y, outX: o.x, outY: o.y }; });
  if (s.type === 'dimension' && reflected) out.offset = -s.offset;
  if ('angleDeg' in s) out.angleDeg = norm(angle(s.angleDeg));
  if (s.type === 'arc') {
    out.startDeg = norm(angle(reflected ? s.endDeg : s.startDeg));
    out.endDeg = out.startDeg + arcSweep(s);
  }
  return out;
}
/** 図形／点／穴と mm の移動量から新しい同型データを返す。 */
/** 図形／点／穴を、横方向だけ mapX(x) で動かした新データ（縦は変えない）。座標の持ち方は translate と同じ全項目（端点・中心・ベジェの制御点・節点とそのハンドル・折れ線の頂点）。 */
export function warpX(s, mapX) { return transformGeometry(s, p => ({ x: mapX(p.x), y: p.y })); }
export function translate(s, dx, dy) { return transformGeometry(s, p => ({ x: p.x + dx, y: p.y + dy })); }
/** 図形／点／穴を、基準点 origin を動かさずに横 sx 倍・縦 sy 倍へ伸縮した新データを返す（倍率は正の数。そうでなければ RangeError）。
 *  縦横が同じ倍率なら円・円弧は半径が変わるだけ。縦横が違うと円・円弧は折れ線（円は閉じた形・円弧は開いた線）になる。文字の大きさは同じ倍率（縦横が違えば幾何平均）、画像は幅と高さ、寸法はずらし量も伸縮する。 */
export function scaleGeometry(s, sx, sy, origin) {
  if (!(Number.isFinite(sx) && sx > 0 && Number.isFinite(sy) && sy > 0)) throw new RangeError('scale');
  const point = p => ({ x: origin.x + (p.x - origin.x) * sx, y: origin.y + (p.y - origin.y) * sy }), uniform = Math.abs(sx - sy) < 1e-12, mean = uniform ? sx : Math.sqrt(sx * sy);
  if (!uniform && (s.type === 'circle' || s.type === 'arc')) {
    let pts = flattenShape(s, 0.05); if (s.type === 'circle' && pts.length > 1 && distance(pts[0], pts.at(-1)) < 1e-9) pts = pts.slice(0, -1);
    const { cx, cy, r, startDeg, endDeg, ...rest } = s; return { ...rest, type: 'polyline', closed: s.type === 'circle', points: pts.map(point) };
  }
  const out = transformGeometry(s, point);
  if (s.type === 'circle' || s.type === 'arc') out.r = s.r * sx;
  else if (s.type === 'text') out.sizeMm = s.sizeMm * mean;
  else if (s.type === 'image') { out.wMm = s.wMm * sx; out.hMm = s.hMm * sy; }
  else if (s.type === 'dimension') out.offset = s.offset * mean;
  return out;
}
/** 図形／点／穴を垂直線 x=c で左右反転した新データを返す。 */
export function mirrorX(s, c = 0) { return transformGeometry(s, p => ({ x: 2 * c - p.x, y: p.y }), a => 180 - a, true); }
/** 図形／点／穴を水平線 y=c で上下反転した新データを返す。 */
export function mirrorY(s, c = 0) { return transformGeometry(s, p => ({ x: p.x, y: 2 * c - p.y }), a => -a, true); }

/** 共有端点を持つ2線分と C 寸法(mm)から両辺を等距離切り取る線を返す。不成立は null。 */
export function chamferCorner(a, b, c) {
  if (!filletCorner(a, b, Math.min(c, 1e-6)) || !Number.isFinite(c) || c <= 0) return null;
  const ap = [{x:a.x1,y:a.y1},{x:a.x2,y:a.y2}], bp = [{x:b.x1,y:b.y1},{x:b.x2,y:b.y2}];
  const i = ap.findIndex(p => bp.some(q => distance(p,q) < EPS)), j = bp.findIndex(q => distance(ap[i],q) < EPS);
  const corner = ap[i], ends = [ap[1-i],bp[1-j]];
  if (ends.some(p => distance(p,corner) < c)) return null;
  const [p,q] = ends.map(p => { const f=c/distance(p,corner); return {x:corner.x+(p.x-corner.x)*f,y:corner.y+(p.y-corner.y)*f}; });
  return {type:'line',x1:p.x,y1:p.y,x2:q.x,y2:q.y};
}

/** 共有端点を持つ2線分と正の半径(mm)から接円弧を返す。不成立・短すぎる線は null。入力は不変。 */
export function filletCorner(l1, l2, radius) {
  if (l1.type !== 'line' || l2.type !== 'line' || !Number.isFinite(radius) || radius <= 0) return null;
  const a = [{ x: l1.x1, y: l1.y1 }, { x: l1.x2, y: l1.y2 }], b = [{ x: l2.x1, y: l2.y1 }, { x: l2.x2, y: l2.y2 }];
  let pair;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (distance(a[i], b[j]) < EPS) pair = [i, j];
  if (!pair) return null;
  const [i, j] = pair, corner = a[i], la = distance(corner, a[1 - i]), lb = distance(corner, b[1 - j]);
  if (la < EPS || lb < EPS) return null;
  const u = { x: (a[1 - i].x - corner.x) / la, y: (a[1 - i].y - corner.y) / la }, v = { x: (b[1 - j].x - corner.x) / lb, y: (b[1 - j].y - corner.y) / lb };
  const theta = Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
  if (theta < EPS || Math.PI - theta < EPS) return null;
  const reach = radius / Math.tan(theta / 2);
  if (reach > la + EPS || reach > lb + EPS) return null;
  const factor = radius / Math.sin(theta / 2) / Math.hypot(u.x + v.x, u.y + v.y);
  const cx = corner.x + (u.x + v.x) * factor, cy = corner.y + (u.y + v.y) * factor;
  const angles = [u, v].map(w => norm(Math.atan2(corner.y + w.y * reach - cy, corner.x + w.x * reach - cx) * 180 / Math.PI));
  if (norm(angles[1] - angles[0]) > 180) angles.reverse();
  return { type: 'arc', cx, cy, r: radius, startDeg: angles[0], endDeg: angles[0] + norm(angles[1] - angles[0]) };
}

/** 点と方向で表した2直線から交点を返す。平行なら null。 */
function infiniteIntersection(p, v, q, w) {
  const den = cross(v, w);
  if (Math.abs(den) < EPS) return null;
  const t = cross({ x: q.x - p.x, y: q.y - p.y }, w) / den;
  return { x: p.x + t * v.x, y: p.y + t * v.y };
}
/** 点列の符号付き倍面積を返す。Y 下向きの時計回りが正。 */
function signedArea(points) { return points.reduce((sum, p, i) => sum + cross(p, points[(i + 1) % points.length]), 0); }
/** 点列・距離(mm)・閉フラグからオフセット点列を返す。閉図形は正が外、開図形は正が左。退化は []。交差ループは大きい方を残す簡易処理。 */
export function offsetPolyline(points, d, closed = false, {join='miter', tolerance=0.01} = {}) {
  if (!Number.isFinite(d)) return [];
  let pts = points.filter((p, i) => !i || distance(p, points[i - 1]) > EPS).map(p => ({ ...p }));
  if (closed && pts.length > 1 && distance(pts[0], pts.at(-1)) < EPS) pts.pop();
  if (pts.length < (closed ? 3 : 2)) return [];
  const area = closed ? signedArea(pts) : 0;
  if (closed && Math.abs(area) < EPS) return [];
  if (d === 0) return pts;
  const side = closed ? -Math.sign(area) * d : -d;
  const edges = pts.slice(0, closed ? undefined : -1).map((p, i) => {
    const q = pts[(i + 1) % pts.length], len = distance(p, q), v = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    return { p: { x: p.x - v.y * side, y: p.y + v.x * side }, v };
  });
  let out = pts.map((p, i) => {
    if (!closed && i === 0) return edges[0].p;
    if (!closed && i === pts.length - 1) { const e = edges.at(-1); return { x: p.x - e.v.y * side, y: p.y + e.v.x * side }; }
    const a = edges[(i - 1 + edges.length) % edges.length], b = edges[i];
    if (join === 'round' && cross(a.v,b.v)*side < -EPS) {
      const start=Math.atan2(a.v.x*side,-a.v.y*side),end=Math.atan2(b.v.x*side,-b.v.y*side);
      const sweep=Math.atan2(Math.sin(end-start),Math.cos(end-start)),r=Math.abs(d);
      const count=Math.max(1,Math.ceil(Math.abs(sweep)/Math.max(1e-5,2*Math.acos(Math.max(-1,1-tolerance/r)))));
      return Array.from({length:count+1},(_,i)=>({x:p.x+r*Math.cos(start+sweep*i/count),y:p.y+r*Math.sin(start+sweep*i/count)}));
    }
    const hit = infiniteIntersection(a.p, a.v, b.p, b.v);
    if (!hit && dot(a.v, b.v) > 0) return b.p;
    // 過大なマイターはベベル結合に置き換える。
    if (hit && distance(hit, p) <= Math.abs(d) * 10) return hit;
    return [{ x: p.x - a.v.y * side, y: p.y + a.v.x * side }, b.p];
  }).flat();
  for (let pass = 0; pass < points.length * 2; pass++) {
    let changed = false;
    outer: for (let i = 0; i < out.length - (closed ? 0 : 1); i++) for (let j = i + 2; j < out.length - (closed ? 0 : 1); j++) {
      if (closed && i === 0 && j === out.length - 1) continue;
      const a = out[i], b = out[(i + 1) % out.length], c = out[j], e = out[(j + 1) % out.length];
      const hits = intersections({ type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, { type: 'line', x1: c.x, y1: c.y, x2: e.x, y2: e.y });
      if (!hits.length) continue;
      const h = hits[0], outside = [...out.slice(0, i + 1), h, ...out.slice(j + 1)], loop = [h, ...out.slice(i + 1, j + 1)];
      out = closed && Math.abs(signedArea(loop)) > Math.abs(signedArea(outside)) ? loop : outside;
      changed = true; break outer;
    }
    if (!changed) break;
  }
  out = out.filter((p, i) => !i || distance(p, out[i - 1]) > EPS);
  if (closed) {
    if (out.length < 3 || signedArea(out) * area <= EPS) return [];
    // 内側で消滅した輪郭（辺を越えて折り返したもの）を拒否する。
    if (d < 0 && out.some(p => Math.min(...pts.map((q, i) => segmentDistance(q, pts[(i + 1) % pts.length], p))) < -d - 1e-7)) return [];
  }
  return out;
}
/** 図形と符号付き距離(mm)から新図形を返す。不成立は null。円・円弧は正が半径増、ベジェは公差0.01mmで平坦化。 */
export function offsetShape(s, d) {
  if (!Number.isFinite(d)) return null;
  if (s.type === 'circle' || s.type === 'arc') return s.r + d > EPS ? { ...s, r: s.r + d } : null;
  if (s.type === 'line') {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    return len > EPS ? translate(s, (s.y2 - s.y1) / len * d, -(s.x2 - s.x1) / len * d) : null;
  }
  if (s.type === 'text' || s.type === 'dimension' || s.type === 'fold' || s.type === 'image') return null;
  const points = s.type === 'bezier' || s.type === 'path' ? flattenShape(s, 0.01) : s.points;
  if (!points) return null;
  const closed = (s.type === 'polyline' || s.type === 'path') && s.closed, result = offsetPolyline(points, d, closed);
  return result.length >= (closed ? 3 : 2) ? { id: s.id, layer: s.layer, type: 'polyline', points: result, closed } : null;
}
/** 連続経路と距離・結合指定から平坦化オフセット図形を返す。不成立は null。 */
export function offsetPath(path,d,options={}) {
  let points=path.items.flatMap((item,i)=>{let ps=flattenShape(item.shape,0.01);if(item.reversed)ps.reverse();return i?ps.slice(1):ps;});
  if(path.reversed)points.reverse();
  points=offsetPolyline(points,d,path.closed,options);
  return points.length >= (path.closed?3:2) ? {type:'polyline',points,closed:path.closed} : null;
}
/** 角度を [0,360) に正規化して返す。 */
function norm(a) { return ((a % 360) + 360) % 360; }
/** 円弧から時計回りの掃引角を返す。同角は長さゼロ、差が360度以上なら全周。 */
export function arcSweep(s) { return Math.abs(s.endDeg - s.startDeg) >= 360 ? 360 : norm(s.endDeg - s.startDeg); }
/** 円／円弧と角度から円周上の点を返す。 */
export function circlePoint(s, deg) { const a = deg * Math.PI / 180; return { x: s.cx + s.r * Math.cos(a), y: s.cy + s.r * Math.sin(a) }; }
/** 円弧と角度から、その角度が掃引範囲内かを返す。 */
function onArc(s, deg) { return norm(deg - s.startDeg) <= arcSweep(s) + EPS; }
/** 3次ベジェとパラメータ t (0..1) から曲線上の点を返す。 */
export function bezierPoint(s, t) {
  const u = 1 - t;
  return { x: u ** 3 * s.x1 + 3 * u * u * t * s.c1x + 3 * u * t * t * s.c2x + t ** 3 * s.x2,
    y: u ** 3 * s.y1 + 3 * u * u * t * s.c1y + 3 * u * t * t * s.c2y + t ** 3 * s.y2 };
}
/** 線分両端と点から、線分までの最短距離を返す。 */
function segmentDistance(a, b, p) {
  const v = { x: b.x - a.x, y: b.y - a.y }, n = dot(v, v);
  const t = n ? Math.max(0, Math.min(1, dot({ x: p.x - a.x, y: p.y - a.y }, v) / n)) : 0;
  return distance(p, { x: a.x + t * v.x, y: a.y + t * v.y });
}
/** 昇べき順の多項式係数と x から値を返す。 */
function evaluate(c, x) { return c.reduceRight((v, a) => v * x + a, 0); }
/** 多項式係数から [0,1] の実根を二分探索で返す（重根も含む）。 */
function roots(c) {
  const scale = Math.max(...c.map(Math.abs));
  if (!scale) return [];
  c = c.map(v => v / scale);
  while (c.length > 1 && Math.abs(c.at(-1)) < 1e-14) c.pop();
  if (c.length === 1) return [];
  if (c.length === 2) { const t = -c[0] / c[1]; return t >= 0 && t <= 1 ? [t] : []; }
  const cuts = [0, ...roots(c.slice(1).map((v, i) => v * (i + 1))), 1].sort((a, b) => a - b);
  const out = cuts.filter(t => Math.abs(evaluate(c, t)) < 1e-12);
  for (let i = 1; i < cuts.length; i++) {
    let lo = cuts[i - 1], hi = cuts[i], f = evaluate(c, lo);
    if (f * evaluate(c, hi) >= 0) continue;
    for (let j = 0; j < 60; j++) { const m = (lo + hi) / 2; if (f * evaluate(c, m) > 0) { lo = m; f = evaluate(c, m); } else hi = m; }
    out.push((lo + hi) / 2);
  }
  return out;
}
/** ベジェの一軸の4座標から多項式係数を返す。 */
function coefficients(a, b, c, d) { return [a, 3 * (b - a), 3 * (a - 2 * b + c), -a + 3 * b - 3 * c + d]; }
/** 図形と点から輪郭までの最短距離を返す。ベジェは停留点を数値的に解く。 */
export function distToShape(s, p) {
  if (s.type === 'fold') return distToShape({ ...s, type: 'line' }, p);
  if (s.type === 'image') { const q = rotate(p, -s.angleDeg, s), b = imageBox(s); return Math.max(b.minX - q.x, q.x - b.maxX, b.minY - q.y, q.y - b.maxY, 0); }
  if (s.type === 'path') return Math.min(Infinity, ...pathSegments(s).map(seg => distToShape(seg, p)));
  if (s.type === 'text') { const q = rotate(p, -s.angleDeg, s), b = textBox(s); return Math.max(b.minX - q.x, q.x - b.maxX, b.minY - q.y, q.y - b.maxY, 0); }
  if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return segmentDistance(d.a, d.b, p); }
  if (s.type === 'line') return segmentDistance({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, p);
  if (s.type === 'circle') return Math.abs(distance(p, { x: s.cx, y: s.cy }) - s.r);
  if (s.type === 'arc') {
    const a = Math.atan2(p.y - s.cy, p.x - s.cx) * 180 / Math.PI;
    return onArc(s, a) ? Math.abs(distance(p, { x: s.cx, y: s.cy }) - s.r) : Math.min(distance(p, circlePoint(s, s.startDeg)), distance(p, circlePoint(s, s.endDeg)));
  }
  if (s.type === 'polyline') {
    let d = Infinity;
    for (let i = 1; i < s.points.length; i++) d = Math.min(d, segmentDistance(s.points[i - 1], s.points[i], p));
    return s.closed ? Math.min(d, segmentDistance(s.points.at(-1), s.points[0], p)) : d;
  }
  if (s.type === 'bezier') {
    const x = coefficients(s.x1, s.c1x, s.c2x, s.x2), y = coefficients(s.y1, s.c1y, s.c2y, s.y2);
    x[0] -= p.x; y[0] -= p.y;
    const c = Array(6).fill(0);
    for (let i = 0; i < 4; i++) for (let j = 1; j < 4; j++) c[i + j - 1] += j * (x[i] * x[j] + y[i] * y[j]);
    return Math.min(...[0, 1, ...roots(c)].map(t => distance(p, bezierPoint(s, t))));
  }
  return Infinity;
}
/** 図形から端点・各辺中点・中心の点配列を返す。ベジェ中点は t=0.5。 */
export function snapPoints(s) {
  if (s.type === 'fold') return snapPoints({ ...s, type: 'line' });
  if (s.type === 'image') return [];
  if (s.type === 'path') return [...s.nodes.map(n => ({ x: n.x, y: n.y })), ...pathSegments(s).map(seg => seg.type === 'line' ? { x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 } : bezierPoint(seg, 0.5))];
  if (s.type === 'text') return [{ x: s.x, y: s.y }];
  if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, d.a, d.b]; }
  if (s.type === 'circle') return [{ x: s.cx, y: s.cy }];
  if (s.type === 'arc') return [circlePoint(s, s.startDeg), circlePoint(s, s.endDeg), circlePoint(s, s.startDeg + arcSweep(s) / 2), { x: s.cx, y: s.cy }];
  if (s.type === 'bezier') return [{ x: s.x1, y: s.y1 }, bezierPoint(s, 0.5), { x: s.x2, y: s.y2 }];
  const pts = s.type === 'line' ? [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] : s.points;
  const out = pts.map(p => ({ ...p }));
  for (let i = 0; i < pts.length - (s.closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
  return out;
}
/** 2ベクトルから2次元外積のスカラー値を返す。 */
function cross(a, b) { return a.x * b.y - a.y * b.x; }
/** 線分／円の2図形から有限交点配列を返す。重なる線分は重複区間の端、同一円は空配列。 */
export function intersections(a, b) {
  if (!['line', 'circle'].includes(a.type) || !['line', 'circle'].includes(b.type)) return [];
  if (a.type === 'circle' && b.type === 'line') return intersections(b, a);
  if (a.type === 'line') {
    const p = { x: a.x1, y: a.y1 }, q = { x: a.x2, y: a.y2 }, v = { x: q.x - p.x, y: q.y - p.y }, n = dot(v, v);
    if (n < EPS * EPS) return distToShape(b, p) < EPS ? [p] : [];
    if (b.type === 'line') {
      const r = { x: b.x1, y: b.y1 }, z = { x: b.x2, y: b.y2 }, w = { x: z.x - r.x, y: z.y - r.y }, d = { x: r.x - p.x, y: r.y - p.y }, k = cross(v, w);
      if (Math.abs(k) < EPS) return [p, q, r, z].filter((pt, i, all) => distToShape(a, pt) < EPS && distToShape(b, pt) < EPS && !all.slice(0, i).some(x => distance(x, pt) < EPS));
      const t = cross(d, w) / k, u = cross(d, v) / k;
      return t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS ? [{ x: p.x + t * v.x, y: p.y + t * v.y }] : [];
    }
    const d = { x: p.x - b.cx, y: p.y - b.cy }, t = -dot(v, d) / n;
    const h = b.r ** 2 - ((d.x + t * v.x) ** 2 + (d.y + t * v.y) ** 2);
    if (h < -EPS) return [];
    const dt = Math.sqrt(Math.max(0, h) / n);
    return (dt < EPS ? [t] : [t - dt, t + dt]).filter(u => u >= -EPS && u <= 1 + EPS).map(u => ({ x: p.x + u * v.x, y: p.y + u * v.y }));
  }
  const d = Math.hypot(b.cx - a.cx, b.cy - a.cy);
  if (d < EPS || d > a.r + b.r + EPS || d < Math.abs(a.r - b.r) - EPS) return [];
  const l = (a.r ** 2 - b.r ** 2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a.r ** 2 - l * l));
  const vx = (b.cx - a.cx) / d, vy = (b.cy - a.cy) / d, p = { x: a.cx + l * vx, y: a.cy + l * vy };
  return h < EPS ? [p] : [{ x: p.x - h * vy, y: p.y + h * vx }, { x: p.x + h * vy, y: p.y - h * vx }];
}
/** 点配列から {minX,minY,maxX,maxY} を返す。空は null。 */
function bounds(pts) { return pts.reduce((b, p) => b ? { minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) } : { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }, null); }
/** 図形から厳密な軸平行 bbox を返す（ベジェ極値は数値計算）。 */
export function bboxOf(s) {
  if (s.type === 'fold') return bboxOf({ ...s, type: 'line' });
  if (s.type === 'image') { const b = imageBox(s); return bounds([{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }].map(p => rotate(p, s.angleDeg, s))); }
  if (s.type === 'path') return bounds(pathSegments(s).flatMap(seg => { const b = bboxOf(seg); return [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }]; }).concat(s.nodes.map(n => ({ x: n.x, y: n.y }))));
  if (s.type === 'text') { const b = textBox(s); return bounds([{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }].map(p => rotate(p, s.angleDeg, s))); }
  if (s.type === 'dimension') return bounds(snapPoints(s));
  if (s.type === 'circle') return { minX: s.cx - s.r, minY: s.cy - s.r, maxX: s.cx + s.r, maxY: s.cy + s.r };
  if (s.type === 'arc') return bounds([s.startDeg, s.endDeg, ...[0, 90, 180, 270].filter(a => onArc(s, a))].map(a => circlePoint(s, a)));
  if (s.type === 'bezier') {
    const ts = [0, 1];
    for (const axis of ['x', 'y']) { const c = coefficients(s[axis + '1'], s['c1' + axis], s['c2' + axis], s[axis + '2']); ts.push(...roots(c.slice(1).map((v, i) => v * (i + 1)))); }
    return bounds(ts.map(t => bezierPoint(s, t)));
  }
  return bounds(s.type === 'polyline' ? s.points : [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]);
}
/** 文書の全図形と穴の実寸輪郭から bbox を返す。空文書は null。工具のない穴は中心のみ。 */
export function bboxOfDoc(doc) { return bounds([...doc.shapes.flatMap(s => { const b = bboxOf(s); return [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }]; }), ...doc.holes.flatMap(h=>{
  const a=doc.tools && holeAppearance(h,doc);if(!a)return [h];
  if(a.kind==='circle'||a.kind==='dot')return [{x:h.x-a.width/2,y:h.y-a.width/2},{x:h.x+a.width/2,y:h.y+a.width/2}];
  const pts=a.kind==='diamond'?[{x:-a.width/2,y:0},{x:a.width/2,y:0},{x:0,y:-a.height/2},{x:0,y:a.height/2}]:[{x:-a.width/2,y:-a.height/2},{x:a.width/2,y:-a.height/2},{x:a.width/2,y:a.height/2},{x:-a.width/2,y:a.height/2}];
  return pts.map(p=>{const q=rotate(p,h.angleDeg);return {x:q.x+h.x,y:q.y+h.y};});
})]); }
/** 図形の色（5色のみ）と線種（2種のみ）。どちらも省略可（既定の見た目を使う）。 */
export const SHAPE_COLORS = ['blue', 'green', 'red', 'white', 'yellow'];
export const LINE_STYLES = ['solid', 'dashed'];
/** 新しい独立した version:8 の mm 文書を返す。副作用なし。既定レイヤーは型紙・金具・ガイド（名前が id と同じときは UI 側で翻訳する）。parts＝部品（厚み）、seams＝縫い合わせ線。 */
export function newDoc() { return { version: 8, unit: 'mm', shapes: [], holes: [], paths: [], parts: [], seams: [], mark: 'tool', dotD: 2, layers: [{ id: 'pattern', name: 'pattern', visible: true, locked: false }, { id: 'hardware', name: 'hardware', visible: true, locked: false }, { id: 'guide', name: 'guide', visible: true, locked: false }], tools: [] }; }
/** 任意の JSON 値を受け取り、文書構造・有限数・ID参照が正しい場合 true を返す。入力は変更しない。 */
export function validateDoc(d) {
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const id = x => typeof x === 'string' && x.length > 0;
  const nums = (x, keys) => keys.every(k => Number.isFinite(x[k]));
  const unique = xs => xs.every(x => obj(x) && id(x.id)) && new Set(xs.map(x => x.id)).size === xs.length;
  if (!obj(d) || d.version !== 8 || d.unit !== 'mm' || !['shapes', 'holes', 'layers', 'tools', 'paths', 'parts', 'seams'].every(k => Array.isArray(d[k]) && unique(d[k])) || !d.layers.length) return false;
  const partIds = new Set(d.parts.map(p => p.id));
  if (!d.parts.every(p => typeof p.name === 'string' && Number.isFinite(p.thickness) && p.thickness >= 0 && Array.isArray(p.shapeIds) && p.shapeIds.every(id => d.shapes.some(s => s.id === id)) && (p.skive === undefined || (Array.isArray(p.skive) && p.skive.every(k => obj(k) && Number.isFinite(k.toThickness) && k.toThickness >= 0))))) return false;
  if (!d.shapes.every(s => s.type !== 'fold' || (nums(s, ['x1', 'y1', 'x2', 'y2', 'angleDeg']) && typeof s.inner === 'boolean' && (s.partId === null || s.partId === undefined || partIds.has(s.partId))))) return false;
  if (!d.seams.every(m => obj(m.a) && obj(m.b) && ['butt', 'overlap', 'felled'].includes(m.style) && typeof m.reversed === 'boolean' && [m.a, m.b].every(side => d.paths.some(p => p.id === side.pathId) && nums(side, ['from', 'to']) && side.from >= 0 && side.to >= side.from))) return false;
  if (!d.layers.every(l => typeof l.name === 'string' && typeof l.visible === 'boolean' && typeof l.locked === 'boolean')) return false;
  const texOk = x => x.texture === undefined || x.texture === null || (typeof x.texture === 'string' && x.texture.length > 0 && x.texture.length <= 40); /* 革の質感（テクスチャ）の id。部品にも図形にも付けられる（図形の指定が優先） */
  if (!d.shapes.every(x => x.groupId === undefined || (typeof x.groupId === 'string' && x.groupId.length > 0 && x.groupId.length <= 40))) return false; /* グループ（同じ groupId の図形をまとめて扱う） */
  if (!d.parts.every(texOk) || !d.shapes.every(texOk) || (d.textureMm !== undefined && d.textureMm !== null && !(Number.isFinite(d.textureMm) && d.textureMm > 0))) return false;
  const leatherOk = x => x.leather === undefined || x.leather === null || /^#[0-9a-fA-F]{6}$/.test(String(x.leather)), leatherGroupOk = x => x.leatherGroup === undefined || x.leatherGroup === null || (typeof x.leatherGroup === 'string' && x.leatherGroup.length > 0 && x.leatherGroup.length <= 40); /* 型紙に直接付けた革色（部品を作らなくても塗れる・2026-10-18）と、端がつながった線の一周をまとめる印 */
  if (!d.shapes.every(x => leatherOk(x) && leatherGroupOk(x) && (x.metalGroup === undefined || x.metalGroup === null || (typeof x.metalGroup === 'string' && x.metalGroup.length > 0 && x.metalGroup.length <= 40)) && (x.metalStyle === undefined || x.metalStyle === 'linear' || x.metalStyle === 'radial'))) return false; /* 金属の色の、線の一周のまとまり・光沢の形（帯・放射） */
  const ringOk = r => Array.isArray(r) && r.length >= 3 && r.length <= 20000 && r.every(q => obj(q) && Number.isFinite(q.x) && Number.isFinite(q.y));
  const fillOk = f => obj(f) && id(f.id) && f.id.length <= 40 && ringOk(f.points) && Array.isArray(f.holes ?? []) && (f.holes ?? []).length <= 500 && (f.holes ?? []).every(ringOk) && Array.isArray(f.ids) && f.ids.length <= 5000 && f.ids.every(x => typeof x === 'string') && (((typeof f.leather === 'string' && /^#[0-9a-fA-F]{6}$/.test(f.leather)) || (typeof f.texture === 'string' && f.texture.length > 0 && f.texture.length <= 40)) !== (typeof f.metal === 'string' && f.metal.length > 0 && f.metal.length <= 20)) && (f.texture === undefined || (typeof f.texture === 'string' && f.texture.length > 0 && f.texture.length <= 40)) && (f.area === undefined || Number.isFinite(f.area)) && (f.style === undefined || f.style === 'linear' || f.style === 'radial');   /* 領域の塗り（線で囲まれた場所・2026-10-18）：金属の色か、（革色・質感）のどちらか */
  if (!(d.fills === undefined || (Array.isArray(d.fills) && d.fills.length <= 2000 && d.fills.every(fillOk)))) return false;
  const layers = new Set(d.layers.map(l => l.id)), shapes = new Set(d.shapes.map(s => s.id)), tools = new Set(d.tools.map(t => t.id));
  if (!d.shapes.every(s => {
    if (!layers.has(s.layer)) return false;
    if (s.color != null && !SHAPE_COLORS.includes(s.color)) return false;
    if (s.lineStyle != null && !LINE_STYLES.includes(s.lineStyle)) return false;
    if (s.type === 'line' || s.type === 'fold') return nums(s, ['x1', 'y1', 'x2', 'y2']);
    if (s.type === 'circle' || s.type === 'arc') return nums(s, ['cx', 'cy', 'r']) && s.r > 0 && (s.type === 'circle' || nums(s, ['startDeg', 'endDeg']));
    if (s.type === 'bezier') return nums(s, ['x1', 'y1', 'c1x', 'c1y', 'c2x', 'c2y', 'x2', 'y2']);
    if (s.type === 'path') return Array.isArray(s.nodes) && s.nodes.length >= (s.closed ? 3 : 2) && typeof s.closed === 'boolean' && s.nodes.every(n => obj(n) && nums(n, ['x', 'y', 'inX', 'inY', 'outX', 'outY']) && typeof n.smooth === 'boolean');
    if (s.type === 'text') return nums(s, ['x', 'y', 'sizeMm', 'angleDeg']) && s.sizeMm > 0 && typeof s.text === 'string' && s.text.length > 0 && s.text.length <= 1000;
    if (s.type === 'dimension') return nums(s, ['x1', 'y1', 'x2', 'y2', 'offset']);
    if (s.type === 'image') return nums(s, ['x', 'y', 'wMm', 'hMm', 'angleDeg', 'opacity']) && s.wMm > 0 && s.hMm > 0 && s.opacity >= 0 && s.opacity <= 1 && typeof s.imageId === 'string' && s.imageId.length > 0;
    return s.type === 'polyline' && Array.isArray(s.points) && s.points.length >= (s.closed ? 3 : 2) && typeof s.closed === 'boolean' && s.points.every(p => obj(p) && nums(p, ['x', 'y']));
  })) return false;
  if (d.calcMemos !== undefined && !(Array.isArray(d.calcMemos) && d.calcMemos.length <= 500 && unique(d.calcMemos) && d.calcMemos.every(m => typeof m.expr === 'string' && m.expr.length <= 300 && Number.isFinite(m.result) && typeof m.note === 'string' && m.note.length <= 500))) return false; /* 計算メモ（式・結果・コメント）。無くてもよい */
  const mark = m => ['tool','diamond','dot','circle','slit'].includes(m);
  if (!mark(d.mark) || !Number.isFinite(d.dotD) || d.dotD <= 0) return false;
  if (!d.tools.every(t => typeof t.name === 'string' && ['diamond', 'european', 'round', 'flat'].includes(t.kind) && nums(t, ['pitch', 'holeW', 'holeH', 'holeD', 'angleDeg']) && t.pitch > 0 && t.holeW > 0 && t.holeH > 0 && t.holeD > 0 && Number.isInteger(t.teeth) && t.teeth > 0 && t.teeth <= 1000 && mark(t.mark))) return false;
  if (!d.paths.every(p => Array.isArray(p.shapeIds) && p.shapeIds.length && new Set(p.shapeIds).size === p.shapeIds.length && p.shapeIds.every(id => shapes.has(id)) && typeof p.reversed === 'boolean' && typeof p.closed === 'boolean' && mark(p.mark) && Array.isArray(p.segments) && p.segments.every(s => obj(s) && nums(s,['from','to','pitch']) && s.from >= 0 && s.to >= s.from && s.pitch > 0 && tools.has(s.toolId) && ['fixed','variable','equal','manual'].includes(s.mode)))) return false;
  const lengths=new Map();
  for(const p of d.paths){const route=resolvePath(d,p);if(!route||route.closed!==p.closed)return false;const len=arcLength(route);lengths.set(p.id,len);if(p.segments.some(s=>s.to>len+1e-6))return false;}
  return d.holes.every(h => nums(h, ['x', 'y', 'angleDeg', 's']) && h.s >= 0 && h.s <= lengths.get(h.pathId)+1e-6 && tools.has(h.toolId) && d.paths.some(p => p.id === h.pathId) && mark(h.mark));
}

/** 直せる不整合を直す（図面を書き換える・直した数を返す）。いまは、経路の「閉じている」を実際の線に合わせる：区間選択で線を切り分けたあと、新しい経路が元の印を引き継いで、検査に通らず読み込めなくなった図面を直す（2026-10-16 不具合記録）。読み込み（migrateDoc）と保存の前に使う。 */
export function healDoc(d) {
  let fixed = 0; if (!d || !Array.isArray(d.paths) || !Array.isArray(d.shapes)) return fixed;
  { /* 部品が、消えた図形を指したままの図面（どこかの消し方で、部品の掃除が漏れた・2026-10-18）：検査に通らず、色の変更・保存・「前回の続き」が止まる。消えた図形を、部品の中身から外す */
    const ids = new Set(d.shapes.map(s => s.id)); for (const p of Array.isArray(d.parts) ? d.parts : []) if (Array.isArray(p.shapeIds) && p.shapeIds.some(id => !ids.has(id))) { p.shapeIds = p.shapeIds.filter(id => ids.has(id)); fixed++; }
  }
  { /* 領域の塗り：囲む図形が全部消えた塗りは、掃除で消す（2026-10-18） */
    const ids = new Set(d.shapes.map(s => s.id)); if (Array.isArray(d.fills)) { const keep = d.fills.filter(f => Array.isArray(f?.ids) && f.ids.some(id => ids.has(id))); if (keep.length !== d.fills.length) { fixed += d.fills.length - keep.length; d.fills = keep; } }
  }
  { /* 同じ id の経路が2つ以上ある図面（つなぎ目を越えて新しい2本に打ったときの不具合・2026-10-17）：2つ目以降に新しい id を付け、同じ id の菱目は、いちばん近い経路に付け直す（経路の上の位置 s も取り直す） */
    const seen = new Map(); for (const p of d.paths) { if (!seen.has(p.id)) seen.set(p.id, []); seen.get(p.id).push(p); }
    for (const [id, list] of seen) {
      if (list.length < 2) continue; const used = new Set(d.paths.map(p => p.id)); let n = 1; const fresh = () => { while (used.has('p' + n)) n++; used.add('p' + n); return 'p' + n; };
      const routes = list.map((p, i) => { if (i > 0) p.id = fresh(); let route = null; try { route = resolvePath(d, p); } catch { route = null; } return { p, route }; });
      for (const h of (d.holes || []).filter(h => h.pathId === id)) {
        let best = null, bd = Infinity; for (const r of routes) { if (!r.route) continue; const pr = projectOnPath(r.route, h), dist = distance(pr, h); if (dist < bd) { bd = dist; best = { r, pr }; } }
        if (best) { h.pathId = best.r.p.id; h.s = best.pr.s; }
      }
      fixed++;
    }
  }
  for (const p of d.paths) { try { const route = resolvePath(d, p); if (route && typeof route.closed === 'boolean' && route.closed !== p.closed) { p.closed = route.closed; fixed++; } } catch { /* 直せない経路は、そのまま（検査で弾く） */ } }
  return fixed;
}
/** v1(Y上向き)→v2(Y下向き)→v3(paths/tool拡張)へ独立コピーを順次変換。不正入力は検証側に渡す。 */
export function migrateDoc(input) {
  if (!input || !Number.isInteger(input.version)) return input;
  const d = JSON.parse(JSON.stringify(input));
  if (d.version === 1) {
    if (!Array.isArray(d.shapes) || !Array.isArray(d.holes) || !Array.isArray(d.tools)) return d;
    d.shapes = d.shapes.map(s => mirrorY(s)); d.holes = d.holes.map(h => mirrorY(h));
    d.tools = d.tools.map(t => ({...t,angleDeg: -t.angleDeg})); d.version = 2;
  }
  if (d.version === 2) {
    if (!Array.isArray(d.shapes) || !Array.isArray(d.holes) || !Array.isArray(d.tools)) return d;
    d.paths = [...new Set(d.holes.map(h => h.pathId))].map(id => ({id,shapeIds:[id],reversed:false,closed:d.shapes.find(s=>s.id===id)?.type==='circle' || !!d.shapes.find(s=>s.id===id)?.closed,segments:[],mark:'tool'}));
    d.tools = d.tools.map(t => ({...t,teeth:t.teeth ?? 2,holeD:t.holeD ?? t.holeW,mark:t.mark ?? 'tool'}));
    d.holes = d.holes.map(h => { const s = d.shapes.find(s=>s.id===h.pathId); return {...h,s:s ? projectOnPath(s,h).s : 0,mark:h.mark ?? 'tool'}; });
    d.mark = 'tool'; d.dotD = 0.5; d.version = 3;
  }
  if (d.version === 3) {
    // v4：path／text／dimension 型を追加。既定レイヤー（目印・ガイド）が無ければ足す。
    if (!Array.isArray(d.layers)) return d;
    for (const id of ['marks', 'guide']) if (!d.layers.some(l => l.id === id)) d.layers.push({ id, name: id, visible: true, locked: false });
    d.version = 4;
  }
  if (d.version === 4) {
    // v5：parts（厚み）・seams（縫い合わせ線）・fold 型を追加。
    if (!Array.isArray(d.parts)) d.parts = [];
    if (!Array.isArray(d.seams)) d.seams = [];
    d.version = 5;
  }
  if (d.version === 5) { d.version = 6; } // v6：image（下絵）型を追加
  if (d.version === 6) { d.version = 7; } // v7：図形の色・線種（任意・既定は従来の見た目）を追加
  if (d.version === 7) {
    // v8：層を 型紙・金具・ガイド の3つに（事業主決定A・2026-10-12）。目印（marks）はガイドへ。金具穴（hwholes）と、置いた金具の外形線・断面は金具（hardware）へ。金具の穴には hwHole を付ける（Beam Studio で切る）。
    const has = id => d.layers.some(l => l.id === id);
    if (has('marks')) { if (!has('guide')) { const m = d.layers.find(l => l.id === 'marks'); m.id = 'guide'; if (m.name === 'marks') m.name = 'guide'; } else d.layers = d.layers.filter(l => l.id !== 'marks'); for (const s of d.shapes) if (s.layer === 'marks') s.layer = 'guide'; }
    const hwGroups = new Set(d.shapes.filter(s => s.hw && s.groupId).map(s => s.groupId));
    for (const s of d.shapes) { if (s.layer === 'hwholes') { s.layer = 'hardware'; s.hwHole = true; } else if (s.hw || s.hwSection || (s.groupId && hwGroups.has(s.groupId))) s.layer = 'hardware'; }
    if (has('hwholes')) { if (!has('hardware')) { const h = d.layers.find(l => l.id === 'hwholes'); h.id = 'hardware'; if (h.name === 'hwholes') h.name = 'hardware'; } else d.layers = d.layers.filter(l => l.id !== 'hwholes'); }
    if (!has('hardware') && d.shapes.some(s => s.layer === 'hardware')) d.layers.splice(Math.min(1, d.layers.length), 0, { id: 'hardware', name: 'hardware', visible: true, locked: false });
    d.version = 8;
  }
  healDoc(d);
  return d;
}
/** 画像（下絵）の回転前ローカル矩形。 */
function imageBox(s) { return { minX: s.x, minY: s.y, maxX: s.x + s.wMm, maxY: s.y + s.hMm }; }

/** テキスト図形から回転前のローカル bbox（基準点が左下・幅は 0.6×サイズ×文字数の概算）を返す。 */
function textBox(s) { const w = Math.max(0.6 * s.sizeMm, 0.6 * s.sizeMm * [...s.text].length); return { minX: s.x, minY: s.y - s.sizeMm, maxX: s.x + w, maxY: s.y + s.sizeMm * 0.25 }; }
/** 2 点とオフセット(mm・正は進行方向の左)から寸法線の描画データ {value,a,b,ext,textPos,angleDeg} を返す。 */
export function dimension(p1, p2, offset = 8) {
  const len = distance(p1, p2), v = len > EPS ? { x: (p2.x - p1.x) / len, y: (p2.y - p1.y) / len } : { x: 1, y: 0 }, n = { x: v.y, y: -v.x };
  const a = { x: p1.x + n.x * offset, y: p1.y + n.y * offset }, b = { x: p2.x + n.x * offset, y: p2.y + n.y * offset };
  const over = Math.sign(offset || 1) * 1.5, ext = [[p1, { x: a.x + n.x * over, y: a.y + n.y * over }], [p2, { x: b.x + n.x * over, y: b.y + n.y * over }]];
  let angleDeg = norm(Math.atan2(v.y, v.x) * 180 / Math.PI); if (angleDeg > 90 && angleDeg <= 270) angleDeg = norm(angleDeg + 180);
  const up = rotate({ x: 0, y: -1.2 }, angleDeg);
  return { value: len, a, b, ext, textPos: { x: (a.x + b.x) / 2 + up.x, y: (a.y + b.y) / 2 + up.y }, angleDeg };
}
/** 閉じた点列から面積(mm²)を返す。向きによらず正。 */
export function areaOf(points) { return points.length < 3 ? 0 : Math.abs(signedArea(points)) / 2; }
/** 数値入力の文字列と直前の点から {x,y} または {value} を返す。"x,y" 絶対、"@dx,dy" 相対、"L<A"・"@L<A" 極座標（A は度・時計回りが正）、数値だけは {value}。不正は null。 */
export function parseInput(str, last = { x: 0, y: 0 }) {
  const num = '(-?\\d+(?:\\.\\d+)?)', s = String(str ?? '').trim(), m = s.match(new RegExp(`^(@?)\\s*${num}\\s*(?:(,)\\s*${num}|<\\s*${num})$`));
  if (!m) { const v = s.match(new RegExp(`^${num}$`)); return v ? { value: Number(v[1]) } : null; }
  const rel = m[1] === '@', a = Number(m[2]);
  if (m[3]) { const b = Number(m[4]); return rel ? { x: last.x + a, y: last.y + b } : { x: a, y: b }; }
  const deg = Number(m[5]) * Math.PI / 180; return { x: last.x + a * Math.cos(deg), y: last.y + a * Math.sin(deg) };
}

/** path 図形から区間（line／bezier）配列を返す。両ハンドルが節点に一致する区間は直線。結果は nodes 配列ごとにキャッシュ。 */
const segmentCache = new WeakMap();
export function pathSegments(s) {
  const hit = segmentCache.get(s.nodes); if (hit && hit.closed === s.closed) return hit.segments;
  const n = s.nodes, count = s.closed ? n.length : n.length - 1, segments = [];
  for (let i = 0; i < count; i++) {
    const a = n[i], b = n[(i + 1) % n.length];
    const straight = distance({ x: a.outX, y: a.outY }, a) < EPS && distance({ x: b.inX, y: b.inY }, b) < EPS;
    segments.push(straight ? { type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y } : { type: 'bezier', x1: a.x, y1: a.y, c1x: a.outX, c1y: a.outY, c2x: b.inX, c2y: b.inY, x2: b.x, y2: b.y });
  }
  segmentCache.set(s.nodes, { closed: s.closed, segments }); return segments;
}
/** 節点を作る。ハンドル省略時は節点に一致（角）。 */
export function pathNode(x, y, inH = null, outH = null, smooth = !!(inH || outH)) { return { x, y, inX: inH ? inH.x : x, inY: inH ? inH.y : y, outX: outH ? outH.x : x, outY: outH ? outH.y : y, smooth }; }
/** 通る点の列から、すべての点を通る滑らかなパスの節点を返す（Catmull-Rom 風：内側の点の接線は両隣を結ぶ向き、両端は隣へ向かう）。
 *  重なった点（距離が EPS 以下）は除く。点が2つ未満なら null。 */
export function smoothPathNodes(points) {
  const pts = points.filter((p, i) => !i || distance(p, points[i - 1]) > 1e-9); if (pts.length < 2) return null;
  return pts.map((p, i) => {
    const prev = pts[i - 1], next = pts[i + 1];
    if (!prev) return pathNode(p.x, p.y, null, { x: p.x + (next.x - p.x) / 3, y: p.y + (next.y - p.y) / 3 }, true);
    if (!next) return pathNode(p.x, p.y, { x: p.x + (prev.x - p.x) / 3, y: p.y + (prev.y - p.y) / 3 }, null, true);
    const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6; /* 接線 (next-prev)/2 の 1/3 */
    return pathNode(p.x, p.y, { x: p.x - tx, y: p.y - ty }, { x: p.x + tx, y: p.y + ty }, true);
  });
}
/** line／bezier／polyline／path 図形から同じ形の path 図形を返す。他は null。 */
export function toPath(s) {
  if (s.type === 'path') return { ...s, nodes: s.nodes.map(n => ({ ...n })) };
  const base = { id: s.id, layer: s.layer, type: 'path' };
  if (s.type === 'line') return { ...base, closed: false, nodes: [pathNode(s.x1, s.y1), pathNode(s.x2, s.y2)] };
  if (s.type === 'bezier') return { ...base, closed: false, nodes: [pathNode(s.x1, s.y1, null, { x: s.c1x, y: s.c1y }, false), pathNode(s.x2, s.y2, { x: s.c2x, y: s.c2y }, null, false)] };
  if (s.type === 'polyline') { const pts = s.closed && distance(s.points[0], s.points.at(-1)) < EPS ? s.points.slice(0, -1) : s.points; return { ...base, closed: !!s.closed, nodes: pts.map(p => pathNode(p.x, p.y)) }; }
  return null;
}
/** path と弧長位置から、その点に節点を挿入した新 path を返す（形は変わらない）。 */
export function pathInsertNode(s, position) {
  const segs = pathSegments(s), len = arcLength(s), target = Math.max(0, Math.min(len, position));
  let base = 0, i = 0;
  for (; i < segs.length - 1; i++) { const n = arcLength(segs[i]); if (target <= base + n + EPS) break; base += n; }
  const seg = segs[i], local = target - base, nodes = s.nodes.map(n => ({ ...n })), a = nodes[i], b = nodes[(i + 1) % nodes.length];
  if (seg.type === 'line') {
    const f = arcLength(seg) > EPS ? local / arcLength(seg) : 0, p = { x: seg.x1 + (seg.x2 - seg.x1) * f, y: seg.y1 + (seg.y2 - seg.y1) * f };
    nodes.splice(i + 1, 0, pathNode(p.x, p.y));
  } else {
    let lo = 0, hi = 1, t = 0.5; for (let k = 0; k < 50; k++) { t = (lo + hi) / 2; if (bezierLength(seg, t) < local) lo = t; else hi = t; }
    const P = [{ x: seg.x1, y: seg.y1 }, { x: seg.c1x, y: seg.c1y }, { x: seg.c2x, y: seg.c2y }, { x: seg.x2, y: seg.y2 }], L = (p, q) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    const p01 = L(P[0], P[1]), p12 = L(P[1], P[2]), p23 = L(P[2], P[3]), p012 = L(p01, p12), p123 = L(p12, p23), m = L(p012, p123);
    a.outX = p01.x; a.outY = p01.y; b.inX = p23.x; b.inY = p23.y;
    nodes.splice(i + 1, 0, pathNode(m.x, m.y, p012, p123, true));
  }
  return { ...s, nodes };
}
/** path と節点番号から、その節点を除いた新 path を返す。最小節点数を下回るときは null。 */
export function pathRemoveNode(s, index) {
  if (s.nodes.length - 1 < (s.closed ? 3 : 2) || index < 0 || index >= s.nodes.length) return null;
  const nodes = s.nodes.map(n => ({ ...n })); nodes.splice(index, 1); return { ...s, nodes };
}

/** 図形と公差(mm)から平坦化点列を返す。ベジェは制御多角形の弦からの距離で適応分割。 */
export function flattenShape(s, tolerance = 0.01) {
  if (!(tolerance > 0)) throw new RangeError('tolerance');
  if (s.type === 'fold') return flattenShape({ ...s, type: 'line' }, tolerance);
  if (s.type === 'image') { const b = bboxOf(s); return [{x:b.minX,y:b.minY},{x:b.maxX,y:b.minY},{x:b.maxX,y:b.maxY},{x:b.minX,y:b.maxY},{x:b.minX,y:b.minY}]; }
  if (s.type === 'path') return pathSegments(s).flatMap((seg, i) => { const ps = flattenShape(seg, tolerance); return i ? ps.slice(1) : ps; });
  if (s.type === 'text' || s.type === 'dimension') { const b = bboxOf(s); return [{x:b.minX,y:b.minY},{x:b.maxX,y:b.minY},{x:b.maxX,y:b.maxY},{x:b.minX,y:b.maxY},{x:b.minX,y:b.minY}]; }
  if (s.type === 'line') return [{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}];
  if (s.type === 'polyline') return [...s.points.map(p=>({...p})), ...(s.closed ? [{...s.points[0]}] : [])];
  if (s.type === 'circle' || s.type === 'arc') {
    const sweep = s.type==='circle' ? 360 : arcSweep(s), n = Math.max(1,Math.ceil(sweep*Math.PI/180 / Math.max(1e-5,2*Math.acos(Math.max(-1,1-tolerance/s.r)))));
    return Array.from({length:n+1},(_,i)=>circlePoint(s,(s.startDeg || 0)+sweep*i/n));
  }
  const out = [{x:s.x1,y:s.y1}];
  const mid = (a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const split = (a,b,c,d,depth) => {
    if (depth >= 24 || Math.max(segmentDistance(a,d,b),segmentDistance(a,d,c)) <= tolerance) { out.push(d); return; }
    const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);
    split(a,ab,abc,m,depth+1); split(m,bcd,cd,d,depth+1);
  };
  split(out[0],{x:s.c1x,y:s.c1y},{x:s.c2x,y:s.c2y},{x:s.x2,y:s.y2},0); return out;
}
/** ベジェと t から導関数ベクトルを返す。 */
function derivative(s,t) {
  const u=1-t; return {x:3*(u*u*(s.c1x-s.x1)+2*u*t*(s.c2x-s.c1x)+t*t*(s.x2-s.c2x)),y:3*(u*u*(s.c1y-s.y1)+2*u*t*(s.c2y-s.c1y)+t*t*(s.y2-s.c2y))};
}
/** ベジェの区間 [0,t] を Gauss–Legendre 5点＋適応分割で積分し弧長(mm)を返す。 */
function bezierLength(s,t=1) {
  const integrate=(a,b)=>{
    const xs=[0,-0.5384693101056831,0.5384693101056831,-0.906179845938664,0.906179845938664], ws=[0.5688888888888889,0.4786286704993665,0.4786286704993665,0.2369268850561891,0.2369268850561891];
    return (b-a)/2*xs.reduce((sum,x,i)=>{const v=derivative(s,(a+b)/2+x*(b-a)/2);return sum+ws[i]*Math.hypot(v.x,v.y);},0);
  };
  const rec=(a,b,whole,n)=>{const m=(a+b)/2,l=integrate(a,m),r=integrate(m,b);return n>=18 || Math.abs(l+r-whole)<1e-9 ? l+r : rec(a,m,l,n+1)+rec(m,b,r,n+1);};
  return rec(0,t,integrate(0,t),0);
}
/** 図形または chainShapes の経路から弧長(mm)を返す。 */
export function arcLength(s) {
  if (s.items) return s.items.reduce((n,i)=>n+arcLength(i.shape),0);
  if (s.type==='path') return pathSegments(s).reduce((n,seg)=>n+arcLength(seg),0);
  if (s.type==='text'||s.type==='dimension'||s.type==='fold'||s.type==='image') return 0;
  if (s.type==='circle' || s.type==='arc') return s.r*Math.PI/180*(s.type==='circle'?360:arcSweep(s));
  if (s.type==='bezier') return bezierLength(s);
  const ps=flattenShape(s); return ps.slice(1).reduce((n,p,i)=>n+distance(ps[i],p),0);
}
/** arcLength の別名。入力図形／経路から全長(mm)を返す。 */
export function lengthOf(s) { return arcLength(s); }
/** 図形／経路と弧長(mm)から {x,y,s,angleDeg} を返す。範囲外は両端へ制限。 */
export function pointAtLength(shape, position) {
  const length=arcLength(shape), s=Math.max(0,Math.min(length,position));
  if (shape.items) {
    let left=shape.reversed ? length-s : s, item=shape.items.at(-1);
    for (const candidate of shape.items) { item=candidate; const n=arcLength(item.shape); if(left<=n+EPS)break; left-=n; }
    if (!item) return {x:0,y:0,s,angleDeg:0};
    const p=pointAtLength(item.shape,item.reversed ? arcLength(item.shape)-left : left);
    return {...p,s,angleDeg:norm(p.angleDeg+(item.reversed?180:0)+(shape.reversed?180:0))};
  }
  if (shape.type==='path') {
    const segs=pathSegments(shape); let left=s, seg=segs.at(-1);
    for (const candidate of segs) { seg=candidate; const n=arcLength(seg); if(left<=n+EPS)break; left-=n; }
    if (!seg) return {x:shape.nodes[0]?.x??0,y:shape.nodes[0]?.y??0,s,angleDeg:0};
    return {...pointAtLength(seg,left),s};
  }
  if (shape.type==='text'||shape.type==='dimension'||shape.type==='fold'||shape.type==='image') return {x:shape.x??shape.x1,y:shape.y??shape.y1,s:0,angleDeg:0};
  if (shape.type==='circle' || shape.type==='arc') {
    const deg=(shape.type==='arc'?shape.startDeg:0)+(shape.r ? s/shape.r*180/Math.PI : 0);
    return {...circlePoint(shape,deg),s,angleDeg:norm(deg+90)};
  }
  if (shape.type==='bezier') {
    let lo=0,hi=1,t=length ? s/length : 0;
    for(let i=0;i<40;i++) {
      const error=bezierLength(shape,t)-s; if(Math.abs(error)<1e-8)break;
      if(error>0)hi=t; else lo=t;
      const v=derivative(shape,t), candidate=t-error/Math.hypot(v.x,v.y);
      t=candidate>lo && candidate<hi ? candidate : (lo+hi)/2;
    }
    let v=derivative(shape,t);
    if(Math.hypot(v.x,v.y)<EPS) { const a=bezierPoint(shape,Math.max(0,t-1e-6)),b=bezierPoint(shape,Math.min(1,t+1e-6)); v={x:b.x-a.x,y:b.y-a.y}; }
    return {...bezierPoint(shape,t),s,angleDeg:norm(Math.atan2(v.y,v.x)*180/Math.PI)};
  }
  const ps=flattenShape(shape); let left=s;
  for(let i=1;i<ps.length;i++) {const a=ps[i-1],b=ps[i],n=distance(a,b); if(left<=n+EPS || i===ps.length-1){const f=n?Math.min(1,left/n):0;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,s,angleDeg:norm(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)};} left-=n;}
  return {...ps[0],s,angleDeg:0};
}
/** 未整列図形と端点公差から経路の配列を返す。分岐では停止し、円・閉図形は独立。入力不変。 */
export function chainShapes(shapes,tol=0.01) {
  const remaining=new Set(shapes), out=[];
  const end=(s,last)=>pointAtLength(s,last?arcLength(s):0);
  while(remaining.size) {
    const first=remaining.values().next().value; remaining.delete(first);
    const items=[{shape:first,reversed:false}]; let closed=first.type==='circle' || !!first.closed || (arcLength(first)>EPS && distance(end(first,0),end(first,1))<=tol);
    if(!closed) for(const prepend of [false,true]) {
      while(true) {
        const edge=prepend?items[0]:items.at(-1), p=end(edge.shape,prepend?edge.reversed:!edge.reversed);
        const candidates=[...remaining].filter(s=>s.type!=='circle'&&!s.closed).flatMap(s=>[false,true].filter(last=>distance(p,end(s,last))<=tol).map(last=>({shape:s,reversed:prepend?!last:last})));
        // 元図形群で次数3以上の端点をまたがない。
        const degree=shapes.filter(s=>s.type!=='circle'&&!s.closed).reduce((n,s)=>n+Number(distance(p,end(s,0))<=tol)+Number(distance(p,end(s,1))<=tol),0);
        if(candidates.length!==1 || degree>2)break;
        const item=candidates[0];remaining.delete(item.shape); if(prepend)items.unshift(item);else items.push(item);
      }
      closed=distance(end(items[0].shape,items[0].reversed),end(items.at(-1).shape,!items.at(-1).reversed))<=tol;
      if(closed)break;
    }
    out.push({items,shapeIds:items.map(i=>i.shape.id),closed,reversed:false});
  }
  return out;
}
/** ダブルクリックの「つながった線の選択」用：図形 startId から、端でつながった輪郭をたどって、図形の id の並びを返す。
 *  分岐点（3本以上が集まる所）では、進行方向にいちばん滑らかにつながる線を選んで先へ進み、枝（突き当たる縦線など）には入らない。
 *  端が gapTol（mm）以内で少し離れているだけの所も、つながっているものとして越える（まず tol 以内を探し、無ければ gapTol 以内でいちばん近い端）。
 *  円・閉じた図形は、それ1つだけ。chainShapes（目打ち・オフセットなどの経路）とは別で、分岐点では止まらない。 */
export function contourFrom(shapes, startId, { tol = 0.01, gapTol = 0.2 } = {}) {
  const open = shapes.filter(s => s.type !== 'circle' && !s.closed), start = shapes.find(s => s.id === startId);
  if (!start) return [];
  if (start.type === 'circle' || start.closed || !open.includes(start)) return [startId];
  const len = new Map(open.map(s => [s.id, arcLength(s)])), at = (s, end) => pointAtLength(s, end ? len.get(s.id) : 0);
  const turn = (a, b) => Math.abs(((a - b + 540) % 360) - 180); /* 2つの向きの差（0〜180度） */
  const seen = new Set([startId]), order = [startId]; let closed = false;
  for (const firstExit of [1, 0]) {
    if (closed) break; /* 1周して閉じたら、反対向きにはたどらない */
    let cur = start, exit = firstExit; const far = at(start, firstExit ? 0 : 1); /* 出発した図形の、反対側の端 */
    for (;;) {
      const p = at(cur, exit), travel = exit ? p.angleDeg : p.angleDeg + 180; /* いま端から出ていく向き */
      if (cur !== start && distance(p, far) <= Math.max(tol, gapTol)) { closed = true; break; } /* 出発点に戻った＝閉じた輪郭。出発点の端に突き当たる別の線（縦線など）は足さない */
      let found = null;
      for (const limit of [Math.max(tol, gapTol)]) { /* 0.2mm 以内の端を全部候補にして、いちばん滑らかにつながる線を選ぶ（突き当たる枝のほうが近くても、先の線を選べる） */
        let best = null, bt = Infinity, bd = Infinity, n = 0;
        for (const o of open) { if (seen.has(o.id)) continue; for (const end of [0, 1]) { const q = at(o, end), d = distance(p, q); if (d > limit) continue; n++; const inward = end ? q.angleDeg + 180 : q.angleDeg, tn = turn(travel, inward); if (tn < bt - 1e-6 || (Math.abs(tn - bt) <= 1e-6 && d < bd)) { bt = tn; bd = d; best = { shape: o, end }; } } }
        if (best && n > 1 && bt > 60) break; /* 枝が分岐点（T字）の根元に突き当たったとき：左右どちらへ進むか決められないので、そこで止まる */
        if (best) { found = best; break; }
      }
      if (!found) break;
      seen.add(found.shape.id); if (firstExit) order.push(found.shape.id); else order.unshift(found.shape.id);
      cur = found.shape; exit = found.end ? 0 : 1;
    }
  }
  return order;
}
/** contourFrom でたどった輪郭を、向きをそろえた「経路」（chainShapes の要素と同じ形：{items, shapeIds, closed, reversed}）にする。2本以上でなければ null。
 *  オフセットの「つながった図形全体」用：分岐点では真っ直ぐ続く線を選び、枝は含めない。小さなすき間（gapTol 以内）は、そのまま点でつなぐ。 */
export function contourChain(shapes, startId, { tol = 0.01, gapTol = 0.2 } = {}) {
  const ids = contourFrom(shapes, startId, { tol, gapTol }); if (ids.length < 2) return null;
  const list = ids.map(id => shapes.find(s => s.id === id)), end = (s, last) => pointAtLength(s, last ? arcLength(s) : 0), items = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i]; let reversed;
    if (i === 0) { const next = list[1], ne = [end(next, 0), end(next, 1)], near = p => Math.min(distance(p, ne[0]), distance(p, ne[1])); reversed = near(end(s, 0)) < near(end(s, 1)); }
    else { const prev = items[i - 1], exit = end(prev.shape, !prev.reversed); reversed = distance(exit, end(s, 1)) < distance(exit, end(s, 0)); }
    items.push({ shape: s, reversed });
  }
  const first = items[0], last = items.at(-1), closed = distance(end(first.shape, first.reversed), end(last.shape, !last.reversed)) <= tol;
  return { items, shapeIds: ids, closed, reversed: false };
}
/** 図形のうち、点 p にいちばん近い区間（直線の1区間）を返す：{ a, b }。円・円弧・ベジェ・折れ線は、折れ線にした区間のうちの1つ（閉じた図形は、閉じる区間も入れる）。区間が無ければ null。金具を本体の線に着けるときの「着ける線」を決めるのに使う。 */
export function nearestSegmentOf(shape, p, flat = 0.05) {
  const pts = flattenShape(shape, flat); if (!pts || pts.length < 2) return null;
  const segs = []; for (let k = 0; k + 1 < pts.length; k++) segs.push([pts[k], pts[k + 1]]);
  if ((shape.closed || shape.type === 'circle') && distance(pts[0], pts.at(-1)) > 1e-9) segs.push([pts.at(-1), pts[0]]);
  let best = null, bd = Infinity; for (const [a, b] of segs) { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; if (l2 < 1e-18) continue; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)), d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); if (d < bd) { bd = d; best = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } }; } }
  return best;
}
/** 金具を本体の線にぴったり着ける動き（2026-10-18 事業主の希望「金具をしっかり本体にくっつけたいが、隙間ができる」）。
 *  points：金具の外形を折れ線にした点（mm）。line：{ a, b }（本体の線。無限に延ばした直線として使う）。rotate：true なら、金具の線に近い辺（凸包の辺で、線にいちばん近い点につながる長いほう）が線と平行になるよう、先に回す（±45度を超えるときは回さない）。
 *  金具は、いまある側（点の重心の側）のまま、線にいちばん近い点が線に乗るまで、線に垂直な向きに動く。隙間があれば寄せ、めり込んでいれば外へ戻す。
 *  戻り値：{ dx, dy, angleDeg（回す角度・0＝回さない）, pivot（回す中心）, gap（回したあとの、動かす前の隙間 mm・めり込みは負） }。使うときは、点・図形を pivot まわりに angleDeg 回してから (dx, dy) 動かす。点が2つ未満・線が点なら null。 */
export function attachToLine(points, line, { rotate: doRotate = false } = {}) {
  const pts = (points || []).filter(q => Number.isFinite(q?.x) && Number.isFinite(q?.y)); if (pts.length < 2 || !line?.a || !line?.b) return null;
  const ux0 = line.b.x - line.a.x, uy0 = line.b.y - line.a.y, len = Math.hypot(ux0, uy0); if (!(len > 1e-9)) return null;
  const ux = ux0 / len, uy = uy0 / len, cx = pts.reduce((m, q) => m + q.x, 0) / pts.length, cy = pts.reduce((m, q) => m + q.y, 0) / pts.length;
  const up = (-uy * (cx - line.a.x) + ux * (cy - line.a.y)) >= 0, nx = up ? -uy : uy, ny = up ? ux : -ux;   /* 線の法線：金具のある側へ向ける */
  const sd = q => nx * (q.x - line.a.x) + ny * (q.y - line.a.y);
  let pts2 = pts, angleDeg = 0, pivot = { x: cx, y: cy };
  if (doRotate) {
    const hull = (() => { const s = [...pts].sort((p, q) => p.x - q.x || p.y - q.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], hi = []; for (const q of s) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); } for (const q of [...s].reverse()) { while (hi.length >= 2 && cr(hi.at(-2), hi.at(-1), q) <= 0) hi.pop(); hi.push(q); } return [...lo.slice(0, -1), ...hi.slice(0, -1)]; })();
    if (hull.length >= 3) {
      let vi = 0; hull.forEach((q, k) => { if (sd(q) < sd(hull[vi]) - 1e-12) vi = k; });
      const prev = hull[(vi + hull.length - 1) % hull.length], cur = hull[vi], next = hull[(vi + 1) % hull.length], lp = Math.hypot(cur.x - prev.x, cur.y - prev.y), ln = Math.hypot(next.x - cur.x, next.y - cur.y), e = ln >= lp ? [cur, next] : [prev, cur];
      if (Math.max(lp, ln) > 1e-9) {
        const ea = Math.atan2(e[1].y - e[0].y, e[1].x - e[0].x), la = Math.atan2(uy, ux); let d = ((ea - la) * 180 / Math.PI) % 180; if (d > 90) d -= 180; if (d <= -90) d += 180;   /* 辺と線の向きの差（-90〜90度） */
        if (Math.abs(d) <= 45 && Math.abs(d) > 1e-9) { angleDeg = -d; pivot = { x: (e[0].x + e[1].x) / 2, y: (e[0].y + e[1].y) / 2 }; const a = angleDeg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a); pts2 = pts.map(q => ({ x: pivot.x + (q.x - pivot.x) * co - (q.y - pivot.y) * si, y: pivot.y + (q.x - pivot.x) * si + (q.y - pivot.y) * co })); }
      }
    }
  }
  const gap = Math.min(...pts2.map(sd)); return { dx: -gap * nx, dy: -gap * ny, angleDeg, pivot, gap };
}
/** 線で囲まれた場所（領域）を、点 p から「塗りつぶし」で求める（事業主の指摘 2026-10-18「つながっていないと警告が出て色が塗れない」）。
 *  取り込んだ図面の輪郭は、線の端が別の線の途中に付く形（T字）や、0.3mm ほどの隙間があり、端と端をたどる方式では閉じて見えない。ここでは、線を細い帯（幅 gap）にして画素に描き、p から塗りつぶす：
 *  帯より狭い隙間・T字は、閉じたものとして越える。窓（p を中心にした正方形）の端に届いたら「囲まれていない」とみなし、もっと大きい窓で試す。最初の隙間（0.8mm）で漏れるときは、2.5mm まで広げて試す（bridged）。
 *  p が線の上なら、まわりの点から試して、囲まれた領域のうち小さいほうを返す。
 *  shapes：線になる図形（line・arc・circle・polyline・bezier・path…。id が要る）。戻り値：{ points（外形・mm）, holes（中の穴の外形の配列）, ids（領域を囲む図形の id）, area（mm²・穴を引いた）, bridged } または null（囲まれていない）。 */
export function enclosedAreaAt(shapes, p, { gaps = [0.8, 2.5], windows = [120, 360, 1080], maxCells = 1400 } = {}) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const segs = []; for (const s of shapes || []) { if (!s || s.id === undefined) continue; let pts; try { pts = flattenShape(s, 0.05); } catch { continue; } if (pts && pts.length >= 2) segs.push({ id: s.id, pts }); }
  if (!segs.length) return null;
  for (let gi = 0; gi < gaps.length; gi++) {
    for (const W of windows) {
      let r = regionInWindow(segs, p, gaps[gi], W, maxCells);
      if (r === 'leak') continue;   /* 窓より広がった：もっと大きい窓で */
      if (!r) break;   /* 空きの無い（線だらけの）点：窓を広げても同じ。次の隙間へ */
      if (r.cell > 0.1001) {   /* 粗い窓の結果：囲んだ範囲だけを、細かい画素で求め直す（粗い画素が偶然すき間を閉じた分は、ここで漏れて外れる） */
        const xs = r.points.map(q => q.x), ys = r.points.map(q => q.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const f = regionInWindow(segs, p, gaps[gi], Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 8, maxCells, { x: cx, y: cy });
        if (!f || f === 'leak') break;   /* 細かく見ると漏れる：この隙間では塗れない。次の隙間へ */
        r = f;
      }
      r.bridged = gi > 0; return r;
    }
  }
  return null;
}
function rasterGrid(segs, gap, W, maxCells, center) {   /* 線を細い帯にして画素に描く：owner[画素]＝その線の番号（0＝空き） */
  const cell = Math.max(0.1, W / maxCells), N = Math.ceil(W / cell), x0 = center.x - W / 2, y0 = center.y - W / 2, rad = Math.max(1, Math.round(gap / 2 / cell));
  const owner = new Int32Array(N * N), disk = []; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + 0.5) disk.push(dx, dy);
  const lo = -rad, hi = N + rad;   /* 窓のまわり（帯の半径ぶん）まで描く */
  for (let k = 0; k < segs.length; k++) {
    const pts = segs[k].pts;
    for (let q = 0; q + 1 < pts.length; q++) {
      let ax = (pts[q].x - x0) / cell, ay = (pts[q].y - y0) / cell, bx = (pts[q + 1].x - x0) / cell, by = (pts[q + 1].y - y0) / cell;
      if (Math.max(ax, bx) < lo || Math.min(ax, bx) > hi || Math.max(ay, by) < lo || Math.min(ay, by) > hi) continue;
      { /* 窓の中に切り詰める（Liang–Barsky） */
        let t0 = 0, t1 = 1, ok = true; const dx = bx - ax, dy = by - ay;
        for (const [pp, qq] of [[-dx, ax - lo], [dx, hi - ax], [-dy, ay - lo], [dy, hi - ay]]) { if (pp === 0) { if (qq < 0) { ok = false; break; } } else { const r = qq / pp; if (pp < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } } }
        if (!ok) continue; const nax = ax + dx * t0, nay = ay + dy * t0, nbx = ax + dx * t1, nby = ay + dy * t1; ax = nax; ay = nay; bx = nbx; by = nby;
      }
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.6));
      for (let s = 0; s <= steps; s++) { const t = s / steps, cx = Math.floor(ax + (bx - ax) * t), cy = Math.floor(ay + (by - ay) * t); for (let d = 0; d < disk.length; d += 2) { const x = cx + disk[d], y = cy + disk[d + 1]; if (x >= 0 && x < N && y >= 0 && y < N) owner[y * N + x] = k + 1; } }
    }
  }
  return { N, cell, x0, y0, rad, owner };
}
function regionInWindow(segs, p, gap, W, maxCells, center = p) {   /* center：窓の中心（省略は p） */
  const g = rasterGrid(segs, gap, W, maxCells, center), { N, cell, x0, y0, rad, owner } = g;
  const sx = Math.min(N - 1, Math.max(0, Math.floor((p.x - x0) / cell))), sy = Math.min(N - 1, Math.max(0, Math.floor((p.y - y0) / cell))), seeds = [];
  if (owner[sy * N + sx] === 0) seeds.push([sx, sy]);
  else for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = sx + Math.round(Math.cos(a) * (rad + 2)), y = sy + Math.round(Math.sin(a) * (rad + 2)); if (x >= 0 && x < N && y >= 0 && y < N && owner[y * N + x] === 0) seeds.push([x, y]); }   /* 線の上：両側のまわりの点から */
  if (!seeds.length) return null;
  const lab = new Int32Array(N * N), stack = new Int32Array(N * N), info = [null]; let touchedBorder = false;
  for (const [x, y] of seeds) {
    if (lab[y * N + x]) continue; const id = info.length; let sp = 0, count = 0, border = false; stack[sp++] = y * N + x; lab[y * N + x] = id;
    while (sp) {
      const c = stack[--sp], cy = (c / N) | 0, cx = c - cy * N; count++; if (cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1) border = true;
      if (cx > 0 && !lab[c - 1] && !owner[c - 1]) { lab[c - 1] = id; stack[sp++] = c - 1; }
      if (cx < N - 1 && !lab[c + 1] && !owner[c + 1]) { lab[c + 1] = id; stack[sp++] = c + 1; }
      if (cy > 0 && !lab[c - N] && !owner[c - N]) { lab[c - N] = id; stack[sp++] = c - N; }
      if (cy < N - 1 && !lab[c + N] && !owner[c + N]) { lab[c + N] = id; stack[sp++] = c + N; }
    }
    info.push({ count, border }); if (border) touchedBorder = true;
  }
  let best = 0; for (let k = 1; k < info.length; k++) if (!info[k].border && (!best || info[k].count < info[best].count)) best = k;
  if (!best) return touchedBorder ? 'leak' : null;
  return buildRegion(g, segs, lab, best);
}
/** ラベル best の空き画素の連なり（領域）を、外形・穴・囲む図形の id・面積にする（外形は、帯の半分の幅ぶん線の中心まで広げる）。 */
function buildRegion(g, segs, lab, best) {
  const { N, cell, x0, y0, rad, owner } = g;
  const m = new Uint8Array(N * N), touch = new Map(); for (let c = 0; c < N * N; c++) if (lab[c] === best) m[c] = 1;
  for (let c = 0; c < N * N; c++) if (m[c]) { const cy = (c / N) | 0, cx = c - cy * N; for (const nb of [cx > 0 ? c - 1 : -1, cx < N - 1 ? c + 1 : -1, cy > 0 ? c - N : -1, cy < N - 1 ? c + N : -1]) if (nb >= 0 && owner[nb]) touch.set(owner[nb], (touch.get(owner[nb]) || 0) + 1); }
  for (let it = 0; it < rad; it++) { /* 帯（線の半分の幅）ぶん、線の中心まで広げる：塗りが線に届く */
    const add = []; for (let c = 0; c < N * N; c++) { if (m[c] || !owner[c]) continue; const cy = (c / N) | 0, cx = c - cy * N; if ((cx > 0 && m[c - 1]) || (cx < N - 1 && m[c + 1]) || (cy > 0 && m[c - N]) || (cy < N - 1 && m[c + N])) add.push(c); }
    for (const c of add) m[c] = 1;
  }
  const V = N + 1, adj = new Map(), edges = [], addEdge = (x1, y1, x2, y2) => { const e = { x1, y1, x2, y2, used: false }; edges.push(e); const key = y1 * V + x1; (adj.get(key) || adj.set(key, []).get(key)).push(e); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!m[y * N + x]) continue;   /* 領域を右手に見て、時計回り（画面の座標）にたどる辺 */
    if (y === 0 || !m[(y - 1) * N + x]) addEdge(x, y, x + 1, y); if (x === N - 1 || !m[y * N + x + 1]) addEdge(x + 1, y, x + 1, y + 1);
    if (y === N - 1 || !m[(y + 1) * N + x]) addEdge(x + 1, y + 1, x, y + 1); if (x === 0 || !m[y * N + x - 1]) addEdge(x, y + 1, x, y);
  }
  const loops = [];
  for (const e0 of edges) {
    if (e0.used) continue; const pts = []; let e = e0;
    while (e && !e.used) {
      e.used = true; pts.push({ x: e.x1, y: e.y1 }); const dx = e.x2 - e.x1, dy = e.y2 - e.y1; let next = null, bs = -9;
      for (const o of adj.get(e.y2 * V + e.x2) || []) { if (o.used) continue; const sc = dx * (o.y2 - o.y1) - dy * (o.x2 - o.x1); if (sc > bs) { bs = sc; next = o; } }   /* 分かれ目では右に曲がる（斜めにだけ接する別の領域とつながらない） */
      e = next;
    }
    if (pts.length >= 4) loops.push(pts);
  }
  const area2 = ps => ps.reduce((a, q, k) => { const r = ps[(k + 1) % ps.length]; return a + (q.x * r.y - r.x * q.y); }, 0);
  const epsCells = Math.max(0.6, 0.08 / cell), simplify = ps => {   /* 一直線の点を除き、階段（セルの段差）をならす */
    const keep = ps.filter((q, k) => { const a = ps[(k + ps.length - 1) % ps.length], b = ps[(k + 1) % ps.length]; return (q.x - a.x) * (b.y - q.y) - (q.y - a.y) * (b.x - q.x) !== 0; }); if (keep.length < 4) return keep;
    const rdp = (arr, a, b, out) => { let dmax = 0, idx = -1; const A = arr[a], B = arr[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1; for (let k = a + 1; k < b; k++) { const d = Math.abs((arr[k].x - A.x) * dy - (arr[k].y - A.y) * dx) / len; if (d > dmax) { dmax = d; idx = k; } } if (dmax > epsCells && idx > 0) { rdp(arr, a, idx, out); rdp(arr, idx, b, out); } else out.push(arr[a]); };
    let far = 0, fd = -1; keep.forEach((q, k) => { const d = (q.x - keep[0].x) ** 2 + (q.y - keep[0].y) ** 2; if (d > fd) { fd = d; far = k; } });
    const a1 = keep.slice(0, far + 1), a2 = [...keep.slice(far), keep[0]], out = []; rdp(a1, 0, a1.length - 1, out); rdp(a2, 0, a2.length - 1, out); return out;
  };
  const toMm = ps => ps.map(q => ({ x: x0 + q.x * cell, y: y0 + q.y * cell }));
  const polys = loops.map(l => ({ pts: simplify(l), a: area2(l) })).filter(l => l.pts.length >= 3 && Math.abs(l.a) > 0);
  if (!polys.length) return null; polys.sort((u, v) => Math.abs(v.a) - Math.abs(u.a));
  const outer = polys[0], sign = Math.sign(outer.a), minHole = 2 / (cell * cell);   /* 穴：向きが逆で、2mm² 以上（細い線の跡は穴にしない） */
  const holes = polys.slice(1).filter(l => Math.sign(l.a) !== sign && Math.abs(l.a) / 2 >= minHole).map(l => toMm(l.pts)), points = toMm(outer.pts);
  const areaMm = Math.abs(outer.a) / 2 * cell * cell - holes.reduce((s, h) => s + Math.abs(area2(h)) / 2, 0);
  const total = [...touch.values()].reduce((s, v) => s + v, 0), ids = [...touch].filter(([, v]) => v >= total * 0.03).map(([k]) => segs[k - 1].id);   /* 領域に長く接している図形だけ（縫い目の短い印などは入れない）：動かしたとき、塗りがついていくかの判定に使う */
  return { points, holes, ids, area: areaMm, bridged: false, cell };
}

/** 選んだ図形（selectedIds）と、まわりの線で囲まれた場所を、全部求める（事業主の指摘 2026-10-18「選んだ線が一周つながっていないと言われる。つながっているのに」）。
 *  選んだ図形の範囲（＋30mm）の窓に線を描き、空きを全部ラベルづけして、窓の端に届かず（囲まれていて）・4mm² 以上で・境目の半分以上が選んだ図形の場所を返す。
 *  最初の隙間（0.8mm）で見つからなければ 2.5mm まで広げる（bridged）。窓が 1080mm を超える選択・囲む場所が無い選択は []。戻り値は enclosedAreaAt と同じ形の配列。 */
export function enclosedAreasAround(shapes, selectedIds, { gaps = [0.8, 2.5], maxWindow = 1080, maxCells = 1400, maxRegions = 20 } = {}) {
  const sel = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []), segs = [];
  for (const s of shapes || []) { if (!s || s.id === undefined) continue; let pts; try { pts = flattenShape(s, 0.05); } catch { continue; } if (pts && pts.length >= 2) segs.push({ id: s.id, pts }); }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; for (const s of segs) if (sel.has(s.id)) for (const q of s.pts) { if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x; if (q.y < minY) minY = q.y; if (q.y > maxY) maxY = q.y; }
  if (!Number.isFinite(minX)) return [];
  const W = Math.max(maxX - minX, maxY - minY) + 30; if (!(W > 30) || W > maxWindow) return [];
  for (let gi = 0; gi < gaps.length; gi++) {
    const g = rasterGrid(segs, gaps[gi], W, maxCells, { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }), { N, owner } = g, lab = new Int32Array(N * N), stack = new Int32Array(N * N), info = [null];
    for (let c0 = 0; c0 < N * N; c0++) {
      if (lab[c0] || owner[c0]) continue; const id = info.length; let sp = 0, count = 0, border = false; stack[sp++] = c0; lab[c0] = id;
      while (sp) {
        const c = stack[--sp], cy = (c / N) | 0, cx = c - cy * N; count++; if (cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1) border = true;
        if (cx > 0 && !lab[c - 1] && !owner[c - 1]) { lab[c - 1] = id; stack[sp++] = c - 1; }
        if (cx < N - 1 && !lab[c + 1] && !owner[c + 1]) { lab[c + 1] = id; stack[sp++] = c + 1; }
        if (cy > 0 && !lab[c - N] && !owner[c - N]) { lab[c - N] = id; stack[sp++] = c - N; }
        if (cy < N - 1 && !lab[c + N] && !owner[c + N]) { lab[c + N] = id; stack[sp++] = c + N; }
      }
      info.push({ count, border });
    }
    const contact = info.map(() => new Map());
    for (let c = 0; c < N * N; c++) { const L = lab[c]; if (!L || info[L].border) continue; const cy = (c / N) | 0, cx = c - cy * N; for (const nb of [cx > 0 ? c - 1 : -1, cx < N - 1 ? c + 1 : -1, cy > 0 ? c - N : -1, cy < N - 1 ? c + N : -1]) if (nb >= 0 && owner[nb]) contact[L].set(owner[nb], (contact[L].get(owner[nb]) || 0) + 1); }
    const picks = [];
    for (let k = 1; k < info.length; k++) {
      if (info[k].border || info[k].count * g.cell * g.cell < 4) continue; let tot = 0, mine = 0; for (const [o, v] of contact[k]) { tot += v; if (sel.has(segs[o - 1].id)) mine += v; }
      if (tot > 0 && mine / tot >= 0.5) picks.push(k);
    }
    if (picks.length) return picks.slice(0, maxRegions).map(k => { const r = buildRegion(g, segs, lab, k); if (r) r.bridged = gi > 0; return r; }).filter(Boolean);
  }
  return [];
}
/** 型紙の輪郭を、塗りつぶし用の多角形にする（革色を部品を作らずに付けるため・2026-10-18）。
 *  startId が閉じた図形（円・閉じた折れ線など）ならそれ自身。開いた線なら、端がつながった線を一周たどり（contourChain・すき間 gapTol まで越える）、出発点へ戻ってこなければ null。
 *  戻り値 { ids: 一周に入った図形の id, points: 多角形の点（mm・円弧やベジェは折れ線にする・最後の点は最初と重ねない） }。 */
export function outlinePolygon(shapes, startId, { tol = 0.01, gapTol = 0.2, flat = 0.05 } = {}) {
  const start = shapes.find(s => s.id === startId); if (!start) return null;
  const tidy = pts => { const out = []; for (const q of pts) if (!out.length || distance(out.at(-1), q) > 1e-6) out.push({ x: q.x, y: q.y }); if (out.length > 1 && distance(out[0], out.at(-1)) <= 1e-6) out.pop(); return out.length >= 3 ? out : null; };
  if (start.type === 'circle' || start.closed) { const pts = tidy(flattenShape(start, flat)); return pts ? { ids: [start.id], points: pts } : null; }
  const ch = contourChain(shapes, startId, { tol, gapTol });
  if (!ch || ch.items.length < 2) { const raw = flattenShape(start, flat); if (raw.length >= 3 && distance(raw[0], raw.at(-1)) <= gapTol) { const pts = tidy(raw); return pts ? { ids: [start.id], points: pts } : null; } return null; } /* 1本の開いた線でも、端どうしが重なっていれば一周 */
  const raw = [];
  for (const it of ch.items) { const p = flattenShape(it.shape, flat).slice(); if (it.reversed) p.reverse(); raw.push(...p); }
  if (raw.length < 3 || distance(raw[0], raw.at(-1)) > gapTol) return null;
  const pts = tidy(raw); return pts ? { ids: ch.shapeIds, points: pts } : null;
}
/** contourFrom で選んだ輪郭 ids の、先へ進めなかった端のうち「分岐」で止まった所を返す：端のすぐそば（tol 以内）に、輪郭に入っていない別の図形の端がある所。
 *  すき間（離れて見える所）は含めない（画面の橙の輪で出ている）。戻り値は [{ x, y }]。 */
export function contourStops(shapes, ids, { tol = 0.01, gapTol = 0.2 } = {}) {
  const inSet = new Set(ids), mine = shapes.filter(s => inSet.has(s.id) && s.type !== 'circle' && !s.closed), others = shapes.filter(s => !inSet.has(s.id) && s.type !== 'circle' && !s.closed);
  const endsOf = s => { const len = arcLength(s); return len > EPS ? [pointAtLength(s, 0), pointAtLength(s, len)] : []; }, out = [];
  for (const s of mine) for (const p of endsOf(s)) {
    if (mine.some(o => o !== s && endsOf(o).some(q => distance(p, q) <= gapTol))) continue; /* 輪郭の中でつながっている端 */
    if (others.some(o => endsOf(o).some(q => distance(p, q) <= tol)) && !out.some(q => distance(p, q) <= tol)) out.push({ x: p.x, y: p.y });
  }
  return out;
}
/** 文書と永続経路から、図形の向きを解決した計算用経路を返す。不連続なら null。 */
export function resolvePath(doc,path) {
  const shapes=path.shapeIds.map(id=>doc.shapes.find(s=>s.id===id)); if(shapes.some(s=>!s))return null;
  const chains=chainShapes(shapes); if(chains.length!==1)return null;
  return {...chains[0],reversed:path.reversed};
}
/** 全長・基準ピッチ・両端余白(mm)から等分割位置配列を返す。同点は分割数を増やす。 */
export function equalDivide(length,pitch,margin=0) {
  if(![length,pitch,margin].every(Number.isFinite)||length<0||pitch<=0||margin<0||2*margin>length)return [];
  const usable=length-2*margin; if(usable<EPS)return [margin];
  const n=Math.max(1,Math.round(usable/pitch)); if(n>100000)throw new RangeError('count');
  return Array.from({length:n+1},(_,i)=>margin+usable*i/n);
}
/** 図形／経路・ピッチと余白／可変指定から接線角付き等間隔点配列を返す。閉経路の終点は重複しない。 */
export function pointsAlongShape(shape,pitch,{offsetStart=0,offsetEnd=0,variable=false}={}) {
  const len=arcLength(shape), closed=shape.closed||shape.type==='circle'||(shape.type==='arc'&&arcSweep(shape)===360);
  if(![pitch,offsetStart,offsetEnd].every(Number.isFinite)||pitch<=0||offsetStart<0||offsetEnd<0||offsetStart+offsetEnd>len)return [];
  const usable=len-offsetStart-offsetEnd; if(usable<EPS)return [pointAtLength(shape,offsetStart)];
  const loop=closed&&offsetStart===0&&offsetEnd===0;
  const n=variable ? Math.max(1,Math.round(usable/pitch)) : Math.floor((usable+EPS)/pitch);
  if(n>100000)throw new RangeError('count');
  const step=variable?usable/n:pitch, count=loop ? (variable?n:Math.ceil(usable/pitch-EPS)) : n+1;
  return Array.from({length:count},(_,i)=>pointAtLength(shape,offsetStart+i*step));
}
/** 経路と角モードから30度超の角の位置・接線（二等分指定時は平均角）を返す。 */
export function cornerHoles(shape,mode='place') {
  if(mode==='none')return [];
  const positions=[];
  const visit=(s,base=0,reverse=false)=>{
    if(s.items) {let n=0; for(const item of s.items){visit(item.shape,n,item.reversed);n+=arcLength(item.shape);if(n<arcLength(s)-EPS)positions.push(n);} if(s.closed)positions.push(0);return;}
    if(s.type==='polyline'){let n=0;for(let i=1;i<s.points.length;i++){n+=distance(s.points[i-1],s.points[i]);if(i<s.points.length-1||s.closed)positions.push(base+(reverse?arcLength(s)-n:n));}if(s.closed)positions.push(base);}
    if(s.type==='path'){let n=0;const segs=pathSegments(s);for(let i=0;i<segs.length;i++){n+=arcLength(segs[i]);if(i<segs.length-1||s.closed)positions.push(base+(reverse?arcLength(s)-n:n));}if(s.closed)positions.push(base);}
  };
  visit(shape); const len=arcLength(shape), closed=shape.closed||shape.type==='circle';
  return [...new Set(positions.map(s=>shape.reversed?len-s:s))].map(s=>{
    const e=Math.min(1e-5,len/100000), before=pointAtLength(shape,s===0&&closed?len-e:s-e),after=pointAtLength(shape,s===len&&closed?e:s+e), delta=((after.angleDeg-before.angleDeg+540)%360)-180;
    return Math.abs(delta)>30+1e-5 ? {...pointAtLength(shape,s),angleDeg:mode==='bisect'?norm(before.angleDeg+delta/2):after.angleDeg} : null;
  }).filter(Boolean);
}
/** 工具・開始弧長（数値または {s}）・経路から刃数分の点と nextS を返す。経路外の刃は省く。 */
export function toothPositions(tool,startPoint,path) {
  const start=typeof startPoint==='number'?startPoint:Number.isFinite(startPoint.s)?startPoint.s:projectOnPath(path,startPoint).s, len=arcLength(path);
  if(!Number.isFinite(start)||start<0||!Number.isInteger(tool.teeth)||tool.teeth<1||tool.teeth>1000||!Number.isFinite(tool.pitch)||!(tool.pitch>0))return {points:[],nextS:start};
  const points=Array.from({length:tool.teeth},(_,i)=>start+i*tool.pitch).filter(s=>s<=len+EPS).map(s=>pointAtLength(path,s));
  return {points,nextS:start+(tool.teeth-1)*tool.pitch};
}
/** 経路と点から最寄りの弧長位置 {x,y,s,angleDeg} を返す。ベジェは距離の停留点を全て調べる。 */
export function projectOnPath(path,p) {
  const len=arcLength(path),positions=[0,len];
  if(path.items){let base=0;for(const item of path.items){const n=arcLength(item.shape),q=projectOnPath(item.shape,p);const s=base+(item.reversed?n-q.s:q.s);positions.push(path.reversed?len-s:s);base+=n;}}
  else if(path.type==='path'){let base=0;for(const seg of pathSegments(path)){positions.push(base+projectOnPath(seg,p).s);base+=arcLength(seg);}}
  else if(path.type==='text'||path.type==='dimension'||path.type==='fold'||path.type==='image'){return {...pointAtLength(path,0)};}
  else if(path.type==='circle'||path.type==='arc'){
    const deg=norm(Math.atan2(p.y-path.cy,p.x-path.cx)*180/Math.PI);
    if(path.type==='circle'||onArc(path,deg))positions.push(norm(deg-(path.type==='arc'?path.startDeg:0))*Math.PI/180*path.r);
  }else if(path.type==='bezier'){
    const x=coefficients(path.x1,path.c1x,path.c2x,path.x2),y=coefficients(path.y1,path.c1y,path.c2y,path.y2);x[0]-=p.x;y[0]-=p.y;const c=Array(6).fill(0);
    for(let i=0;i<4;i++)for(let j=1;j<4;j++)c[i+j-1]+=j*(x[i]*x[j]+y[i]*y[j]);
    positions.push(...roots(c).map(t=>bezierLength(path,t)));
  }else{
    const ps=flattenShape(path);let base=0;
    for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],v={x:b.x-a.x,y:b.y-a.y},n=distance(a,b);const t=n?Math.max(0,Math.min(1,dot({x:p.x-a.x,y:p.y-a.y},v)/(n*n))):0;positions.push(base+t*n);base+=n;}
  }
  const candidates=positions.map(s=>pointAtLength(path,s));
  return candidates.reduce((a,b)=>distance(a,p)<=distance(b,p)?a:b);
}
/** 穴・文書から表示／出力用の形状、実寸幅高、角度を返す。 */
export const dotLen = h => Number.isFinite(h?.len) && h.len > 0 ? h.len : 2; /* 点の目印の、画面での線の長さ（mm）。穴に len があればそれ、なければ2mm。選択ツールで端をつかんで変えられる */
export function holeAppearance(h,doc) {
  const tool=doc.tools.find(t=>t.id===h.toolId); if(!tool)return null;
  const p=doc.paths?.find(p=>p.id===h.pathId), mark=[h.mark,p?.mark,doc.mark,tool.mark].find(m=>m&&m!=='tool')||'tool';
  const kind=mark==='tool'?({diamond:'diamond',european:'slit',round:'circle',flat:'slit'}[tool.kind]):mark;
  const d=mark==='dot'?doc.dotD:mark==='circle'?tool.holeW:tool.holeD;
  return {kind,width:kind==='dot'||kind==='circle'?d:tool.holeW,height:kind==='dot'||kind==='circle'?d:tool.holeH,angleDeg:h.angleDeg};
}
/** 新しい既定工具配列を返す。名前は翻訳キーとして UI 側で表示する。 */
export function defaultTools() {
  const make=(id,kind,pitch,teeth)=>({id,name:id,kind,pitch,teeth,holeW:kind==='round'?1:2,holeH:kind==='round'?1:0.8,holeD:1,angleDeg:kind==='round'?0:45,mark:'tool'});
  return [...[3,4].flatMap(p=>[2,4,6].map(n=>make(`diamond-${p}-${n}`,'diamond',p,n))),make('diamond-3.95-2','diamond',3.95,2),make('european-3.38-2','european',3.38,2),make('round-3-2','round',3,2)]; /* 3.95mm は2本刃だけ（固定ピッチの作図では本数は結果に影響しない。手動配置の1回の穴数だけが変わる） */
}
/** 図形／点／穴を、2 点 a・b を通る任意の軸線で折り返した新データを返す（線対称コピー用）。 */
export function reflectAcross(s, a, b) {
  const len = distance(a, b); if (len < EPS) return mirrorX(s, a.x);
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, axisDeg = Math.atan2(uy, ux) * 180 / Math.PI;
  const point = p => { const dx = p.x - a.x, dy = p.y - a.y, t = dx * ux + dy * uy, px = a.x + t * ux, py = a.y + t * uy; return { x: 2 * px - p.x, y: 2 * py - p.y }; };
  return transformGeometry(s, point, deg => 2 * axisDeg - deg, true);
}
/** 図形と弧長位置の配列から、その位置で切り分けた図形配列を返す。円は 2 点以上で円弧になる。切れない型は [図形]。 */
/** 曲がり（ハンドル）が無い、直線だけでできた path を、直線（節点2つ）／折れ線（3つ以上）に戻す。曲線を含むものはそのまま。 */
/** 直線（line・2点だけの折れ線）の中から、同じ直線の上に並び、端がつながっている（重なり・gap mm 以内のすき間を含む）ものを、まとまりにして返す。2本以上のまとまりだけ：[{ ids, p1, p2 }]（p1・p2＝まとめた1本の直線の両端）。向きは cross（外積）、直線からのずれは dist（mm）で見る。 */
export function collinearLineClusters(list, { gap = 0.5, dist = 0.01, cross = 1e-4 } = {}) {
  const lines = list.map(s => s.type === 'line' ? { id: s.id, a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } } : s.type === 'polyline' && !s.closed && s.points?.length === 2 ? { id: s.id, a: { x: s.points[0].x, y: s.points[0].y }, b: { x: s.points[1].x, y: s.points[1].y } } : null).filter(l => l && Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) > EPS);
  for (const l of lines) { const d = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y); l.len = d; l.u = { x: (l.b.x - l.a.x) / d, y: (l.b.y - l.a.y) / d }; }
  const parent = lines.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const A = lines[i], B = lines[j]; if (Math.abs(A.u.x * B.u.y - A.u.y * B.u.x) > cross) continue;
    const off = q => Math.abs((q.x - A.a.x) * A.u.y - (q.y - A.a.y) * A.u.x), t = q => (q.x - A.a.x) * A.u.x + (q.y - A.a.y) * A.u.y;
    if (off(B.a) > dist || off(B.b) > dist) continue;
    const t0 = Math.min(t(B.a), t(B.b)), t1 = Math.max(t(B.a), t(B.b)); if (t0 <= A.len + gap && t1 >= -gap) parent[find(j)] = find(i);
  }
  const groups = new Map(); lines.forEach((l, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(l); });
  const out = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue; const R = g[0], t = q => (q.x - R.a.x) * R.u.x + (q.y - R.a.y) * R.u.y, pts = g.flatMap(l => [l.a, l.b]);
    out.push({ ids: g.map(l => l.id), p1: pts.reduce((m, q) => t(q) < t(m) ? q : m), p2: pts.reduce((m, q) => t(q) > t(m) ? q : m) });
  }
  return out;
}
/** 小さな菱形・四角（4つの頂点で一周する折れ線・大きさ maxMm 以下）の中心＝4つの頂点の平均。一周＝閉じた折れ線、または始点と終点が同じ位置の開いた折れ線（菱目の作り）。
 *  （事業主の指摘 2026-10-18「菱穴の中心から直線が引けない」：円には中心のスナップがあるが、菱形には無く、頂点にしか吸い付かなかった）。大きな図形・4頂点でない図形・線・円は対象外。戻り値は [{ x, y }]。 */
export function smallLoopCenters(list, { maxMm = 12 } = {}) {
  const out = [];
  for (const s of list || []) {
    if (s?.type !== 'polyline' || !Array.isArray(s.points) || s.points.length < 4 || s.points.length > 5) continue;
    let pts = s.points; const a = pts[0], b = pts[pts.length - 1], same = Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
    if (same) pts = pts.slice(0, -1); else if (!s.closed) continue;
    if (pts.length !== 4 || pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y); if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) > maxMm + 1e-9) continue;
    out.push({ x: xs.reduce((m, v) => m + v, 0) / 4, y: ys.reduce((m, v) => m + v, 0) / 4 });
  }
  return out;
}
/** 小さな菱形・四角（4つの頂点で一周する折れ線・大きさ maxMm 以下）の大きさ：長いほうの対角線＝幅 w・短いほうの対角線＝高さ h と、中心。目打ちの穴の大きさ（holeW・holeH）に合わせるために使う。
 *  （事業主の指摘 2026-10-18「菱目の大きさがバラバラ・外周と同じ大きさにしたい」：外周の菱の線は 1.1×0.4mm・目打ちの穴は 2×0.8mm だった）。対象は smallLoopCenters と同じ。戻り値 [{ w, h, x, y }]。 */
export function diamondLoopSizes(list, { maxMm = 12 } = {}) {
  const out = [];
  for (const s of list || []) {
    if (s?.type !== 'polyline' || !Array.isArray(s.points) || s.points.length < 4 || s.points.length > 5) continue;
    let pts = s.points; const a = pts[0], b = pts[pts.length - 1], same = Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
    if (same) pts = pts.slice(0, -1); else if (!s.closed) continue;
    if (pts.length !== 4 || pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y); if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) > maxMm + 1e-9) continue;
    const d1 = Math.hypot(pts[2].x - pts[0].x, pts[2].y - pts[0].y), d2 = Math.hypot(pts[3].x - pts[1].x, pts[3].y - pts[1].y);
    const lv = d1 >= d2 ? { x: pts[2].x - pts[0].x, y: pts[2].y - pts[0].y } : { x: pts[3].x - pts[1].x, y: pts[3].y - pts[1].y }; let ang = Math.atan2(lv.y, lv.x) * 180 / Math.PI; ang = ((ang % 180) + 180) % 180;   /* 長いほうの対角線の向き（0〜180度） */
    out.push({ w: Math.max(d1, d2), h: Math.min(d1, d2), ang, x: xs.reduce((m, v) => m + v, 0) / 4, y: ys.reduce((m, v) => m + v, 0) / 4 });
  }
  return out;
}
/** 小さな菱形の線（diamondLoopSizes の対象）を、新しい大きさ（幅 w＝長い対角線・高さ h＝短い対角線）に作り直した点の並びを返す。中心・長軸の向き・頂点の並び（始点＝終点の5点／閉じた4点）はそのまま。
 *  各頂点を、長軸方向に w/元の幅・短軸方向に h/元の高さだけ、中心から伸ばし縮みさせる（傾いた平行四辺形でも形の傾きは保つ）。対象でなければ null。 */
export function resizeDiamondLoop(s, w, h) {
  const z = diamondLoopSizes([s])[0]; if (!z || !(w > 0) || !(h > 0) || !(z.w > 1e-9) || !(z.h > 1e-9)) return null;
  const same = Math.hypot(s.points[0].x - s.points[s.points.length - 1].x, s.points[0].y - s.points[s.points.length - 1].y) < 1e-6, base = same ? s.points.slice(0, -1) : s.points;
  const d1 = Math.hypot(base[2].x - base[0].x, base[2].y - base[0].y), d2 = Math.hypot(base[3].x - base[1].x, base[3].y - base[1].y), [a, b] = d1 >= d2 ? [0, 2] : [1, 3], len = Math.hypot(base[b].x - base[a].x, base[b].y - base[a].y);
  const u = { x: (base[b].x - base[a].x) / len, y: (base[b].y - base[a].y) / len }, v = { x: -u.y, y: u.x }, kw = w / z.w; let kh = h / z.h;
  { const [a2, b2] = d1 >= d2 ? [1, 3] : [0, 2], sx = base[b2].x - base[a2].x, sy = base[b2].y - base[a2].y, su = sx * u.x + sy * u.y, sv = sx * v.x + sy * v.y, rem = h * h - (su * kw) ** 2; if (Math.abs(sv) > 1e-9 && rem > 0) kh = Math.sqrt(rem) / Math.abs(sv); }   /* 短い対角線が長い対角線に直角でない形でも、短い対角線の長さがちょうど h になるように */
  const out = base.map(p => { const dx = p.x - z.x, dy = p.y - z.y, du = (dx * u.x + dy * u.y) * kw, dv = (dx * v.x + dy * v.y) * kh; return { x: z.x + u.x * du + v.x * dv, y: z.y + u.y * du + v.y * dv }; });
  return same ? [...out, { ...out[0] }] : out;
}
/** 端と端がつながって、同じ直線上に続く直線（line・2点の開いた折れ線・同じ層）を、1つの辺としてまとめる（1本の辺が、途中で分かれているもの）。
 *  戻り値 [{ ids, p1, p2, mid }]（ids は 2 本以上・p1・p2＝辺全体の両端・mid＝辺全体の中点）。
 *  まとめない：すき間がある（tol 超）・曲がっている・折り返す・重なる・続きの候補が2本以上ある端（どれが続きか決められない）。層が違う線は続きにしない。
 *  （事業主の指摘 2026-10-18「スナップの位置が上下対称のはずなのにずれる」：1本の辺が3本に分かれていて、1本ごとの中点が、下の1本の辺の中点とずれた） */
export function straightRuns(list, { tol = 0.02, cross = 1e-3 } = {}) {
  const lines = [];
  for (const s of list || []) {
    const pts = s.type === 'line' ? [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] : s.type === 'polyline' && !s.closed && s.points?.length === 2 ? s.points : null; if (!pts) continue;
    const a = pts[0], b = pts[1], len = Math.hypot(b.x - a.x, b.y - a.y); if (!(len > 1e-3) || !Number.isFinite(len)) continue;
    lines.push({ id: s.id, layer: s.layer, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, len, u: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } });
  }
  const cell = 2 * tol, key = (cx, cy) => cx + ',' + cy, grid = new Map(), recs = [];
  lines.forEach((l, i) => [0, 1].forEach(e => { const p = e ? l.b : l.a, rec = { i, e, p, d: e ? { x: -l.u.x, y: -l.u.y } : { x: l.u.x, y: l.u.y } }, k = key(Math.round(p.x / cell), Math.round(p.y / cell)); recs.push(rec); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(rec); }));   /* d＝その端から線の中へ向かう向き */
  const candidates = rec => {   /* その端の続きの候補：同じ層・同じ直線上で、反対向きに伸びる線の端 */
    const out = [], cx = Math.round(rec.p.x / cell), cy = Math.round(rec.p.y / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get(key(cx + dx, cy + dy)) || []) {
      if (o.i === rec.i || Math.hypot(o.p.x - rec.p.x, o.p.y - rec.p.y) > tol || lines[o.i].layer !== lines[rec.i].layer) continue;
      if (Math.abs(rec.d.x * o.d.y - rec.d.y * o.d.x) <= cross && rec.d.x * o.d.x + rec.d.y * o.d.y < 0) out.push(o);
    }
    return out;
  };
  const parent = lines.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i])), cand = new Map(recs.map(r => [r, candidates(r)]));
  for (const rec of recs) { const c = cand.get(rec); if (c.length === 1 && cand.get(c[0]).length === 1 && cand.get(c[0])[0] === rec) parent[find(rec.i)] = find(c[0].i); }   /* お互いにただ1つの続きのときだけつなぐ */
  const groups = new Map(); lines.forEach((l, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(l); });
  const out = [];
  for (const grp of groups.values()) {
    if (grp.length < 2) continue;
    const R = grp.reduce((m, l) => l.len > m.len ? l : m), t = q => (q.x - R.a.x) * R.u.x + (q.y - R.a.y) * R.u.y, off = q => Math.abs((q.x - R.a.x) * R.u.y - (q.y - R.a.y) * R.u.x), pts = grp.flatMap(l => [l.a, l.b]);
    if (pts.some(q => off(q) > 0.05)) continue;   /* 少しずつ曲がっていく列は、まとめない */
    const lo = pts.reduce((m, q) => t(q) < t(m) ? q : m), hi = pts.reduce((m, q) => t(q) > t(m) ? q : m), span = t(hi) - t(lo), sum = grp.reduce((m, l) => m + l.len, 0);
    if (Math.abs(sum - span) > 0.05 + tol * grp.length) continue;   /* 重なり・折り返しがあれば、まとめない */
    out.push({ ids: grp.map(l => l.id), p1: { x: lo.x, y: lo.y }, p2: { x: hi.x, y: hi.y }, mid: { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 } });
  }
  return out;
}
export function straightenPath(s) {
  if (s.type !== 'path' || !s.nodes?.length || s.nodes.length < 2) return s;
  if (!s.nodes.every(n => !n.smooth && n.inX === n.x && n.inY === n.y && n.outX === n.x && n.outY === n.y)) return s;
  const { nodes, closed, type, ...rest } = s;
  if (nodes.length === 2 && !closed) return { ...rest, type: 'line', x1: nodes[0].x, y1: nodes[0].y, x2: nodes[1].x, y2: nodes[1].y };
  return { ...rest, type: 'polyline', closed: !!closed, points: nodes.map(n => ({ x: n.x, y: n.y })) };
}
/** 図形を弧長位置で切り分ける。折れ線・パスを切った残りで、直線だけのものは直線・折れ線のまま返す（トリムで「直線として扱えない」ことが無いように）。 */
export function splitShapeAt(s, positions) {
  const r = splitShapeAtRaw(s, positions); return r.length === 1 && r[0] === s ? r : r.map(straightenPath);
}
function splitShapeAtRaw(s, positions) {
  const len = arcLength(s), closedLoop = !!s.closed && s.type !== 'circle'; /* 閉じた図形は、始点（位置 0＝終点）も区切りになりうる（始点にある頂点に別の線がつながっている場合） */
  const norm = p => closedLoop && p >= len - 1e-6 && p <= len + 1e-6 ? 0 : p;
  const cuts = [...new Set(positions.map(norm).filter(p => Number.isFinite(p) && (p > 1e-6 || (closedLoop && p >= 0)) && p < len - 1e-6).map(p => +p.toFixed(9)))].sort((x, y) => x - y);
  if (!cuts.length || s.type === 'text' || s.type === 'dimension') return [s];
  const strip = o => { const { id, ...rest } = o; return rest; };
  if (s.type === 'circle') {
    if (cuts.length < 2) return [s];
    const degs = cuts.map(c => c / s.r * 180 / Math.PI);
    return degs.map((d, i) => ({ ...strip(s), type: 'arc', startDeg: d, endDeg: i + 1 < degs.length ? degs[i + 1] : d + (360 - d + degs[0]) }));
  }
  const bounds = [0, ...cuts, len];
  if (s.type === 'line') return bounds.slice(1).map((e, i) => { const p = pointAtLength(s, bounds[i]), q = pointAtLength(s, e); return { ...strip(s), x1: p.x, y1: p.y, x2: q.x, y2: q.y }; });
  if (s.type === 'arc') return bounds.slice(1).map((e, i) => ({ ...strip(s), startDeg: s.startDeg + bounds[i] / s.r * 180 / Math.PI, endDeg: s.startDeg + e / s.r * 180 / Math.PI }));
  // ベジェ・折れ線・path は path に変換し、切断点に節点を挿入してから節点列を分ける。
  /* 折れ線・ベジェ・直線は path に変換して切るが、変換で見た目（点線・色・層・グループなど、形以外の属性）が捨てられるので、元の図形から引き継ぐ（不具合記録 2026-10-17：点線をトリムしたら残りが実線になった） */
  let p = toPath(s); if (s.type !== 'path') { const GEOM = new Set(['id', 'type', 'x1', 'y1', 'x2', 'y2', 'c1x', 'c1y', 'c2x', 'c2y', 'points', 'closed', 'nodes']), look = {}; for (const [k, v] of Object.entries(s)) if (!GEOM.has(k)) look[k] = v; p = { ...look, ...p }; } const have = [0]; { let acc = 0; for (const g of pathSegments(p)) { acc += arcLength(g); have.push(acc); } } /* すでにある節点の位置（始点・頂点）。そこが区切りなら、節点を重ねて足さない（長さ0の線ができる） */
  for (const c of cuts) if (!have.some(h => Math.abs(h - c) < 1e-6)) p = pathInsertNode(p, c);
  const idx = []; let acc = 0; const segs = pathSegments(p);
  for (let i = 0; i < segs.length; i++) { if (cuts.some(c => Math.abs(c - acc) < 1e-6)) idx.push(i); acc += arcLength(segs[i]); }
  if (p.closed) { const n = p.nodes.length, order = [...idx, idx[0] + n]; return order.slice(1).map((e, i) => ({ ...strip(p), closed: false, nodes: Array.from({ length: e - order[i] + 1 }, (_, k) => ({ ...p.nodes[(order[i] + k) % n] })) })).filter(x => x.nodes.length >= 2); }
  const order = [0, ...idx, p.nodes.length - 1];
  return order.slice(1).map((e, i) => ({ ...strip(p), closed: false, nodes: p.nodes.slice(order[i], e + 1).map(n => ({ ...n })) })).filter(x => x.nodes.length >= 2);
}
/** 図形配列から全ペアの交点 [{x,y,ids:[a,b]}] を返す。line／circle は厳密、他は平坦化（公差 tol）して折れ線どうしで求める。 */
export function allIntersections(shapes, tol = 0.01) {
  const out = [], edgesOf = s => { if (s.type === 'line' || s.type === 'circle') return [s]; if (s.type === 'arc' || s.type === 'bezier' || s.type === 'polyline' || s.type === 'path') { const ps = flattenShape(s, tol); return ps.slice(1).map((q, i) => ({ type: 'line', x1: ps[i].x, y1: ps[i].y, x2: q.x, y2: q.y })); } return []; };
  const cache = shapes.map(edgesOf);
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
    for (const a of cache[i]) for (const b of cache[j]) for (const p of intersections(a, b)) {
      if (!out.some(q => q.ids[0] === shapes[i].id && q.ids[1] === shapes[j].id && distance(p, q) < tol * 5)) out.push({ ...p, ids: [shapes[i].id, shapes[j].id] });
    }
  }
  return out;
}
/** 図形・クリック点・他図形群から、交点と端点で区切った区間のうち点を含む区間を除いた図形配列を返す（トリム）。keep=true は点を含む区間だけ残す。 */
export function trimAt(s, p, others, { keep = false, tol = 0.01 } = {}) {
  const len = arcLength(s); if (len < EPS || s.type === 'text' || s.type === 'dimension') return null;
  const cuts = allIntersections([s, ...others.filter(o => o.id !== s.id)], tol).filter(q => q.ids.includes(s.id)).map(q => projectOnPath(s, q).s);
  const parts = splitShapeAt(s, cuts);
  if (parts.length < 2 && s.type !== 'circle') { /* 端だけが他の図形に接している線（飛び出した線）：交点の外側は線全体なので、切り取ると線ごと消える */
    const open = !s.closed, atEnd = cuts.some(c => c < 1e-6 + tol || c > len - tol - 1e-6);
    return open && atEnd ? (keep ? [s] : []) : null;
  }
  const hit = parts.reduce((best, part) => distToShape(part, p) < distToShape(best, p) ? part : best);
  return keep ? [hit] : parts.filter(part => part !== hit);
}
/** .lcc の取り込みで作る層（lcc-… ・ lc0, lc1…）の id か。 */
export const isLccLayerId = id => /^(lcc-|lc\d)/.test(id || '');
/** 穴が、経路の線の層に左右されない「独立した穴」か：.lcc から取り込んだ穴（ownVisible）。古い図（印の無い取り込み穴）は、経路の線がすべて .lcc の層（または見えない補助の線）にあるものを同じに扱う。 */
export function ownHolePathIds(doc) {
  const byId = new Map(doc.shapes.map(s => [s.id, s])), out = new Set();
  for (const p of doc.paths) if (p.shapeIds.length && p.shapeIds.every(id => { const s = byId.get(id); return s && (s.holeLink || isLccLayerId(s.layer)); })) out.add(p.id);
  return out;
}
export const holeIsOwn = (h, ownPaths) => !!h.ownVisible || ownPaths.has(h.pathId);

/** 2本の曲線（直線・円弧・円・ベジェ・ペン・折れ線）の交点のそばを、半径 r の円弧でなめらかにつなぐ。pA・pB は、それぞれ残したい側（腕）の上でクリックした点。
 *  戻り値 { arc, a, b }（arc＝つなぎの円弧、a・b＝切って残した曲線）か、成り立たないとき null。曲線は細かい折れ線で計算するので、接する点は 0.01mm 程度の誤差。 */
export function filletCurves(sA, pA, sB, pB, r) {
  const okType = s => ['line', 'polyline', 'arc', 'bezier', 'path', 'circle'].includes(s?.type) && !(s.closed && s.type !== 'circle');
  if (!(r > 0) || !okType(sA) || !okType(sB)) return null;
  const asArc = s => s.type === 'circle' ? { ...s, type: 'arc', startDeg: 0, endDeg: 360 } : s, A = asArc(sA), B = asArc(sB);
  const PA = flattenShape(A, 0.005), PB = flattenShape(B, 0.005); if (!PA || !PB || PA.length < 2 || PB.length < 2) return null;
  const cum = P => P.reduce((c, q, i) => (c.push(i ? c[i - 1] + distance(q, P[i - 1]) : 0), c), []), cA = cum(PA), cB = cum(PB);
  const segHit = (a, b, c, d) => { const v = { x: b.x - a.x, y: b.y - a.y }, w = { x: d.x - c.x, y: d.y - c.y }, den = cross(v, w); if (Math.abs(den) < 1e-12) return null; const e = { x: c.x - a.x, y: c.y - a.y }, t = cross(e, w) / den, u = cross(e, v) / den; return t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9 ? null : { x: a.x + v.x * t, y: a.y + v.y * t }; };
  const crossings = (P, Q) => { const out = []; for (let i = 1; i < P.length; i++) for (let j = 1; j < Q.length; j++) { const h = segHit(P[i - 1], P[i], Q[j - 1], Q[j]); if (h) out.push(h); } return out; };
  const project = (P, C, q) => { let best = { d: Infinity }; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], v = { x: b.x - a.x, y: b.y - a.y }, n = dot(v, v), t = n ? Math.max(0, Math.min(1, dot({ x: q.x - a.x, y: q.y - a.y }, v) / n)) : 0, pt = { x: a.x + v.x * t, y: a.y + v.y * t }, d = distance(pt, q); if (d < best.d) best = { d, pt, s: C[i - 1] + t * Math.sqrt(n), side: Math.sign(cross(v, { x: q.x - pt.x, y: q.y - pt.y })) }; } return best; };
  const mid = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 }, X = crossings(PA, PB).sort((p, q) => distance(p, mid) - distance(q, mid))[0]; if (!X) return null;
  const sideA = project(PA, cA, pB).side, sideB = project(PB, cB, pA).side; if (!sideA || !sideB) return null;
  let center = null;
  for (const da of [r, -r]) for (const db of [r, -r]) {
    const oa = offsetPolyline(PA, da, false, { join: 'miter' }), ob = offsetPolyline(PB, db, false, { join: 'miter' }); if (oa.length < 2 || ob.length < 2) continue;
    for (const C of crossings(oa, ob)) if (project(PA, cA, C).side === sideA && project(PB, cB, C).side === sideB && (!center || distance(C, X) < distance(center, X))) center = C;
  }
  if (!center) return null;
  const qa = project(PA, cA, center), qb = project(PB, cB, center); if (Math.abs(qa.d - r) > 0.02 || Math.abs(qb.d - r) > 0.02) return null;
  const sa = qa.s * arcLength(A) / cA.at(-1), sb = qb.s * arcLength(B) / cB.at(-1), keep = (S, P, C, pt, s, click) => { const parts = splitShapeAt(S, [s]); if (parts.length < 2) return null; return project(P, C, click).s < pt.s ? parts[0] : parts[1]; };
  const a = keep(A, PA, cA, qa, sa, pA), b = keep(B, PB, cB, qb, sb, pB); if (!a || !b) return null;
  const ang = q => norm(Math.atan2(q.y - center.y, q.x - center.x) * 180 / Math.PI), a1 = ang(qa.pt), a2 = ang(qb.pt), d = norm(a2 - a1);
  const arc = d <= 180 ? { type: 'arc', cx: center.x, cy: center.y, r, startDeg: a1, endDeg: a1 + d } : { type: 'arc', cx: center.x, cy: center.y, r, startDeg: a2, endDeg: a2 + norm(a1 - a2) };
  return { arc, a, b };
}

/** 2本の直線の角を丸める（kind='fillet'）／面取りする（'chamfer'）。端がつながっていなくても、交わっていなくても、2本をのばした交点を角にする（のばす・切り詰める）。
 *  p1・p2 は、それぞれ残したい側（腕）の上でクリックした点。戻り値 { arc, a, b }（arc＝丸めの円弧または面取りの線、a・b＝残した直線）か、平行・長さ不足などで成り立たないとき null。 */
export function roundLinesAt(l1, p1, l2, p2, r, kind = 'fillet') {
  if (!(r > 0) || l1?.type !== 'line' || l2?.type !== 'line') return null;
  const v = { x: l1.x2 - l1.x1, y: l1.y2 - l1.y1 }, w = { x: l2.x2 - l2.x1, y: l2.y2 - l2.y1 }, den = cross(v, w);
  if (Math.abs(den) < 1e-9 * Math.hypot(v.x, v.y) * Math.hypot(w.x, w.y)) return null; /* 平行 */
  const t = cross({ x: l2.x1 - l1.x1, y: l2.y1 - l1.y1 }, w) / den, C = { x: l1.x1 + v.x * t, y: l1.y1 + v.y * t };
  const farOf = (l, q) => { const e = [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }], s = e.map(pt => dot({ x: pt.x - C.x, y: pt.y - C.y }, { x: q.x - C.x, y: q.y - C.y })); return s[0] >= s[1] ? { pt: e[0], first: true } : { pt: e[1], first: false }; };
  const A = farOf(l1, p1), B = farOf(l2, p2); if (distance(A.pt, C) < EPS || distance(B.pt, C) < EPS) return null;
  const VA = { type: 'line', x1: A.pt.x, y1: A.pt.y, x2: C.x, y2: C.y }, VB = { type: 'line', x1: B.pt.x, y1: B.pt.y, x2: C.x, y2: C.y };
  const arc = (kind === 'chamfer' ? chamferCorner : filletCorner)(VA, VB, r); if (!arc) return null;
  const ends = arc.type === 'arc' ? [circlePoint(arc, arc.startDeg), circlePoint(arc, arc.endDeg)] : [{ x: arc.x1, y: arc.y1 }, { x: arc.x2, y: arc.y2 }];
  const pa = ends.reduce((m, q) => distToShape(VA, m) <= distToShape(VA, q) ? m : q), pb = ends.find(q => q !== pa) || ends[1];
  const rebuild = (F, q) => F.first ? { x1: F.pt.x, y1: F.pt.y, x2: q.x, y2: q.y } : { x1: q.x, y1: q.y, x2: F.pt.x, y2: F.pt.y };
  return { arc, a: { ...l1, ...rebuild(A, pa) }, b: { ...l2, ...rebuild(B, pb) } };
}

/** 線 base の、角 C と反対側の端から先へ、同じ直線上で端どうしがつながっている線を順にたどる（層・種類が違ってもよい。呼ぶ側で直線にそろえて渡す）。
 *  lines＝候補（{ id, x1, y1, x2, y2 }）。戻り値＝[{ id, near, far }]（近い順。near＝角側の端・far＝先の端）。折れ曲がる線・折り返す線・端が離れた線は入らない。 */
export function collinearChain(lines, base, C, tol = 1e-4) {
  const ends = l => [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }], [p0, p1] = ends(base), farEnd = distance(p0, C) <= distance(p1, C) ? p1 : p0, nearEnd = farEnd === p1 ? p0 : p1, len = distance(nearEnd, farEnd);
  if (len < EPS) return [];
  const u = { x: (farEnd.x - nearEnd.x) / len, y: (farEnd.y - nearEnd.y) / len }, out = [], used = new Set([base.id]); let E = farEnd;
  for (;;) {
    let found = null;
    for (const l of lines) {
      if (used.has(l.id)) continue;
      const [a, b] = ends(l), aNear = distance(a, E) <= tol, bNear = distance(b, E) <= tol; if (aNear === bNear) continue;
      const nr = aNear ? a : b, fr = aNear ? b : a, d = distance(nr, fr); if (d < EPS) continue;
      const v = { x: (fr.x - nr.x) / d, y: (fr.y - nr.y) / d };
      if (dot(u, v) > 0 && Math.abs(cross(u, v)) < 1e-6) { found = { id: l.id, near: nr, far: fr }; break; }
    }
    if (!found) break; used.add(found.id); out.push(found); E = found.far;
  }
  return out;
}

/** 端（角）を共有する2本の直線 l1・l2 の角を、それぞれの先につながった同じ直線上の線（chain1・chain2＝collinearChain の戻り値）まで含めて丸める（'fillet'）／面取りする（'chamfer'）。
 *  戻り値 { arc, side1, side2 }：side＝その辺の編集の列（角に近い順）。{ id, remove:true }＝丸めの内側に入って消す線／{ id, near, to }＝角側の端 near を接点 to へ切り詰める線。成り立たない（平行・続きを足しても入らない）とき null。 */
export function roundChainAt(l1, chain1, l2, chain2, r, kind = 'fillet') {
  if (!(r > 0) || l1?.type !== 'line' || l2?.type !== 'line') return null;
  const a = [{ x: l1.x1, y: l1.y1 }, { x: l1.x2, y: l1.y2 }], b = [{ x: l2.x1, y: l2.y1 }, { x: l2.x2, y: l2.y2 }]; let C = null;
  for (const p of a) for (const q of b) if (distance(p, q) < EPS) C = p;
  if (!C) return null;
  const farOf = (l, ch) => ch.length ? ch.at(-1).far : (distance({ x: l.x1, y: l.y1 }, C) <= distance({ x: l.x2, y: l.y2 }, C) ? { x: l.x2, y: l.y2 } : { x: l.x1, y: l.y1 });
  const F1 = farOf(l1, chain1), F2 = farOf(l2, chain2), M1 = { type: 'line', x1: C.x, y1: C.y, x2: F1.x, y2: F1.y }, M2 = { type: 'line', x1: C.x, y1: C.y, x2: F2.x, y2: F2.y };
  const arc = (kind === 'chamfer' ? chamferCorner : filletCorner)(M1, M2, r); if (!arc) return null;
  const ends = arc.type === 'arc' ? [circlePoint(arc, arc.startDeg), circlePoint(arc, arc.endDeg)] : [{ x: arc.x1, y: arc.y1 }, { x: arc.x2, y: arc.y2 }];
  const pa = ends.reduce((m, q) => distToShape(M1, m) <= distToShape(M1, q) ? m : q), pb = ends.find(q => q !== pa) || ends[1];
  const edits = (l, ch, P) => {
    const farPt = distance({ x: l.x1, y: l.y1 }, C) <= distance({ x: l.x2, y: l.y2 }, C) ? { x: l.x2, y: l.y2 } : { x: l.x1, y: l.y1 }, t = distance(C, P), out = []; let cum = 0;
    for (const e of [{ id: l.id, near: C, far: farPt }, ...ch]) { const end = cum + distance(e.near, e.far); if (end <= t + 1e-6) out.push({ id: e.id, remove: true }); else { if (cum < t - 1e-6) out.push({ id: e.id, near: e.near, to: P }); break; } cum = end; }
    return out;
  };
  return { arc, side1: edits(l1, chain1, pa), side2: edits(l2, chain2, pb) };
}

/** 2本の直線の角に入る、丸めの半径（面取りは寸法）の最大値と、それを決めている短い線の長さ。平行などで決められないとき null。 */
export function cornerLimit(l1, p1, l2, p2, kind = 'fillet') {
  if (l1?.type !== 'line' || l2?.type !== 'line') return null;
  const v = { x: l1.x2 - l1.x1, y: l1.y2 - l1.y1 }, w = { x: l2.x2 - l2.x1, y: l2.y2 - l2.y1 }, den = cross(v, w);
  if (Math.abs(den) < 1e-9 * Math.hypot(v.x, v.y) * Math.hypot(w.x, w.y)) return null;
  const t = cross({ x: l2.x1 - l1.x1, y: l2.y1 - l1.y1 }, w) / den, C = { x: l1.x1 + v.x * t, y: l1.y1 + v.y * t };
  const farOf = (l, q) => { const e = [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }]; return dot({ x: e[0].x - C.x, y: e[0].y - C.y }, { x: q.x - C.x, y: q.y - C.y }) >= dot({ x: e[1].x - C.x, y: e[1].y - C.y }, { x: q.x - C.x, y: q.y - C.y }) ? e[0] : e[1]; };
  const A = farOf(l1, p1), B = farOf(l2, p2), la = distance(A, C), lb = distance(B, C); if (la < EPS || lb < EPS) return null;
  const u = { x: (A.x - C.x) / la, y: (A.y - C.y) / la }, z = { x: (B.x - C.x) / lb, y: (B.y - C.y) / lb }, theta = Math.acos(Math.max(-1, Math.min(1, dot(u, z))));
  if (theta < EPS || Math.PI - theta < EPS) return null;
  const short = Math.min(la, lb); return { max: kind === 'chamfer' ? short : short * Math.tan(theta / 2), short };
}
