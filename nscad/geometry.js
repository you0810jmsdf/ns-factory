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
export function translate(s, dx, dy) { return transformGeometry(s, p => ({ x: p.x + dx, y: p.y + dy })); }
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
/** 新しい独立した version:6 の mm 文書を返す。副作用なし。既定レイヤーは型紙・目印・ガイド（名前が id と同じときは UI 側で翻訳する）。parts＝部品（厚み）、seams＝縫い合わせ線。 */
export function newDoc() { return { version: 6, unit: 'mm', shapes: [], holes: [], paths: [], parts: [], seams: [], mark: 'tool', dotD: 0.5, layers: [{ id: 'pattern', name: 'pattern', visible: true, locked: false }, { id: 'marks', name: 'marks', visible: true, locked: false }, { id: 'guide', name: 'guide', visible: true, locked: false }], tools: [] }; }
/** 任意の JSON 値を受け取り、文書構造・有限数・ID参照が正しい場合 true を返す。入力は変更しない。 */
export function validateDoc(d) {
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const id = x => typeof x === 'string' && x.length > 0;
  const nums = (x, keys) => keys.every(k => Number.isFinite(x[k]));
  const unique = xs => xs.every(x => obj(x) && id(x.id)) && new Set(xs.map(x => x.id)).size === xs.length;
  if (!obj(d) || d.version !== 6 || d.unit !== 'mm' || !['shapes', 'holes', 'layers', 'tools', 'paths', 'parts', 'seams'].every(k => Array.isArray(d[k]) && unique(d[k])) || !d.layers.length) return false;
  const partIds = new Set(d.parts.map(p => p.id));
  if (!d.parts.every(p => typeof p.name === 'string' && Number.isFinite(p.thickness) && p.thickness >= 0 && Array.isArray(p.shapeIds) && p.shapeIds.every(id => d.shapes.some(s => s.id === id)) && (p.skive === undefined || (Array.isArray(p.skive) && p.skive.every(k => obj(k) && Number.isFinite(k.toThickness) && k.toThickness >= 0))))) return false;
  if (!d.shapes.every(s => s.type !== 'fold' || (nums(s, ['x1', 'y1', 'x2', 'y2', 'angleDeg']) && typeof s.inner === 'boolean' && (s.partId === null || s.partId === undefined || partIds.has(s.partId))))) return false;
  if (!d.seams.every(m => obj(m.a) && obj(m.b) && ['butt', 'overlap', 'felled'].includes(m.style) && typeof m.reversed === 'boolean' && [m.a, m.b].every(side => d.paths.some(p => p.id === side.pathId) && nums(side, ['from', 'to']) && side.from >= 0 && side.to >= side.from))) return false;
  if (!d.layers.every(l => typeof l.name === 'string' && typeof l.visible === 'boolean' && typeof l.locked === 'boolean')) return false;
  const layers = new Set(d.layers.map(l => l.id)), shapes = new Set(d.shapes.map(s => s.id)), tools = new Set(d.tools.map(t => t.id));
  if (!d.shapes.every(s => {
    if (!layers.has(s.layer)) return false;
    if (s.type === 'line' || s.type === 'fold') return nums(s, ['x1', 'y1', 'x2', 'y2']);
    if (s.type === 'circle' || s.type === 'arc') return nums(s, ['cx', 'cy', 'r']) && s.r > 0 && (s.type === 'circle' || nums(s, ['startDeg', 'endDeg']));
    if (s.type === 'bezier') return nums(s, ['x1', 'y1', 'c1x', 'c1y', 'c2x', 'c2y', 'x2', 'y2']);
    if (s.type === 'path') return Array.isArray(s.nodes) && s.nodes.length >= (s.closed ? 3 : 2) && typeof s.closed === 'boolean' && s.nodes.every(n => obj(n) && nums(n, ['x', 'y', 'inX', 'inY', 'outX', 'outY']) && typeof n.smooth === 'boolean');
    if (s.type === 'text') return nums(s, ['x', 'y', 'sizeMm', 'angleDeg']) && s.sizeMm > 0 && typeof s.text === 'string' && s.text.length > 0 && s.text.length <= 1000;
    if (s.type === 'dimension') return nums(s, ['x1', 'y1', 'x2', 'y2', 'offset']);
    if (s.type === 'image') return nums(s, ['x', 'y', 'wMm', 'hMm', 'angleDeg', 'opacity']) && s.wMm > 0 && s.hMm > 0 && s.opacity >= 0 && s.opacity <= 1 && typeof s.imageId === 'string' && s.imageId.length > 0;
    return s.type === 'polyline' && Array.isArray(s.points) && s.points.length >= (s.closed ? 3 : 2) && typeof s.closed === 'boolean' && s.points.every(p => obj(p) && nums(p, ['x', 'y']));
  })) return false;
  const mark = m => ['tool','diamond','dot','circle','slit'].includes(m);
  if (!mark(d.mark) || !Number.isFinite(d.dotD) || d.dotD <= 0) return false;
  if (!d.tools.every(t => typeof t.name === 'string' && ['diamond', 'european', 'round', 'flat'].includes(t.kind) && nums(t, ['pitch', 'holeW', 'holeH', 'holeD', 'angleDeg']) && t.pitch > 0 && t.holeW > 0 && t.holeH > 0 && t.holeD > 0 && Number.isInteger(t.teeth) && t.teeth > 0 && t.teeth <= 1000 && mark(t.mark))) return false;
  if (!d.paths.every(p => Array.isArray(p.shapeIds) && p.shapeIds.length && new Set(p.shapeIds).size === p.shapeIds.length && p.shapeIds.every(id => shapes.has(id)) && typeof p.reversed === 'boolean' && typeof p.closed === 'boolean' && mark(p.mark) && Array.isArray(p.segments) && p.segments.every(s => obj(s) && nums(s,['from','to','pitch']) && s.from >= 0 && s.to >= s.from && s.pitch > 0 && tools.has(s.toolId) && ['fixed','variable','equal','manual'].includes(s.mode)))) return false;
  const lengths=new Map();
  for(const p of d.paths){const route=resolvePath(d,p);if(!route||route.closed!==p.closed)return false;const len=arcLength(route);lengths.set(p.id,len);if(p.segments.some(s=>s.to>len+1e-6))return false;}
  return d.holes.every(h => nums(h, ['x', 'y', 'angleDeg', 's']) && h.s >= 0 && h.s <= lengths.get(h.pathId)+1e-6 && tools.has(h.toolId) && d.paths.some(p => p.id === h.pathId) && mark(h.mark));
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
/** line／bezier／polyline／path 図形から同じ形の path 図形を返す。他は null。 */
export function toPath(s) {
  if (s.type === 'path') return { ...s, nodes: s.nodes.map(n => ({ ...n })) };
  const { x1, y1, x2, y2, c1x, c1y, c2x, c2y, points, ...metadata } = s;
  const base = { ...metadata, type: 'path' };
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
  if (local <= EPS || arcLength(seg) - local <= EPS) return s;
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
  const nodes = s.nodes.map(n => ({ ...n }));
  if (s.closed || (index > 0 && index < nodes.length - 1)) {
    const a = nodes[(index - 1 + nodes.length) % nodes.length], m = nodes[index], b = nodes[(index + 1) % nodes.length];
    // De Casteljau 分割の接線長比から元のパラメータを復元。保存・読込後も有効。
    let l = Math.hypot(m.x - m.inX, m.y - m.inY), r = Math.hypot(m.outX - m.x, m.outY - m.y);
    if (l + r < EPS) {
      l = Math.sqrt(Math.hypot(m.x - 2 * m.inX + a.outX, m.y - 2 * m.inY + a.outY));
      r = Math.sqrt(Math.hypot(b.inX - 2 * m.outX + m.x, b.inY - 2 * m.outY + m.y));
      if (l + r < EPS) { l = Math.cbrt(distance(a, m)); r = Math.cbrt(distance(m, b)); }
    }
    const t = l / (l + r);
    if (t > EPS && t < 1 - EPS) {
      const c1 = { x: a.x + (a.outX - a.x) / t, y: a.y + (a.outY - a.y) / t };
      const c2 = { x: b.x + (b.inX - b.x) / (1 - t), y: b.y + (b.inY - b.y) / (1 - t) };
      const mix = (p, q) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      const mid = mix(c1, c2), left = mix({ x: a.outX, y: a.outY }, mid), right = mix(mid, { x: b.inX, y: b.inY });
      if (distance(left, { x: m.inX, y: m.inY }) < 1e-7 && distance(right, { x: m.outX, y: m.outY }) < 1e-7 && distance(mix(left, right), m) < 1e-7) {
        a.outX = c1.x; a.outY = c1.y; b.inX = c2.x; b.inY = c2.y;
      }
    }
  }
  nodes.splice(index, 1); return { ...s, nodes };
}

const pathLengthCache = new WeakMap();
/** 不変の区間配列から累積弧長を返す。節点編集では配列を交換してキャッシュを更新する。 */
function pathLengths(s) {
  const segments = pathSegments(s); let values = pathLengthCache.get(segments);
  if (!values) { values = [0]; for (const seg of segments) values.push(values.at(-1) + arcLength(seg)); pathLengthCache.set(segments, values); }
  return values;
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
  if (s.type==='path') return pathLengths(s).at(-1);
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
    const segs=pathSegments(shape), lengths=pathLengths(shape); let lo=0, hi=segs.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(s<=lengths[mid+1])hi=mid;else lo=mid+1;}
    const seg=segs[lo], left=s-lengths[lo];
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
  // 閉経路の継ぎ目は逆向きでも s=0 に統一し、始終点の角穴を重ねない。
  return [...new Set(positions.map(s=>{const position=shape.reversed?len-s:s;return closed&&Math.abs(position-len)<EPS?0:position;}))].map(s=>{
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
  return [...[3,4].flatMap(p=>[2,4,6].map(n=>make(`diamond-${p}-${n}`,'diamond',p,n))),make('european-3.38-2','european',3.38,2),make('round-3-2','round',3,2)];
}
/** 図形／点／穴を、2 点 a・b を通る任意の軸線で折り返した新データを返す（線対称コピー用）。 */
export function reflectAcross(s, a, b) {
  const len = distance(a, b); if (len < EPS) return mirrorX(s, a.x);
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, axisDeg = Math.atan2(uy, ux) * 180 / Math.PI;
  const point = p => { const dx = p.x - a.x, dy = p.y - a.y, t = dx * ux + dy * uy, px = a.x + t * ux, py = a.y + t * uy; return { x: 2 * px - p.x, y: 2 * py - p.y }; };
  return transformGeometry(s, point, deg => 2 * axisDeg - deg, true);
}
/** 図形と弧長位置の配列から、その位置で切り分けた図形配列を返す。円は 2 点以上で円弧になる。切れない型は [図形]。 */
export function splitShapeAt(s, positions) {
  const len = arcLength(s), closed = s.type === 'circle' || s.closed;
  const cuts = [...new Set(positions.filter(Number.isFinite).map(p => closed && Math.abs(p - len) < 1e-6 ? 0 : p).filter(p => (closed ? p >= 0 : p > 1e-6) && p < len - 1e-6).map(p => +p.toFixed(9)))].sort((x, y) => x - y);
  if (!cuts.length || (closed && cuts.length < 2) || !['line','arc','circle','bezier','polyline','path'].includes(s.type)) return [s];
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
  let p = toPath(s); for (const c of cuts) p = pathInsertNode(p, c);
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
  const parts = splitShapeAt(s, cuts); if (parts.length < 2) return null;
  const hit = parts.reduce((best, part) => distToShape(part, p) < distToShape(best, p) ? part : best);
  return keep ? [hit] : parts.filter(part => part !== hit);
}

/** SVG は内部と同じ Y 下向き。正の掃引をそのまま sweep=1 にする。 */
export function svgSweep() { return 1; }

/** mm値をSVGの数値文字列にする（小数6桁、校正係数の精度を保持）。 */
export const svgNumber = n => (Math.round(n * 1e6) / 1e6).toString();
/** 対象図形に属する経路の穴を返す。 */
export function holesOnShapes(doc, shapes) { const ids = new Set(shapes.map(s => s.id)), okPaths = new Set(doc.paths.filter(p => p.shapeIds.every(id => ids.has(id))).map(p => p.id)); return doc.holes.filter(h => okPaths.has(h.pathId)); }
/** 色は #rgb/#rrggbb/#rrggbbaa だけ通す（属性への差し込み防止）。 */
export const safeColor = (c, fallback = '#d9c7a0') => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? String(c) : fallback;
/** 文字列をXMLのテキスト・属性値用にエスケープする。 */
export const svgEscape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** 識別子をSVG/DXF用の英数字と区切りに制限する。 */
export const svgId = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');

/** 図形 1 つから SVG の path d 文字列を返す（円・円弧は arc コマンド、ベジェは C、path は区間ごと）。文字・寸法は null。 */
export function shapeToSvgD(s) {
  if (s.type === 'line') return `M${svgNumber(s.x1)} ${svgNumber(s.y1)}L${svgNumber(s.x2)} ${svgNumber(s.y2)}`;
  if (s.type === 'circle') return `M${svgNumber(s.cx - s.r)} ${svgNumber(s.cy)}A${svgNumber(s.r)} ${svgNumber(s.r)} 0 1 1 ${svgNumber(s.cx + s.r)} ${svgNumber(s.cy)}A${svgNumber(s.r)} ${svgNumber(s.r)} 0 1 1 ${svgNumber(s.cx - s.r)} ${svgNumber(s.cy)}Z`;
  if (s.type === 'arc') {
    const sweep = arcSweep(s), a0 = s.startDeg * Math.PI / 180, a1 = (s.startDeg + sweep) * Math.PI / 180;
    if (sweep >= 360) return shapeToSvgD({ ...s, type: 'circle' });
    return `M${svgNumber(s.cx + s.r * Math.cos(a0))} ${svgNumber(s.cy + s.r * Math.sin(a0))}A${svgNumber(s.r)} ${svgNumber(s.r)} 0 ${sweep > 180 ? 1 : 0} ${svgSweep()} ${svgNumber(s.cx + s.r * Math.cos(a1))} ${svgNumber(s.cy + s.r * Math.sin(a1))}`;
  }
  if (s.type === 'bezier') return `M${svgNumber(s.x1)} ${svgNumber(s.y1)}C${svgNumber(s.c1x)} ${svgNumber(s.c1y)} ${svgNumber(s.c2x)} ${svgNumber(s.c2y)} ${svgNumber(s.x2)} ${svgNumber(s.y2)}`;
  if (s.type === 'polyline') return s.points.map((p, i) => `${i ? 'L' : 'M'}${svgNumber(p.x)} ${svgNumber(p.y)}`).join('') + (s.closed ? 'Z' : '');
  if (s.type === 'path') {
    const segs = pathSegments(s); if (!segs.length) return null;
    return `M${svgNumber(segs[0].x1)} ${svgNumber(segs[0].y1)}` + segs.map(g => g.type === 'line' ? `L${svgNumber(g.x2)} ${svgNumber(g.y2)}` : `C${svgNumber(g.c1x)} ${svgNumber(g.c1y)} ${svgNumber(g.c2x)} ${svgNumber(g.c2y)} ${svgNumber(g.x2)} ${svgNumber(g.y2)}`).join('') + (s.closed ? 'Z' : '');
  }
  return null;
}
/** 穴 1 つの SVG 要素文字列を返す（mark に従う：菱形は polygon、点・丸は circle、線分は line）。 */
export function holeToSvg(h, doc, color = '#e00000') {
  const a = holeAppearance(h, doc); if (!a) return '';
  if (a.kind === 'dot' || a.kind === 'circle') return `<circle cx="${svgNumber(h.x)}" cy="${svgNumber(h.y)}" r="${svgNumber(a.width / 2)}" fill="none" stroke="${color}"/>`;
  const pts = (a.kind === 'slit' ? [{ x: -a.width / 2, y: 0 }, { x: a.width / 2, y: 0 }] : [{ x: -a.width / 2, y: 0 }, { x: 0, y: -a.height / 2 }, { x: a.width / 2, y: 0 }, { x: 0, y: a.height / 2 }]).map(p => { const q = rotate(p, h.angleDeg); return `${svgNumber(q.x + h.x)},${svgNumber(q.y + h.y)}`; });
  return a.kind === 'slit' ? `<line x1="${pts[0].split(',')[0]}" y1="${pts[0].split(',')[1]}" x2="${pts[1].split(',')[0]}" y2="${pts[1].split(',')[1]}" stroke="${color}"/>` : `<polygon points="${pts.join(' ')}" fill="none" stroke="${color}"/>`;
}
/** 文書から SVG 文字列を返す。1 ユーザー単位＝1mm、width/height は mm、レイヤーごとに <g id>。線は黒 strokeMm、穴は赤。 */
export function docToSvg(doc, { includeHoles = true, strokeMm = 0.1, fill = false, marginMm = 0, layerIds = null, calibration = null, fontFamily = 'sans-serif' } = {}) {
  const shapes = doc.shapes.filter(s => (layerIds ? layerIds.includes(s.layer) : doc.layers.find(l => l.id === s.layer)?.visible));
  const holes = includeHoles ? holesOnShapes(doc, shapes) : [];
  const b = bboxOfDoc({ ...doc, shapes, holes }) || { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const fx = calibration?.fx ?? 1, fy = calibration?.fy ?? 1;
  if (![fx,fy,strokeMm].every(v=>Number.isFinite(v)&&v>0) || !Number.isFinite(marginMm) || marginMm<0) throw new RangeError('SVG dimensions');
  const padX = b.maxX === b.minX ? strokeMm / 2 : 0, padY = b.maxY === b.minY ? strokeMm / 2 : 0;
  const x0 = b.minX - marginMm - padX, y0 = b.minY - marginMm - padY, w = b.maxX - b.minX + 2 * (marginMm + padX), h = b.maxY - b.minY + 2 * (marginMm + padY);
  const groups = doc.layers.filter(l => shapes.some(s => s.layer === l.id)).map(l => {
    const body = shapes.filter(s => s.layer === l.id).map(s => {
      if (s.type === 'text') return `<text x="${svgNumber(s.x)}" y="${svgNumber(s.y)}" font-size="${svgNumber(s.sizeMm)}" font-family="${svgEscape(fontFamily)}" fill="#000" stroke="none" transform="rotate(${svgNumber(s.angleDeg)} ${svgNumber(s.x)} ${svgNumber(s.y)})">${svgEscape(s.text)}</text>`;
      if (s.type === 'dimension') { const d = dimension({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }, s.offset); return `<path d="M${svgNumber(d.a.x)} ${svgNumber(d.a.y)}L${svgNumber(d.b.x)} ${svgNumber(d.b.y)}${d.ext.map(([p, q]) => `M${svgNumber(p.x)} ${svgNumber(p.y)}L${svgNumber(q.x)} ${svgNumber(q.y)}`).join('')}"/><text x="${svgNumber(d.textPos.x)}" y="${svgNumber(d.textPos.y)}" font-size="2.5" font-family="${svgEscape(fontFamily)}" text-anchor="middle" fill="#000" stroke="none" transform="rotate(${svgNumber(d.angleDeg)} ${svgNumber(d.textPos.x)} ${svgNumber(d.textPos.y)})">${svgNumber(d.value)}</text>`; }
      const d = shapeToSvgD(s); const partColor = fill ? safeColor((doc.parts || []).find(p => p.shapeIds.includes(s.id))?.color) : null;
      return d ? `<path id="${svgId(s.id)}" d="${d}"${fill && (s.closed || s.type === 'circle') ? ` fill="${partColor}"` : ''}/>` : '';
    }).join('');
    return `<g id="${svgId('layer-' + l.id)}" data-name="${svgEscape(l.name)}">${body}</g>`;
  }).join('');
  const threadHex = h => { const p = doc.paths.find(p => p.id === h.pathId); return (fill && p && p.threadHex) ? safeColor(p.threadHex, '#e00000') : '#e00000'; };
  const holeGroup = holes.length ? `<g id="holes" data-name="Stitch_Holes" stroke-width="${svgNumber(strokeMm)}">${holes.map(h => holeToSvg(h, doc, threadHex(h))).join('')}</g>` : '';
  const inner = `<g fill="none" stroke="#000" stroke-width="${svgNumber(strokeMm)}" stroke-linecap="round" stroke-linejoin="round">${groups}${holeGroup}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgNumber(w * fx)}mm" height="${svgNumber(h * fy)}mm" viewBox="${svgNumber(x0 * fx)} ${svgNumber(y0 * fy)} ${svgNumber(w * fx)} ${svgNumber(h * fy)}">${fx === 1 && fy === 1 ? inner : `<g transform="scale(${svgNumber(fx)} ${svgNumber(fy)})">${inner}</g>`}</svg>`;
}
/** 校正係数：期待値 ÷ 実測値。実測が正でなければ null。 */
export function calibrationFactor(expectedMm, measuredMm) { const factor=expectedMm/measuredMm; return Number.isFinite(expectedMm) && Number.isFinite(measuredMm) && expectedMm > 0 && measuredMm > 0 && Number.isFinite(factor) && factor>0 ? factor : null; }
/** SVG 文字列に縦横の補正係数を掛けた新しい SVG を返す（width/height/viewBox と transform）。文書を渡した場合は docToSvg に委ねる。 */
export function applyCalibration(svgOrDoc, fx = 1, fy = 1) {
  if (![fx,fy].every(v=>Number.isFinite(v)&&v>0)) throw new RangeError('calibration');
  if (typeof svgOrDoc !== 'string') return docToSvg(svgOrDoc, { calibration: { fx, fy } });
  const m = svgOrDoc.match(/^<svg([^>]*) width="([\d.]+)mm" height="([\d.]+)mm" viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)">([\s\S]*)<\/svg>$/);
  if (!m) return svgOrDoc;
  const [, attrs, w, h, x0, y0, vw, vh, inner] = m;
  return `<svg${attrs} width="${svgNumber(w * fx)}mm" height="${svgNumber(h * fy)}mm" viewBox="${svgNumber(x0 * fx)} ${svgNumber(y0 * fy)} ${svgNumber(vw * fx)} ${svgNumber(vh * fy)}"><g transform="scale(${svgNumber(fx)} ${svgNumber(fy)})">${inner}</g></svg>`;
}
