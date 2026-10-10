// 折りたたみ 3D シミュレーション：板（部品）の生成・折り線での分割と回転・投影・干渉判定・三面図。純粋関数のみ（DOM/WebGL は app 側）。
// 座標：2D は x 右・y 下（mm）。3D は同じ x・y に z を足す（z は画面手前が正）。板は z=0（表面・銀面）から z=−t（裏面・床面）へ厚みを持つ。
import { flattenShape, bboxOf } from './geometry.js';

// ---- ベクトル・行列 ----
export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const add3 = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub3 = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale3 = (a, k) => v3(a.x * k, a.y * k, a.z * k);
export const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len3 = a => Math.hypot(a.x, a.y, a.z);
export const norm3 = a => { const l = len3(a) || 1; return scale3(a, 1 / l); };
/** 4x4 行列（列優先・16 要素）。 */
export const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function multiply(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
export const translation = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
/** 任意軸（単位ベクトル）まわりの回転行列（ロドリゲス）。角度は度。 */
export function rotationAxis(axis, deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c, { x, y, z } = norm3(axis); return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1]; }
export function transformPoint(m, p) { const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15] || 1; return v3((m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12]) / w, (m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13]) / w, (m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14]) / w); }
/** 点 pivot を通る軸 axis まわりの回転。 */
export function rotationAbout(pivot, axis, deg) { return multiply(multiply(translation(pivot.x, pivot.y, pivot.z), rotationAxis(axis, deg)), translation(-pivot.x, -pivot.y, -pivot.z)); }

