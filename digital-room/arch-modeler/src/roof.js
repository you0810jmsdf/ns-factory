// 屋根生成モジュール（陸屋根・切妻・寄棟）
// 最上階の外接矩形＋軒の出の範囲に、指定勾配の閉じたソリッドを生成する
import * as THREE from 'three';

const ROOF_MAT = new THREE.MeshStandardMaterial({ color: 0x8a4538, roughness: 0.85 });

/**
 * 屋根メッシュを生成する
 * @param {object} roof {type:'none'|'flat'|'gable'|'hip', pitch:勾配(度), overhang:軒の出(m)}
 * @param {object} bbox {minX,maxX,minZ,maxZ} 最上階の壁の外接矩形
 * @param {number} baseY 屋根の底面高さ(壁天端)
 * @returns {THREE.Mesh|null}
 */
export function buildRoof(roof, bbox, baseY) {
  if (!roof || roof.type === 'none') return null;
  const ov = roof.overhang ?? 0.4;
  const L0 = (bbox.maxX - bbox.minX) + ov * 2;
  const W0 = (bbox.maxZ - bbox.minZ) + ov * 2;
  if (L0 <= 0.1 || W0 <= 0.1) return null;
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cz = (bbox.minZ + bbox.maxZ) / 2;

  // 棟は長辺方向に通す（L=棟方向の長さ, W=梁間方向）
  const alongX = L0 >= W0;
  const L = alongX ? L0 : W0;
  const W = alongX ? W0 : L0;

  let geo;
  if (roof.type === 'flat') {
    geo = new THREE.BoxGeometry(L, 0.15, W).translate(0, 0.075, 0);
  } else {
    geo = roofGeometry(L, W, (roof.pitch ?? 30) * Math.PI / 180, roof.type);
  }

  const mesh = new THREE.Mesh(geo, ROOF_MAT);
  mesh.position.set(cx, baseY, cz);
  if (!alongX) mesh.rotation.y = Math.PI / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** 切妻/寄棟の凸ソリッドを生成（棟=X軸方向、底面y=0、原点=底面中心） */
function roofGeometry(L, W, pitch, type) {
  const hl = L / 2, hw = W / 2;
  let rise = hw * Math.tan(pitch);
  // 棟の端点（寄棟は梁間の半分だけ内側に寄せると四方が同勾配になる）
  let ridgeHalf = type === 'hip' ? Math.max(0, hl - hw) : hl;
  if (type === 'hip' && ridgeHalf === 0) rise = hl * Math.tan(pitch); // 正方形→方形屋根

  const A = new THREE.Vector3(-hl, 0, -hw); // 北西
  const B = new THREE.Vector3(hl, 0, -hw);  // 北東
  const C = new THREE.Vector3(hl, 0, hw);   // 南東
  const D = new THREE.Vector3(-hl, 0, hw);  // 南西
  const R1 = new THREE.Vector3(-ridgeHalf, rise, 0);
  const R2 = new THREE.Vector3(ridgeHalf, rise, 0);

  const tris = [];
  const quad = (a, b, c, d) => { tris.push([a, b, c], [a, c, d]); };

  quad(A, B, R2, R1);   // 北側スロープ
  quad(C, D, R1, R2);   // 南側スロープ
  if (type === 'gable') {
    tris.push([B, C, R2]);  // 東妻面（垂直）
    tris.push([D, A, R1]);  // 西妻面（垂直）
  } else {
    tris.push([B, C, R2]);  // 東の隅棟スロープ
    tris.push([D, A, R1]);  // 西の隅棟スロープ
  }
  quad(D, C, B, A);     // 底面

  return solidFromTriangles(tris);
}

/** 三角形群から法線が外向きに揃った非インデックスジオメトリを作る（凸形状用） */
function solidFromTriangles(tris) {
  // 全頂点の重心を基準に、面法線が内向きの三角形は巻き順を反転する
  const centroid = new THREE.Vector3();
  let count = 0;
  for (const t of tris) for (const v of t) { centroid.add(v); count++; }
  centroid.divideScalar(count);

  const pos = [];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(),
        n = new THREE.Vector3(), fc = new THREE.Vector3();
  for (let [a, b, c] of tris) {
    e1.subVectors(b, a); e2.subVectors(c, a);
    n.crossVectors(e1, e2);
    fc.copy(a).add(b).add(c).divideScalar(3).sub(centroid);
    if (n.dot(fc) < 0) [b, c] = [c, b];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
