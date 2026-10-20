// 寸法線を自動で入れる（事業主の希望 2026-10-19「図面に全自動で寸法線を入れ、あとから微調整が簡単にできるようにしてほしい」）。
// 純粋関数：図面（doc）と対象の図形（cand）から「作る寸法線の一覧」を返す。図面には触らない。画面側（app.js）が一覧を doc.shapes に足す。
// 入れるもの（チェックで選ぶ）：①型紙ごとの全体の幅と高さ（いちばん広い所＝外接の枠） ②まっすぐな辺ごとの長さ ③円の直径 ④菱目の間隔（工具のピッチと違う所だけ・区間ごとに代表1本）。
// 型紙＝端どうしが 0.5mm 以内でつながっている線のかたまり（取り込んだ図面の小さな隙間・分岐・丸角＝直線＋円弧でも1つにまとまる・事業主指摘 2026-10-19「縦横の最大値寸法が入っていない」）。
// 型紙の中にある小さなかたまり（スロット・窓・穴）には全体の幅・高さを入れない（辺の長さ・円の直径は入れる）。
// 菱目（菱の線）には寸法を入れない（事業主指摘 2026-10-19「菱目の寸法は不要」）。上下・左右で対称な辺は片側だけに入れる（事業主指摘 2026-10-19「上下左右対称な部分はどちらかに寸法を入れること」）。
// 菱目の間隔は、指定した工具のピッチと違う所だけ、区間ごとに代表1本（事業主指示 2026-10-19「菱目のピッチが指定した工具と異なる部分があれば代表で入れること」）。
// 同じ2点を測る寸法がすでにあれば入れない（何度押しても増えない）。作った寸法には autoDim（種類）の印を付ける（「自動で入れた寸法を全部消す」で消せる）。
import { distance, bboxOf, arcLength, pointAtLength, resolvePath, pathSegments, diamondLoopSizes, outlinePolygon, arcSweep, circlePoint, flattenShape } from './geometry.js';

const AD_RADIUS_TOL = 0.1;   /* 半径が「同じ」とみなす差（mm）：同じ半径の角は、型紙ごとに1本にまとめて「R5 ×4」（ベジェ・折れ線は円へのあてはめなので、少しの誤差を許す） */
const AD_SAME_CORNER = 0.2;  /* 中心・半径がこの差以内の曲線は「同じ角」とみなす（1つの角が 74°＋16° のように2本の曲線に分かれていても、角は1つ・mm） */
const AD_ARC_SLACK = 0.5;    /* 丸めた角・円弧（180°以下）とみなす余裕（度） */
const AD_R_MAX = 100;        /* これより大きな半径の緩い曲線は「丸めた角」とみなさない（mm） */
const AD_CLICK_MIN_SWEEP = 10;   /* 手動で角をクリックしたとき：ベジェ・折れ線の丸みは、この角度以上から半径を取る（度・自動より短い丸みも拾う） */
const AD_FIT_MIN_SWEEP = 20; /* ベジェ・折れ線の丸みは、この角度以上のものだけ半径を取る（度） */
const AD_FIT_TOL = 0.05, AD_FIT_REL = 0.01; /* 円とみなせる条件：点と円のずれの最大が max(0.05mm, 半径の1%) 以内 */
const AD_TURN_MIN = 0.5, AD_TURN_MAX = 30;  /* 折れ線で「丸みの続き」とみなす、頂点ごとの曲がり（度）：これより小さければ直線・大きければ鋭い角（面取りなど） */
const AD_EQ = 0.01;     /* 同じ点とみなす距離（mm） */
const AD_MIN = 1;        /* これより短い寸法は入れない（mm） */
const AD_MIN_EDGE = 3;   /* 辺の寸法は、これより短い辺には入れない（丸角のつなぎなど小さな辺の数字が散らばらないように） */
const AD_TINY = 3;       /* 外接の枠がこれ以下の小さなかたまり（小さな穴など）には、全体の幅・高さを入れない（mm） */
const AD_JOIN = 0.5;     /* 端どうしがこの距離以内なら「つながっている」とみなす（取り込んだ図面の小さな隙間を越える・mm） */
const AD_MIRROR = 0.1;   /* 対称（鏡写し）とみなす位置の差（mm） */
const AD_PITCH_TOL = 0.05; /* 菱目の間隔（範囲の平均）が工具のピッチと「同じ」とみなす差（mm） */
const AD_PITCH_GROUP = 0.15; /* 隣り合う菱目の間隔がこの差以内なら「同じ間隔の範囲」として1つにまとめる（取り込んだ図面の小さなばらつきを吸収・mm） */
const AD_TYPES = ['line', 'polyline', 'path', 'arc', 'bezier', 'circle'];
const adRound = v => Math.round(v * 100) / 100;
const adFinite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const adSame = (p, q, tol = AD_EQ) => Math.hypot(p.x - q.x, p.y - q.y) <= tol;
const adSamePair = (d, p, q, tol = AD_EQ) => { const a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }; return (adSame(a, p, tol) && adSame(b, q, tol)) || (adSame(a, q, tol) && adSame(b, p, tol)); };

