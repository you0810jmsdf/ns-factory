// 磁石吸着（スナップ）計算モジュール
// ドラッグ中のパーツの外形(AABB)と周囲の箱(壁・他パーツ)を比較し、
// しきい値以内なら「面がぴったり接する」「端が揃う」位置へ吸着させる
// 依存ライブラリなしの純関数（Nodeで単体テスト可能）

export const SNAP_DIST = 0.25; // 吸着距離(m)

/**
 * 吸着後の位置を計算する
 * @param {{x:number,z:number}} pos 配置候補位置（パーツ原点）
 * @param {{cx:number,cz:number,hx:number,hz:number}} foot
 *   パーツ外形: cx/cz=原点からAABB中心へのオフセット, hx/hz=半幅
 * @param {Array<{minX:number,maxX:number,minZ:number,maxZ:number}>} boxes 吸着先の箱
 * @param {number} dist 吸着距離(m)
 * @returns {{x:number,z:number,snapped:boolean}}
 */
export function snapPosition(pos, foot, boxes, dist = SNAP_DIST) {
  // 現在位置でのパーツ外形
  const ownMinX = pos.x + foot.cx - foot.hx, ownMaxX = pos.x + foot.cx + foot.hx;
  const ownMinZ = pos.z + foot.cz - foot.hz, ownMaxZ = pos.z + foot.cz + foot.hz;

  let bestDx = null, bestDz = null;

  for (const b of boxes) {
    // X方向の吸着候補（Z範囲が重なっている相手のみ＝隣り合う面）
    if (ownMinZ < b.maxZ + 1e-6 && ownMaxZ > b.minZ - 1e-6) {
      for (const d of [
        b.maxX - ownMinX,  // 相手の右面に左面を接触
        b.minX - ownMaxX,  // 相手の左面に右面を接触
        b.minX - ownMinX,  // 左端を揃える
        b.maxX - ownMaxX   // 右端を揃える
      ]) {
        if (Math.abs(d) <= dist && (bestDx === null || Math.abs(d) < Math.abs(bestDx))) {
          bestDx = d;
        }
      }
    }
    // Z方向の吸着候補（X範囲が重なっている相手のみ）
    if (ownMinX < b.maxX + 1e-6 && ownMaxX > b.minX - 1e-6) {
      for (const d of [
        b.maxZ - ownMinZ,
        b.minZ - ownMaxZ,
        b.minZ - ownMinZ,
        b.maxZ - ownMaxZ
      ]) {
        if (Math.abs(d) <= dist && (bestDz === null || Math.abs(d) < Math.abs(bestDz))) {
          bestDz = d;
        }
      }
    }
  }

  return {
    x: pos.x + (bestDx ?? 0),
    z: pos.z + (bestDz ?? 0),
    snapped: bestDx !== null || bestDz !== null
  };
}

/**
 * 軸に平行な壁をAABB箱に変換する（斜め壁はnull）
 * @param {{x1:number,y1:number,x2:number,y2:number,thickness:number}} w 壁
 */
export function wallToBox(w) {
  const t = w.thickness / 2;
  if (Math.abs(w.y2 - w.y1) < 0.01) {        // X方向の壁
    return {
      minX: Math.min(w.x1, w.x2), maxX: Math.max(w.x1, w.x2),
      minZ: w.y1 - t, maxZ: w.y1 + t
    };
  }
  if (Math.abs(w.x2 - w.x1) < 0.01) {        // Z方向の壁
    return {
      minX: w.x1 - t, maxX: w.x1 + t,
      minZ: Math.min(w.y1, w.y2), maxZ: Math.max(w.y1, w.y2)
    };
  }
  return null; // 斜め壁は吸着対象外
}
