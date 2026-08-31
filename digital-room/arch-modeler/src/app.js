// アプリ統括モジュール
// 2Dエディタ・3Dビュー・階層管理・屋根・日照/照度シミュレーション・家具・STL出力を連携させる
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FloorplanEditor } from './floorplan.js';
import { buildBuilding, floorLevels } from './builder3d.js';
import { CATALOG, createFurniture } from './furniture.js';
import { sunPosition, sunriseSunset, dayOfYear, formatHour } from './sun.js';
import { exportSTL } from './exporter.js';
import { analyzeDaylight, disposeHeatmap } from './daylight.js';
import { checkWallQuantity, formatWallReport } from './kabe.js';
import { openWallReport } from './report.js';
import { computeStructure } from './structure.js';
import { EXT_CATALOG, createExterior, defaultParams } from './exterior.js';
import { searchHelp } from './helpdata.js';
import { snapPosition, wallToBox } from './snap.js';

// ===== 共有状態（v2: 階層対応） =====
const state = {
  floors: [{ walls: [], furniture: [] }],
  exterior: [],   // 外構: {type, x, z, rot, params}
  activeFloor: 0,
  roof: { type: 'gable', pitch: 30, overhang: 0.4 },
  showGhost: true,
  defaults: { wallHeight: 2.4, wallThickness: 0.15 }
};
// 2Dエディタは「現在編集中の階」だけを見るため、ゲッターで橋渡しする
Object.defineProperties(state, {
  walls: { get() { return state.floors[state.activeFloor].walls; } },
  furniture: { get() { return state.floors[state.activeFloor].furniture; } },
  ghostWalls: {
    get() {
      return state.showGhost && state.activeFloor > 0
        ? state.floors[state.activeFloor - 1].walls : null;
    }
  }
});

const $ = id => document.getElementById(id);
const setStatus = t => { $('statusbar').textContent = t; };

// ===== 保存・読込 =====
const STORAGE_KEY = 'kenchiku3d_autosave';
function saveLocal() {
  localStorage.setItem(STORAGE_KEY,
    JSON.stringify({ version: 2, floors: state.floors, roof: state.roof, exterior: state.exterior }));
}
/** v1形式({walls,furniture})も自動移行して読み込む */
function loadData(data) {
  if (data.floors) {
    state.floors = data.floors.map(f => ({ walls: f.walls ?? [], furniture: f.furniture ?? [] }));
  } else {
    state.floors = [{ walls: data.walls ?? [], furniture: data.furniture ?? [] }];
  }
  if (state.floors.length === 0) state.floors = [{ walls: [], furniture: [] }];
  state.roof = data.roof ?? { type: 'gable', pitch: 30, overhang: 0.4 };
  state.exterior = data.exterior ?? [];
  state.activeFloor = 0;
  rebuildFloorSelect();
  syncRoofUI();
  rebuildFurniture();
  rebuildExterior();
  buildingDirty = true;
}