/** 多角形（点列）の中に点があるか（辺をまたぐ回数の偶奇で決める）。 */
export function adPointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** 菱目（菱の線）か：小さな4点の一周（diamondLoopSizes が菱形と判定するもの）。寸法を入れない。 */
export const adIsDiamond = s => s?.type === 'polyline' && diamondLoopSizes([s]).length > 0;
/** 図形のまっすぐな辺 [[p, q], …]（直線・折れ線の各辺・ペンの直線区間。円弧・曲線は無し）。 */
function adStraightEdges(s) {
  if (s.type === 'line') return [[{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]];
  if (s.type === 'polyline') { const pts = s.points, n = pts.length, out = []; for (let i = 0; i < n - (s.closed ? 0 : 1); i++) out.push([pts[i], pts[(i + 1) % n]]); return out; }
  if (s.type === 'path') return pathSegments(s).filter(seg => seg.type === 'line').map(seg => [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]);
  return [];
}
/** 辺 p→q の寸法線を置く側：型紙の多角形があれば外側、無ければかたまりの真ん中から遠い側、それも無ければ進む向きの左。dimension() の offset は、進む向きの左が正。 */
function adEdgeOffset(p, q, pc, gap) {
  const len = distance(p, q) || 1, n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len }, mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  if (pc?.points) return adPointInPolygon({ x: mid.x + n.x * 0.5, y: mid.y + n.y * 0.5 }, pc.points) ? -gap : gap;
  if (pc?.box) { const c = { x: (pc.box.minX + pc.box.maxX) / 2, y: (pc.box.minY + pc.box.maxY) / 2 }; return n.x * (mid.x - c.x) + n.y * (mid.y - c.y) >= 0 ? gap : -gap; }
  return gap;
}
const adBoxOk = b => b && [b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite);
const adBoundsOf = list => { let b = null; for (const s of list) { let x = null; try { x = s && bboxOf(s); } catch { x = null; } if (!adBoxOk(x)) continue; b = b ? { minX: Math.min(b.minX, x.minX), minY: Math.min(b.minY, x.minY), maxX: Math.max(b.maxX, x.maxX), maxY: Math.max(b.maxY, x.maxY) } : { ...x }; } return b; };
const adSize = s => { let b = null; try { b = bboxOf(s); } catch { b = null; } return adBoxOk(b) ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0; };
/** 辺 p→q が、全体の幅（上下の辺で長さが幅と同じ）か全体の高さ（左右の辺で長さが高さと同じ）と同じ寸法になるか。同じなら辺の寸法は入れない（全体の寸法と二重になる）。 */
function adIsBoxEdge(p, q, b) {
  const horiz = Math.abs(p.y - q.y) <= AD_EQ, vert = Math.abs(p.x - q.x) <= AD_EQ;
  if (horiz && Math.abs(Math.abs(q.x - p.x) - (b.maxX - b.minX)) <= AD_EQ) return true;
  if (vert && Math.abs(Math.abs(q.y - p.y) - (b.maxY - b.minY)) <= AD_EQ) return true;
  return false;
}
/** 開いた図形の両端（円・閉じた図形は無し。座標が壊れている図形は無し）。 */
function adEnds(s) {
  if (s.type === 'circle' || s.closed) return [];
  let len = 0; try { len = arcLength(s); } catch { return []; }
  if (!(len > 1e-9)) return [];
  try { return [pointAtLength(s, 0), pointAtLength(s, len)].filter(adFinite).map(p => ({ x: p.x, y: p.y })); } catch { return []; }
}
/** 端どうしが AD_JOIN 以内でつながっている図形を、かたまりにまとめる（分岐があってもよい・一周していなくてもよい）。返す値：図形の配列の配列。 */
export function adClusters(geo) {
  const parent = geo.map((_, i) => i), find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }, union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const key = (x, y) => Math.floor(x / AD_JOIN) + ',' + Math.floor(y / AD_JOIN), grid = new Map(), ends = geo.map(adEnds);
  ends.forEach((ps, i) => { for (const p of ps) { const k = key(p.x, p.y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push({ i, p }); } });
  ends.forEach((ps, i) => { for (const p of ps) { const cx = Math.floor(p.x / AD_JOIN), cy = Math.floor(p.y / AD_JOIN); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get((cx + dx) + ',' + (cy + dy)) || []) if (o.i !== i && distance(o.p, p) <= AD_JOIN) union(i, o.i); } });
  const groups = new Map(); geo.forEach((s, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(s); });
  return [...groups.values()];
}
/** 型紙（かたまり）の一覧：[{ ids, list, box（外接の枠＝いちばん広い所）, w, h, circle（円1つだけ）, piece（全体の幅・高さを入れる型紙か）, inner（別のかたまりの枠の中にある＝スロット・窓・穴）, why（piece でない理由）, points（一周の多角形・内外の判定用・無ければ null） }]。
 *  piece＝別のかたまりの中に無く、外接の枠が AD_TINY より大きく、2つ以上の図形か・閉じた図形か・縦横とも AD_TINY より大きい1つの図形（1本の直線だけは型紙にしない）。 */
