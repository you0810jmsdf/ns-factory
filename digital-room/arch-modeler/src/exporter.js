// 3Dプリント用STLエクスポート
// 建物（全階の壁＋床スラブ＋屋根）を縮尺指定でバイナリSTL(mm単位)に変換して保存する
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { buildBuilding } from './builder3d.js';

/**
 * STLを生成してダウンロードする
 * @param {object} state 共有状態
 * @param {number} scaleDenom 縮尺の分母（100 → 1/100）
 * @param {number} minWallMm 印刷時の壁厚最小保証(mm)。0で実寸のまま
 * @param {boolean} includeFloor 床スラブを含めるか
 * @param {boolean} includeRoof 屋根を含めるか
 * @returns {{fileName:string, sizeMm:{x:number,y:number,z:number}}|null}
 */
export function exportSTL(state, scaleDenom, minWallMm, includeFloor, includeRoof) {
  if (!state.floors.some(f => f.walls.length > 0)) return null;

  // 縮尺後にminWallMmを下回る壁は実寸側で厚みを補正する
  // 実寸厚(m) × 1000 / 縮尺 = 印刷厚(mm)
  const minThicknessReal = minWallMm * scaleDenom / 1000;

  const group = buildBuilding(state, {
    forExport: true,
    wallThicknessMin: minThicknessReal,
    includeFloor,
    includeRoof
  });

  // 実寸(m) → 印刷寸法(mm): ×1000/縮尺
  const s = 1000 / scaleDenom;
  group.scale.setScalar(s);
  group.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const data = exporter.parse(group, { binary: true });

  const fileName = `building_1-${scaleDenom}.stl`;
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  // 印刷サイズを算出して返す
  const bbox = new THREE.Box3().setFromObject(group);
  const size = bbox.getSize(new THREE.Vector3());
  return {
    fileName,
    sizeMm: { x: size.x, y: size.y, z: size.z }
  };
}
