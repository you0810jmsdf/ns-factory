// 照度解析モジュール
// 壁データから部屋を自動検出し、作業面(床+0.75m)の昼光照度を簡易計算する
// モデル: 晴天時の直達日光＋等輝度天空光。室内反射は含まない（実際よりやや暗めに出る）
import * as THREE from 'three';
import { buildBuilding, floorLevels, wallsBBox } from './builder3d.js';
import { buildExteriorGroup } from './exterior.js';

const CELL = 0.25;        // 部屋検出グリッド(m)
const STRIDE = 2;         // 照度サンプル間隔 = CELL*STRIDE = 0.5m
const WORK_PLANE = 0.75;  // 作業面の高さ(m)
const SKY_RAYS = 32;      // 天空光サンプリング本数

// コサイン重み付き半球方向（黄金角螺旋）を事前計算
const GOLD = Math.PI * (3 - Math.sqrt(5));
const SKY_DIRS = [];
for (let i = 0; i < SKY_RAYS; i++) {
  const u = (i + 0.5) / SKY_RAYS;
  const sinT = Math.sqrt(u), cosT = Math.sqrt(1 - u), phi = i * GOLD;
  SKY_DIRS.push(new THREE.Vector3(sinT * Math.cos(phi), cosT, sinT * Math.sin(phi)));
}

/**
 * 照度解析を実行する
 * @param {object} state 共有状態（floors/roof）
 * @param {number} altitude 太陽高度(度)
 * @param {THREE.Vector3} sunDir モデル空間の太陽方向（正規化済み）
 * @returns {{rooms:Array, group:THREE.Group}|null}
 */
export function analyzeDaylight(state, altitude, sunDir) {
  // 遮蔽判定用ソリッド（ガラスなし・屋根あり・全階）
  const solid = buildBuilding(state, { forExport: true, includeFloor: true, includeRoof: true });
  solid.updateMatrixWorld(true);
  const meshes = [];
  solid.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (meshes.length === 0) return null;

  // 外構（隣家・塀・樹木等）も遮蔽物として加える
  const exterior = buildExteriorGroup(state);
  exterior.updateMatrixWorld(true);
  exterior.traverse(o => { if (o.isMesh) meshes.push(o); });

  // 晴天時の水平面照度モデル(lx)
  const sinA = Math.sin(altitude * Math.PI / 180);
  const dirH = altitude > 0 ? 90000 * sinA : 0;          // 直達（水平面）
  const skyH = altitude > 0 ? 10000 + 20000 * sinA : 0;  // 天空光（水平面）

  const raycaster = new THREE.Raycaster();
  raycaster.far = 80;
  const levels = floorLevels(state);
  const group = new THREE.Group();
  const roomsOut = [];
  const origin = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  state.floors.forEach((floor, fi) => {
    if (floor.walls.length === 0) return;
    const det = detectRooms(floor.walls);
    const planeY = levels[fi];

    det.rooms.forEach((room, ri) => {
      const values = [];
      let cxSum = 0, czSum = 0;

      for (const c of room.cells) {
        if (c.ix % STRIDE !== 0 || c.iz % STRIDE !== 0) continue;
        origin.set(c.x, planeY + WORK_PLANE, c.z);
        let E = 0;

        // 直達日光: 太陽方向への遮蔽チェック
        if (dirH > 0) {
          raycaster.set(origin, sunDir);
          if (raycaster.intersectObjects(meshes, false).length === 0) E += dirH;
        }
        // 天空光: 半球レイの到達率 × 天空照度
        if (skyH > 0) {
          let open = 0;
          for (const d of SKY_DIRS) {
            raycaster.set(origin, tmpDir.copy(d));
            if (raycaster.intersectObjects(meshes, false).length === 0) open++;
          }
          E += skyH * open / SKY_RAYS;
        }

        values.push(E);
        cxSum += c.x; czSum += c.z;

        // ヒートマップ（床面に表示）
        const quad = new THREE.Mesh(
          new THREE.PlaneGeometry(CELL * STRIDE * 0.96, CELL * STRIDE * 0.96).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({
            color: luxColor(E), transparent: true, opacity: 0.8,
            depthWrite: false, side: THREE.DoubleSide
          })
        );
        quad.position.set(c.x, planeY + 0.03, c.z);
        group.add(quad);
      }
      if (values.length === 0) return;

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const info = {
        floor: fi,
        label: `${fi + 1}F-${ri + 1}`,
        area: room.cells.length * CELL * CELL,
        avg,
        min: Math.min(...values),
        max: Math.max(...values)
      };
      roomsOut.push(info);

      // 部屋番号ラベル
      const sprite = makeLabel(info.label);
      sprite.position.set(cxSum / values.length, planeY + 1.4, czSum / values.length);
      group.add(sprite);
    });
  });

  // ジオメトリ破棄用に保持
  group.userData.disposable = true;
  return { rooms: roomsOut, group };
}

