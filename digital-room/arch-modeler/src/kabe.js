// 壁量計算モジュール（木造軸組・建築基準法46条の簡易版）
// 必要壁量(地震力・風圧力)と存在壁量を方向別に比較し、四分割法で配置バランスも判定する
// 計算書出力用に壁ごとの内訳・見付面積内訳などの詳細データも返す
// ※参考値。確認申請に使う計算は建築士による正規の構造検討が必要
import { floorLevels, levelHeight, wallsBBox, SLAB_T } from './builder3d.js';

// 地震力用の必要壁量係数 (cm/m²) [軽い屋根, 重い屋根]
// QUAKE_COEF[総階数][階(下から0始まり)]
const QUAKE_COEF = {
  1: [[11, 15]],
  2: [[29, 33], [15, 21]],
  3: [[46, 50], [34, 39], [18, 24]]
};
const WIND_COEF = 50;     // 風圧力用 (cm/m² 見付面積) ※一般区域
const MIN_SEG = 0.9;      // 耐力壁とみなす最小長さ(m)
const DIAG_TAN = Math.tan(22.5 * Math.PI / 180); // 軸方向判定の許容角

/**
 * 壁量計算を実行する
 * @param {object} state 共有状態
 * @param {object} opts {roofWeight:'light'|'heavy', wallRatio:壁倍率}
 */
export function checkWallQuantity(state, { roofWeight = 'light', wallRatio = 2.0 } = {}) {
  // 壁のある階だけを対象にする（元のインデックスを保持して床レベル参照に使う）
  const entries = state.floors
    .map((f, idx) => ({ f, idx }))
    .filter(e => e.f.walls.length > 0);
  const floors = entries.map(e => e.f);
  const origIdx = entries.map(e => e.idx);
  const n = floors.length;
  if (n === 0) return { error: '壁がありません。先に間取りを作成してください' };
  if (n > 3) return { error: '木造壁量計算は3階建てまでが対象です' };

  const wIdx = roofWeight === 'heavy' ? 1 : 0;
  const levels = floorLevels(state);
  const stories = [];
  let diagTotal = 0;

  for (let i = 0; i < n; i++) {
    const floor = floors[i];
    const b = wallsBBox(floor.walls);
    const width = b.maxX - b.minX, depth = b.maxZ - b.minZ;
    const area = width * depth; // 壁芯外形による近似（凹型は過大=安全側）
    const coef = QUAKE_COEF[n][i][wIdx];
    const seg = collectSegments(floor.walls, wallRatio);
    diagTotal += seg.diag;

    const story = {
      name: `${i + 1}F`, area, width, depth, bbox: b,
      walls: floor.walls,           // 配置図用
      wallRows: seg.rows,           // 計算書用: 壁ごとの内訳
      segs: { x: seg.x, z: seg.z }, // 配置図用: 有効区間
      coef, dirs: {}, quarters: {}
    };
    for (const dir of ['x', 'z']) {
      const exist = seg[dir].reduce((s, g) => s + g.len, 0) * 100 * wallRatio; // cm
      const reqQuake = coef * area;
      const facade = facadeArea(state, floors, levels, origIdx, i, dir);
      const reqWind = WIND_COEF * facade.total;
      const req = Math.max(reqQuake, reqWind);
      story.dirs[dir] = {
        exist, reqQuake, reqWind, req, facade,
        ratio: req > 0 ? exist / req : Infinity,
        ok: exist >= req
      };
      story.quarters[dir] = quarterCheck(seg[dir], b, coef, wallRatio, dir);
    }
    stories.push(story);
  }
  return { stories, diagTotal, meta: { n, roofWeight, wallRatio } };
}

/** 開口のない長さMIN_SEG以上の壁区間を方向別に集める（壁ごとの内訳行つき） */
function collectSegments(walls, wallRatio) {
  const out = { x: [], z: [], diag: 0, rows: [] };
  walls.forEach((w, wi) => {
    const dx = w.x2 - w.x1, dz = w.y2 - w.y1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;
    let dir = null;
    if (Math.abs(dz) <= Math.abs(dx) * DIAG_TAN) dir = 'x';
    else if (Math.abs(dx) <= Math.abs(dz) * DIAG_TAN) dir = 'z';

    const openSum = w.openings.reduce((s, o) => s + o.width, 0);
    const row = {
      no: `W${wi + 1}`,
      dir, dirLabel: dir === 'x' ? 'X(東西)' : dir === 'z' ? 'Z(南北)' : '斜め',
      len, openSum, effSum: 0, amount: 0,
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2
    };
    if (!dir) {
      out.diag++;
      out.rows.push(row);
      return;
    }

    // 開口で分割（垂れ壁・腰壁部分は耐力壁にしない）
    const ops = [...w.openings]
      .map(o => [Math.max(0, o.offset - o.width / 2), Math.min(len, o.offset + o.width / 2)])
      .sort((a, b2) => a[0] - b2[0]);
    let cursor = 0;
    const spans = [];
    for (const [a, b2] of ops) {
      if (a > cursor) spans.push([cursor, a]);
      cursor = Math.max(cursor, b2);
    }
    if (cursor < len) spans.push([cursor, len]);

    const ux = dx / len, uz = dz / len;
    for (const [a, b2] of spans) {
      const sl = b2 - a;
      if (sl < MIN_SEG) continue;
      const t = (a + b2) / 2 / len;
      out[dir].push({
        len: sl,
        // 四分割法用: 壁線の直交方向位置（X壁→Z座標 / Z壁→X座標）
        pos: dir === 'x' ? w.y1 + dz * t : w.x1 + dx * t,
        // 配置図用: 有効区間の両端座標
        line: {
          x1: w.x1 + ux * a, y1: w.y1 + uz * a,
          x2: w.x1 + ux * b2, y2: w.y1 + uz * b2
        }
      });
      row.effSum += sl;
    }
    row.amount = row.effSum * 100 * wallRatio;
    out.rows.push(row);
  });
  return out;
}

