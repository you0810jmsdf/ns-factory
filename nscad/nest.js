/* 用紙への配置（ネスティング）の計算：型紙の外形（点の並び）を、用紙の印刷できる範囲に、余白が少なくなるように並べる。画面や図面には触れない（純粋な計算）。
   事業主 2026-10-29「図形をA4用紙に効率よく配置調整できる機能が欲しい。極力余白が少なくなるような組み合わせ（図形の回転許容）をシミュレーションして最適な結果を表示する。印刷時の余白も考慮」
   （対象＝型紙のかたまりごと・詰め方＝実際の形で・回転は90°刻み＋各型紙の最適な角度・結果は薄く表示して「配置する」で確定）。
   やり方：外形を細かい格子（既定 2mm）に置き換え（少しでもかかる格子は塗る）、回転を変えて、用紙の左上から順に「いちばん上・左に置ける所」へ置く。並べる順番を何通りも試して（時間の上限つき）、
   用紙の枚数が少なく、使う範囲が小さい案を選ぶ。型紙どうしは gap（mm）以上あける。印刷余白 margin の内側だけに置く。縦・横の両方の向きを試す（orient='auto'）。
   名前は nst で始める（file:// 版では全部品が同じ場所に連結されるため、ほかの部品と名前がぶつからないように）。 */
const nstRot = (p, deg, c) => { const a = deg * Math.PI / 180, x = p.x - c.x, y = p.y - c.y; return { x: c.x + x * Math.cos(a) - y * Math.sin(a), y: c.y + x * Math.sin(a) + y * Math.cos(a) }; };
const nstBox = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; } return { minX: x0, minY: y0, maxX: x1, maxY: y1 }; };
const nstArea = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; };
/** 凸包（単調な鎖）。最小の外接の四角の向きを求めるのに使う。 */
function nstHull(pts) {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], hi = [];
  for (const p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...s].reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/** 最小の外接の四角が、軸に平行になる回転角（度）。凸包の辺ごとに、その辺を水平にしたときの外接の四角の面積を比べる。 */
