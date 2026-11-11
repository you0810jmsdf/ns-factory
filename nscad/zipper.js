// ファスナーの絵（事業主 2026-11-11「選択したラインがファスナであることを明示したい。横から見たファスナと上からみたファスナをデザインし、線をファスナに置き換えることができる機能」）。
// 線そのものは残し、図形に zipper の印（号数・見え方・開け具合）を付ける。この部品は、線の点の列から、ファスナーの絵（線の集まり）を作るだけ（画面・図面には触らない）。
// 線の長さ＝ファスナーの長さ（下止めから上止めまで）。テープは両端から少しはみ出す。寸法は代表値（金具データ data/hardware.json の zipper-3・zipper-5 と同じ・要実測）。

/** 号数ごとの寸法（mm）。tapeW＝テープ全体の幅・elementW＝かみ合った歯の幅・pitch＝片側の歯の間隔・thick＝歯の厚み（横から見た高さ）。 */
export const ZIPPER_SIZES = {
  '3': { tapeW: 24, elementW: 4.5, pitch: 2.4, thick: 2.0 },
  '5': { tapeW: 30, elementW: 6, pitch: 3.2, thick: 2.6 },
};
export const ZIPPER_VIEWS = ['top', 'side'];
export const ZIPPER_METALS = ['gold', 'silver', 'antique', 'blacknickel'];   /* 金具（歯・スライダー・引き手・止め）の色：ゴールド・シルバー・アンティーク・黒ニッケル */
/** 金具の色（hex＝地の色・light＝明るい面・dark＝ふち）。ゴールドとシルバーは、金属の色（hardware.js の METAL_COLORS）と同じ値。 */
export const ZIPPER_METAL_COLORS = {
  gold: { hex: '#D4AF37', light: '#F6E39A', dark: '#8A6A12' },
  silver: { hex: '#C5C9CE', light: '#F4F6F8', dark: '#7B8086' },
  antique: { hex: '#8C6A3A', light: '#C4A26B', dark: '#4E3A1E' },
  blacknickel: { hex: '#4A4D52', light: '#8A8E94', dark: '#1E2023' },
};
/** 市販のファスナーの長さの候補（cm）。 */
export const ZIPPER_STD_CM = [10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 60];
/** クリックで選べる幅の半分（mm）：上からはテープの幅の半分、横からはスライダーと引き手の高さ。 */
export function zipperHalfWidth(z) { const n = normalizeZipper(z), sp = ZIPPER_SIZES[n.size]; return n.view === 'top' ? sp.tapeW / 2 : sp.thick / 2 + 0.8 + sp.elementW * 0.4 + 0.5; }
export const ZIPPER_TAPE_DEFAULT = '#333333';   /* テープの色の初めの値（黒に近い灰色）。色は自由に選べる */
const zipHexOk = c => typeof c === 'string' && /^#[0-9a-f]{6}$/.test(c);
const ZIPPER_TAPE_THICK = 0.6;   /* 横から見たテープの厚み */

/** 図面に保存してよい印か（検査用）。 */
export function zipperOk(z) {
  return !!z && typeof z === 'object' && !Array.isArray(z) && typeof z.size === 'string' && Object.hasOwn(ZIPPER_SIZES, z.size) && ZIPPER_VIEWS.includes(z.view) && Number.isFinite(z.open) && z.open >= 0 && z.open <= 100
    && ZIPPER_METALS.includes(z.metal) && zipHexOk(z.tape)
    && (z.rev === undefined || typeof z.rev === 'boolean') && (z.mir === undefined || typeof z.mir === 'boolean') && zipCutOk(z.cut0) && zipCutOk(z.cut1) && Object.keys(z).every(k => ['size', 'view', 'open', 'metal', 'tape', 'rev', 'mir', 'cut0', 'cut1'].includes(k));
}
/** 欠けた値・壊れた値を、標準（3号・上から・閉じた状態・ゴールド・テープは黒に近い灰色）で埋める。rev・mir は true のときだけ書く。 */
export function normalizeZipper(z = {}) {
  const open = Number(z?.open), o = { size: Object.hasOwn(ZIPPER_SIZES, String(z?.size)) ? String(z.size) : '3', view: ZIPPER_VIEWS.includes(z?.view) ? z.view : 'top', open: Number.isFinite(open) ? Math.min(100, Math.max(0, Math.round(open))) : 0, metal: ZIPPER_METALS.includes(z?.metal) ? z.metal : 'gold', tape: zipHexOk(String(z?.tape ?? '').toLowerCase()) ? String(z.tape).toLowerCase() : ZIPPER_TAPE_DEFAULT };
  if (z?.rev === true) o.rev = true; if (z?.mir === true) o.mir = true;
  for (const k of ['cut0', 'cut1']) { const v = Math.round(Number(z?.[k]) * 10) / 10; if (Number.isFinite(v) && v > 0) o[k] = Math.min(ZIPPER_CUT_MAX, v); }   /* 端を短くする長さ（mm）：0 は書かない */
  return o;
}

const zipDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** 重なった点を除く。始点と終点が同じなら、閉じた線（輪）として最後の点を除く。 */
function zipCleanPoints(points, closed) {
  const pts = []; for (const p of points || []) { if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) continue; if (!pts.length || zipDist(pts[pts.length - 1], p) > 1e-6) pts.push({ x: p.x, y: p.y }); }
  if (pts.length >= 3 && zipDist(pts[0], pts[pts.length - 1]) <= 1e-6) { pts.pop(); closed = true; }
  return { pts, closed: !!closed && pts.length >= 3 };
}
/** 線に沿った物差し：長さ s の位置の点・進む向き・横向き（法線）を返す。開いた線は、端の向きのまま外へ延ばす。閉じた線は一周して戻る。 */
function zipRuler(pts, closed) {
  const n = pts.length, segN = closed ? n : n - 1, cum = [0];
  for (let i = 0; i < segN; i++) cum.push(cum[i] + zipDist(pts[i], pts[(i + 1) % n]));
  const L = cum[segN], dirOf = i => { const a = pts[i], b = pts[(i + 1) % n], d = cum[i + 1] - cum[i] || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }; };
  const dirs = Array.from({ length: segN }, (_, i) => dirOf(i));
  const segAt = s => { let lo = 0, hi = segN - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m + 1] < s) lo = m + 1; else hi = m; } return lo; };
  const wrap = s => closed ? ((s % L) + L) % L : s;
  /** 位置 s の枠（点 p・向き t・横 nrm）。 */
  const at = s0 => {
    const s = wrap(s0), i = s <= 0 ? 0 : s >= L ? segN - 1 : segAt(s), t = dirs[i], a = pts[i], d = s - cum[i];
    return { p: { x: a.x + t.x * d, y: a.y + t.y * d }, t, n: { x: -t.y, y: t.x } };
  };
  /** 線から横へ v だけ離れた点（頂点では、前後の向きの間を取って、帯の幅が変わらないようにする）。 */
  const side = (s0, v) => {
    const s = wrap(s0), f = at(s); let nx = f.n.x, ny = f.n.y, k = 1;
    const vi = cum.findIndex(c => Math.abs(c - s) < 1e-7);
    if (vi >= 0 && (closed || (vi > 0 && vi < segN))) {
      const a = dirs[(vi - 1 + segN) % segN], b = dirs[vi % segN], mx = -(a.y + b.y), my = a.x + b.x, m = Math.hypot(mx, my);
      if (m > 1e-9) { nx = mx / m; ny = my / m; k = Math.min(3, 1 / Math.max(1e-6, nx * -b.y + ny * b.x)); }
    }
    return { x: f.p.x + nx * v * k, y: f.p.y + ny * v * k };
  };
  /** s0〜s1 の間の、帯を作るための位置の列（両端と、その間の頂点）。閉じた線は一周をまたいでよい。 */
  const stations = (s0, s1) => {
    const out = [s0];
    if (closed) { const k0 = Math.floor(s0 / L), k1 = Math.floor(s1 / L); for (let k = k0; k <= k1; k++) for (let i = 0; i < segN; i++) { const s = cum[i] + k * L; if (s > s0 + 1e-7 && s < s1 - 1e-7) out.push(s); } }
    else for (let i = 1; i < segN; i++) if (cum[i] > s0 + 1e-7 && cum[i] < s1 - 1e-7) out.push(cum[i]);
    out.push(s1); return out;
  };
  /** 位置 s を中心にした、固い部品の点（u＝線に沿う向き・v＝横）。曲がった線の上でも形はゆがまない。 */
  const rigid = (s, list) => { const f = at(s); return list.map(([u, v]) => ({ x: f.p.x + f.t.x * u + f.n.x * v, y: f.p.y + f.t.y * u + f.n.y * v })); };
  return { L, at, side, stations, rigid };
}

