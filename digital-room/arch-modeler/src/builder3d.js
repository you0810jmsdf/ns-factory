// 間取りデータ(階層・壁・開口部・屋根)から3Dの建物メッシュを生成する
// 座標系: 2Dの(x,y) → 3Dの(x,z)。北=-Z方向、Y=高さ
import * as THREE from 'three';
import { buildRoof } from './roof.js';

export const SLAB_T = 0.12; // 床スラブ厚(m)

const WALL_MAT = new THREE.MeshStandardMaterial({ color: 0xece7de, roughness: 0.9 });
const FLOOR_MAT = new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.85 });
const GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0xa8d4e8, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide
});

/** 階の天井高（壁の最大高さ。壁がなければ2.4m） */
export function levelHeight(floor) {
  let h = 0;
  for (const w of floor.walls) h = Math.max(h, w.height);
  return h || 2.4;
}

/** 各階の床面高さ(Y)の配列を返す */
export function floorLevels(state) {
  const levels = [];
  let y = 0;
  for (const f of state.floors) {
    levels.push(y);
    y += levelHeight(f) + SLAB_T;
  }
  return levels;
}

/** 壁の外接矩形 */
export function wallsBBox(walls) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxT = 0;
  for (const w of walls) {
    minX = Math.min(minX, w.x1, w.x2); maxX = Math.max(maxX, w.x1, w.x2);
    minZ = Math.min(minZ, w.y1, w.y2); maxZ = Math.max(maxZ, w.y1, w.y2);
    maxT = Math.max(maxT, w.thickness);
  }
  return { minX, maxX, minZ, maxZ, maxT };
}

/**
 * 建物全体（全階＋屋根）のグループを生成する
 * @param {object} state 共有状態
 * @param {object} opts {forExport, wallThicknessMin(m,0=実寸), includeFloor, includeRoof}
 */
export function buildBuilding(state, opts = {}) {
  const { forExport = false, wallThicknessMin = 0,
          includeFloor = true, includeRoof = true } = opts;
  const group = new THREE.Group();
  const levels = floorLevels(state);
  let topIdx = -1;

  state.floors.forEach((floor, i) => {
    if (floor.walls.length === 0) return;
    topIdx = i;
    const fg = new THREE.Group();
    fg.position.y = levels[i];
    for (const w of floor.walls) {
      const t = Math.max(w.thickness, wallThicknessMin);
      fg.add(buildWall(w, t, forExport));
    }
    if (includeFloor) {
      fg.add(buildFloorSlab(floor.walls, forExport ? Math.max(SLAB_T, wallThicknessMin) : SLAB_T));
    }
    group.add(fg);
  });

  // 屋根（最上階の外接矩形に載せる）
  if (includeRoof && topIdx >= 0 && state.roof && state.roof.type !== 'none') {
    const top = state.floors[topIdx];
    const baseY = levels[topIdx] + levelHeight(top);
    const roof = buildRoof(state.roof, wallsBBox(top.walls), baseY);
    if (roof) group.add(roof);
  }
  return group;
}

/** 1枚の壁（開口部の上下も箱で構成）を生成 */
function buildWall(w, thickness, forExport) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const len = Math.hypot(dx, dy);
  const H = w.height;
  const g = new THREE.Group();
  g.position.set(w.x1, 0, w.y1);
  g.rotation.y = -Math.atan2(dy, dx);

  const addBox = (x0, x1, y0, y1) => {
    const bw = x1 - x0, bh = y1 - y0;
    if (bw <= 0.001 || bh <= 0.001) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, thickness), WALL_MAT);
    m.position.set(x0 + bw / 2, y0 + bh / 2, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };

  // 開口部を壁の長さ方向に並べ、区間ごとに箱を生成
  const ops = [...w.openings]
    .map(o => ({ ...o, a: Math.max(0, o.offset - o.width / 2), b: Math.min(len, o.offset + o.width / 2) }))
    .sort((p, q) => p.a - q.a);

  let cursor = 0;
  for (const o of ops) {
    if (o.a > cursor) addBox(cursor, o.a, 0, H);          // 開口部までの全高壁
    addBox(o.a, o.b, 0, o.sill);                          // 開口部の下（窓の腰壁）
    addBox(o.a, o.b, o.sill + o.height, H);               // 開口部の上（垂れ壁）
    if (!forExport && o.type === 'window') {
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(o.b - o.a, o.height), GLASS_MAT);
      glass.position.set((o.a + o.b) / 2, o.sill + o.height / 2, 0);
      g.add(glass);
    }
    cursor = Math.max(cursor, o.b);
  }
  if (cursor < len) addBox(cursor, len, 0, H);
  return g;
}

/** 壁の外接矩形から床スラブを生成（その階の床面の直下に置く） */
function buildFloorSlab(walls, thickness) {
  const b = wallsBBox(walls);
  const pad = b.maxT / 2;
  const sw = (b.maxX - b.minX) + pad * 2, sd = (b.maxZ - b.minZ) + pad * 2;
  const m = new THREE.Mesh(new THREE.BoxGeometry(sw, thickness, sd), FLOOR_MAT);
  m.position.set((b.minX + b.maxX) / 2, -thickness / 2, (b.minZ + b.maxZ) / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}