export function adPieces(geo) {
  const cl = adClusters(geo).map(list => { const box = adBoundsOf(list); return box ? { list, ids: list.map(s => s.id), box, w: box.maxX - box.minX, h: box.maxY - box.minY, circle: list.length === 1 && list[0].type === 'circle', points: null, inner: false, piece: false, why: '' } : null; }).filter(Boolean);
  for (const c of cl) c.inner = cl.some(o => o !== c && (o.w > c.w + AD_EQ || o.h > c.h + AD_EQ) && o.box.minX - AD_JOIN <= c.box.minX && o.box.minY - AD_JOIN <= c.box.minY && o.box.maxX + AD_JOIN >= c.box.maxX && o.box.maxY + AD_JOIN >= c.box.maxY);
  for (const c of cl) {
    const one = c.list.length === 1 ? c.list[0] : null;
    c.why = c.circle ? 'circle' : c.inner ? 'inner' : !(Math.max(c.w, c.h) > AD_TINY) ? 'tiny' : (one && one.type !== 'circle' && !one.closed && !(Math.min(c.w, c.h) > AD_TINY)) ? 'single' : '';
    c.piece = c.why === '';
    if (c.circle) continue;
    const start = [...c.list].sort((a, b) => adSize(b) - adSize(a))[0];
    try { const poly = outlinePolygon(c.list, start.id, { gapTol: AD_JOIN }); if (poly && Array.isArray(poly.points) && poly.points.length >= 3) c.points = poly.points; } catch { c.points = null; }   /* 一周がたどれれば、辺の外側を正しく決められる。たどれなくても、かたまりの真ん中から遠い側で決める */
  }
  return cl;
}
/** 上下・左右で対称な寸法を片側だけにする：同じ種類・同じ長さで、両方を含むかたまりの真ん中の縦線か横線で鏡写しにすると重なる寸法は、先のもの（上・左）だけ残す。
 *  落とした寸法も「見た」に数える（鏡写しの鏡写し＝点対称の所も片側だけになる）。出力の並びは元のまま。全体の幅・高さは対象外。 */