/** 四分割法: 両側端1/4部分の壁量充足率と壁率比を判定 */
function quarterCheck(segs, b, coef, wallRatio, dir) {
  const lo = dir === 'x' ? b.minZ : b.minX;
  const hi = dir === 'x' ? b.maxZ : b.maxX;
  const span = hi - lo;
  const across = dir === 'x' ? (b.maxX - b.minX) : (b.maxZ - b.minZ);
  if (span <= 0) return null;
  const qArea = across * span / 4;
  const need = coef * qArea;

  const fill = (from, to) => segs
    .filter(s => s.pos >= from - 1e-6 && s.pos <= to + 1e-6)
    .reduce((s, g) => s + g.len, 0) * 100 * wallRatio;
  const e1 = fill(lo, lo + span / 4);        // 北側/西側端
  const e2 = fill(hi - span / 4, hi);        // 南側/東側端
  const r1 = need > 0 ? e1 / need : Infinity;
  const r2 = need > 0 ? e2 / need : Infinity;
  const bothFull = r1 >= 1 && r2 >= 1;
  const balance = Math.min(r1, r2) / Math.max(r1, r2);
  return { e1, e2, need, qArea, r1, r2, balance, ok: bothFull || balance >= 0.5 };
}

/** 風圧力用の見付面積(m²): 対象階の床+1.35mより上の立面投影（上階＋屋根含む）。内訳行つき */
function facadeArea(state, floors, levels, origIdx, i, dir) {
  const cut = levels[origIdx[i]] + 1.35;
  const rows = [];
  let total = 0;
  for (let j = i; j < floors.length; j++) {
    const base = levels[origIdx[j]];
    const b = wallsBBox(floors[j].walls);
    const w = dir === 'x' ? (b.maxZ - b.minZ) : (b.maxX - b.minX);
    const top = base + levelHeight(floors[j]) + (j < floors.length - 1 ? SLAB_T : 0);
    const bottom = Math.max(base, cut);
    if (top > bottom) {
      const a = w * (top - bottom);
      rows.push({ label: `${j + 1}F壁面`, w, h: top - bottom, area: a });
      total += a;
    }
  }
  // 屋根の投影
  const roof = state.roof;
  if (roof && roof.type !== 'none') {
    const b = wallsBBox(floors[floors.length - 1].walls);
    const ov = roof.overhang ?? 0.4;
    const Lx = (b.maxX - b.minX) + ov * 2, Lz = (b.maxZ - b.minZ) + ov * 2;
    let a = 0;
    if (roof.type === 'flat') {
      a = (dir === 'x' ? Lz : Lx) * 0.15;
    } else {
      const alongX = Lx >= Lz;
      const major = Math.max(Lx, Lz), minor = Math.min(Lx, Lz);
      const rise = (minor / 2) * Math.tan((roof.pitch ?? 30) * Math.PI / 180);
      const ridge = roof.type === 'gable' ? major : Math.max(0, major - minor);
      // 棟と平行な風→妻面(三角形)、直交する風→平側(矩形/台形)
      const windAlongRidge = (alongX && dir === 'x') || (!alongX && dir === 'z');
      a = windAlongRidge ? minor * rise / 2 : (major + ridge) / 2 * rise;
    }
    rows.push({ label: '屋根投影', w: null, h: null, area: a });
    total += a;
  }
  return { total, rows };
}

/** 結果をサイドバー表示用テキストに整形する */
export function formatWallReport(res) {
  if (res.error) return res.error;
  const pct = r => r === Infinity ? '∞' : `${Math.round(r * 100)}%`;
  const dirName = { x: 'X方向(東西)', z: 'Z方向(南北)' };
  const lines = [];
  let allOk = true;

  for (const s of res.stories) {
    lines.push(`【${s.name}】床面積 ${s.area.toFixed(1)}㎡`);
    for (const dir of ['x', 'z']) {
      const d = s.dirs[dir];
      const mark = d.ok ? '✓' : '✗不足';
      if (!d.ok) allOk = false;
      lines.push(`${dirName[dir]}: 存在${Math.round(d.exist)}cm / 必要${Math.round(d.req)}cm`
        + `（地震${Math.round(d.reqQuake)}・風${Math.round(d.reqWind)}）${mark} ${pct(d.ratio)}`);
      const q = s.quarters[dir];
      if (q) {
        const qmark = q.ok ? '✓' : '✗偏り';
        if (!q.ok) allOk = false;
        lines.push(`　四分割: 端部 ${pct(q.r1)}/${pct(q.r2)} 壁率比${q.balance === Infinity ? '-' : q.balance.toFixed(2)} ${qmark}`);
      }
    }
  }
  if (res.diagTotal > 0) lines.push(`※斜め壁${res.diagTotal}枚は集計対象外`);
  lines.push(allOk ? '総合判定: ✓ 壁量・バランスとも基準値を満たします'
                   : '総合判定: ✗ 不足箇所があります。耐力壁の追加・配置見直しを検討してください');
  lines.push('（簡易計算による参考値。確認申請には使用できません）');
  return lines.join('\n');
}