function nstMinRectAngle(pts) {
  const h = nstHull(pts); if (h.length < 3) return 0; let best = 0, bestArea = Infinity;
  for (let i = 0; i < h.length; i++) { const p = h[i], q = h[(i + 1) % h.length], ang = -Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI, b = nstBox(h.map(r => nstRot(r, ang, p))), a = (b.maxX - b.minX) * (b.maxY - b.minY); if (a < bestArea - 1e-9) { bestArea = a; best = ang; } }
  return best;
}
/** 試す回転角（度）：回転しないなら 0 だけ。回すなら 0・90・180・270 と、最小の外接の四角が軸に平行になる角（と、それに 90 ずつ足した角）。近い角（0.5°以内）は1つにまとめる。 */
function nstAngles(pts, rotate) {
  if (!rotate) return [0];
  const base = [0, 90, 180, 270], m = nstMinRectAngle(pts), out = [...base]; for (const k of [0, 90, 180, 270]) out.push(((m + k) % 360 + 360) % 360);
  const keep = []; for (const a of out) if (!keep.some(b => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 0.5)) keep.push(a);
  return keep;
}
/** 外形（点の並び）を格子に置き換える：少しでもかかる格子は塗る（細い横線を3本ずつ引いて、中の区間を塗る）。戻り値 { w, h, cells: 塗った格子の位置の並び（行ごと・左から）, minX, minY }。 */
function nstRaster(pts, cell) {
  const b = nstBox(pts), w = Math.max(1, Math.ceil((b.maxX - b.minX) / cell - 1e-9)), h = Math.max(1, Math.ceil((b.maxY - b.minY) / cell - 1e-9)), grid = new Uint8Array(w * h), n = pts.length, SUB = 3;
  for (let r = 0; r < h; r++) for (let k = 0; k < SUB; k++) {
    const y = b.minY + (r + (k + 0.5) / SUB) * cell, xs = [];
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; if ((p.y <= y) !== (q.y <= y)) xs.push(p.x + (y - p.y) / (q.y - p.y) * (q.x - p.x)); }
    xs.sort((m, o) => m - o);
    for (let j = 0; j + 1 < xs.length; j += 2) { const a = Math.max(0, Math.floor((xs[j] - b.minX) / cell)), z = Math.min(w - 1, Math.floor((xs[j + 1] - b.minX) / cell - 1e-9)); for (let c = a; c <= z; c++) grid[r * w + c] = 1; }
  }
  const cells = []; for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (grid[r * w + c]) cells.push(r * w + c);
  return { w, h, grid, cells, minX: b.minX, minY: b.minY };
}
/** 塗った格子を、まわりへ g 格子ぶん広げた格子の位置（置いた型紙のまわりの、あけておく間）。戻り値 [{ dx, dy }] ではなく、元の格子の座標に足す差の並び。 */
function nstDilateOffsets(g) { const o = []; for (let y = -g; y <= g; y++) for (let x = -g; x <= g; x++) o.push([x, y]); return o; }
function nstMulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** 1通りの順番で詰める。戻り値 { sheets: [{ placed: [{ piece, rot, gx, gy, bottom }], occ }], unplaced, score }。 */
function nstPack(order, rasters, gw, gh, gc, deadline) {
  const sheets = [], unplaced = [], dil = nstDilateOffsets(gc);
  const newSheet = () => ({ placed: [], occ: new Uint8Array(gw * gh), rows: 0 });
  const tryOnSheet = (sheet, pieceRasters) => {
    let best = null;
    for (const [ri, R] of pieceRasters.entries()) {
      if (R.w > gw || R.h > gh) continue;
      const cells = R.cells, nC = cells.length, maxGy = gh - R.h, maxGx = gw - R.w;
      for (let gy = 0; gy <= maxGy; gy++) {
        if (best && gy + R.h >= best.bottom) break;   /* これより下は、いまの最良より深くなる */
        for (let gx = 0; gx <= maxGx; gx++) {
          let hit = false;
          for (let k = 0; k < nC; k++) { const c = cells[k], idx = (gy + ((c / R.w) | 0)) * gw + gx + (c % R.w); if (sheet.occ[idx]) { hit = true; break; } }
          if (!hit) { const bottom = gy + R.h; if (!best || bottom < best.bottom || (bottom === best.bottom && gx < best.gx)) best = { ri, gx, gy, bottom }; break; }
        }
      }
    }
    return best;
  };
  const commit = (sheet, piece, R, b) => {
    for (const c of R.cells) { const cx = b.gx + (c % R.w), cy = b.gy + ((c / R.w) | 0); for (const [ox, oy] of dil) { const x = cx + ox, y = cy + oy; if (x >= 0 && x < gw && y >= 0 && y < gh) sheet.occ[y * gw + x] = 1; } }
    sheet.placed.push({ piece, ri: b.ri, gx: b.gx, gy: b.gy, bottom: b.bottom }); if (b.bottom > sheet.rows) sheet.rows = b.bottom;
  };
  for (const piece of order) {
    const rs = rasters.get(piece.id); let done = false;
    for (const sheet of sheets) { const b = tryOnSheet(sheet, rs); if (b) { commit(sheet, piece, rs[b.ri], b); done = true; break; } }
    if (!done) { const sheet = newSheet(), b = tryOnSheet(sheet, rs); if (b) { sheets.push(sheet); commit(sheet, piece, rs[b.ri], b); } else unplaced.push(piece.id); }
    if (deadline && Date.now() > deadline) { /* 時間切れ：残りは今の並べ方で続ける（途中で止めると置けなくなるので、最後まで置く） */ }
  }
  const last = sheets[sheets.length - 1], score = unplaced.length * 1e9 + sheets.length * 1e6 + (last ? last.rows * 1000 : 0);
  return { sheets, unplaced, score };
}
/* ---- 間隔 0 のとき：置いたあとの型紙を、ぴったり接するまで寄せる（事業主 2026-11-08「隙間が０にならない」）。
   格子（既定 2mm）で置くと、少しでもかかる格子は塗るため、型紙どうしに 0.5〜2mm のすき間が残る。置いたあとで、本当の外形の重なりを調べて、左・上へ、重ならない限界まで動かす（0.001mm まで）。 ---- */