// ===== サンプル間取り（2階建て 8m×6m・切妻屋根） =====
function loadSample() {
  loadData({
    version: 2,
    roof: { type: 'gable', pitch: 30, overhang: 0.4 },
    exterior: [
      { type: 'neighbor', x: 3.5, z: 11.5, rot: 0, params: { w: 7, d: 6, h: 6 } },   // 南側の隣家
      { type: 'block_wall', x: 4, z: 8.5, rot: 0, params: { len: 13, h: 1.6 } },     // 南境界の塀
      { type: 'tree_d', x: -2, z: 5, rot: 0, params: { h: 5 } },                      // 西の落葉樹
      { type: 'tree_c', x: -2, z: 1, rot: 0, params: { h: 6 } },                      // 西の針葉樹
      { type: 'parking', x: 10.5, z: 3.5, rot: 0, params: { w: 2.5, d: 5 } },
      { type: 'carport', x: 10.5, z: 3.5, rot: 0, params: { w: 2.7, d: 5, h: 2.2 } },
      { type: 'deck', x: 2.5, z: 7, rot: 0, params: { w: 3.6, d: 1.8, h: 0.4 } },
      { type: 'storage', x: 9.5, z: -0.5, rot: 0, params: { w: 1.8, d: 0.9, h: 1.9 } },
      { type: 'gate', x: 9.8, z: 6.8, rot: 0, params: { h: 1.5 } },
      { type: 'lawn', x: -2.8, z: 7.5, rot: 0, params: { w: 4, d: 4 } }
    ],
    floors: [
      { // 1F: LDK＋洋室
        walls: [
          { x1: 0, y1: 0, x2: 8, y2: 0, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 2, width: 1.2, height: 1.1, sill: 0.9 },
            { type: 'window', offset: 6.5, width: 1.2, height: 1.1, sill: 0.9 }] },
          { x1: 8, y1: 0, x2: 8, y2: 6, height: 2.4, thickness: 0.15, openings: [
            { type: 'door', offset: 1, width: 0.9, height: 2.0, sill: 0 }] },
          { x1: 8, y1: 6, x2: 0, y2: 6, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 2, width: 1.8, height: 2.0, sill: 0 },
            { type: 'window', offset: 5.5, width: 1.8, height: 2.0, sill: 0 }] },
          { x1: 0, y1: 6, x2: 0, y2: 0, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 3, width: 1.2, height: 1.1, sill: 0.9 }] },
          { x1: 5, y1: 0, x2: 5, y2: 6, height: 2.4, thickness: 0.12, openings: [
            { type: 'door', offset: 4.5, width: 0.8, height: 2.0, sill: 0 }] }
        ],
        furniture: [
          { type: 'bed', x: 6.5, z: 1.3, rot: 0 },
          { type: 'desk', x: 7.4, z: 4.0, rot: -Math.PI / 2 },
          { type: 'chair', x: 6.9, z: 4.0, rot: Math.PI / 2 },
          { type: 'shelf', x: 5.4, z: 2.5, rot: Math.PI / 2 },
          { type: 'table', x: 2.5, z: 3.0, rot: 0 },
          { type: 'chair', x: 2.5, z: 2.3, rot: Math.PI },
          { type: 'chair', x: 2.5, z: 3.7, rot: 0 },
          { type: 'sofa', x: 1.3, z: 4.8, rot: Math.PI / 2 },
          { type: 'tv', x: 3.8, z: 5.5, rot: Math.PI },
          { type: 'kitchen', x: 2.0, z: 0.5, rot: 0 },
          { type: 'fridge', x: 4.3, z: 0.6, rot: 0 },
          { type: 'plant', x: 0.5, z: 0.6, rot: 0 }
        ]
      },
      { // 2F: 寝室×2
        walls: [
          { x1: 0, y1: 0, x2: 8, y2: 0, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 2, width: 1.2, height: 1.1, sill: 0.9 },
            { type: 'window', offset: 6, width: 1.2, height: 1.1, sill: 0.9 }] },
          { x1: 8, y1: 0, x2: 8, y2: 6, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 3, width: 1.2, height: 1.1, sill: 0.9 }] },
          { x1: 8, y1: 6, x2: 0, y2: 6, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 2, width: 1.6, height: 1.1, sill: 0.9 },
            { type: 'window', offset: 6, width: 1.6, height: 1.1, sill: 0.9 }] },
          { x1: 0, y1: 6, x2: 0, y2: 0, height: 2.4, thickness: 0.15, openings: [
            { type: 'window', offset: 3, width: 1.2, height: 1.1, sill: 0.9 }] },
          { x1: 4, y1: 0, x2: 4, y2: 6, height: 2.4, thickness: 0.12, openings: [
            { type: 'door', offset: 3, width: 0.8, height: 2.0, sill: 0 }] }
        ],
        furniture: [
          { type: 'bed', x: 1.5, z: 1.5, rot: 0 },
          { type: 'shelf', x: 3.5, z: 4.5, rot: -Math.PI / 2 },
          { type: 'bed', x: 6.2, z: 1.5, rot: 0 },
          { type: 'desk', x: 7.3, z: 4.5, rot: -Math.PI / 2 },
          { type: 'plant', x: 4.5, z: 5.4, rot: 0 }
        ]
      }
    ]
  });
  editor.draw();
  onModelChange();
}

// ===== 2Dエディタ =====
let buildingDirty = true;
function onModelChange() {
  saveLocal();
  buildingDirty = true;
  clearHeatmap();
  if (!$('view3d').classList.contains('hidden')) refreshBuilding();
  syncOpeningPanel();
}
const editor = new FloorplanEditor($('canvas2d'), state, onModelChange, setStatus);

// 開口部プロパティパネル
function syncOpeningPanel() {
  const o = editor.getSelectedOpening();
  $('openingProps').classList.toggle('hidden', !o);
  if (o) {
    $('opWidth').value = o.width;
    $('opHeight').value = o.height;
    $('opSill').value = o.sill;
  }
}
for (const [id, key] of [['opWidth', 'width'], ['opHeight', 'height'], ['opSill', 'sill']]) {
  $(id).addEventListener('input', () => {
    const o = editor.getSelectedOpening();
    if (!o) return;
    const v = parseFloat($(id).value);
    if (!isNaN(v) && v >= 0) { o[key] = v; saveLocal(); buildingDirty = true; editor.draw(); }
  });
}

