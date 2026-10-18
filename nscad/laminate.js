// 貼り合わせの曲げ検証（事業主指示 2026-10-17）：表と裏を別々に作図した図面（図面の「部品」2つ）を貼り合わせたとき、どのくらい曲がるかを、革の厚みから求める。
// あわせて、①寸法の過不足（足りない寸法の案つき）②菱目の数と位置が表と裏で合うか、を調べる。ブラウザにも Node にも依存しない（図面の JSON だけを見る）。
import { bboxOf, distance, smallLoopCenters } from './geometry.js';

const DIM_TOL = 0.05, ROW_GAP = 0.5, EDGE_PAD = 1;   /* 寸法の一致の許容（mm）・同じ列とみなす幅（mm）・部品の外枠から寸法の端が出てよい幅（mm） */

/** 部品の外枠（部品に入れた図形の外接の四角）。図形が無ければ null。 */
export function partBox(doc, part) {
  const shapes = doc.shapes.filter(s => part.shapeIds.includes(s.id)); if (!shapes.length) return null;
  const bs = shapes.map(bboxOf); return { minX: Math.min(...bs.map(b => b.minX)), minY: Math.min(...bs.map(b => b.minY)), maxX: Math.max(...bs.map(b => b.maxX)), maxY: Math.max(...bs.map(b => b.maxY)) };
}
const within = (b, p, pad = 0) => p.x >= b.minX - pad && p.x <= b.maxX + pad && p.y >= b.minY - pad && p.y <= b.maxY + pad;
const lamNum = (v, d = 2) => (+v).toFixed(d);

/** 曲がる向き：'x'（横方向に曲がる＝横の長さの差で曲がる）か 'y'。auto は長い辺のほう。 */
function axisOf(a, b, axis) {
  if (axis === 'x' || axis === 'y') return axis;
  const ext = box => [box.maxX - box.minX, box.maxY - box.minY]; const ea = ext(a), eb = ext(b);
  return Math.max(ea[0], eb[0]) >= Math.max(ea[1], eb[1]) ? 'x' : 'y';
}

/** 曲げ：長さの差 dL（表−裏）と、2枚の厚み（tOuter・tInner）から、貼り合わせて曲がる半径と角度。
 *  2枚の中立面（厚みの真ん中）の間は d＝(tOuter+tInner)/2。長いほうが外側で、長さの差 ＝ 角度 × d。 */
export function bendOf(lenOuter, lenInner, tOuter, tInner) {
  const dL = lenOuter - lenInner, d = (tOuter + tInner) / 2;
  if (Math.abs(dL) < 1e-6) return { ok: true, curl: 'none', dL: 0, thetaDeg: 0, radius: Infinity, d };
  const theta = Math.abs(dL) / d, longT = dL > 0 ? tOuter : tInner, shortT = dL > 0 ? tInner : tOuter, longLen = Math.max(lenOuter, lenInner);
  const radius = longLen / theta - longT / 2;   /* 貼り合わせた面での曲げ半径 */
  if (!(radius > shortT / 2)) return { ok: false, error: 'tooMuch', dL, d, thetaDeg: theta * 180 / Math.PI, radius };   /* 差が大きすぎて、短いほうの革が潰れる */
  return { ok: true, curl: dL > 0 ? 'outer' : 'inner', dL, d, thetaDeg: theta * 180 / Math.PI, radius };
}

/** 自動の部品（三つ折りの展開の表・裏。part.autoPly＝'outer'｜'inner'）は、外枠の中に財布の図面の菱目・寸法・点線が入り込んでいても、展開の図形だけを数える。手で作った部品は、外枠の中のものをすべて数える。 */
const lamOwnShape = (part, s) => !part.autoPly || (s.foldFlat === 'fdu' && s.ply === part.autoPly);
const lamOwnHole = (doc, part, h) => !part.autoPly || (h.foldFlat === 'fdu' && doc.paths.find(p => p.id === h.pathId)?.ply === part.autoPly);
/** 部品に付く寸法：両端が、部品の外枠（EDGE_PAD だけ広げた）に入る寸法。 */
function dimsOf(doc, box, part) {
  return doc.shapes.filter(s => s.type === 'dimension' && !s.foldSec && lamOwnShape(part, s) && within(box, { x: s.x1, y: s.y1 }, EDGE_PAD) && within(box, { x: s.x2, y: s.y2 }, EDGE_PAD))
    .map(s => ({ id: s.id, value: distance({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }), horizontal: Math.abs(s.x2 - s.x1) >= Math.abs(s.y2 - s.y1) }));
}

