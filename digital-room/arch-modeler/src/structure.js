// 構造検討モジュール（簡易法）
// ①N値計算（柱頭柱脚金物・告示1460号の略算式） ②偏心率 ③横架材スパン目安 ④基礎接地圧
// いずれも耐力壁データからの簡易計算による目安。正規の構造検討は建築士による
import { detectRooms } from './daylight.js';

// N値→接合金物の選定表（告示1460号表三に基づく一般的対応）
const HW_TABLE = [
  { max: 0.0,      sym: 'い', name: '短ほぞ差し・かすがい' },
  { max: 0.65,     sym: 'ろ', name: '長ほぞ差し込み栓・CP-L' },
  { max: 1.0,      sym: 'は', name: 'CP-T・VP金物' },
  { max: 1.4,      sym: 'に', name: '羽子板ボルト等' },
  { max: 1.6,      sym: 'ほ', name: '羽子板ボルト＋スクリュー釘' },
  { max: 1.8,      sym: 'へ', name: 'ホールダウン10kN' },
  { max: 2.8,      sym: 'と', name: 'ホールダウン15kN' },
  { max: 3.7,      sym: 'ち', name: 'ホールダウン20kN' },
  { max: 4.7,      sym: 'り', name: 'ホールダウン25kN' },
  { max: Infinity, sym: 'ぬ', name: 'ホールダウン15kN×2' }
];

// 梁せい目安スパン表 (m, mm) — 梁間隔910mm・無等級材・住宅荷重の一般的目安
const FLOOR_BEAM = [[1.82, 105], [2.73, 180], [3.64, 240], [4.55, 300], [5.46, 330]];
const ROOF_BEAM  = [[1.82, 105], [2.73, 150], [3.64, 210], [4.55, 270], [5.46, 300]];

/**
 * 構造検討一式を実行する
 * @param {object} state 共有状態
 * @param {object} kabeRes checkWallQuantityの結果（詳細データ込み）
 * @param {object} opts {soil: 地耐力 kN/㎡}
 */
export function computeStructure(state, kabeRes, { soil = 30 } = {}) {
  return {
    ecc: eccentricity(kabeRes),
    nvalues: nValueCheck(kabeRes),
    beams: beamCheck(kabeRes),
    foundation: foundationCheck(kabeRes, soil)
  };
}

// ===== ① 偏心率 =====
// 剛心=耐力壁剛性(長さ×倍率∝長さ)の重み付き平均位置、重心=床(部屋)の図心
// 偏心率 Re = 偏心距離 / 弾力半径 ≤ 0.3 で適合
function eccentricity(kabeRes) {
  const out = [];
  for (const s of kabeRes.stories) {
    const kx = s.segs.x, kz = s.segs.z;
    const sumKx = kx.reduce((a, g) => a + g.len, 0);
    const sumKz = kz.reduce((a, g) => a + g.len, 0);
    if (sumKx === 0 || sumKz === 0) { out.push({ name: s.name, error: '片方向の耐力壁がありません' }); continue; }

    const Zr = kx.reduce((a, g) => a + g.len * g.pos, 0) / sumKx; // X壁の剛心(Z座標)
    const Xr = kz.reduce((a, g) => a + g.len * g.pos, 0) / sumKz; // Z壁の剛心(X座標)

    // 重心: 部屋セルの図心（部屋がなければ外形中心）
    const det = detectRooms(s.walls);
    let Xg, Zg;
    const cells = det.rooms.flatMap(r => r.cells);
    if (cells.length > 0) {
      Xg = cells.reduce((a, c) => a + c.x, 0) / cells.length;
      Zg = cells.reduce((a, c) => a + c.z, 0) / cells.length;
    } else {
      Xg = (s.bbox.minX + s.bbox.maxX) / 2;
      Zg = (s.bbox.minZ + s.bbox.maxZ) / 2;
    }

    const ey = Math.abs(Zg - Zr); // X方向地震時の偏心距離
    const ex = Math.abs(Xg - Xr); // Z方向地震時の偏心距離
    const KR = kx.reduce((a, g) => a + g.len * (g.pos - Zr) ** 2, 0)
             + kz.reduce((a, g) => a + g.len * (g.pos - Xr) ** 2, 0); // ねじり剛性
    const rex = Math.sqrt(KR / sumKx), rez = Math.sqrt(KR / sumKz);  // 弾力半径
    const Rex = rex > 0 ? ey / rex : Infinity;
    const Rez = rez > 0 ? ex / rez : Infinity;

    out.push({
      name: s.name, Xg, Zg, Xr, Zr, ex, ey, rex, rez, Rex, Rez,
      okX: Rex <= 0.3, okZ: Rez <= 0.3
    });
  }
  return out;
}