$('wallHeight').addEventListener('input', () => {
  state.defaults.wallHeight = parseFloat($('wallHeight').value) || 2.4;
});
$('wallThickness').addEventListener('input', () => {
  state.defaults.wallThickness = parseFloat($('wallThickness').value) || 0.15;
});

document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editor.setTool(btn.dataset.tool);
  });
});

// ===== 階層管理 =====
function rebuildFloorSelect() {
  const sel = $('floorSelect');
  sel.innerHTML = '';
  state.floors.forEach((f, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${i + 1}F`;
    sel.appendChild(o);
  });
  sel.value = state.activeFloor;
}
$('floorSelect').addEventListener('change', () => {
  state.activeFloor = parseInt($('floorSelect').value);
  editor.selected = null;
  editor.cancelDrawing();
  syncOpeningPanel();
  editor.draw();
  setStatus(`${state.activeFloor + 1}F を編集中`);
});
$('btnAddFloor').addEventListener('click', () => {
  state.floors.push({ walls: [], furniture: [] });
  state.activeFloor = state.floors.length - 1;
  rebuildFloorSelect();
  editor.draw();
  onModelChange();
  setStatus(`${state.floors.length}F を追加しました（下書き表示を参考に壁を描いてください）`);
});
$('btnDelFloor').addEventListener('click', () => {
  if (state.floors.length <= 1) { alert('最後の階は削除できません'); return; }
  if (!confirm(`${state.activeFloor + 1}F を削除しますか？`)) return;
  state.floors.splice(state.activeFloor, 1);
  state.activeFloor = Math.min(state.activeFloor, state.floors.length - 1);
  rebuildFloorSelect();
  editor.draw();
  onModelChange();
});
$('ghostFloor').addEventListener('change', () => {
  state.showGhost = $('ghostFloor').checked;
  editor.draw();
});

// ===== 3Dシーン =====
const view3d = $('view3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd9ec);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(12, 10, 14);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view3d.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(4, 1, 3);
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// 地面
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x8fae7a, roughness: 1 })
);
ground.position.y = -0.13;
ground.receiveShadow = true;
scene.add(ground);

// 光源
const hemi = new THREE.HemisphereLight(0xcfe5f5, 0x6a7a5a, 0.6);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -18; sunLight.shadow.camera.right = 18;
sunLight.shadow.camera.top = 18; sunLight.shadow.camera.bottom = -18;
sunLight.shadow.camera.far = 120;
sunLight.shadow.bias = -0.0004;
scene.add(sunLight);
scene.add(sunLight.target);

// 太陽の見た目と軌跡
const sunBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xffdd66 })
);
scene.add(sunBall);
let sunPathLine = null;

// 北方向の矢印（赤）
const northArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, -1), new THREE.Vector3(4, 0.05, -6), 2, 0xcc2222, 0.5, 0.3);
scene.add(northArrow);

// 建物・家具・外構グループ
let buildingGroup = null;
const furnitureGroup = new THREE.Group();
scene.add(furnitureGroup);
const exteriorGroup = new THREE.Group();
scene.add(exteriorGroup);

function rebuildExterior() {
  exteriorGroup.clear();
  state.exterior.forEach((it, i) => {
    const obj = createExterior(it.type, it.params);
    if (!obj) return;
    obj.position.set(it.x, 0, it.z);
    obj.rotation.y = it.rot ?? 0;
    obj.userData.kind = 'exterior';
    obj.userData.idx = i;
    exteriorGroup.add(obj);
  });
}

function refreshBuilding() {
  if (!buildingDirty) return;
  if (buildingGroup) scene.remove(buildingGroup);
  buildingGroup = buildBuilding(state, { includeFloor: true, includeRoof: true });
  scene.add(buildingGroup);
  buildingDirty = false;
  rebuildFurniture();

  // カメラ注視点と北矢印を建物中心に合わせる
  if (state.floors.some(f => f.walls.length > 0)) {
    const bbox = new THREE.Box3().setFromObject(buildingGroup);
    const c = bbox.getCenter(new THREE.Vector3());
    controls.target.set(c.x, Math.max(1, c.y), c.z);
    sunLight.target.position.set(c.x, 0, c.z);
    northArrow.position.set(c.x, 0.05, bbox.min.z - 2);
  }
  updateSun();
}

function rebuildFurniture() {
  furnitureGroup.clear();
  const levels = floorLevels(state);
  state.floors.forEach((floor, fi) => {
    floor.furniture.forEach((f, i) => {
      const obj = createFurniture(f.type);
      if (!obj) return;
      obj.position.set(f.x, levels[fi], f.z);
      obj.rotation.y = f.rot;
      obj.userData.kind = 'furniture';
      obj.userData.floor = fi;
      obj.userData.idx = i;
      furnitureGroup.add(obj);
    });
  });
}

function resize3d() {
  const r = view3d.getBoundingClientRect();
  if (r.width === 0) return;
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  renderer.setSize(r.width, r.height);
}
new ResizeObserver(resize3d).observe(view3d);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// ===== 日照シミュレーション =====
function sunSettings() {
  return {
    lat: parseFloat($('lat').value) || 35.83,
    lon: parseFloat($('lon').value) || 140.15,
    n: dayOfYear($('sunDate').value || '2026-06-21'),
    hour: parseFloat($('sunTime').value),
    north: parseFloat($('northAngle').value) || 0
  };
}

/** 方位角・高度角(度) → モデル空間の方向ベクトル（-Z=図面の北） */
function sunVector(az, alt, north) {
  const a = (az - north) * Math.PI / 180;
  const h = alt * Math.PI / 180;
  return new THREE.Vector3(
    Math.sin(a) * Math.cos(h),
    Math.sin(h),
    -Math.cos(a) * Math.cos(h)
  );
}

function updateSun() {
  const s = sunSettings();
  const { altitude, azimuth } = sunPosition(s.lat, s.lon, s.n, s.hour);
  const center = controls.target;
  const dir = sunVector(azimuth, altitude, s.north);
  const R = 30;

  sunLight.position.copy(center).addScaledVector(dir, R);
  sunBall.position.copy(center).addScaledVector(dir, R * 0.95);
  sunBall.visible = altitude > 0;

  // 高度に応じて光と空の色を変える
  if (altitude <= 0) {
    sunLight.intensity = 0;
    hemi.intensity = 0.25;
    scene.background.set(0x2a3548);
  } else {
    const k = Math.min(1, altitude / 25); // 低高度で夕焼け
    sunLight.intensity = 0.6 + 1.8 * k;
    sunLight.color.setHSL(0.09 + 0.04 * k, 0.8 - 0.5 * k, 0.7 + 0.2 * k);
    hemi.intensity = 0.35 + 0.35 * k;
    scene.background.setHSL(0.58, 0.45, 0.45 + 0.3 * k);
  }

  // 情報表示
  $('timeLabel').textContent = formatHour(s.hour);
  $('northLabel').textContent = s.north;
  const rs = sunriseSunset(s.lat, s.lon, s.n);
  $('sunInfo').textContent =
    `太陽高度: ${altitude.toFixed(1)}°　方位: ${azimuth.toFixed(1)}°\n` +
    (rs ? `日の出 ${formatHour(rs.sunrise)} ／ 日の入 ${formatHour(rs.sunset)}`
        : '日の出・日の入なし（極域）') +
    (altitude <= 0 ? '\n☾ 太陽は地平線の下です' : '');

  updateSunPath(s);
}

/** その日の太陽軌跡ラインを描く */
let lastPathKey = '';
function updateSunPath(s) {
  const key = `${s.lat},${s.lon},${s.n},${s.north},${controls.target.x},${controls.target.z}`;
  if (key === lastPathKey) return;
  lastPathKey = key;
  if (sunPathLine) { scene.remove(sunPathLine); sunPathLine.geometry.dispose(); }
  const pts = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const { altitude, azimuth } = sunPosition(s.lat, s.lon, s.n, h);
    if (altitude <= 0) continue;
    pts.push(new THREE.Vector3().copy(controls.target)
      .addScaledVector(sunVector(azimuth, altitude, s.north), 28.5));
  }
  if (pts.length < 2) return;
  sunPathLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xe8a020, transparent: true, opacity: 0.6 })
  );
  scene.add(sunPathLine);
}

for (const id of ['sunDate', 'sunTime', 'lat', 'lon', 'northAngle']) {
  $(id).addEventListener('input', updateSun);
}

// 1日再生アニメーション
let animating = false;
$('btnAnimate').addEventListener('click', () => {
  animating = !animating;
  $('btnAnimate').textContent = animating ? '■ 停止' : '▶ 1日を再生';
  if (animating) stepAnimate();
});
function stepAnimate() {
  if (!animating) return;
  let t = parseFloat($('sunTime').value) + 0.05;
  if (t > 20) t = 4;
  $('sunTime').value = t;
  updateSun();
  requestAnimationFrame(stepAnimate);
}

// ===== 屋根 =====
function syncRoofUI() {
  $('roofType').value = state.roof.type;
  $('roofPitch').value = state.roof.pitch;
  $('pitchLabel').textContent = state.roof.pitch;
  $('roofOverhang').value = state.roof.overhang;
}
function roofChanged() {
  saveLocal();
  buildingDirty = true;
  clearHeatmap();
  if (!$('view3d').classList.contains('hidden')) refreshBuilding();
}
$('roofType').addEventListener('change', () => {
  state.roof.type = $('roofType').value;
  roofChanged();
});
$('roofPitch').addEventListener('input', () => {
  state.roof.pitch = parseFloat($('roofPitch').value);
  $('pitchLabel').textContent = state.roof.pitch;
  roofChanged();
});
$('roofOverhang').addEventListener('input', () => {
  state.roof.overhang = parseFloat($('roofOverhang').value) || 0;
  roofChanged();
});

// ===== 照度解析 =====
let heatmapGroup = null;
function clearHeatmap() {
  if (!heatmapGroup) return;
  scene.remove(heatmapGroup);
  disposeHeatmap(heatmapGroup);
  heatmapGroup = null;
}
const fmtLux = E => E >= 9950 ? `${(E / 1000).toFixed(0)}k lx`
  : E >= 1000 ? `${(E / 1000).toFixed(1)}k lx` : `${Math.round(E)} lx`;

$('btnDaylight').addEventListener('click', () => {
  refreshBuilding();
  const s = sunSettings();
  const { altitude, azimuth } = sunPosition(s.lat, s.lon, s.n, s.hour);
  if (altitude <= 0) {
    $('daylightInfo').textContent = '太陽が地平線の下です。時刻を昼間に設定してください';
    return;
  }
  $('daylightInfo').textContent = '計算中…';
  setTimeout(() => {
    const res = analyzeDaylight(state, altitude, sunVector(azimuth, altitude, s.north));
    clearHeatmap();
    if (!res || res.rooms.length === 0) {
      $('daylightInfo').textContent = '閉じた部屋が見つかりません。壁で囲まれた間取りにしてください';
      return;
    }
    heatmapGroup = res.group;
    scene.add(heatmapGroup);
    $('daylightInfo').textContent =
      res.rooms.map(r =>
        `【${r.label}】平均 ${fmtLux(r.avg)}（${fmtLux(r.min)}〜${fmtLux(r.max)}）${r.area.toFixed(1)}㎡`
      ).join('\n') + `\n※ ${$('sunDate').value} ${formatHour(s.hour)}・晴天・作業面75cm`;
  }, 30);
});
$('btnHeatClear').addEventListener('click', () => {
  clearHeatmap();
  $('daylightInfo').textContent = '';
});

// ===== 家具・外構の配置（3Dビュー内） =====
const raycaster = new THREE.Raycaster();
let placing = null;           // 配置待ち {kind:'furniture'|'exterior', type}
let selectedObj = null;       // 選択中のTHREE.Group
let draggingObj = false;

// 家具ボタン一覧を生成
for (const [key, def] of Object.entries(CATALOG)) {
  const btn = document.createElement('button');
  btn.textContent = def.name;
  btn.addEventListener('click', () => {
    placing = { kind: 'furniture', type: key };
    setStatus(`「${def.name}」を ${state.activeFloor + 1}F に配置: 3Dビューの床をクリック`);
  });
  $('furnitureList').appendChild(btn);
}

// 外構ボタン一覧を生成
for (const [key, def] of Object.entries(EXT_CATALOG)) {
  const btn = document.createElement('button');
  btn.textContent = def.name;
  btn.addEventListener('click', () => {
    placing = { kind: 'exterior', type: key };
    setStatus(`「${def.name}」を配置: 3Dビューの地面をクリック`);
  });
  $('exteriorList').appendChild(btn);
}

// 外構サイズ調整パネル
function syncExtProps() {
  const isExt = selectedObj?.userData.kind === 'exterior';
  $('extProps').classList.toggle('hidden', !isExt);
  const body = $('extPropsBody');
  body.innerHTML = '';
  if (!isExt) return;
  const idx = selectedObj.userData.idx;
  const item = state.exterior[idx];
  const def = EXT_CATALOG[item.type];
  if (!item || !def) return;
  for (const p of def.params) {
    const label = document.createElement('label');
    label.textContent = p.label + ' ';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = p.min; input.max = p.max; input.step = p.step;
    input.value = item.params?.[p.key] ?? p.def;
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (isNaN(v) || v < p.min || v > p.max) return;
      item.params = { ...defaultParams(item.type), ...item.params, [p.key]: v };
      saveLocal();
      clearHeatmap();
      rebuildExterior();
      // 再生成後に選択を引き継ぐ
      selectedObj = exteriorGroup.children.find(o => o.userData.idx === idx) ?? null;
      if (selectedObj) highlight(selectedObj, true);
    });
    label.appendChild(input);
    body.appendChild(label);
  }
}

function pointerRay(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  return raycaster;
}

/** 指定高さの水平面との交点 */
function floorPoint(e, y) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
  const p = new THREE.Vector3();
  return pointerRay(e).ray.intersectPlane(plane, p) ? p : null;
}

// ===== 磁石吸着 =====
const _snapBox = new THREE.Box3();

/** パーツの外形（原点からのAABB中心オフセットと半幅） */
function footprintOf(obj) {
  _snapBox.setFromObject(obj);
  return {
    cx: (_snapBox.min.x + _snapBox.max.x) / 2 - obj.position.x,
    cz: (_snapBox.min.z + _snapBox.max.z) / 2 - obj.position.z,
    hx: (_snapBox.max.x - _snapBox.min.x) / 2,
    hz: (_snapBox.max.z - _snapBox.min.z) / 2
  };
}

/** グループ内の他パーツをAABB箱として集める */
function groupBoxes(group, exclude, filter) {
  const boxes = [];
  for (const obj of group.children) {
    if (obj === exclude) continue;
    if (filter && !filter(obj)) continue;
    _snapBox.setFromObject(obj);
    boxes.push({ minX: _snapBox.min.x, maxX: _snapBox.max.x,
                 minZ: _snapBox.min.z, maxZ: _snapBox.max.z });
  }
  return boxes;
}

/** ドラッグ中のパーツの吸着先（壁＋同種パーツ）を集める */
function collectSnapBoxes(obj) {
  const ud = obj.userData;
  const boxes = [];
  if (ud.kind === 'furniture') {
    // 同じ階の壁と家具
    for (const w of state.floors[ud.floor].walls) {
      const b = wallToBox(w);
      if (b) boxes.push(b);
    }
    boxes.push(...groupBoxes(furnitureGroup, obj, o => o.userData.floor === ud.floor));
  } else {
    // 建物外壁(1F)と他の外構
    for (const w of state.floors[0]?.walls ?? []) {
      const b = wallToBox(w);
      if (b) boxes.push(b);
    }
    boxes.push(...groupBoxes(exteriorGroup, obj));
  }
  return boxes;
}

function findObject(e) {
  const hits = pointerRay(e).intersectObjects(
    [...furnitureGroup.children, ...exteriorGroup.children], true);
  if (hits.length === 0) return null;
  let obj = hits[0].object;
  while (obj.parent && obj.parent !== furnitureGroup && obj.parent !== exteriorGroup)
    obj = obj.parent;
  return obj;
}

function highlight(group, on) {
  group?.traverse(m => {
    if (m.isMesh && m.material.emissive) {
      m.material = m.material.clone();
      m.material.emissive.set(on ? 0x445522 : 0x000000);
    }
  });
}

renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;

  if (placing) {
    if (placing.kind === 'furniture') {
      const levels = floorLevels(state);
      const p = floorPoint(e, levels[state.activeFloor]);
      if (p) {
        state.floors[state.activeFloor].furniture.push(
          { type: placing.type, x: p.x, z: p.z, rot: 0 });
        rebuildFurniture();
        saveLocal();
        setStatus(`${CATALOG[placing.type].name} を ${state.activeFloor + 1}F に配置しました`);
      }
    } else {
      const p = floorPoint(e, 0);
      if (p) {
        state.exterior.push(
          { type: placing.type, x: p.x, z: p.z, rot: 0, params: defaultParams(placing.type) });
        rebuildExterior();
        saveLocal();
        clearHeatmap();
        setStatus(`${EXT_CATALOG[placing.type].name} を配置しました（選択するとサイズ調整できます）`);
      }
    }
    placing = null;
    return;
  }

  const hit = findObject(e);
  if (selectedObj) highlight(selectedObj, false);
  selectedObj = hit;
  syncExtProps();
  if (hit) {
    highlight(hit, true);
    draggingObj = true;
    controls.enabled = false;
    const ud = hit.userData;
    const label = ud.kind === 'exterior'
      ? `${EXT_CATALOG[ud.exteriorType ?? state.exterior[ud.idx]?.type]?.name ?? '外構'}`
      : `${CATALOG[ud.furnitureType]?.name ?? '家具'}（${ud.floor + 1}F）`;
    setStatus(`${label} を選択中（ドラッグ移動=壁や他パーツに自動吸着・Shift+ドラッグ=吸着オフ / R回転 / Delete削除）`);
  }
});

renderer.domElement.addEventListener('pointermove', e => {
  if (!draggingObj || !selectedObj) return;
  const ud = selectedObj.userData;
  const y = ud.kind === 'exterior' ? 0 : floorLevels(state)[ud.floor];
  const p = floorPoint(e, y);
  if (!p) return;

  // 磁石吸着（Shift押下で無効＝自由配置）
  let np = { x: p.x, z: p.z };
  if (!e.shiftKey) {
    np = snapPosition(np, footprintOf(selectedObj), collectSnapBoxes(selectedObj));
  }

  selectedObj.position.set(np.x, y, np.z);
  const target = ud.kind === 'exterior'
    ? state.exterior[ud.idx]
    : state.floors[ud.floor].furniture[ud.idx];
  if (target) { target.x = np.x; target.z = np.z; }
});

renderer.domElement.addEventListener('pointerup', () => {
  if (draggingObj) {
    saveLocal();
    if (selectedObj?.userData.kind === 'exterior') clearHeatmap(); // 遮蔽物が動いたら照度は無効
  }
  draggingObj = false;
  controls.enabled = true;
});

window.addEventListener('keydown', e => {
  if (e.key === 'F1') { e.preventDefault(); showHelp(true); return; }

  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;

  if (e.key === 'Escape') {
    if (!$('helpModal').classList.contains('hidden')) { showHelp(false); return; }
    editor.cancelDrawing(); placing = null;
  }

  // 3Dビュー: 家具・外構操作
  if (!$('view3d').classList.contains('hidden')) {
    if ((e.key === 'r' || e.key === 'R') && selectedObj) {
      selectedObj.rotation.y += Math.PI / 4;
      const ud = selectedObj.userData;
      const target = ud.kind === 'exterior'
        ? state.exterior[ud.idx]
        : state.floors[ud.floor].furniture[ud.idx];
      if (target) { target.rot = selectedObj.rotation.y; saveLocal(); }
      if (ud.kind === 'exterior') clearHeatmap();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObj) {
      const ud = selectedObj.userData;
      if (ud.kind === 'exterior') {
        state.exterior.splice(ud.idx, 1);
        rebuildExterior();
        clearHeatmap();
      } else {
        state.floors[ud.floor].furniture.splice(ud.idx, 1);
        rebuildFurniture();
      }
      selectedObj = null;
      syncExtProps();
      saveLocal();
    }
  } else {
    // 2Dビュー: 選択削除
    if (e.key === 'Delete' || e.key === 'Backspace') editor.deleteSelected();
  }
});

// ===== タブ切替 =====
function showTab(is3d) {
  $('tab3d').classList.toggle('active', is3d);
  $('tab2d').classList.toggle('active', !is3d);
  $('panel3d').classList.toggle('hidden', !is3d);
  $('panel2d').classList.toggle('hidden', is3d);
  $('view3d').classList.toggle('hidden', !is3d);
  $('canvas2d').classList.toggle('hidden', is3d);
  if (is3d) {
    resize3d();
    refreshBuilding();
    setStatus('3Dビュー: ドラッグで回転・ホイールでズーム・右ドラッグで移動。家具はクリックで選択');
  } else {
    editor.resize();
    editor.draw();
    setStatus(`間取りモード: ${state.activeFloor + 1}F を編集中`);
  }
}
$('tab2d').addEventListener('click', () => showTab(false));
$('tab3d').addEventListener('click', () => showTab(true));

// ===== 壁量チェック =====
$('btnKabe').addEventListener('click', () => {
  const res = checkWallQuantity(state, {
    roofWeight: $('roofWeight').value,
    wallRatio: parseFloat($('wallRatio').value) || 2.0
  });
  $('kabeInfo').textContent = formatWallReport(res);
});

$('btnReport').addEventListener('click', () => {
  const res = checkWallQuantity(state, {
    roofWeight: $('roofWeight').value,
    wallRatio: parseFloat($('wallRatio').value) || 2.0
  });
  if (res.error) { $('kabeInfo').textContent = res.error; return; }
  const st = computeStructure(state, res, { soil: parseFloat($('soil').value) || 30 });
  const ok = openWallReport(state, res, st, {
    name: $('bldgName').value.trim(),
    addr: $('bldgAddr').value.trim()
  });
  $('kabeInfo').textContent = ok
    ? '計算書を別ウィンドウに作成しました。「印刷/PDF保存」ボタンでPDF化できます'
    : 'ウィンドウを開けませんでした（ポップアップブロックを確認してください）';
});

// ===== ヘルプ =====
function showHelp(on) {
  $('helpModal').classList.toggle('hidden', !on);
}
$('btnHelp').addEventListener('click', () => showHelp(true));
$('btnHelpClose').addEventListener('click', () => showHelp(false));
$('helpModal').addEventListener('click', e => {
  if (e.target === $('helpModal')) showHelp(false); // 背景クリックで閉じる
});
$('btnManual').addEventListener('click', () => {
  if (!window.open('docs/manual.html', '_blank')) {
    alert('取扱説明書を開けませんでした。docs\\manual.html を直接開いてください');
  }
});

// ヘルプ検索（完全ローカル・課金なし）
$('helpSearch').addEventListener('input', () => {
  const query = $('helpSearch').value;
  const results = $('helpResults');
  const hasQuery = query.trim().length > 0;
  results.classList.toggle('hidden', !hasQuery);
  $('helpStatic').classList.toggle('hidden', hasQuery); // 検索中は早見表を隠す
  if (!hasQuery) { results.innerHTML = ''; return; }

  const hits = searchHelp(query);
  results.innerHTML = '';
  if (hits.length === 0) {
    const div = document.createElement('div');
    div.className = 'help-noresult';
    div.textContent = '該当する項目が見つかりません。別のキーワード（例: 壁 / 屋根 / 照度 / 計算書 / STL）をお試しください';
    results.appendChild(div);
    return;
  }
  for (const hit of hits) {
    const div = document.createElement('div');
    div.className = 'help-hit';
    const h = document.createElement('h4');
    h.textContent = hit.q;
    const p = document.createElement('p');
    p.textContent = hit.a;
    const a = document.createElement('a');
    a.textContent = '📖 取扱説明書の該当章を開く';
    a.addEventListener('click', () => window.open(`docs/manual.html#${hit.section}`, '_blank'));
    div.append(h, p, a);
    results.appendChild(div);
  }
});