/** 部品の菱目：外枠の中にある穴を、断面方向の位置でそろえた「列」にして、列ごとに曲がる方向の位置（外枠の端から）を昇順に並べる。 */
function holeRows(doc, box, axis, part) {
  const along = axis === 'x' ? 'x' : 'y', across = axis === 'x' ? 'y' : 'x', a0 = axis === 'x' ? box.minX : box.minY, c0 = axis === 'x' ? box.minY : box.minX;
  const hs = doc.holes.filter(h => within(box, h, 0.01) && lamOwnHole(doc, part, h)).sort((p, q) => p[across] - q[across]); const rows = [];
  for (const h of hs) { const last = rows.at(-1); if (last && Math.abs(h[across] - last.at) <= ROW_GAP) { last.pos.push(h[along] - a0); last.sum += h[across]; last.n++; last.at = last.sum / last.n; } else rows.push({ at: h[across], sum: h[across], n: 1, pos: [h[along] - a0] }); }
  return rows.map(r => ({ cross: r.at - c0, pos: r.pos.sort((p, q) => p - q) }));
}

/** 曲げ区間の候補：表の部品の中にある、部品の幅（曲がらない方向）の8割以上を横切る点線の位置（外枠の端から）。同じ位置（0.01mm 以内）は1本にする。 */
function lamDashPositions(doc, box, axis, part) {
  const horizontal = axis === 'x', span = horizontal ? box.maxY - box.minY : box.maxX - box.minX, a0 = horizontal ? box.minX : box.minY, pad = 0.5, out = [];
  for (const s of doc.shapes) {
    if (s.type !== 'line' || s.lineStyle !== 'dashed' || !lamOwnShape(part, s)) continue;
    const along = horizontal ? [s.x1, s.x2] : [s.y1, s.y2], across = horizontal ? [s.y1, s.y2] : [s.x1, s.x2], cLo = horizontal ? box.minY : box.minX, cHi = horizontal ? box.maxY : box.maxX;
    if (Math.abs(along[0] - along[1]) > 0.01 || Math.abs(across[0] - across[1]) < span * 0.8 || Math.min(...across) < cLo - pad || Math.max(...across) > cHi + pad) continue;
    const p = along[0] - a0; if (p >= -0.01 && p <= (horizontal ? box.maxX - box.minX : box.maxY - box.minY) + 0.01 && !out.some(q => Math.abs(q - p) < 0.01)) out.push(p);
  }
  return out.sort((p, q) => p - q);
}
/** 点線の位置から曲げ区間の組を作る：3の倍数ならば（始め・まん中・終わり）ずつ、偶数ならば2本ずつ。それ以外は区間なし。 */
function lamZonesFromDashes(pos) {
  const k = pos.length % 3 === 0 && pos.length ? 3 : pos.length % 2 === 0 && pos.length ? 2 : 0, out = [];
  for (let i = 0; k && i < pos.length; i += k) out.push([pos[i], pos[i + k - 1]]); return out;
}
/** 菱目の間隔が変わる範囲を、曲げ部として見つける（事業主の希望 2026-10-19「菱目間隔が変わる範囲を自動で検知してそこを曲げ部として扱う」）。pos＝1列の菱目の位置（mm・昇順でなくてもよい）。
 *  平らな所の間隔（ピッチ）は、いちばん多い間隔（±0.05mm でまとめる・同数なら左のほう）。ピッチから許容（max(0.1mm, ピッチの2%)）より外れた間隔が続く範囲を、1つの曲げ部［始まりの穴の位置, 終わりの穴の位置］にする。
 *  返り値：{ ok:true, pitch, zones:[[a,b]…] } か { ok:false, reason:'few'（間隔が6つ未満＝穴が7個より少ない）｜'irregular'（ピッチが半数に満たない）｜'uniform'（間隔が変わる所なし）, pitch? }。 */