/** 壁で閉じた領域(部屋)をグリッド+塗りつぶしで検出する */
export function detectRooms(walls) {
  const b = wallsBBox(walls);
  const pad = 0.5;
  const x0 = b.minX - pad, z0 = b.minZ - pad;
  const nx = Math.ceil((b.maxX - b.minX + pad * 2) / CELL);
  const nz = Math.ceil((b.maxZ - b.minZ + pad * 2) / CELL);
  if (nx * nz > 400000) return { rooms: [] }; // 異常な広さは打ち切り

  // 壁セルをマーク（開口部があっても部屋境界として扱う）
  const blocked = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const px = x0 + (ix + 0.5) * CELL, pz = z0 + (iz + 0.5) * CELL;
      for (const w of walls) {
        if (distToSeg(px, pz, w) < w.thickness / 2 + CELL * 0.35) {
          blocked[iz * nx + ix] = 1;
          break;
        }
      }
    }
  }

  // 外周から到達できるセル＝屋外
  const region = new Int32Array(nx * nz).fill(-1); // -1未分類 0屋外 1..部屋ID
  const queue = [];
  for (let ix = 0; ix < nx; ix++) { queue.push(ix, (nz - 1) * nx + ix); }
  for (let iz = 0; iz < nz; iz++) { queue.push(iz * nx, iz * nx + nx - 1); }
  for (const s of queue) if (!blocked[s]) region[s] = 0;
  bfs(queue, 0);

  function bfs(seeds, id) {
    const q = seeds.filter(s => region[s] === id && !blocked[s]);
    while (q.length) {
      const s = q.pop();
      const ix = s % nx, iz = (s / nx) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const jx = ix + dx, jz = iz + dz;
        if (jx < 0 || jx >= nx || jz < 0 || jz >= nz) continue;
        const j = jz * nx + jx;
        if (region[j] === -1 && !blocked[j]) { region[j] = id; q.push(j); }
      }
    }
  }

  // 残りを部屋として塗り分け
  const rooms = [];
  for (let s = 0; s < nx * nz; s++) {
    if (region[s] !== -1 || blocked[s]) continue;
    const id = rooms.length + 1;
    region[s] = id;
    bfs([s], id);
    const cells = [];
    for (let t = 0; t < nx * nz; t++) {
      if (region[t] === id) {
        const ix = t % nx, iz = (t / nx) | 0;
        cells.push({ ix, iz, x: x0 + (ix + 0.5) * CELL, z: z0 + (iz + 0.5) * CELL });
      }
    }
    if (cells.length * CELL * CELL >= 1.0) rooms.push({ cells }); // 1㎡未満は除外
  }
  return { rooms };
}

function distToSeg(px, pz, w) {
  const dx = w.x2 - w.x1, dz = w.y2 - w.y1;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return Math.hypot(px - w.x1, pz - w.y1);
  let t = ((px - w.x1) * dx + (pz - w.y1) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (w.x1 + t * dx), pz - (w.y1 + t * dz));
}

/** 照度(lx)→ヒートマップ色（対数スケール 50〜20000lx） */
export function luxColor(E) {
  const t = Math.max(0, Math.min(1,
    (Math.log10(Math.max(E, 1)) - Math.log10(50)) / (Math.log10(20000) - Math.log10(50))));
  return new THREE.Color().setHSL(0.66 * (1 - t), 0.9, 0.25 + 0.4 * t);
}

/** 部屋番号のスプライトラベル */
function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(64, 64, 56, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a4f8b'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#1a4f8b';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 66);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), depthTest: false
  }));
  sprite.scale.setScalar(0.7);
  return sprite;
}

/** ヒートマップグループのリソースを破棄する */
export function disposeHeatmap(group) {
  group.traverse(o => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
    if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); }
  });
}