// ===== データボタン =====
$('btnSample').addEventListener('click', loadSample);
$('btnClear').addEventListener('click', () => {
  if (!confirm('全データを消去しますか？')) return;
  loadData({ version: 2, floors: [{ walls: [], furniture: [] }], roof: state.roof });
  editor.draw();
  onModelChange();
});
$('btnSaveJson').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ version: 2, floors: state.floors, roof: state.roof }, null, 1)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'floorplan.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
$('btnLoadJson').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    loadData(JSON.parse(await file.text()));
    editor.draw();
    onModelChange();
    setStatus(`${file.name} を読み込みました`);
  } catch {
    alert('JSONの読み込みに失敗しました');
  }
  e.target.value = '';
});

// ===== STLエクスポート =====
$('btnExportStl').addEventListener('click', () => {
  const result = exportSTL(
    state,
    parseInt($('exportScale').value),
    parseFloat($('minWallMm').value) || 0,
    $('exportFloor').checked,
    $('exportRoof').checked
  );
  $('exportInfo').textContent = result
    ? `${result.fileName} を出力しました\n印刷サイズ: ${result.sizeMm.x.toFixed(0)} × ${result.sizeMm.z.toFixed(0)} × 高さ${result.sizeMm.y.toFixed(0)} mm`
    : '壁がありません。先に間取りを作成してください';
});

// ===== 起動処理 =====
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    const data = JSON.parse(saved);
    if (data.floors?.some(f => f.walls.length > 0) || data.walls?.length > 0) {
      loadData(data);
    } else {
      loadSample();
    }
  } catch { loadSample(); }
} else {
  loadSample();
}
rebuildFloorSelect();
syncRoofUI();
editor.draw();
updateSun();
setStatus('間取りモード: 1F を編集中（サンプル: 2階建て・切妻屋根）');