export function adDedupeMirror(dims, pieces) {
  const inBox = (c, d) => [[d.x1, d.y1], [d.x2, d.y2]].every(([x, y]) => x >= c.box.minX - AD_JOIN && x <= c.box.maxX + AD_JOIN && y >= c.box.minY - AD_JOIN && y <= c.box.maxY + AD_JOIN);
  const order = (a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2) || Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2);
  const boxes = new Map(dims.map(d => [d, pieces.filter(c => inBox(c, d))])), lenKey = d => Math.round(distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) / AD_MIRROR);
  const mirrored = (x, c, a, b) => { const cx = (c.box.minX + c.box.maxX) / 2, cy = (c.box.minY + c.box.maxY) / 2; return adSamePair(x, { x: 2 * cx - a.x, y: a.y }, { x: 2 * cx - b.x, y: b.y }, AD_MIRROR) || adSamePair(x, { x: a.x, y: 2 * cy - a.y }, { x: b.x, y: 2 * cy - b.y }, AD_MIRROR); };
  const seen = new Map(), drop = new Set();
  for (const d of [...dims].sort(order)) {
    if (d.autoDim === 'size') continue;
    const k = lenKey(d), near = [-1, 0, 1].flatMap(o => seen.get(k + o) || []).filter(x => x.autoDim === d.autoDim), a = { x: d.x1, y: d.y1 }, b = { x: d.x2, y: d.y2 }, mine = boxes.get(d);
    if (near.some(x => { const theirs = boxes.get(x); return mine.some(c => theirs.includes(c) && mirrored(x, c, a, b)); })) drop.add(d);
    if (!seen.has(k)) seen.set(k, []); seen.get(k).push(d);
  }
  return dims.filter(d => !drop.has(d));
}
/** 菱目（菱の線）の中心を、並びの列にする：間隔 maxD 以内で近い順にたどり、進む向きが大きく変わる相手（72度以上）には行かない（角で列を分ける）。返す値：中心の配列の配列（2つ以上）。 */
export function adDiamondChains(centers, maxD) {
  const pts = centers.filter(adFinite).map((c, i) => ({ x: c.x, y: c.y, i })), used = new Set(), chains = [];
  const key = (x, y) => Math.floor(x / maxD) + ',' + Math.floor(y / maxD), grid = new Map();
  for (const p of pts) { const k = key(p.x, p.y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const around = p => { const out = [], cx = Math.floor(p.x / maxD), cy = Math.floor(p.y / maxD); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get((cx + dx) + ',' + (cy + dy)) || []) if (o !== p && !used.has(o.i)) { const d = distance(p, o); if (d <= maxD) out.push({ o, d }); } return out; };
  const next = (cur, prev) => { let best = null, bs = Infinity; for (const { o, d } of around(cur)) { let score = d; if (prev) { const ux = cur.x - prev.x, uy = cur.y - prev.y, vx = o.x - cur.x, vy = o.y - cur.y, cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1)); if (cos < 0.3) continue; score = d * (2 - cos); } if (score < bs) { bs = score; best = o; } } return best; };
  const degree = new Map(pts.map(p => [p.i, around(p).length]));
  for (const start of [...pts].sort((a, b) => degree.get(a.i) - degree.get(b.i))) {
    if (used.has(start.i)) continue; used.add(start.i); const chain = [start];
    let prev = null, cur = start; for (;;) { const n = next(cur, prev); if (!n) break; used.add(n.i); chain.push(n); prev = cur; cur = n; }
    prev = chain.length >= 2 ? chain[1] : null; cur = chain[0]; for (;;) { const n = next(cur, prev); if (!n) break; used.add(n.i); chain.unshift(n); prev = cur; cur = n; }
    if (chain.length >= 2) { const f = chain[0], l = chain.at(-1); if (f.x > l.x + 1e-6 || (Math.abs(f.x - l.x) <= 1e-6 && f.y > l.y)) chain.reverse(); chains.push(chain.map(p => ({ x: p.x, y: p.y }))); }   /* 左→右（縦なら上→下）にそろえる：区間の代表が同じ端から決まり、上下対称の列が片側になる */
  }
  return chains;
}
/** 菱目の間隔の寸法線を置く側：型紙（かたまりの枠）の真ん中に近い側＝内側（辺の寸法と重ならない）。型紙でも一周でもないかたまり（1本の線など）なら進む向きの左。 */
function adInwardOffset(p, q, pc, gap) {
  if (!pc?.box || !(pc.piece || pc.points)) return gap;
  const len = distance(p, q) || 1, n = { x: (q.y - p.y) / len, y: -(q.x - p.x) / len }, mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, c = { x: (pc.box.minX + pc.box.maxX) / 2, y: (pc.box.minY + pc.box.maxY) / 2 };
  return n.x * (mid.x - c.x) + n.y * (mid.y - c.y) >= 0 ? -gap : gap;
}
/** 菱目の列（pts：並び順の中心。pitch＝その点の工具のピッチ）を「同じ間隔の範囲」に分け、工具のピッチと違う範囲ごとに、範囲の最初から最後までの寸法線1本（文字は labelOf(平均の間隔, 間隔の数)＝「菱目 ○○mm ×n」）を入れる（事業主の希望 2026-10-19「同じ菱目間隔の範囲を特定し、まとめて菱目〇〇mmという表記に」）。 */
function adPitchDims(runs, add, gap, labelOf) {
  for (const r of runs) {
    const pts = r.pts, off = (p, q) => adInwardOffset(p, q, r.pc, gap); if (pts.length < 2) continue;   /* 型紙の中では内側へ（辺の寸法と重ならない） */
    const gaps = []; for (let k = 0; k + 1 < pts.length; k++) gaps.push(distance(pts[k], pts[k + 1]));
    let i = 0;
    while (i < gaps.length) {
      let j = i, sum = gaps[i]; while (j + 1 < gaps.length && Math.abs(gaps[j + 1] - sum / (j - i + 1)) <= AD_PITCH_GROUP) { j++; sum += gaps[j]; }   /* 同じ間隔（平均との差 0.15mm 以内）が続く所を1つの範囲に */
      const cnt = j - i + 1, avg = sum / cnt, ref = pts[i].pitch ?? pts[i + 1].pitch;
      if (ref > 0 && Math.abs(avg - ref) > AD_PITCH_TOL + 1e-9) add(pts[i], pts[j + 1], off(pts[i], pts[j + 1]), 'hole', { label: labelOf(avg, cnt) });   /* 範囲の最初から最後までの線に「菱目 ○○mm ×n」 */
      i = j + 1;
    }
  }
}