/** 線の長さ（mm）。 */
/** 端を短くする長さ（mm）の上限と検査。cut0＝線の始点側・cut1＝線の終点側（向きを反対にしても、場所は変わらない）。 */
export const ZIPPER_CUT_MAX = 5000;
const zipCutOk = v => v === undefined || (Number.isFinite(v) && v > 0 && v <= ZIPPER_CUT_MAX);
/** 線の両端から、決めた長さだけ内側に入った所までを取り出す（事業主 2026-11-11「それぞれの端部から距離指定で短くしたい」）。線そのものは変えない。輪は短くしない。残りが 1mm 未満になるときは、短くしない。 */
function zipTrim(c, z) {
  const a = z.cut0 || 0, b = z.cut1 || 0; if (c.closed || c.pts.length < 2 || !(a > 0 || b > 0)) return c;
  const R = zipRuler(c.pts, false); if (R.L - a - b < 1) return c;
  return { pts: R.stations(a, R.L - b).map(s => R.at(s).p), closed: false };
}
/** ファスナーの長さ（mm）：線の長さから、両端を短くした分を引いた長さ（下止めから上止めまで）。 */
export function zipperNetLength(points, zipper) { const c = zipTrim(zipCleanPoints(points, false), normalizeZipper(zipper)); return c.pts.length < 2 ? 0 : zipRuler(c.pts, c.closed).L; }
export function zipperLength(points, closed = false) { const c = zipCleanPoints(points, closed); return c.pts.length < 2 ? 0 : zipRuler(c.pts, c.closed).L; }

/**
 * ファスナーの絵を作る。points＝線を細かい直線に分けた点の列（始点＝下止め側・終点＝上止め側。rev で逆）。
 * 返り値 { length, closed, items }。items＝絵の線の集まり { kind, points, closed, solid }。
 *   kind：tape（テープ）・tooth（歯）・stop（上止め・下止め）・slider（スライダー）・bridge（引き手の付け根）・pull（引き手）・hole（引き手の穴）
 *   solid＝塗りつぶして描く小さい部品（歯・止め）。
 * 上から（top）：テープの外形・左右からかみ合う歯・スライダーと引き手。横から（side）：薄いテープ・歯の列・スライダーの横顔と、起きた引き手。
 * 開け具合 open（0〜100）：0＝閉じている（スライダーは上止め側）。100＝全部開いている（下止め側）。スライダーより上止め側の歯は、左右に離れる。
 */