const NST_TOUCH = 1e-6;
const nstCrossZ = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
/** 2本の線分が、端以外で、はっきり交わるか（端が接する・重なって並ぶだけは、交わりでない）。 */
function nstProperCross(p1, p2, p3, p4) {
  const d1 = nstCrossZ(p3, p4, p1), d2 = nstCrossZ(p3, p4, p2), d3 = nstCrossZ(p1, p2, p3), d4 = nstCrossZ(p1, p2, p4);
  return ((d1 > NST_TOUCH && d2 < -NST_TOUCH) || (d1 < -NST_TOUCH && d2 > NST_TOUCH)) && ((d3 > NST_TOUCH && d4 < -NST_TOUCH) || (d3 < -NST_TOUCH && d4 > NST_TOUCH));
}
/** 点 p が、外形 poly の内側に、はっきり入っているか（縁の上は入っていない）。 */
function nstStrictInside(p, poly, tol) {
  let c = false, near = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
    const vx = b.x - a.x, vy = b.y - a.y, n = vx * vx + vy * vy, t = n ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / n)) : 0; near = Math.min(near, Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t)));
  }
  return c && near > tol;
}
/** 2つの外形が重なるか（縁が接するだけは、重ならない）。 */
function nstPolyOverlap(A, B, boxA, boxB, tol) {
  if (boxA.maxX <= boxB.minX + tol || boxB.maxX <= boxA.minX + tol || boxA.maxY <= boxB.minY + tol || boxB.maxY <= boxA.minY + tol) return false;
  const nA = A.length, nB = B.length;
  for (let i = 0; i < nA; i++) { const a1 = A[i], a2 = A[(i + 1) % nA]; for (let j = 0; j < nB; j++) if (nstProperCross(a1, a2, B[j], B[(j + 1) % nB])) return true; }
  for (const p of A) if (nstStrictInside(p, B, tol)) return true;
  for (const q of B) if (nstStrictInside(q, A, tol)) return true;
  /* 辺をそろえて重なる（頂点が相手の縁の上・辺の交わりが「接するだけ」に見える）ときや、同じ形がそのまま重なるときのため：辺の中点と、頂点の平均の点でも調べる */
  const mids = P => { const o = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; o.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); } o.push({ x: P.reduce((s, q) => s + q.x, 0) / P.length, y: P.reduce((s, q) => s + q.y, 0) / P.length }); return o; };
  for (const p of mids(A)) if (nstStrictInside(p, B, tol)) return true;
  for (const q of mids(B)) if (nstStrictInside(q, A, tol)) return true;
  return false;
}
/** 1枚の用紙の型紙（items＝[{ points, dx, dy }]）を、左・上へ寄せる。bounds＝印刷できる範囲 { minX, minY, maxX, maxY }。限界 tmax mm まで。items を書き換える。 */
function nstCompactSheet(items, bounds, tmax) {
  const tol = 0.0005, boxes = items.map(it => nstBox(it.points));
  const order = items.map((_, i) => i).sort((a, b) => boxes[a].minX - boxes[b].minX || boxes[a].minY - boxes[b].minY);
  const free = (i, dx, dy) => {
    const b = boxes[i], nb = { minX: b.minX + dx, maxX: b.maxX + dx, minY: b.minY + dy, maxY: b.maxY + dy };
    if (nb.minX < bounds.minX - tol || nb.minY < bounds.minY - tol || nb.maxX > bounds.maxX + tol || nb.maxY > bounds.maxY + tol) return false;
    const moved = dx || dy ? items[i].points.map(p => ({ x: p.x + dx, y: p.y + dy })) : items[i].points;
    for (let j = 0; j < items.length; j++) if (j !== i && nstPolyOverlap(moved, items[j].points, nb, boxes[j], tol)) return false;
    return true;
  };
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const i of order) for (const [ux, uy] of [[-1, 0], [0, -1]]) {
      const STEP = 0.5; let ok = 0, bad = null;
      for (let t = STEP; t <= tmax + 1e-9; t += STEP) { if (free(i, ux * t, uy * t)) ok = t; else { bad = t; break; } }
      if (bad !== null) { let lo = ok, hi = bad; for (let k = 0; k < 16; k++) { const mid = (lo + hi) / 2; if (free(i, ux * mid, uy * mid)) lo = mid; else hi = mid; } ok = lo; }
      if (ok > 1e-4) { const sx = ux * ok, sy = uy * ok; items[i].points = items[i].points.map(p => ({ x: p.x + sx, y: p.y + sy })); items[i].dx += sx; items[i].dy += sy; boxes[i] = nstBox(items[i].points); moved = true; }
    }
    if (!moved) break;
  }
}
/** 型紙を用紙に並べる。pieces＝[{ id, points: [{ x, y }, …]（外形・閉じた形） }]。
 *  opts：sheetW・sheetH（用紙の大きさ mm・既定 A4 縦 210×297）／margin（印刷余白 mm・既定 10）／gap（型紙どうしの間隔 mm・既定 3）／cell（格子 mm・既定 2）／rotate（回転を許す・既定 true）／
 *  orient（'portrait'｜'landscape'｜'auto'＝両方を試す・既定 'auto'）／timeMs（試す時間の上限・既定 1500）／trials（順番を試す回数の上限・既定 60）／seed。
 *  戻り値 { orient, sheetW, sheetH, margin, gap, sheets: [{ items: [{ id, angle, center, dx, dy, points }], usedArea }], unplaced: [id], usage（使った面積の割合＝型紙の面積の合計 ÷ 使った用紙の印刷できる面積）, wasteRatio }。
 *  items の変換：外形の各点 p を、center を中心に angle 度（geometry.js の rotate と同じ向き）回し、(dx, dy) だけ動かす。points は変換後の外形（用紙の左上が (0,0)・印刷余白の内側）。 */