/** 円のあてはめ（最小二乗・Kåsa 法）：点の並び → { cx, cy, r, dev（点と円のずれの最大・mm） }。3点未満・一直線のときは null。 */
function adFitCircle(pts) {
  const n = pts.length; if (n < 3) return null;
  let mx = 0, my = 0; for (const p of pts) { mx += p.x; my += p.y; } mx /= n; my /= n;   /* 平均を原点にして、桁落ちを避ける（図面の座標が数千のことがある） */
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const p of pts) { const u = p.x - mx, v = p.y - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
  const det = suu * svv - suv * suv; if (Math.abs(det) < 1e-9) return null;
  const uc = (svv * (suuu + suvv) - suv * (svvv + svuu)) / (2 * det), vc = (suu * (svvv + svuu) - suv * (suuu + suvv)) / (2 * det), cx = mx + uc, cy = my + vc, r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  if (!Number.isFinite(r)) return null; let dev = 0; for (const p of pts) dev = Math.max(dev, Math.abs(Math.hypot(p.x - cx, p.y - cy) - r));
  return { cx, cy, r, dev };
}
const adNormDeg = d => { while (d > 180) d -= 360; while (d <= -180) d += 360; return d; };
/** 点の並びが円の上を回る角度の合計（度・向きによらず正）。 */
function adSweepAlong(pts, c) { let sum = 0; for (let i = 1; i < pts.length; i++) sum += adNormDeg((Math.atan2(pts[i].y - c.cy, pts[i].x - c.cx) - Math.atan2(pts[i - 1].y - c.cy, pts[i - 1].x - c.cx)) * 180 / Math.PI); return Math.abs(sum); }
/** 図形の中の「丸めた角」（円弧状の丸み）の一覧 [{ cx, cy, r, mid（曲線の真ん中の点）, exact（円弧そのもの） }]。
 *  円弧（arc）はそのまま。ベジェ曲線・折れ線（ペンの線も）は、曲がりが続く所（頂点ごとに 0.5°〜30°・同じ向き）を円にあてはめ、円とみなせて（ずれが max(0.05mm, 半径の1%)）・20°以上・半径 1〜100mm のものだけ。
 *  事業主のウォレットの図面は、丸めた角がすべてベジェ曲線（半径10の正確な円弧）だった（2026-10-20「まだダメでした」）。 */
function adRoundings(s, minSweep = AD_FIT_MIN_SWEEP) {
  if (s.type === 'arc') { if (!(s.r > 0)) return []; const sw = arcSweep(s), m = Math.max(2, Math.ceil(sw / 5)); return sw <= 180 + AD_ARC_SLACK ? [{ cx: s.cx, cy: s.cy, r: s.r, mid: circlePoint(s, s.startDeg + sw / 2), exact: true, pts: Array.from({ length: m + 1 }, (_, i) => circlePoint(s, s.startDeg + sw * i / m)) }] : []; }
  let pts = null; if (s.type === 'polyline') pts = s.points; else if (s.type === 'bezier' || s.type === 'path') { try { pts = flattenShape(s, 0.02); } catch { pts = null; } }
  if (!Array.isArray(pts) || pts.length < 4) return [];
  const turnAt = (a, i) => { const p = a[i - 1], q = a[i], r = a[i + 1]; return adNormDeg((Math.atan2(r.y - q.y, r.x - q.x) - Math.atan2(q.y - p.y, q.x - p.x)) * 180 / Math.PI); };
  const arcLike = d => Math.abs(d) >= AD_TURN_MIN && Math.abs(d) <= AD_TURN_MAX;
  const kappa = (a, i) => { const d = Math.hypot(a[i + 1].x - a[i].x, a[i + 1].y - a[i].y) + Math.hypot(a[i].x - a[i - 1].x, a[i].y - a[i - 1].y); return d > 0 ? Math.abs(turnAt(a, i)) / (d / 2) : 0; };   /* 曲がり（度/mm）：円の上なら 1/半径 に比例して一定。長い直線につながる頂点は小さくなる */
  if (s.type === 'polyline' && s.closed) {   /* 閉じた折れ線は、丸みの途中で切れないよう、曲がりがいちばん小さい頂点（長い直線の端）から数え始める */
    const m = pts.length, ring = [pts[m - 1], ...pts, pts[0]]; let k = 0, best = Infinity; for (let i = 1; i <= m; i++) { const v = kappa(ring, i); if (v < best) { best = v; k = i - 1; } }
    pts = [...pts.slice(k), ...pts.slice(0, k), pts[k]];
  }
  const n = pts.length, out = []; let run = [], kPrev = 0;
  const flush = () => {
    if (run.length >= 3) {
      const i0 = run[0] === 1 ? 0 : run[0], i1 = run.at(-1) === n - 2 ? n - 1 : run.at(-1), sub = pts.slice(i0, i1 + 1), f = adFitCircle(sub);
      if (f && f.r >= AD_MIN && f.r <= AD_R_MAX && f.dev <= Math.max(AD_FIT_TOL, AD_FIT_REL * f.r)) { const sw = adSweepAlong(sub, f); if (sw >= minSweep && sw <= 180 + AD_ARC_SLACK) out.push({ cx: f.cx, cy: f.cy, r: f.r, mid: sub[(sub.length - 1) >> 1], exact: false, pts: sub }); }
    }
    run = [];
  };
  for (let i = 1; i < n - 1; i++) { const d = turnAt(pts, i), ok = arcLike(d), kp = ok ? kappa(pts, i) : 0; if (ok && run.length && (Math.sign(d) !== Math.sign(turnAt(pts, run.at(-1))) || kp > 2.5 * kPrev || kp < kPrev / 2.5)) flush(); if (ok) { run.push(i); kPrev = kp; } else flush(); }   /* 向きが変わる・曲がりの強さが急に変わる（直線の端・別の角）所で区切る */
  flush(); return out;
}
const adSegDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0; return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); };
/** 手動の寸法ツール（D）用：クリックした点 pt の近く（曲線から tol mm 以内）にある「丸めた角」を1つ探す（事業主の希望 2026-10-20「Rの寸法をお願いします」＝角を1回クリックで R）。
 *  円弧・ベジェ曲線・折れ線の丸みを、自動寸法と同じ adRoundings で見つける（短い丸みは 10° から。1つの角が 74°＋16° に分かれていても、どちらを押しても同じ角）。
 *  返り値：{ cx, cy, r, qx, qy（クリックの向きの、円の上の点）, exact, ends（その丸みの両端の点＝直線とのつなぎ目）, outside（クリックが曲線のすぐ外側＝中心と反対の側なら true）, label（「R10」）}。無ければ null。shapes：対象の図形（菱目は除く）。 */