export function zipperArt(points, zipper, { closed = false } = {}) {
  const z = normalizeZipper(zipper), c0 = zipTrim(zipCleanPoints(points, closed), z), c = z.rev ? { pts: [...c0.pts].reverse(), closed: c0.closed } : c0;
  if (c.pts.length < 2) return { length: 0, closed: false, items: [] };
  const R = zipRuler(c.pts, c.closed), L = R.L, spec = ZIPPER_SIZES[z.size], eW = spec.elementW, items = [];
  if (!(L > 0.5)) return { length: L, closed: c.closed, items: [] };
  const add = (kind, pts, closedItem = true, solid = false) => { items.push({ kind, points: pts, closed: closedItem, solid }); };
  const band = (s0, s1, v0, v1) => { const st = R.stations(s0, s1); return [...st.map(s => R.side(s, v0)), ...st.reverse().map(s => R.side(s, v1))]; };
  const sgn = (z.mir ? 1 : -1) * (z.rev ? -1 : 1), isTop = z.view === 'top';   /* 向きを反対（rev）にしても、引き手は線の同じ側に残す（事業主 2026-11-11「向きを反対にするとタブが外から内に移動してしまう」：線を逆にたどると横向きも逆になるので、打ち消す） */
  const ext = c.closed ? 0 : spec.tapeW / 2;   /* テープが止めの外へはみ出す長さ */
  const bs = c.closed ? 0 : Math.min(eW * 0.9, L * 0.15), ts = c.closed ? 0 : Math.min(eW * 0.7, L * 0.12);   /* 下止め・上止めの長さ */
  const Ls = Math.min(eW * 2.1, Math.max(1, (L - bs - ts) * 0.8)), h = Ls / 2, pullL = eW * 3.6;
  const a = bs, b = L - ts, room = Math.max(0, b - a - Ls), sc = a + h + room * (1 - z.open / 100);   /* スライダーの中心 */
  let pullDir = -1;   /* 引き手は、ふつう下止め側へ寝る。はみ出すときは上止め側へ */
  if (!c.closed && sc - h - pullL < -ext * 0.5 && sc + h + pullL <= L + ext * 0.5) pullDir = 1;
  const hideLo = isTop && pullDir < 0 ? sc - h - pullL : sc - h, hideHi = isTop && pullDir > 0 ? sc + h + pullL : sc + h;   /* スライダー・引き手の下の歯は描かない（線が重ならない） */
  const lt = spec.pitch * 0.4, half = spec.pitch / 2, th = spec.thick;

  if (isTop) {
    if (c.closed) { add('tape', R.stations(0, L).slice(0, -1).map(s => R.side(s, -spec.tapeW / 2))); add('tape', R.stations(0, L).slice(0, -1).map(s => R.side(s, spec.tapeW / 2))); }
    else add('tape', band(-ext, L + ext, -spec.tapeW / 2, spec.tapeW / 2));
  } else {
    const t2 = ZIPPER_TAPE_THICK / 2;
    if (c.closed) add('tape', band(sc + h, sc - h + L, -t2, t2));
    else { if (sc - h > -ext) add('tape', band(-ext, sc - h, -t2, t2)); if (L + ext > sc + h) add('tape', band(sc + h, L + ext, -t2, t2)); }
  }
  for (let k = 0, s = a + lt / 2; s + lt / 2 <= b + 1e-9; k++, s = a + lt / 2 + k * half) {
    if (s + lt / 2 > hideLo && s - lt / 2 < hideHi) continue;
    const meshed = s < sc, left = k % 2 === 0;
    if (isTop) {
      const g = meshed ? 0 : eW * 0.32, v0 = left ? -eW / 2 - g : -eW * 0.12 + g, v1 = left ? eW * 0.12 - g : eW / 2 + g;
      add('tooth', R.rigid(s, [[-lt / 2, v0], [lt / 2, v0], [lt / 2, v1], [-lt / 2, v1]]), true, true);
    } else if (meshed || left) add('tooth', R.rigid(s, [[-lt / 2, -th / 2], [lt / 2, -th / 2], [lt / 2, th / 2], [-lt / 2, th / 2]]), true, true);
  }
  if (!c.closed) {
    if (isTop) {
      add('stop', R.rigid(bs / 2, [[-bs / 2, -eW * 0.6], [bs / 2, -eW * 0.6], [bs / 2, eW * 0.6], [-bs / 2, eW * 0.6]]), true, true);
      for (const m of [-1, 1]) add('stop', R.rigid(L - ts / 2, [[-ts / 2, m * eW * 0.1], [ts / 2, m * eW * 0.1], [ts / 2, m * eW * 0.62], [-ts / 2, m * eW * 0.62]]), true, true);
    } else {
      const hv = th / 2 + 0.25;
      add('stop', R.rigid(bs / 2, [[-bs / 2, -hv], [bs / 2, -hv], [bs / 2, hv], [-bs / 2, hv]]), true, true);
      add('stop', R.rigid(L - ts / 2, [[-ts / 2, -hv], [ts / 2, -hv], [ts / 2, hv], [-ts / 2, hv]]), true, true);
    }
  }
  if (isTop) {
    const hw = eW * 0.95, hb = eW * 0.675, k = Ls * 0.1;   /* 上止め側が広く、下止め側が細い */
    add('slider', R.rigid(sc, [[-h, -hb * 0.55], [-h + k, -hb], [-k, -hb], [Ls * 0.12, -hw], [h - k, -hw], [h, -hw * 0.7], [h, -eW * 0.12], [h - Ls * 0.18, 0], [h, eW * 0.12], [h, hw * 0.7], [h - k, hw], [Ls * 0.12, hw], [-k, hb], [-h + k, hb], [-h, hb * 0.55]]));
    add('bridge', R.rigid(sc, [[-Ls * 0.3, -eW * 0.2], [Ls * 0.12, -eW * 0.2], [Ls * 0.12, eW * 0.2], [-Ls * 0.3, eW * 0.2]]));
    const d = pullDir, u0 = d * h, u1 = d * (h + pullL), pw = eW * 0.52, ch = eW * 0.3;
    add('pull', R.rigid(sc, [[u0, -eW * 0.28], [u0 + d * eW * 0.35, -pw], [u1 - d * ch, -pw], [u1, -pw + ch], [u1, pw - ch], [u1 - d * ch, pw], [u0 + d * eW * 0.35, pw], [u0, eW * 0.28]]));
    const hc = u1 - d * eW * 0.6, hr = eW * 0.2;
    add('hole', R.rigid(sc, Array.from({ length: 12 }, (_, i) => [hc + hr * Math.cos(i * Math.PI / 6), hr * Math.sin(i * Math.PI / 6)])));
  } else {
    const H = th / 2 + 0.8, k = Ls * 0.1, /* 引き手は、左から右へ引いた線なら画面の上側（Y は下向きなので符号は負）。mir で反対側 */ crown = eW * 0.4, pt = eW * 0.22, v = y => y * sgn;
    add('slider', R.rigid(sc, [[-h, v(-H * 0.8)], [-h + k, v(-H)], [h - k, v(-H)], [h, v(-H * 0.8)], [h, v(H * 0.8)], [h - k, v(H)], [-h + k, v(H)], [-h, v(H * 0.8)]]));
    add('bridge', R.rigid(sc, [[-Ls * 0.05, v(H)], [0, v(H + crown)], [Ls * 0.3, v(H + crown)], [Ls * 0.38, v(H)]]), false);
    const d = pullDir, uA = d < 0 ? 0 : Ls * 0.3, uB = d * (h + pullL), yA = H + crown, yB = th / 2 + 0.1;   /* 引き手：付け根（スライダーの上）から、歯の上へ寝る */
    add('pull', R.rigid(sc, [[uA, v(yA + pt / 2)], [uB, v(yB + pt)], [uB, v(yB)], [uA, v(yA - pt / 2)]]));
  }
  return { length: L, closed: c.closed, items };
}