// ===== ② N値計算（簡易） =====
// 柱=耐力壁有効区間の端部とみなす。N = A1×B1 (+A2×B2) − L、金物は選定表から
function nValueCheck(kabeRes) {
  const n = kabeRes.stories.length;
  const ratio = kabeRes.meta.wallRatio;
  // 各階の柱を抽出
  const colsByStory = kabeRes.stories.map(s => collectColumns(s, ratio));

  const out = [];
  for (let i = 0; i < n; i++) {
    const isTop = i === n - 1;
    const upper = isTop ? [] : colsByStory[i + 1];
    const rows = colsByStory[i].map((c, ci) => {
      const B = c.corner ? 0.8 : 0.5;
      let A2 = 0;
      if (!isTop) {
        const m = upper.find(u => Math.hypot(u.x - c.x, u.z - c.z) < 0.3);
        if (m) A2 = m.A1;
      }
      const L = isTop ? (c.corner ? 0.4 : 0.6) : (c.corner ? 1.0 : 1.6);
      const N = c.A1 * B + A2 * B - L;
      const hw = HW_TABLE.find(h => N <= h.max);
      return { no: `${c.corner ? '隅' : ''}C${ci + 1}`, x: c.x, z: c.z,
               corner: c.corner, A1: c.A1, A2, N, sym: hw.sym, hwName: hw.name };
    }).sort((a, b) => b.N - a.N);
    out.push({ name: kabeRes.stories[i].name, rows });
  }
  return out;
}

/** 耐力壁端部から柱を抽出し、両側の壁倍率差A1と出隅判定を返す */
function collectColumns(story, ratio) {
  const cols = []; // {x,z, px,mx,pz,mz}
  const find = (x, z) => {
    let c = cols.find(c2 => Math.hypot(c2.x - x, c2.z - z) < 0.15);
    if (!c) { c = { x, z, px: 0, mx: 0, pz: 0, mz: 0 }; cols.push(c); }
    return c;
  };
  for (const dir of ['x', 'z']) {
    for (const g of story.segs[dir]) {
      const l = g.line;
      const a = find(l.x1, l.y1), b = find(l.x2, l.y2);
      if (dir === 'x') {
        // 壁が+X側に伸びる端と−X側に伸びる端
        if (l.x2 >= l.x1) { a.px += ratio; b.mx += ratio; }
        else { a.mx += ratio; b.px += ratio; }
      } else {
        if (l.y2 >= l.y1) { a.pz += ratio; b.mz += ratio; }
        else { a.mz += ratio; b.pz += ratio; }
      }
    }
  }
  const bx = story.bbox;
  for (const c of cols) {
    c.A1 = Math.max(Math.abs(c.px - c.mx), Math.abs(c.pz - c.mz));
    const edgeX = Math.abs(c.x - bx.minX) < 0.3 || Math.abs(c.x - bx.maxX) < 0.3;
    const edgeZ = Math.abs(c.z - bx.minZ) < 0.3 || Math.abs(c.z - bx.maxZ) < 0.3;
    c.corner = edgeX && edgeZ;
  }
  return cols;
}

// ===== ③ 横架材（梁せい）スパン目安 =====
// 部屋ごとの短辺スパンからスパン表で梁せいの目安を引く
function beamCheck(kabeRes) {
  const n = kabeRes.stories.length;
  const rows = [];
  kabeRes.stories.forEach((s, i) => {
    const isTop = i === n - 1;
    const det = detectRooms(s.walls);
    det.rooms.forEach((room, ri) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const c of room.cells) {
        minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
        minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z);
      }
      const w = maxX - minX + 0.25, d = maxZ - minZ + 0.25;
      const span = Math.min(w, d);
      const table = isTop ? ROOF_BEAM : FLOOR_BEAM;
      const hit = table.find(t => span <= t[0]);
      rows.push({
        story: s.name, room: `${s.name}-${ri + 1}`,
        w, d, span,
        kind: isTop ? '小屋梁' : '床梁（上階床）',
        depth: hit ? `${hit[1]}mm` : '要個別検討（スパン過大）',
        ok: !!hit
      });
    });
  });
  return rows;
}

// ===== ④ 基礎の接地圧チェック =====
// 概算建物重量を布基礎/べた基礎の底面積で除し、地耐力と比較
function foundationCheck(kabeRes, soil) {
  const totalFloor = kabeRes.stories.reduce((a, s) => a + s.area, 0);
  const unit = kabeRes.meta.roofWeight === 'heavy' ? 5.5 : 5.0; // kN/㎡（固定+積載+基礎自重の概算）
  const W = totalFloor * unit;

  const s1 = kabeRes.stories[0];
  const wallLen = s1.wallRows.reduce((a, r) => a + r.len, 0); // 1F全壁下に布基礎想定
  const STRIP_W = 0.45; // 布基礎底盤幅(m)
  const qStrip = W / (wallLen * STRIP_W);
  const qMat = W / s1.area;

  const okStrip = qStrip <= soil;
  const okMat = qMat <= soil;
  let recommend;
  if (soil < 20) recommend = '地盤改良または杭基礎の検討が必要（地耐力20kN/㎡未満）';
  else if (okStrip) recommend = `布基礎（底盤幅${STRIP_W * 1000}mm）で可`;
  else if (okMat) recommend = 'べた基礎を推奨（布基礎では接地圧超過）';
  else recommend = 'べた基礎でも接地圧超過。地盤改良等の検討が必要';

  return { totalFloor, unit, W, wallLen, stripW: STRIP_W, qStrip, qMat, soil, okStrip, okMat, recommend };
}