export function adRoundingNear(shapes, pt, tol) {
  let best = null;
  for (const s of shapes || []) {
    if (!s || !AD_TYPES.includes(s.type) || adIsDiamond(s)) continue;
    const b = bboxOf(s); if (!b || pt.x < b.minX - tol || pt.x > b.maxX + tol || pt.y < b.minY - tol || pt.y > b.maxY + tol) continue;
    for (const f of adRoundings(s, AD_CLICK_MIN_SWEEP)) { let d = Infinity; for (let i = 1; i < f.pts.length; i++) d = Math.min(d, adSegDist(pt, f.pts[i - 1], f.pts[i])); if (d <= tol && (!best || d < best.d)) best = { d, f }; }
  }
  if (!best) return null;
  const f = best.f, dx = pt.x - f.cx, dy = pt.y - f.cy, len = Math.hypot(dx, dy); if (!(len > 1e-9)) return null;
  return { cx: f.cx, cy: f.cy, r: f.r, qx: f.cx + f.r * dx / len, qy: f.cy + f.r * dy / len, exact: f.exact, outside: len > f.r + 1e-9, ends: [f.pts[0], f.pts[f.pts.length - 1]], pts: f.pts, label: `R${f.exact ? adRound(f.r) : Math.round(f.r * 10) / 10}` };
}
/** 手動の R の寸法（2026-10-20 事業主「クリックで寸法線を呼び出し、次のクリックの位置で内外を決めたい」）：1回目のクリックで選んだ角 f（adRoundingNear の返り値）と、2回目の点 m から、作る寸法を決める。
 *  m が円の内側 → 中心から、m の方向の曲線の上の点へ（長さ＝半径）。円の外側 → 曲線の上の点から、同じ方向へ len（寸法線のずらし）だけ引き出す。m の方向が円弧の範囲の外なら、いちばん近い円弧の端の点を使う。
 *  返り値：{ dim（寸法の図形）, outside, label }。 */