export function lamZonesFromHoles(pos, opts = {}) {
  const p = [...pos].filter(Number.isFinite).sort((a, b) => a - b), gaps = p.slice(1).map((x, i) => x - p[i]);
  if (gaps.length < 6) return { ok: false, reason: 'few' };   /* 穴が7個より少ない列は、ピッチを決められない */
  let best = null; for (const g of gaps) { const same = gaps.filter(h => Math.abs(h - g) <= 0.05); if (!best || same.length > best.length) best = same; }
  if (best.length * 2 < gaps.length) return { ok: false, reason: 'irregular' };   /* ピッチ（いちばん多い間隔）が半分に満たない列は、平らな所が分からない */
  const pitch = best.reduce((sum, v) => sum + v, 0) / best.length, tol = opts.tol ?? Math.max(0.1, pitch * 0.02), zones = []; let start = -1;
  gaps.forEach((g, i) => { const off = Math.abs(g - pitch) > tol; if (off && start < 0) start = i; if ((!off || i === gaps.length - 1) && start >= 0) { zones.push([p[start], p[off ? i + 1 : i]]); start = -1; } });
  return zones.length ? { ok: true, pitch, zones } : { ok: false, reason: 'uniform', pitch };
}
/** 菱目の列（holeRows の結果）から、曲げ区間（部品の端からの位置）を見つける：穴が4個以上ある列のうち、いちばん穴の多い列の、間隔が変わる範囲。なければ空。 */
function lamZonesFromRows(rows) {
  const best = rows.filter(r => r.pos.length >= 4).reduce((a, r) => !a || r.pos.length > a.pos.length ? r : a, null), z = best ? lamZonesFromHoles(best.pos) : null; return z?.ok ? z.zones : [];
}
/** 三つ折りの断面図のための、部品1つの「平ら3・丸折り2」の長さ（事業主の選択 2026-10-19・案A）。曲げ部の見つけ方：縦の点線から2か所（4本か6本）→ そうならなければ、菱目の間隔が変わる範囲から2か所。
 *  opts：{ axis:'x'｜'y'（曲がる向き・既定 'x'）}。
 *  返り値：{ ok:true, source:'dashes'｜'holes', axis, length（部品の全長）, flats[3]・bends[2]（部品の端から順）, zones:[[a,b],[a,b]], holes[]（いちばん穴の多い列の、部品の端からの位置・昇順）, edge（部品の端の座標）}
 *  か { ok:false, error:'emptyPart'｜'noZones'（曲げ部が見つからない）｜'zoneCount'（2か所でない・count）｜'zoneBad'（重なり・はみ出し）}。 */