// ---- 板の生成 ----
const area2 = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + (p.x * q.y - q.x * p.y); }, 0) / 2;
/** 多角形を直線（2 点）で 2 つに分ける。戻り値 [正側の多角形, 負側の多角形]（無ければ空配列）。 */
export function splitPolygon(pts, a, b) {
  const nx = -(b.y - a.y), ny = b.x - a.x, side = p => (p.x - a.x) * nx + (p.y - a.y) * ny, pos = [], neg = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], sp = side(p), sq = side(q);
    if (sp >= 0) pos.push(p); if (sp <= 0) neg.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq), m = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; pos.push(m); neg.push(m); }
  }
  const clean = list => list.filter((p, i) => i === 0 || Math.hypot(p.x - list[i - 1].x, p.y - list[i - 1].y) > 1e-9);
  return [clean(pos).length >= 3 ? clean(pos) : [], clean(neg).length >= 3 ? clean(neg) : []];
}
/** 文書から板の配列を作る。部品（parts）の閉図形ごとに 1 枚、折り線で分割して子板にする。各板 {id, partId, polygon, thickness, foldId, parentId, color}。 */
export function buildPanels(doc, { tolerance = 0.2, colorOf = p => p.color || null } = {}) { /* colorOf：部品の板の色（革の質感が付いた部品は平均色を返す） */
  const panels = [];
  const parts = doc.parts?.length ? [...doc.parts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [{ id: '_all', name: 'all', thickness: 1.5, shapeIds: doc.shapes.filter(s => (s.type === 'polyline' || s.type === 'path' || s.type === 'circle') && (s.closed || s.type === 'circle')).map(s => s.id), color: null }];
  // 重ね順：下の部品の厚みの合計だけ上に積む（z0 = 表面の高さ）
  let z0 = 0;
  for (const part of parts) {
    if (part !== parts[0]) z0 += part.thickness;
    const folds = doc.shapes.filter(s => s.type === 'fold' && (s.partId === part.id || (!s.partId && part.id === '_all')));
    for (const id of part.shapeIds) {
      const s = doc.shapes.find(x => x.id === id); if (!s || !(s.closed || s.type === 'circle')) continue;
      let pts = flattenShape(s, tolerance); if (pts.length > 1 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < 1e-9) pts = pts.slice(0, -1);
      if (pts.length < 3) continue;
      // 折り線で順に分割（木構造：分割された側のうち面積が小さい方を子にする）
      let pieces = [{ polygon: pts, foldId: null, parentIdx: null, side: 0 }];
      for (const fold of folds) {
        const next = [];
        for (const piece of pieces) {
          const [pos, neg] = splitPolygon(piece.polygon, { x: fold.x1, y: fold.y1 }, { x: fold.x2, y: fold.y2 });
          if (!pos.length || !neg.length) { next.push(piece); continue; }
          const bigger = Math.abs(area2(pos)) >= Math.abs(area2(neg)) ? pos : neg, smaller = bigger === pos ? neg : pos;
          piece.polygon = bigger; const parent = piece; next.push(parent); // 同じオブジェクトを書き換えて子の parentRef を保つ
          next.push({ polygon: smaller, foldId: fold.id, parentRef: parent, side: smaller === pos ? 1 : -1 });
        }
        pieces = next;
      }
      pieces.forEach((p, i) => { p.id = `${s.id}#${i}`; });
      for (const p of pieces) panels.push({ id: p.id, partId: part.id, shapeId: s.id, polygon: p.polygon, thickness: part.thickness, z0, foldId: p.foldId, parentId: p.parentRef ? p.parentRef.id : null, side: p.side, color: colorOf(part) });
    }
  }
  // 金具（hw 付きの図形）：中心を含む板に乗せ、折りに追従させる。高さは solid.z。
  for (const s of doc.shapes.filter(s => s.hw && s.hw.solid)) {
    let pts = flattenShape(s, tolerance); if (pts.length > 1 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < 1e-9) pts = pts.slice(0, -1);
    if (pts.length < 3) continue;
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
    const host = panels.filter(p => !p.hardware).find(p => pointInPolygon(c, p.polygon));
    const h = Math.max(0.5, Number(s.hw.solid.z) || 2), z0 = (host ? host.z0 : 0) + h;
    panels.push({ id: 'hw:' + s.id, partId: host ? host.partId : '_hw', shapeId: s.id, polygon: pts, thickness: h, z0, foldId: null, parentId: host ? host.id : null, side: 0, color: s.hw.color || '#c8b060', hardware: true });
  }
  return panels;
}
/** 点が多角形の内側か（偶奇判定）。 */
export function pointInPolygon(p, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
/** 板に面（上面・下面・側面）の 3D 頂点を付けた配列を返す。 */
export function panelFaces(panel, matrix = identity()) {
  const t = panel.thickness, z0 = panel.z0 || 0, top = panel.polygon.map(p => transformPoint(matrix, v3(p.x, p.y, z0))), bottom = panel.polygon.map(p => transformPoint(matrix, v3(p.x, p.y, z0 - t)));
  const faces = [{ kind: 'top', points: top }, { kind: 'bottom', points: [...bottom].reverse() }];
  for (let i = 0; i < top.length; i++) { const j = (i + 1) % top.length; faces.push({ kind: 'side', points: [top[i], top[j], bottom[j], bottom[i]] }); }
  return faces.map(f => { const n = faceNormal(f.points); return { ...f, normal: n, center: f.points.reduce((a, p) => add3(a, scale3(p, 1 / f.points.length)), v3()), panelId: panel.id, partId: panel.partId, color: panel.color }; });
}
/** 平面多角形（3D 点列・凹あり・自己交差なし）を耳切りで三角形の配列 [[a,b,c],…] にする。扇形分割だと凹形で面が欠けるため。 */
export function triangulate(points) {
  const n = points.length; if (n < 3) return []; if (n === 3) return [[points[0], points[1], points[2]]];
  const nrm = faceNormal(points), ax = Math.abs(nrm.x), ay = Math.abs(nrm.y), az = Math.abs(nrm.z);
  const to2 = ax >= ay && ax >= az ? p => ({ x: p.y, y: p.z }) : ay >= az ? p => ({ x: p.z, y: p.x }) : p => ({ x: p.x, y: p.y });
  const P = points.map(to2); let area = 0; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a.x * b.y - b.x * a.y; }
  const sign = area >= 0 ? 1 : -1, idx = points.map((_, i) => i), out = [];
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const inside = (a, b, c, p) => sign * cross(a, b, p) >= -1e-12 && sign * cross(b, c, p) >= -1e-12 && sign * cross(c, a, p) >= -1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < n * n) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length], a = P[i0], b = P[i1], c = P[i2];
      if (sign * cross(a, b, c) <= 1e-12) continue; // 凹の角は耳でない
      if (idx.some(k => k !== i0 && k !== i1 && k !== i2 && inside(a, b, c, P[k]))) continue;
      out.push([points[i0], points[i1], points[i2]]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break; // 退化（重なり・自己交差）は残りを扇形で埋める
  }
  for (let i = 1; i + 1 < idx.length; i++) out.push([points[idx[0]], points[idx[i]], points[idx[i + 1]]]);
  return out;
}
export function faceNormal(points) { let n = v3(); for (let i = 0; i < points.length; i++) { const p = points[i], q = points[(i + 1) % points.length]; n = add3(n, v3((p.y - q.y) * (p.z + q.z), (p.z - q.z) * (p.x + q.x), (p.x - q.x) * (p.y + q.y))); } return norm3(n); }
/** 折り線を適用した板ごとの変換行列を返す（親→子の順に累積）。t は 0〜1。inner=true は表面（z=0 側）どうしが向き合う向き（手前へ折る）。 */
export function foldMatrices(panels, folds, t = 1) {
  const byId = new Map(panels.map(p => [p.id, p])), result = new Map();
  const matrixOf = p => {
    if (result.has(p.id)) return result.get(p.id);
    let m = p.parentId ? matrixOf(byId.get(p.parentId)) : identity();
    const fold = p.foldId ? folds.find(f => f.id === p.foldId) : null;
    if (fold) {
      const a = v3(fold.x1, fold.y1, 0), b = v3(fold.x2, fold.y2, 0), axis = norm3(sub3(b, a));
      const toward = fold.inner ? 1 : -1; // +1：表面側（z 正）へ、−1：裏面側へ
      const pivotZ = toward > 0 ? (p.z0 || 0) : (p.z0 || 0) - p.thickness; // 内側になる面に回転軸を置く
      // 子板が軸の左右どちらにあるかで回転の符号を決める（軸の法線 n = (-dy, dx) が正側）
      const nrm = v3(-(b.y - a.y), b.x - a.x, 0), sgn = p.side >= 0 ? 1 : -1;
      const deg = fold.angleDeg * t * toward * sgn * (dot3(cross3(axis, nrm), v3(0, 0, 1)) >= 0 ? 1 : -1);
      m = multiply(m, rotationAbout(v3(a.x, a.y, pivotZ), axis, deg));
    }
    result.set(p.id, m); return m;
  };
  for (const p of panels) matrixOf(p);
  return result;
}
/** 折り線を適用した全板の面（3D）を返す。 */
export function applyFolds(panels, folds, t = 1) { const ms = foldMatrices(panels, folds, t); return panels.flatMap(p => panelFaces(p, ms.get(p.id))); }
/** カメラ {yaw, pitch, roll, distance, zoom, target:{x,y,z}, ortho:true|false} から視線変換行列を返す。roll は視線まわりの回転（度・省略時 0）。 */
export function viewMatrix(cam) {
  const target = cam.target || v3(), ry = rotationAxis(v3(0, 1, 0), cam.yaw || 0), rx = rotationAxis(v3(1, 0, 0), cam.pitch || 0), rz = rotationAxis(v3(0, 0, 1), cam.roll || 0);
  return multiply(multiply(translation(0, 0, -(cam.distance || 300)), multiply(rz, multiply(rx, ry))), translation(-target.x, -target.y, -target.z));
}
/** 面を画面座標に投影：{points:[{x,y}], depth, shade, ...面}。平行投影は zoom[px/mm]、透視は distance で割る。 */
export function project(faces, cam, { width = 800, height = 600, light = v3(0.3, -0.5, 0.8) } = {}) {
  const view = viewMatrix(cam), zoom = cam.zoom || 2, L = norm3(light);
  return faces.map(f => {
    const vp = f.points.map(p => transformPoint(view, p)), depth = vp.reduce((a, p) => a + p.z, 0) / vp.length;
    const pts = vp.map(p => { const k = cam.ortho ? zoom : zoom * (cam.distance || 300) / Math.max(1, -p.z); return { x: width / 2 + p.x * k, y: height / 2 - p.y * k }; });
    const n = faceNormal(vp), shade = 0.35 + 0.65 * Math.max(0, dot3(n, L));
    return { ...f, points: pts, depth, shade, viewNormal: n };
  }).sort((a, b) => a.depth - b.depth);
}
/** 板どうしの干渉：隣接（同じ折り線で繋がる親子）を除き、3D bbox が重なり（許容 ε）かつ重心距離が板の大きさより小さい組を返す。 */
export function collisions(panels, folds, t = 1, { eps = 0.2 } = {}) {
  const ms = foldMatrices(panels, folds, t), boxes = panels.map(p => { const faces = panelFaces(p, ms.get(p.id)), pts = faces.flatMap(f => f.points); return { id: p.id, parentId: p.parentId, min: v3(Math.min(...pts.map(q => q.x)), Math.min(...pts.map(q => q.y)), Math.min(...pts.map(q => q.z))), max: v3(Math.max(...pts.map(q => q.x)), Math.max(...pts.map(q => q.y)), Math.max(...pts.map(q => q.z))), faces }; });
  const out = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]; if (a.parentId === b.id || b.parentId === a.id) continue;
    // 3 軸すべてで ε を超えて重なる（接している・わずかに触れているだけは除く）
    const depths = ['x', 'y', 'z'].map(k => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
    const depth = Math.min(...depths);
    if (depth > eps) out.push({ a: a.id, b: b.id, depth });
  }
  return out;
}
/** 三面図（第三角法）のカメラ：上面＝革の表を正面から（2D と同じ向き）・正面＝手前の縁から・右側面＝右の縁から（roll -90 で正面と同じく厚み（z）が上・手前が左になる）。 */
export function orthoViews() { return { top: { yaw: 0, pitch: 0, distance: 1000, ortho: true }, front: { yaw: 0, pitch: -90, distance: 1000, ortho: true }, right: { yaw: -90, pitch: 0, roll: -90, distance: 1000, ortho: true } }; }
/** 三面図を SVG にする（mm 単位・ビューごとに <g id>・ラベル付き）。scale は 1=実寸。 */
export function viewsToSvg(faces3d, { scale = 1, gapMm = 20, labels = { front: 'FRONT', top: 'TOP', right: 'RIGHT' } } = {}) {
  const views = orthoViews(), groups = [], boxes = {};
  for (const [name, cam] of Object.entries(views)) {
    const proj = project(faces3d, { ...cam, zoom: 1 }, { width: 0, height: 0 });
    const pts = proj.flatMap(f => f.points); if (!pts.length) continue;
    boxes[name] = { minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)), minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y)), proj };
  }
  if (!boxes.top) return '<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10"></svg>';
  const w = n => boxes[n].maxX - boxes[n].minX, h = n => boxes[n].maxY - boxes[n].minY;
  const place = { top: { x: 0, y: 0 }, front: { x: 0, y: (boxes.top ? h('top') + gapMm : 0) }, right: { x: (boxes.top ? w('top') : w('front')) + gapMm, y: 0 } };
  const f = n => (Math.round(n * 1000) / 1000).toString();
  let maxX = 0, maxY = 0;
  for (const [name, box] of Object.entries(boxes)) {
    const ox = place[name].x - box.minX, oy = place[name].y - box.minY;
    const body = box.proj.map(face => `<polygon points="${face.points.map(p => `${f((p.x + ox) * scale)},${f((p.y + oy) * scale)}`).join(' ')}" fill="${face.kind === 'top' ? '#e8d9b8' : face.kind === 'bottom' ? '#c9b48c' : '#a8906a'}" stroke="#000" stroke-width="0.1"/>`).join('');
    groups.push(`<g id="${name}">${body}<text x="${f(place[name].x * scale)}" y="${f((place[name].y - 2) * scale)}" font-size="${f(3 * scale)}" font-family="sans-serif">${String(labels[name] || name).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</text></g>`);
    maxX = Math.max(maxX, (place[name].x + w(name)) * scale); maxY = Math.max(maxY, (place[name].y + h(name)) * scale);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(maxX + 5)}mm" height="${f(maxY + 5)}mm" viewBox="-2 -5 ${f(maxX + 5)} ${f(maxY + 5)}">${groups.join('')}</svg>`;
}
/** 文書の bbox から初期カメラを作る。 */
export function defaultCamera(doc) { const shapes = doc.shapes.filter(s => s.type !== 'fold'); const b = shapes.length ? shapes.map(bboxOf).reduce((a, c) => ({ minX: Math.min(a.minX, c.minX), minY: Math.min(a.minY, c.minY), maxX: Math.max(a.maxX, c.maxX), maxY: Math.max(a.maxY, c.maxY) })) : { minX: 0, minY: 0, maxX: 100, maxY: 100 }; const size = Math.max(b.maxX - b.minX, b.maxY - b.minY, 10); return { yaw: 30, pitch: -35, distance: size * 2.5, zoom: 2, target: v3((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 0), ortho: false }; }
/** 折り線の履歴がある板を 1 枚の平面に展開する（applyFolds の逆）。各板は元の 2D 多角形へ戻り、折り線を共有する辺はそのまま、共有しない縁には縫い代 allowanceMm を外側へ足す。
 *  戻り値 {pieces:[{id, points, partId}], folds:[{x1,y1,x2,y2,angleDeg}], allowanceEdges}。 */
export function unfold(panels, folds, { allowanceMm = 0 } = {}) {
  const pieces = panels.filter(p => !p.hardware).map(p => ({ id: p.id, partId: p.partId, points: p.polygon.map(q => ({ x: q.x, y: q.y })) }));
  const foldLines = folds.map(f => ({ x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, angleDeg: f.angleDeg, id: f.id }));
  let allowanceEdges = 0;
  if (allowanceMm > 0) {
    const onFold = (a, b) => foldLines.some(f => { const d = p => Math.abs((f.x2 - f.x1) * (p.y - f.y1) - (f.y2 - f.y1) * (p.x - f.x1)) / Math.hypot(f.x2 - f.x1, f.y2 - f.y1); return d(a) < 1e-6 && d(b) < 1e-6; });
    for (const piece of pieces) {
      const pts = piece.points, out = [], area = pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + (p.x * q.y - q.x * p.y); }, 0) / 2, sign = area >= 0 ? -1 : 1; // Y 下向きでは符号付き面積が正＝時計回りなので外向き法線は右手側
      const offsets = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; if (onFold(p, q)) return 0; allowanceEdges++; return allowanceMm; });
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[(i - 1 + pts.length) % pts.length], cur = pts[i], next = pts[(i + 1) % pts.length];
        const n1 = edgeNormal(prev, cur, sign), n2 = edgeNormal(cur, next, sign), d1 = offsets[(i - 1 + pts.length) % pts.length], d2 = offsets[i];
        const a = { x: cur.x + n1.x * d1, y: cur.y + n1.y * d1 }, b = { x: cur.x + n2.x * d2, y: cur.y + n2.y * d2 };
        out.push(d1 === d2 ? { x: cur.x + (n1.x + n2.x) / 2 * d1 / Math.max(1e-9, (1 + n1.x * n2.x + n1.y * n2.y) / 2), y: cur.y + (n1.y + n2.y) / 2 * d1 / Math.max(1e-9, (1 + n1.x * n2.x + n1.y * n2.y) / 2) } : d1 === 0 ? b : a);
      }
      piece.points = out;
    }
  }
  return { pieces, folds: foldLines, allowanceEdges };
}
function edgeNormal(a, b, sign) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: -dy / l * sign, y: dx / l * sign }; }