export function adRadiusDimension(f, m, len = 8) {
  const r4 = v => Math.round(v * 1e4) / 1e4;
  let dx = m.x - f.cx, dy = m.y - f.cy, d = Math.hypot(dx, dy);
  if (!(d > 1e-9)) { dx = f.qx - f.cx; dy = f.qy - f.cy; d = Math.hypot(dx, dy) || 1; }   /* 中心ちょうど：1回目の向き */
  let ux = dx / d, uy = dy / d, q = { x: f.cx + ux * f.r, y: f.cy + uy * f.r }, near = Infinity;
  for (let i = 1; i < f.pts.length; i++) near = Math.min(near, adSegDist(q, f.pts[i - 1], f.pts[i]));
  if (near > 0.5) { const e = [f.pts[0], f.pts[f.pts.length - 1]].reduce((b, c) => distance(q, c) < distance(q, b) ? c : b); q = { x: e.x, y: e.y }; ux = (q.x - f.cx) / f.r; uy = (q.y - f.cy) / f.r; }
  const outside = d > f.r + 1e-9;
  const dim = outside ? { type: 'dimension', x1: r4(q.x), y1: r4(q.y), x2: r4(q.x + ux * len), y2: r4(q.y + uy * len), offset: 0, label: f.label } : { type: 'dimension', x1: r4(f.cx), y1: r4(f.cy), x2: r4(q.x), y2: r4(q.y), offset: 0, label: f.label };
  return { dim, outside, label: f.label };
}
/** 作る寸法線の一覧 [{ type:'dimension', x1, y1, x2, y2, offset, autoDim:'size'|'edge'|'circle'|'hole' }, …] を返す（配列に info＝{ clusters, biggest:{ w, h, why } } を付ける：全体が入らなかった理由の案内用）。
 *  doc：図面（既存の寸法・穴・経路・工具を見る）。cand：対象の図形（画面側で「見えている・ガイドの層や点線・目印・金具でない」に絞ったもの。選んでいればその図形だけ）。
 *  gap：線から寸法線までの距離（mm・欄の数字がそのまま距離）。toolPitch：菱の線（工具を持たない菱目）に使う、指定した工具のピッチ（mm・無ければ菱の線の間隔は見ない）。 */