export function nestPieces(pieces, opts = {}) {
  const { sheetW = 210, sheetH = 297, margin = 10, gap = 3, cell = 2, rotate = true, orient = 'auto', timeMs = 1500, trials = 60, seed = 1 } = opts;
  const orients = orient === 'portrait' ? [[sheetW, sheetH, 'portrait']] : orient === 'landscape' ? [[sheetH, sheetW, 'landscape']] : [[sheetW, sheetH, 'portrait'], [sheetH, sheetW, 'landscape']];
  const valid = pieces.filter(p => Array.isArray(p.points) && p.points.length >= 3 && nstArea(p.points) > 1e-6), gc = Math.max(0, Math.ceil(gap / cell - 1e-9));
  const deadline = Date.now() + timeMs; let best = null;
  const rasters = new Map(), info = new Map();
  for (const p of valid) {
    const c = (b => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }))(nstBox(p.points)), list = [];
    for (const ang of nstAngles(p.points, rotate)) { const rp = p.points.map(q => nstRot(q, ang, c)), R = nstRaster(rp, cell); R.angle = ang; R.rp = rp; list.push(R); }
    rasters.set(p.id, list); info.set(p.id, { center: c, area: nstArea(p.points), perim: p.points.reduce((s, q, i) => s + Math.hypot(q.x - p.points[(i + 1) % p.points.length].x, q.y - p.points[(i + 1) % p.points.length].y), 0), box: nstBox(p.points) });
  }
  const orders = [valid.slice().sort((a, b) => info.get(b.id).area - info.get(a.id).area), valid.slice().sort((a, b) => Math.max(info.get(b.id).box.maxX - info.get(b.id).box.minX, info.get(b.id).box.maxY - info.get(b.id).box.minY) - Math.max(info.get(a.id).box.maxX - info.get(a.id).box.minX, info.get(a.id).box.maxY - info.get(a.id).box.minY)), valid.slice().sort((a, b) => info.get(b.id).perim - info.get(a.id).perim)];
  const rnd = nstMulberry(seed);
  for (const [pw, ph, name] of orients) {
    const gw = Math.floor((pw - 2 * margin) / cell + 1e-9), gh = Math.floor((ph - 2 * margin) / cell + 1e-9); if (gw < 1 || gh < 1) continue;
    let bestHere = null;
    for (let t = 0; t < Math.max(orders.length, trials); t++) {
      if (t >= orders.length && Date.now() > deadline) break;
      const order = t < orders.length ? orders[t] : (() => { const o = valid.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; })();
      const r = nstPack(order, rasters, gw, gh, gc, deadline); if (!bestHere || r.score < bestHere.score) bestHere = r;
    }
    if (bestHere && (!best || bestHere.score < best.r.score)) best = { r: bestHere, pw, ph, name };
  }
  if (!best) return { orient: orient === 'landscape' ? 'landscape' : 'portrait', sheetW, sheetH, margin, gap, sheets: [], unplaced: pieces.map(p => p.id), usage: 0, wasteRatio: 1 };
  const { r, pw, ph, name } = best, usableArea = (pw - 2 * margin) * (ph - 2 * margin);
  const sheets = r.sheets.map(sh => {
    const items = sh.placed.map(pl => {
      const R = rasters.get(pl.piece.id)[pl.ri], I = info.get(pl.piece.id), x0 = margin + pl.gx * cell, y0 = margin + pl.gy * cell, dx = x0 - R.minX, dy = y0 - R.minY;
      return { id: pl.piece.id, angle: R.angle, center: I.center, dx, dy, points: R.rp.map(q => ({ x: q.x + dx, y: q.y + dy })) };
    });
    if (gap <= 1e-9 && items.length > 1) nstCompactSheet(items, { minX: margin, minY: margin, maxX: pw - margin, maxY: ph - margin }, cell * 3);   /* 間隔 0：ぴったり接するまで寄せる */
    return { items, usedArea: items.reduce((s, it) => s + nstArea(it.points), 0) };
  });
  const total = sheets.reduce((s, sh) => s + sh.usedArea, 0), usage = sheets.length ? total / (sheets.length * usableArea) : 0;
  return { orient: name, sheetW: pw, sheetH: ph, margin, gap, sheets, unplaced: r.unplaced.concat(pieces.filter(p => !valid.includes(p)).map(p => p.id)), usage, wasteRatio: sheets.length ? 1 - usage : 1 };
}
