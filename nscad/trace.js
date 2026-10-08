// スキャン画像のトレース：グレースケール→2 値化→輪郭追跡（Moore 近傍）→Douglas–Peucker 単純化。純粋関数（ImageData 相当 {width,height,data} を受け取る）。
/** RGBA から輝度（0〜255）の Uint8Array を返す。 */
export function toGray(img) { const { width, height, data } = img, out = new Uint8Array(width * height); for (let i = 0; i < width * height; i++) { const a = data[i * 4 + 3] / 255; out[i] = Math.round((0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) * a + 255 * (1 - a)); } return out; }
/** しきい値で 2 値化（線＝暗い＝1）。invert=true で明るい側を 1 にする。 */
export function threshold(gray, width, height, level = 128, invert = false) { const out = new Uint8Array(width * height); for (let i = 0; i < width * height; i++) out[i] = (invert ? gray[i] > level : gray[i] < level) ? 1 : 0; return out; }
/** 大津の方法で自動しきい値。 */
export function otsu(gray) { const hist = new Array(256).fill(0); for (const v of gray) hist[v]++; const total = gray.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sumB = 0, wB = 0, first = 128, last = 128, max = -1; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sumB += t * hist[t]; const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2; if (between > max + 1e-9) { max = between; first = last = t; } else if (Math.abs(between - max) <= 1e-9) last = t; } return Math.floor((first + last) / 2); } // 同じ分離度が続く区間（0/255 だけの画像など）はその中央を返す
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
/** 2 値画像の輪郭を Moore 近傍で追跡し、輪郭ごとの点列（画素座標・外周は時計回り）を返す。minArea 未満の輪郭は捨てる。 */
export function traceContours(bin, width, height, { minArea = 16, maxContours = 500 } = {}) {
  const get = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? bin[y * width + x] : 0, visited = new Uint8Array(width * height), out = [];
  for (let y = 0; y < height && out.length < maxContours; y++) for (let x = 0; x < width; x++) {
    if (!get(x, y) || visited[y * width + x] || get(x - 1, y)) continue; // 左が背景の画素から始める（外周）
    const start = [x, y], pts = []; let cur = start, prev = [x - 1, y], guard = 0;
    do {
      pts.push({ x: cur[0], y: cur[1] }); visited[cur[1] * width + cur[0]] = 1;
      // 前の背景画素の方向から時計回りに探す
      let d = DIRS.findIndex(([dx, dy]) => cur[0] + dx === prev[0] && cur[1] + dy === prev[1]); if (d < 0) d = 4;
      let found = null;
      for (let k = 1; k <= 8; k++) { const i = (d + k) % 8, nx = cur[0] + DIRS[i][0], ny = cur[1] + DIRS[i][1]; if (get(nx, ny)) { found = [nx, ny]; prev = [cur[0] + DIRS[(i + 7) % 8][0], cur[1] + DIRS[(i + 7) % 8][1]]; break; } }
      if (!found) break; cur = found; guard++;
    } while (!(cur[0] === start[0] && cur[1] === start[1]) && guard < width * height * 2);
    if (pts.length >= 4) { const area = Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + (p.x * q.y - q.x * p.y); }, 0) / 2); if (area >= minArea) out.push(pts); }
    // 内側を塗って同じ輪郭を二度拾わないようにする（走査線の右側を visited 扱い）
    for (const p of pts) { let xx = p.x; while (xx < width && get(xx, p.y)) { visited[p.y * width + xx] = 1; xx++; } }
  }
  return out;
}
/** Douglas–Peucker で点列を単純化（closed=true は閉曲線として扱う）。tol は同じ単位。 */
export function simplify(points, tol = 1, closed = true) {
  if (points.length < 3) return points.map(p => ({ ...p }));
  const dist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; if (!l2) return Math.hypot(p.x - a.x, p.y - a.y); const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)); return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); };
  const dp = (pts, i, j, keep) => { let maxD = 0, idx = -1; for (let k = i + 1; k < j; k++) { const d = dist(pts[k], pts[i], pts[j]); if (d > maxD) { maxD = d; idx = k; } } if (maxD > tol && idx > 0) { dp(pts, i, idx, keep); keep.add(idx); dp(pts, idx, j, keep); } };
  if (!closed) { const keep = new Set([0, points.length - 1]); dp(points, 0, points.length - 1, keep); return [...keep].sort((a, b) => a - b).map(i => ({ ...points[i] })); }
  // 閉曲線：最も離れた 2 点で分けて両側を単純化
  let far = 0; for (let k = 1; k < points.length; k++) if (Math.hypot(points[k].x - points[0].x, points[k].y - points[0].y) > Math.hypot(points[far].x - points[0].x, points[far].y - points[0].y)) far = k;
  const keep = new Set([0, far]); dp(points, 0, far, keep); const rot = [...points.slice(far), ...points.slice(0, 1)], keep2 = new Set([0, rot.length - 1]); dp(rot, 0, rot.length - 1, keep2);
  const idx = new Set([...keep, ...[...keep2].map(i => (i + far) % points.length)]);
  return [...idx].filter(i => i < points.length).sort((a, b) => a - b).map(i => ({ ...points[i] }));
}
/** 画像上の 2 点（画素）と実測 mm から mm/px を返す。 */
export function scaleFromTwoPoints(p1, p2, mm) { const d = Math.hypot(p2.x - p1.x, p2.y - p1.y); return d > 1e-9 && mm > 0 ? mm / d : null; }
/** DPI から mm/px。 */
export function scaleFromDpi(dpi) { return dpi > 0 ? 25.4 / dpi : null; }
/** 画像全体をトレースして、mm 座標の閉じた折れ線の配列を返す。opts: {level(auto=null), tolMm, minAreaMm2, mmPerPx, origin:{x,y}, invert}。 */
export function traceImage(img, { level = null, tolMm = 0.3, minAreaMm2 = 4, mmPerPx = 0.1, origin = { x: 0, y: 0 }, invert = false, maxContours = 500 } = {}) {
  const gray = toGray(img), lv = level === null ? otsu(gray) : level, bin = threshold(gray, img.width, img.height, lv, invert);
  const minArea = minAreaMm2 / (mmPerPx * mmPerPx), contours = traceContours(bin, img.width, img.height, { minArea, maxContours });
  return { level: lv, polylines: contours.map(c => simplify(c, tolMm / mmPerPx, true).map(p => ({ x: origin.x + p.x * mmPerPx, y: origin.y + p.y * mmPerPx }))).filter(pts => pts.length >= 3).map(points => ({ type: 'polyline', closed: true, points })) };
}
/** テスト用：矩形と円を描いた合成画像（白地に黒）。 */
export function syntheticImage(width, height, draw) { const data = new Uint8ClampedArray(width * height * 4).fill(255); const set = (x, y, v) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255; }; draw(set); return { width, height, data }; }