export function lamFoldSpec(doc, part, { axis = 'x' } = {}) {
  const box = partBox(doc, part); if (!box) return { ok: false, error: 'emptyPart' };
  const horizontal = axis !== 'y', length = horizontal ? box.maxX - box.minX : box.maxY - box.minY, rows = holeRows(doc, box, horizontal ? 'x' : 'y', part);
  const dash = lamZonesFromDashes(lamDashPositions(doc, box, horizontal ? 'x' : 'y', part)), hole = lamZonesFromRows(rows);
  const source = dash.length === 2 ? 'dashes' : hole.length === 2 ? 'holes' : null, zones = source === 'dashes' ? dash : source === 'holes' ? hole : null;
  if (!zones) { const count = dash.length || hole.length; return count ? { ok: false, error: 'zoneCount', count } : { ok: false, error: 'noZones' }; }
  const [[a1, b1], [a2, b2]] = zones; if (!(a1 >= -0.01 && b1 - a1 > 1e-6 && a2 >= b1 - 1e-9 && b2 - a2 > 1e-6 && b2 <= length + 0.01)) return { ok: false, error: 'zoneBad' };
  const best = rows.reduce((a, r) => !a || r.pos.length > a.pos.length ? r : a, null);
  return { ok: true, source, axis: horizontal ? 'x' : 'y', length, flats: [a1, a2 - b1, length - b2], bends: [b1 - a1, b2 - a2], zones, holes: best ? [...best.pos] : [], edge: horizontal ? box.minX : box.minY };
}
/** 部品を2つ選んだ時点の「いまの全長」：表・裏それぞれの、曲がる向きの全長と、その差、貼り合わせたときの曲げ。検証を押す前に、画面へ出すための軽い計算（寸法・菱目は見ない・目標の全長も見ない）。
 *  opts：{ tOuter, tInner, axis('auto'|'x'|'y') }。選べていない（同じ部品・見つからない・図形が無い・厚みが正でない）ときは null。返り値：{ ok:true, axis, outerLen, innerLen, diff（長さの差の大きさ）, bend（bendOf の結果）, tOuter, tInner }。 */
export function laminateNow(doc, outerId, innerId, opts = {}) {
  const po = doc.parts.find(p => p.id === outerId), pi = doc.parts.find(p => p.id === innerId); if (!po || !pi || po === pi) return null;
  const tO = Number(opts.tOuter ?? po.thickness), tI = Number(opts.tInner ?? pi.thickness); if (!(tO > 0 && tI > 0)) return null;
  const bo = partBox(doc, po), bi = partBox(doc, pi); if (!bo || !bi) return null;
  const axis = axisOf(bo, bi, opts.axis || 'auto'), horizontal = axis === 'x', len = b => horizontal ? b.maxX - b.minX : b.maxY - b.minY;
  const outerLen = len(bo), innerLen = len(bi); return { ok: true, axis, outerLen, innerLen, diff: Math.abs(outerLen - innerLen), bend: bendOf(outerLen, innerLen, tO, tI), tOuter: tO, tInner: tI };
}
/** 検証の本体。opts：{ tOuter, tInner, axis('auto'|'x'|'y'), holeTol(mm) }。
 *  返り値：{ ok:false, error } か { ok:true, axis, outer, inner, bend, issues:[{ level:'error'|'warn', code, side, text, suggest? }] }。 */