export function autoDimensionPlan(doc, cand, { size = true, edges = true, circles = true, holes = false, radii = false, radiusSide = 'in', gap = 8, toolPitch = null, pitchLabel = null, radiusLabel = null } = {}) {
  const visLayer = new Set((doc.layers || []).filter(l => l && l.visible !== false).map(l => l.id)), existing = (doc.shapes || []).filter(s => s.type === 'dimension' && (!doc.layers || visLayer.has(s.layer))), out = [];   /* 「もうある寸法」は見えている層のものだけ（隠した層の手描きの寸法で全体を止めない） */
  const labelOf = typeof pitchLabel === 'function' ? pitchLabel : (p, n) => `${p.toFixed(2)}mm ×${n}`;
  const has = (p, q) => existing.some(d => adSamePair(d, p, q)) || out.some(d => adSamePair(d, p, q));
  const add = (p, q, offset, kind, extra = null) => { if (!adFinite(p) || !adFinite(q) || !(distance(p, q) >= (kind === 'edge' ? AD_MIN_EDGE : AD_MIN)) || has(p, q)) return; out.push({ type: 'dimension', x1: adRound(p.x), y1: adRound(p.y), x2: adRound(q.x), y2: adRound(q.y), offset: adRound(offset), autoDim: kind, ...(extra || {}) }); };
  const geo = (cand || []).filter(s => s && AD_TYPES.includes(s.type) && !adIsDiamond(s));   /* 菱目（菱の線）は対象外 */
  const pieces = adPieces(geo), pieceOf = new Map(); for (const pc of pieces) for (const id of pc.ids) pieceOf.set(id, pc);
  const sizeExists = (p, q, box) => { const len = distance(p, q), horiz = Math.abs(p.y - q.y) <= AD_EQ, inb = (x, y) => x >= box.minX - 1 && x <= box.maxX + 1 && y >= box.minY - 1 && y <= box.maxY + 1; return existing.some(d => Math.abs(distance({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }) - len) <= 0.02 && (horiz ? Math.abs(d.y1 - d.y2) <= 0.05 : Math.abs(d.x1 - d.x2) <= 0.05) && inb(d.x1, d.y1) && inb(d.x2, d.y2)); };   /* 手で引いた全体の寸法（同じ長さの水平／垂直の寸法が型紙の枠の中にある）があれば、同じ向きの全体は入れない（事業主が手で 283.54・125.00 を入れている図面で二重にしない） */
  for (const pc of pieces) {
    const b = pc.box;
    if (pc.circle) { if (circles) { const c = pc.list[0]; add({ x: c.cx - c.r, y: c.cy }, { x: c.cx + c.r, y: c.cy }, c.r + gap, 'circle'); } continue; }   /* 直径：円の上に */
    if (size && pc.piece) {
      const w1 = { x: b.minX, y: b.minY }, w2 = { x: b.maxX, y: b.minY }, h2 = { x: b.minX, y: b.maxY };
      if (!sizeExists(w1, w2, b)) add(w1, w2, gap, 'size');    /* 全体の幅（いちばん広い所）：上の辺の上（左→右の左側＝上） */
      if (!sizeExists(w1, h2, b)) add(w1, h2, -gap, 'size');   /* 全体の高さ（いちばん高い所）：左の辺の左（上→下の左側は右＝内側なので、負で外へ） */
    }
  }
  if (radii) {   /* 丸めた角・円弧の半径（事業主の要望 2026-10-20「丸めた R 寸法も入れたい」）：型紙ごとに、同じ半径は1本にまとめて「R5 ×4」。円弧・ベジェ曲線・折れ線の丸みを円にあてはめて半径を取る。同じ中心・同じ半径に分かれた曲線（74°＋16° など）は1つの角。中心から、曲線の真ん中の点へ（半径そのものを測る）。半径 1〜100mm・小さなかたまりは除く */
    const rLabel = typeof radiusLabel === 'function' ? radiusLabel : (r, n) => n > 1 ? `R${r} ×${n}` : `R${r}`;
    for (const pc of pieces) {
      if (pc.circle || pc.why === 'tiny') continue;
      const found = pc.list.flatMap(s => adRoundings(s)).filter(f => f.r >= AD_MIN).sort((a, b) => a.cy - b.cy || a.cx - b.cx), corners = [];
      for (const f of found) if (!corners.some(x => Math.abs(x.cx - f.cx) <= AD_SAME_CORNER && Math.abs(x.cy - f.cy) <= AD_SAME_CORNER && Math.abs(x.r - f.r) <= AD_SAME_CORNER)) corners.push(f);
      const groups = []; for (const c of corners) { const g = groups.find(x => Math.abs(x.r - c.r) <= AD_RADIUS_TOL); if (g) g.list.push(c); else groups.push({ r: c.r, list: [c] }); }
      for (const g of groups.sort((a, b) => a.r - b.r)) {
        const c = g.list[0], label = rLabel(c.exact ? adRound(c.r) : Math.round(c.r * 10) / 10, g.list.length), d = Math.hypot(c.mid.x - c.cx, c.mid.y - c.cy) || 1;
        if (radiusSide === 'out') add(c.mid, { x: c.mid.x + (c.mid.x - c.cx) / d * gap, y: c.mid.y + (c.mid.y - c.cy) / d * gap }, 0, 'radius', { label });   /* 外側（2026-10-21 事業主「自動寸法の R にも、内側・外側を選べるように」）：曲線の真ん中の点から、中心と反対の向きへ、線から離す距離だけ引き出す */
        else add({ x: c.cx, y: c.cy }, c.mid, 0, 'radius', { label });   /* 内側：中心から曲線の真ん中へ */
      }
    }
  }
  if (edges) for (const s of geo) { const pc = pieceOf.get(s.id); for (const [p, q] of adStraightEdges(s)) { if (size && pc?.piece && adIsBoxEdge(p, q, pc.box)) continue; add(p, q, adEdgeOffset(p, q, pc, gap), 'edge'); } }
  if (holes) {
    const runs = [], tools = doc.tools || [];
    for (const path of doc.paths || []) {   /* 目打ちの穴：経路ごとに、穴の工具のピッチと比べる */
      if (!path.shapeIds.every(id => geo.some(s => s.id === id))) continue;
      const hs = (doc.holes || []).filter(h => h.pathId === path.id).sort((a, b) => a.s - b.s); if (hs.length < 2) continue;
      runs.push({ pts: hs.map(h => ({ x: h.x, y: h.y, pitch: tools.find(t => t.id === h.toolId)?.pitch })), pc: pieceOf.get(path.shapeIds[0]) });
    }
    if (toolPitch > 0) {   /* 菱の線（取り込んだ図面の菱目）：中心を列にして、指定した工具のピッチと比べる */
      const centers = (cand || []).filter(adIsDiamond).map(s => diamondLoopSizes([s])[0]).filter(Boolean);
      const pieceAt = p => pieces.filter(c => c.piece && p.x >= c.box.minX - AD_JOIN && p.x <= c.box.maxX + AD_JOIN && p.y >= c.box.minY - AD_JOIN && p.y <= c.box.maxY + AD_JOIN).sort((a, b) => a.w * a.h - b.w * b.h)[0] || null;
      for (const chain of adDiamondChains(centers, toolPitch * 1.6)) runs.push({ pts: chain.map(c => ({ ...c, pitch: toolPitch })), pc: pieceAt(chain[Math.floor(chain.length / 2)]) });
    }
    adPitchDims(runs, add, gap, labelOf);
  }
  const result = adDedupeMirror(out, pieces);   /* 上下・左右で対称な辺・円・穴の間隔は片側だけ */
  const big = [...pieces].filter(c => !c.circle).sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  result.info = { clusters: pieces.length, pieces: pieces.filter(c => c.piece).length, biggest: big ? { w: adRound(big.w), h: adRound(big.h), why: big.why } : null };
  return result;
}
/** 一覧の種類ごとの本数 { size, edge, circle, hole }。 */
export function autoDimCounts(plan) { const c = { size: 0, edge: 0, circle: 0, hole: 0, radius: 0 }; for (const d of plan || []) if (d.autoDim in c) c[d.autoDim]++; return c; }