/**
 * つながった線を、1本のファスナーにまとめる。list＝[{ id, key, zipper, points }]（key＝同じ層・同じ設定のものだけをつなぐための合言葉）。
 * 端と端が tol 以内で重なる線を、順につなぐ（向きは最初の線に合わせる）。返り値 [{ ids, zipper, points }]。
 */
export function zipperRuns(list, tol = 0.05) {
  const left = (list || []).filter(x => x && Array.isArray(x.points) && x.points.length >= 2).map(x => ({ ...x, points: x.points.map(p => ({ x: p.x, y: p.y })) })), runs = [];
  while (left.length) {
    const first = left.shift(), run = { ids: [first.id], zipper: first.zipper, key: first.key, points: first.points };
    for (let grew = true; grew;) {
      grew = false;
      const head = run.points[0], tail = run.points[run.points.length - 1]; if (run.points.length >= 3 && zipDist(head, tail) <= tol) break;   /* 輪になったら終わり */
      for (let i = 0; i < left.length; i++) {
        const o = left[i]; if (o.key !== run.key) continue; const a = o.points[0], b = o.points[o.points.length - 1];
        if (zipDist(tail, a) <= tol) run.points = [...run.points, ...o.points.slice(1)];
        else if (zipDist(tail, b) <= tol) run.points = [...run.points, ...o.points.slice(0, -1).reverse()];
        else if (zipDist(head, b) <= tol) run.points = [...o.points.slice(0, -1), ...run.points];
        else if (zipDist(head, a) <= tol) run.points = [...o.points.slice(1).reverse(), ...run.points];
        else continue;
        run.ids.push(o.id); left.splice(i, 1); grew = true; break;
      }
    }
    runs.push({ ids: run.ids, zipper: run.zipper, points: run.points });
  }
  return runs;
}