export function laminateCheck(doc, outerId, innerId, opts = {}) {
  const po = doc.parts.find(p => p.id === outerId), pi = doc.parts.find(p => p.id === innerId);
  if (!po || !pi || po === pi) return { ok: false, error: 'pickTwo' };
  const tO = Number(opts.tOuter ?? po.thickness), tI = Number(opts.tInner ?? pi.thickness); if (!(tO > 0 && tI > 0)) return { ok: false, error: 'thickness' };
  const bo = partBox(doc, po), bi = partBox(doc, pi); if (!bo || !bi) return { ok: false, error: 'emptyPart' };
  const axis = axisOf(bo, bi, opts.axis || 'auto'), horizontalAxis = axis === 'x', holeTol = Number(opts.holeTol ?? 0.3);
  const len = b => horizontalAxis ? b.maxX - b.minX : b.maxY - b.minY, wid = b => horizontalAxis ? b.maxY - b.minY : b.maxX - b.minX;
  const Lo = len(bo), Li = len(bi), Wo = wid(bo), Wi = wid(bi), bend = bendOf(Lo, Li, tO, tI), issues = [], push = (level, code, side, params = {}, suggest) => issues.push({ level, code, side, params, ...(suggest ? { suggest } : {}) });
  if (!bend.ok) push('error', 'bendTooMuch', null, { dl: lamNum(Math.abs(bend.dL)) });
  /* ①寸法の過不足 */
  const checkDims = opts.checkDims !== false, checkHoles = opts.checkHoles !== false;   /* 寸法・菱目の検査は、オフにできる（寸法を非表示にしたとき・菱目をまだ打っていないとき） */
  const names = checkDims ? [['表', po, bo, Lo, Wo, 'outer'], ['裏', pi, bi, Li, Wi, 'inner']] : [], dimInfo = {};
  for (const [side, part, box, L, W] of names) {
    const ds = dimsOf(doc, box, part), hit = (value, horizontal) => ds.some(d => d.horizontal === horizontal && Math.abs(d.value - value) <= DIM_TOL);
    dimInfo[side] = ds;
    if (!hit(L, horizontalAxis)) push('error', 'needLength', side, { v: lamNum(L) }, { side, partId: part.id, value: L, horizontal: horizontalAxis, box, role: 'length' });
    if (!hit(W, !horizontalAxis)) push('error', 'needWidth', side, { v: lamNum(W) }, { side, partId: part.id, value: W, horizontal: !horizontalAxis, box, role: 'width' });
  }
  const used = new Set(), inner = dimInfo['裏'] || [];
  for (const d of dimInfo['表'] || []) {
    if (Math.abs(d.value - Lo) <= DIM_TOL || Math.abs(d.value - Wo) <= DIM_TOL) continue;
    const mate = inner.find(e => !used.has(e.id) && e.horizontal === d.horizontal && Math.abs(e.value - d.value) <= DIM_TOL); if (mate) used.add(mate.id);
    else push('warn', 'unpaired', '裏', { v: lamNum(d.value), from: '表' }, { side: '裏', partId: pi.id, value: d.value, horizontal: d.horizontal, box: bi, role: 'mate' });
  }
  for (const e of inner) if (!used.has(e.id) && Math.abs(e.value - Li) > DIM_TOL && Math.abs(e.value - Wi) > DIM_TOL && !dimInfo['表'].some(d => d.horizontal === e.horizontal && Math.abs(d.value - e.value) <= DIM_TOL))
    push('warn', 'unpaired', '表', { v: lamNum(e.value), from: '裏' }, { side: '表', partId: po.id, value: e.value, horizontal: e.horizontal, box: bo, role: 'mate' });
  /* ②菱目の数と位置：貼り合わせて曲げたとき、表の i 番目の菱目の下に、裏の i 番目の菱目が来るか。同じ角度で曲がるので、裏の位置は、表の位置 × （裏の全長 ÷ 表の全長）になる */
  /* 曲げ区間：手入力があればそれ、なければ表の点線から。区間があれば、平らな所は表と裏で同じ長さ・曲げの区間は、どれも同じ角度で曲がる（長さの差を区間の数で等分）として、裏の位置を求める */
  /* 基準（表 or 裏）と、もう一方の全長（目標）：基準の部品を正しいものとして、もう一方の全長・菱目の位置を求める。目標が無ければ、もう一方のいまの長さ */
  const baseOuter = opts.base !== 'inner', baseSide = baseOuter ? '表' : '裏', otherSide = baseOuter ? '裏' : '表', otherLen = baseOuter ? Li : Lo, tgt = Number(opts.targetLen), hasTarget = Number.isFinite(tgt) && tgt > 0, wantLen = hasTarget ? tgt : otherLen;
  const LoU = baseOuter ? Lo : wantLen, LiU = baseOuter ? wantLen : Li, bendU = bendOf(LoU, LiU, tO, tI);   /* 目標の長さで貼り合わせたときの曲げ（目標が無ければ、いまの曲げと同じ） */
  { const dW = Math.abs(Wo - Wi);   /* 貼り合わせる幅（曲がらない方向）は、表と裏で同じ。大きく違うときは、部品の選び方が合っていない */
    if (dW > 5) push('error', 'partsMismatch', otherSide, { wo: lamNum(Wo), wi: lamNum(Wi) }); else if (dW > DIM_TOL) push('error', 'widthDiffer', otherSide, { cur: lamNum(baseOuter ? Wi : Wo), want: lamNum(baseOuter ? Wo : Wi), base: baseSide }, { side: otherSide, current: baseOuter ? Wi : Wo, want: baseOuter ? Wo : Wi }); }
  if (hasTarget && Math.abs(otherLen - wantLen) > DIM_TOL) push('error', 'lenOff', otherSide, { cur: lamNum(otherLen), want: lamNum(wantLen), diff: lamNum(Math.abs(wantLen - otherLen)), dir: wantLen > otherLen ? 'long' : 'short' }, { side: otherSide, current: otherLen, want: wantLen });
  /* 曲げ区間：手入力があればそれ、なければ表の点線から。区間があれば、平らな所は表と裏で同じ長さ・曲げの区間は、どれも同じ角度で曲がる（長さの差を区間の数で等分）として、もう一方の位置を求める */
  let zones = [], mode = 'uniform', zoneSource = null, given = Array.isArray(opts.zones) && opts.zones.length ? opts.zones : null, dashZones = given ? [] : lamZonesFromDashes(lamDashPositions(doc, bo, axis, po)), cand = given ?? dashZones;
  if (!cand.length) { const hz = lamZonesFromRows(holeRows(doc, bo, axis, po)); if (hz.length) cand = hz; }   /* 点線が無いときは、表の菱目の間隔が変わる範囲を曲げ区間にする（2026-10-19） */
  const candSource = given ? 'given' : dashZones.length ? 'dashes' : cand.length ? 'holes' : null;   /* 曲げ区間の出どころ：入力 ＞ 縦の点線 ＞ 菱目の間隔 */
  if (cand.length && Math.abs(bendU.dL) > 1e-9 && bendU.ok) {
    const sorted = cand.every(([a, b], k) => Number.isFinite(a) && Number.isFinite(b) && a >= -0.01 && b <= Lo + 0.01 && b > a && (k === 0 || a >= cand[k - 1][1] - 1e-9)), red = bendU.dL / cand.length;
    if (sorted && cand.every(([a, b]) => b - a - Math.abs(red) > 1e-6)) {
      const theta = Math.abs(bendU.dL) / bendU.d / cand.length;   /* 1か所あたりの角度（ラジアン） */
      zones = cand.map(([a, b]) => ({ a, b, lenOuter: b - a, lenInner: b - a - red, thetaDeg: theta * 180 / Math.PI, radius: (b - a) / theta - (bendU.dL > 0 ? tO / 2 : -tO / 2) })); mode = 'zones'; zoneSource = candSource;
    } else push('warn', 'zonesBad', null, { n: cand.length });
  }
  const mapInner = x => mode === 'zones' ? x - zones.reduce((sum, z) => sum + (bendU.dL / zones.length) * Math.min(Math.max((x - z.a) / (z.b - z.a), 0), 1), 0) : x * (LoU > 0 ? LiU / LoU : 1);
  const bpOuter = mode === 'zones' ? [0, ...zones.flatMap(z => [z.a, z.b]), Lo] : [0, Lo], bpInner = bpOuter.map(mapInner);   /* 表→裏の対応の折れ点（裏→表は、これを逆にたどる） */
  const mapOuter = y => { for (let k = 0; k + 1 < bpInner.length; k++) { if (y <= bpInner[k + 1] + 1e-9 || k + 2 === bpInner.length) { const span = bpInner[k + 1] - bpInner[k]; return span === 0 ? bpOuter[k] : bpOuter[k] + (y - bpInner[k]) * (bpOuter[k + 1] - bpOuter[k]) / span; } } return y; };
  const expect = baseOuter ? mapInner : mapOuter;   /* 基準の位置 → もう一方にあるべき位置 */
  const ro = checkHoles ? holeRows(doc, bo, axis, po) : [], ri = checkHoles ? holeRows(doc, bi, axis, pi) : [], rb = baseOuter ? ro : ri, rx = baseOuter ? ri : ro, holes = { rows: [], count: [ro.reduce((n, r) => n + r.pos.length, 0), ri.reduce((n, r) => n + r.pos.length, 0)], maxDev: 0 };
  const total = rows => rows.reduce((n, r) => n + r.pos.length, 0);
  const loopsOf = part => smallLoopCenters(doc.shapes.filter(s => part.shapeIds.includes(s.id) && lamOwnShape(part, s))).length, loops = [loopsOf(po), loopsOf(pi)], baseLoops = baseOuter ? loops[0] : loops[1], otherLoops = baseOuter ? loops[1] : loops[0];   /* 菱の線（小さな菱形の図形）の数：穴とは別に数える（位置の検査・曲げ区間には使わない。事業主の指摘 2026-10-19「表に菱目があるのにないと計画がでる」） */
  if (!rb.length && !rx.length) { /* 菱目が無ければ、見るものが無い */ }
  else if (rb.length && !rx.length) {   /* もう一方に、まだ菱目が無い：エラーではなく、打つ位置を案内する */
    const want = rb.map(r => r.pos.map(expect)); push('warn', 'holesNone', otherSide, { n: total(rb), rows: rb.length, base: baseSide, loops: otherLoops, list: want[0].slice(0, 6).map(v => lamNum(v)).join(', ') + (want[0].length > 6 ? ' …' : '') });
    rb.forEach((r, k) => holes.rows.push({ row: k + 1, countOuter: baseOuter ? r.pos.length : 0, countInner: baseOuter ? 0 : r.pos.length, devs: [], missing: want[k].map(v => +v.toFixed(3)) }));
  }
  else if (!rb.length && rx.length) push('warn', 'holesExtra', otherSide, { n: total(rx), base: baseSide, loops: baseLoops });
  else if (ro.length !== ri.length) push('error', 'rowCount', null, { a: ro.length, b: ri.length });
  else rb.forEach((a, k) => {
    const b = rx[k], oc = baseOuter ? a : b, ic = baseOuter ? b : a, row = { row: k + 1, countOuter: oc.pos.length, countInner: ic.pos.length, devs: [], missing: [] };
    if (Math.abs(a.cross - b.cross) > holeTol) push('error', 'rowOffset', null, { row: k + 1, a: lamNum(oc.cross), b: lamNum(ic.cross) });
    const want = a.pos.map(expect);   /* もう一方にあるべき位置（端から） */
    if (a.pos.length !== b.pos.length) {
      push('error', a.pos.length > b.pos.length ? 'holeFew' : 'holeMany', otherSide, { row: k + 1, a: oc.pos.length, b: ic.pos.length, n: Math.abs(a.pos.length - b.pos.length) });
      row.missing = want.filter(w => !b.pos.some(p => Math.abs(p - w) <= holeTol)).map(w => +w.toFixed(3));
    }
    const n = Math.min(a.pos.length, b.pos.length); for (let i = 0; i < n; i++) { const dev = b.pos[i] - want[i]; row.devs.push(+dev.toFixed(3)); holes.maxDev = Math.max(holes.maxDev, Math.abs(dev)); }
    const bad = row.devs.map((v, i) => ({ i, v })).filter(x => Math.abs(x.v) > holeTol);
    if (bad.length) { const worst = bad.reduce((p, q) => Math.abs(q.v) > Math.abs(p.v) ? q : p); push('error', 'holePos', otherSide, { row: k + 1, n: bad.length, i: worst.i + 1, dev: lamNum(Math.abs(worst.v)), to: lamNum(want[worst.i]) }, { side: otherSide, row: k + 1, from: b.pos[worst.i], to: want[worst.i], index: worst.i + 1 }); }
    holes.rows.push(row);
  });
  holes.loops = loops; if (checkHoles && loops[0] !== loops[1]) push('warn', 'loopsDiffer', null, { o: loops[0], i: loops[1] });
  return { ok: true, axis, mode, zoneSource, zones, base: baseOuter ? 'outer' : 'inner', target: { side: baseOuter ? 'inner' : 'outer', current: otherLen, want: hasTarget ? wantLen : null }, outer: { length: Lo, width: Wo, thickness: tO }, inner: { length: Li, width: Wi, thickness: tI }, bend: bendU, holes, issues, errors: issues.filter(i => i.level === 'error').length, warns: issues.filter(i => i.level === 'warn').length };
}
