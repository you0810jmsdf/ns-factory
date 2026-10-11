// 神社巡りノート｜夜の日本列島（three.js・標高は国土地理院タイル由来の heightmap.png）
import * as THREE from './vendor/three.module.min.js';

// ---- 範囲（tools/build_heightmap.py と同じ値）----
const LON0 = 128.0, LON1 = 146.0, LAT0 = 30.0, LAT1 = 45.9;
const HMAX = 3776;            // 高さ画像の最大標高(m)
const W = 18;                 // 世界の幅（経度1度 = 1単位）
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const MY0 = merc(LAT0), MY1 = merc(LAT1);

const $ = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => innerWidth < 880;

// ---------- データ読み込み ----------
const [shrineData, deityData, hmImg] = await Promise.all([
  fetch('../shrines.json').then((r) => r.json()),
  fetch('../deities.json').then((r) => r.json()),
  new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data/heightmap.png'; }),
]).catch((e) => { fail('データの読み込みに失敗しました。' + e); throw e; });

const shrines = shrineData.shrines;
const deities = Object.fromEntries(deityData.deities.map((d) => [d.id, d]));
const srcMap = Object.fromEntries((shrineData.sources || []).map((s) => [s.id, s]));
Object.assign(srcMap, Object.fromEntries((deityData.sources || []).map((s) => [s.id, s])));

function fail(msg) {
  const d = document.createElement('div');
  d.className = 'fail';
  d.innerHTML = `<p>${msg}<br><a href="../README.md">神社巡りノートへ</a></p>`;
  document.body.appendChild(d);
}

// ---------- 高さ画像をJS側にも持つ（光点の高さ合わせ）----------
const hmW = hmImg.naturalWidth, hmH = hmImg.naturalHeight;
const hmCanvas = document.createElement('canvas');
hmCanvas.width = hmW; hmCanvas.height = hmH;
const hmCtx = hmCanvas.getContext('2d', { willReadFrequently: true });
hmCtx.drawImage(hmImg, 0, 0);
const hmPix = hmCtx.getImageData(0, 0, hmW, hmH).data;
const H = (W * hmH) / hmW;           // 世界の奥行き
const HSCALE = 0.55;                  // 高さの強調（標高3776m = 0.55単位）

// 地形の頂点シェーダーと同じ求め方（符号化値を線形補間してから2乗）
function heightLin(u, vv) {
  const fx = Math.min(hmW - 1.001, Math.max(0, u * hmW - 0.5)), fy = Math.min(hmH - 1.001, Math.max(0, vv * hmH - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const g = (x, y) => hmPix[(y * hmW + x) * 4] / 255;
  const v = (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
  return v * v * HSCALE;
}
function toWorld(lon, lat) {
  const x = ((lon - LON0) / (LON1 - LON0) - 0.5) * W;
  const vv = (MY1 - merc(lat)) / (MY1 - MY0); // 0=北
  return { x, z: (vv - 0.5) * H, u: (lon - LON0) / (LON1 - LON0), vv };
}
function heightAt(u, vv) {
  const px = Math.min(hmW - 1, Math.max(0, Math.round(u * (hmW - 1))));
  const py = Math.min(hmH - 1, Math.max(0, Math.round(vv * (hmH - 1))));
  const v = hmPix[(py * hmW + px) * 4] / 255;
  return v * v * HSCALE;
}
for (const s of shrines) {
  const p = toWorld(s.lon, s.lat);
  s._p = p;
  s._y = heightAt(p.u, p.vv);
}

// ---------- three.js ----------
const canvas = $('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isNarrow(), powerPreference: 'high-performance' });
} catch (e) { fail('お使いの端末では3D表示を始められませんでした。'); throw e; }
const DPR = Math.min(devicePixelRatio || 1, isNarrow() ? 1.75 : 2);
renderer.setPixelRatio(DPR);
renderer.setClearColor(0x080a08, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 400);

const hmTex = new THREE.Texture(hmImg);
hmTex.needsUpdate = true;
hmTex.minFilter = THREE.LinearFilter; hmTex.magFilter = THREE.LinearFilter;
hmTex.wrapS = hmTex.wrapT = THREE.ClampToEdgeWrapping;
hmTex.generateMipmaps = false;

const NOISE = `
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ return vn(p)*.55 + vn(p*2.03+7.1)*.3 + vn(p*4.1+3.7)*.15; }
`;

const terrainMat = new THREE.ShaderMaterial({
  uniforms: {
    uH: { value: hmTex },
    uScale: { value: HSCALE },
    uTexel: { value: new THREE.Vector2(1 / hmW, 1 / hmH) },
    uWorld: { value: new THREE.Vector2(W, H) },
    uDetail: { value: 0 },
    uTime: { value: 0 },
    uSel: { value: new THREE.Vector3(0, 0, 0) },
  },
  vertexShader: `
    uniform sampler2D uH; uniform float uScale;
    varying vec2 vUv; varying float vH; varying vec3 vPos; varying float vDist;
    void main(){
      vUv = uv;
      float v = texture2D(uH, uv).r;
      vH = v*v;
      vec3 p = position; p.y += vH*uScale;
      vPos = p;
      vec4 mv = modelViewMatrix*vec4(p,1.);
      vDist = -mv.z;
      gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader: `
    precision highp float;
    uniform sampler2D uH; uniform float uScale, uDetail, uTime; uniform vec2 uTexel, uWorld; uniform vec3 uSel;
    varying vec2 vUv; varying float vH; varying vec3 vPos; varying float vDist;
    ${NOISE}
    float hs(vec2 uv){ float v=texture2D(uH,uv).r; return v*v; }
    float detail(vec2 w){ return fbm(w*9.0)*0.6 + fbm(w*26.0)*0.4; }
    void main(){
      vec2 dxy = uTexel*1.4;
      float hL=hs(vUv-vec2(dxy.x,0.)), hR=hs(vUv+vec2(dxy.x,0.));
      float hS=hs(vUv-vec2(0.,dxy.y)), hN=hs(vUv+vec2(0.,dxy.y));
      float wx = uWorld.x*dxy.x*2.0, wz = uWorld.y*dxy.y*2.0;
      float gx = (hR-hL)*uScale/wx, gz = (hS-hN)*uScale/wz;   // vは北が+なので南-北
      // 近景の細かい起伏（演出用）: 陸の上だけ
      float land = smoothstep(0.0, 0.0012, vH);
      vec2 w = vPos.xz;
      float e = 0.012;
      float d0=detail(w), dX=detail(w+vec2(e,0.)), dZ=detail(w+vec2(0.,e));
      float amp = uDetail*land*(0.25+sqrt(vH)*2.2)*0.9;
      gx += (dX-d0)/e*amp*0.02; gz += (dZ-d0)/e*amp*0.02;
      vec3 n = normalize(vec3(-gx, 1.0, -gz));
      vec3 L = normalize(vec3(-0.55, 0.62, 0.45));        // 月明かり（北西の高み）
      float dif = max(dot(n,L),0.0);
      float shade = 0.18 + dif*1.05;
      // 色: 低地=暗い緑青 → 高地=冷えた灰青
      float hh = clamp(sqrt(vH)*1.15, 0.0, 1.0);
      vec3 lowC = vec3(0.045,0.085,0.07), midC=vec3(0.10,0.16,0.14), hiC=vec3(0.36,0.42,0.47);
      vec3 landC = mix(mix(lowC,midC,smoothstep(0.0,0.35,hh)), hiC, smoothstep(0.45,1.0,hh));
      landC *= (0.85 + 0.3*d0*uDetail);
      vec3 col = landC*shade*1.35;
      // 海: 深い紺＋月明かりのゆらぎ
      vec3 seaC = vec3(0.016,0.035,0.065);
      float rip = fbm(w*3.2 + vec2(uTime*0.02, -uTime*0.015));
      seaC += vec3(0.03,0.05,0.08)*smoothstep(0.55,0.9,rip)*0.7;
      // 海岸の薄い光
      float sea = 0.0;
      for (int i=0;i<4;i++){ float a=float(i)*1.5708; vec2 o=vec2(cos(a),sin(a))*uTexel*3.0; sea += step(hs(vUv+o),0.0001); }
      float coast = land*(sea>0.5?1.0:0.0);
      float seaNearLand = (1.0-land)*step(0.0001, hs(vUv+uTexel*vec2(3.,0.))+hs(vUv-uTexel*vec2(3.,0.))+hs(vUv+uTexel*vec2(0.,3.))+hs(vUv-uTexel*vec2(0.,3.)));
      vec3 foam = vec3(0.30,0.46,0.55)*(coast*0.30 + seaNearLand*0.16);
      col = mix(seaC, col, land) + foam;
      // 選んだ神社のまわりを、ごくわずかに照らす
      float dd = distance(vPos.xz, uSel.xz);
      col += vec3(0.20,0.15,0.07)*uSel.y*exp(-dd*dd*(0.9+uDetail*6.0))*0.45;
      // 距離霧
      float fog = 1.0-exp(-vDist*0.012);
      col = mix(col, vec3(0.03,0.04,0.045), fog*0.55);
      float edge = smoothstep(0.0, 0.07, min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)));
      col = mix(vec3(0.031,0.039,0.031), col, edge);
      gl_FragColor = vec4(col,1.0);
    }`,
});

const SEG_X = isNarrow() ? 256 : 384;
const SEG_Z = Math.round(SEG_X * (H / W));
const geo = new THREE.PlaneGeometry(W, H, SEG_X, SEG_Z);
geo.rotateX(-Math.PI / 2);
const terrain = new THREE.Mesh(geo, terrainMat);
terrain.frustumCulled = false;
scene.add(terrain);

// 星（ごく控えめ）
{
  const n = isNarrow() ? 260 : 520;
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(0.15 + Math.random() * 0.85);
    const r = 120;
    pos[i * 3] = Math.cos(a) * Math.sin(b) * r;
    pos[i * 3 + 1] = Math.cos(b) * r * 0.9 + 4;
    pos[i * 3 + 2] = Math.sin(a) * Math.sin(b) * r - 10;
    ph[i] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aPh; uniform float uTime; varying float vA;
      void main(){ vA = 0.25+0.2*sin(uTime*0.7+aPh); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=1.6; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor=vec4(0.85,0.88,1.0,vA); }`,
  });
  const stars = new THREE.Points(g, m);
  stars.frustumCulled = false;
  scene.add(stars);
  scene.userData.starMat = m;
}

// ---------- 神社の光 ----------
const n = shrines.length;
const mPos = new Float32Array(n * 3), mPh = new Float32Array(n), mSel = new Float32Array(n);
shrines.forEach((s, i) => {
  mPos.set([s._p.x, s._y + 0.02, s._p.z], i * 3);
  mPh[i] = i * 1.7;
});
const mGeo = new THREE.BufferGeometry();
mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
mGeo.setAttribute('aPh', new THREE.BufferAttribute(mPh, 1));
mGeo.setAttribute('aSel', new THREE.BufferAttribute(mSel, 1));
const markerMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPx: { value: DPR }, uK: { value: 1 } },
  vertexShader: `
    attribute float aPh, aSel; uniform float uTime, uPx, uK; varying float vP, vS;
    void main(){
      vP = 0.72 + 0.28*sin(uTime*1.3 + aPh); vS = aSel;
      vec4 mv = modelViewMatrix*vec4(position,1.);
      float s = (64.0 + aSel*30.0) * uK / (-mv.z) * 12.0;
      gl_PointSize = clamp(s, 24.0, 96.0) * uPx;
      gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader: `
    varying float vP, vS;
    void main(){
      vec2 c = gl_PointCoord-0.5; float r = length(c)*2.0;
      float core = exp(-r*r*34.0);
      float halo = exp(-r*3.2)*0.85;
      float a = (core*1.1 + halo)*vP*(0.85+vS*0.5);
      vec3 col = mix(vec3(1.0,0.82,0.46), vec3(1.0,0.95,0.78), core);
      gl_FragColor = vec4(col*a, a);
    }`,
});
const markers = new THREE.Points(mGeo, markerMat);
markers.frustumCulled = false;
markers.renderOrder = 10;
scene.add(markers);

// 細い光の柱（控えめ）
{
  const seg = [], al = [];
  shrines.forEach((s) => { seg.push(s._p.x, s._y, s._p.z, s._p.x, s._y + 0.45, s._p.z); al.push(0.55, 0); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(al, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOp: { value: 1 } },
    vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uOp; varying float vA; void main(){ gl_FragColor=vec4(vec3(1.0,0.84,0.5)*vA*uOp, vA*uOp); }`,
  });
  const l = new THREE.LineSegments(g, m);
  l.frustumCulled = false;
  scene.add(l);
  scene.userData.beamMat = m;
}

// ---------- 名札 ----------
const labelsEl = $('labels');
shrines.forEach((s) => {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.textContent = s.name;
  labelsEl.appendChild(el);
  s._lbl = el;
});

// ---------- 現在地と、最短経路の光の筋 ----------
// 現在地はこの端末の画面の中だけで使い、送信も保存もしない。経路は地図上の最短（大圏）で、道路や鉄道の経路ではない。
const D2R = Math.PI / 180;
const haversineKm = (la1, lo1, la2, lo2) => {
  const a = Math.sin(((la2 - la1) * D2R) / 2) ** 2 + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.sin(((lo2 - lo1) * D2R) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};
function greatCircle(la1, lo1, la2, lo2, n) {
  const v = (la, lo) => [Math.cos(la * D2R) * Math.cos(lo * D2R), Math.cos(la * D2R) * Math.sin(lo * D2R), Math.sin(la * D2R)];
  const A = v(la1, lo1), B = v(la2, lo2);
  const om = Math.acos(Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))) || 1e-9;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, a = Math.sin((1 - f) * om) / Math.sin(om), b = Math.sin(f * om) / Math.sin(om);
    const x = a * A[0] + b * B[0], y = a * A[1] + b * B[1], z = a * A[2] + b * B[2];
    out.push([Math.atan2(z, Math.hypot(x, y)) / D2R, Math.atan2(y, x) / D2R]);
  }
  return out;
}
const routeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  uniforms: { uHead: { value: 0 }, uLen: { value: 1 }, uSp: { value: 0.01 }, uPxK: { value: 600 }, uPx: { value: DPR } },
  vertexShader: `
    attribute float aT; uniform float uHead, uLen, uSp, uPxK, uPx; varying float vA, vH;
    void main(){
      vec4 mv = modelViewMatrix*vec4(position,1.);
      float pxu = uPxK/(-mv.z);
      float size = clamp(max(0.0042*pxu, uSp*pxu*2.3), 3.0, 16.0);   // 細く保ちつつ、点どうしが途切れない大きさにする
      float e = clamp(uSp*pxu/size*2.2, 0.0, 1.0);           // 点の密度によらず、筋全体の明るさを一定にする
      float dw = fract(uHead - aT)*uLen;                     // 先頭からの距離（世界の長さ）
      float tail = exp(-dw/0.07);                            // 先頭の後ろに流れる尾（約6km）
      float head = exp(-dw*dw/0.00008);                      // 先頭の光
      float lit = step(aT, uHead + 0.0001);                  // 先頭が通った所だけ、うっすら残る
      vA = e*(0.35*lit + 0.9*tail + 1.7*head);
      vH = head;
      gl_PointSize = size*uPx*(1.0 + 0.9*head);
      gl_Position = projectionMatrix*mv;
    }`,
  fragmentShader: `
    varying float vA, vH;
    void main(){ vec2 c = gl_PointCoord-0.5; float r = length(c)*2.0; float a = exp(-r*r*3.2)*vA;
      vec3 col = mix(vec3(1.0,0.88,0.62), vec3(1.0,0.99,0.92), clamp(vH*1.6,0.0,1.0));
      gl_FragColor = vec4(col*a, a); }`,
});
let route = null;
const userMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPx: { value: DPR }, uK: { value: 1 } },
  vertexShader: `uniform float uTime, uPx, uK; varying float vP;
    void main(){ vP = 0.75+0.25*sin(uTime*2.2); vec4 mv = modelViewMatrix*vec4(position,1.);
      gl_PointSize = clamp(56.0*uK/(-mv.z)*12.0, 22.0, 80.0)*uPx; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying float vP; void main(){ vec2 c = gl_PointCoord-0.5; float r = length(c)*2.0;
    float core = exp(-r*r*30.0); float ring = exp(-pow((r-0.62)*7.0,2.0))*0.45; float a = (core + ring + exp(-r*3.0)*0.3)*vP;
    gl_FragColor = vec4(vec3(0.55,0.86,1.0)*a, a); }`,
});
const userGeo = new THREE.BufferGeometry();
userGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
const userPoint = new THREE.Points(userGeo, userMat);
userPoint.frustumCulled = false; userPoint.renderOrder = 11; userPoint.visible = false;
scene.add(userPoint);
const userLbl = document.createElement('div');
userLbl.className = 'lbl you'; userLbl.textContent = '現在地'; userLbl.style.opacity = 0;
labelsEl.appendChild(userLbl);
let user = null;

const hudEl = document.getElementById('hud');
let hudKey = '';
function showHud(text) {
  if (text === hudKey) return;
  hudKey = text;
  if (!text) { hudEl.hidden = true; document.body.classList.remove('hasroute'); return; }
  hudEl.textContent = text; hudEl.hidden = false; document.body.classList.add('hasroute');
}
const fmtKm = (km) => (km < 10 ? km.toFixed(1) : String(Math.round(km)));
function hudFull(r) {
  const s = shrines.find((x) => x.id === r.shrineId);
  return `${s ? s.name : ''}まで　道路 ${fmtKm(r.km)} km　約${Math.max(1, Math.round(r.min))}分`;
}
function clearRoute() {
  showHud('');
  if (!route) return;
  scene.remove(route.points); route.points.geometry.dispose(); route = null;
}
// 道路の経路: OSRM 公開サーバー（無料・デモ用）。同意を得たときだけ、現在地と神社の座標を送る
// 直線は描かない（海の上を通るなど、実際には通れない線になるため）。取得できないときは、理由と「もう一度」を出す
let routeConsent = null;     // null=未回答 / 'road'
let routeTok = 0;
let routeErr = '';
async function fetchRoad(s) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${user.lon.toFixed(5)},${user.lat.toFixed(5)};${s.lon.toFixed(5)},${s.lat.toFixed(5)}?overview=full&geometries=geojson&alternatives=3`;
    const r = await fetch(url, { signal: ctl.signal, referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json();
    if (d.code !== 'Ok' || !d.routes || !d.routes.length) throw new Error(d.code || 'noroute');
    // 近道：候補のうち、距離がいちばん短い経路を選ぶ（最速の経路は所要時間の目安に使う）
    const shortest = d.routes.slice().sort((a, b) => a.distance - b.distance)[0];
    const fastestMin = Math.min(...d.routes.map((x) => x.duration)) / 60;
    return { ll: shortest.geometry.coordinates.map(([lo, la]) => [la, lo]), km: shortest.distance / 1000, min: shortest.duration / 60, fastestMin, alts: d.routes.length };
  } finally { clearTimeout(timer); }
}
async function buildRoute(s) {
  const tok = ++routeTok;
  clearRoute();
  run = null;
  routeErr = '';
  if (!user || routeConsent !== 'road') return null;
  let r;
  try {
    toast('道路の経路を調べています…', 15000);
    r = await fetchRoad(s);
  } catch (e) {
    if (tok !== routeTok) return null;
    routeErr = '道路の経路を取得できませんでした（通信の失敗・混雑、または道路でつながらない場所）。しばらくして、もう一度お試しください。';
    toast(routeErr, 8000);
    refreshRouteBox();
    return null;
  }
  if (tok !== routeTok) return null;
  toast('道路の経路が見つかりました。', 2200);
  const ll = r.ll, km = r.km, min = r.min;
  // 世界座標へ。道路の線は点が粗いので、一定の間隔で打ち直す
  const raw = ll.map(([la, lo]) => { const p = toWorld(lo, la); return { x: p.x, z: p.z, u: p.u, vv: p.vv }; });
  let total = 0;
  const cum = raw.map((p, i) => (i ? (total += Math.hypot(p.x - raw[i - 1].x, p.z - raw[i - 1].z)) : 0));
  const N = Math.min(6000, Math.max(300, Math.round(total / 0.0012)));   // 近づいても、点が途切れない密度
  const pts = [];
  let k = 0;
  for (let i = 0; i <= N; i++) {
    const d = (total * i) / N;
    while (k < raw.length - 2 && cum[k + 1] < d) k++;
    const span = cum[k + 1] - cum[k] || 1, f = Math.min(1, Math.max(0, (d - cum[k]) / span));
    const a = raw[k], b = raw[k + 1];
    const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f, u = a.u + (b.u - a.u) * f, vv = a.vv + (b.vv - a.vv) * f;
    pts.push({ x, z, y: heightLin(u, vv) });
  }
  // 山を越えるよう、近くの最大値でならす（道路は地面に沿わせる）
  const w = Math.max(1, Math.round(N / 200));
  const ys = pts.map((_, i) => { let m = 0; for (let j = Math.max(0, i - w); j <= Math.min(N, i + w); j++) m = Math.max(m, pts[j].y); return m; });
  const pos = new Float32Array((N + 1) * 3), aT = new Float32Array(N + 1);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  pts.forEach((p, i) => {
    pos.set([p.x, ys[i] + 0.014, p.z], i * 3);
    aT[i] = i / N;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  const points = new THREE.Points(g, routeMat);
  points.frustumCulled = false; points.renderOrder = 9;
  scene.add(points);
  routeMat.uniforms.uSp.value = total / N;
  routeMat.uniforms.uLen.value = total;
  route = { points, pos, N, total, km, min, fastestMin: r.fastestMin, alts: r.alts, shrineId: s.id, mid: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 }, len: Math.hypot(maxX - minX, maxZ - minZ) };
  refreshRouteBox();
  showHud(hudFull(route));
  countUps();
  return route;
}
const toastEl = document.createElement('div');
toastEl.className = 'toast'; toastEl.hidden = true;
document.body.appendChild(toastEl);
let toastTimer = 0;
function toast(msg, ms = 4800) {
  toastEl.textContent = msg; toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.classList.remove('on'); setTimeout(() => { toastEl.hidden = true; }, 500); }, ms);
}
function locate(after) {
  if (!navigator.geolocation) { toast('この端末では現在地を使えません。'); return; }
  toast('現在地を確認しています。許可の画面が出たら「許可」を選んでください。', 9000);
  navigator.geolocation.getCurrentPosition(
    (pos) => { if (setUser(pos.coords.latitude, pos.coords.longitude)) after && after(); },
    (err) => toast(err && err.code === 1 ? '現在地の使用が許可されませんでした。端末の設定で許可すると、光の筋を引けます。' : '現在地を取得できませんでした。電波のよい場所でもう一度お試しください。'),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
}
function setUser(lat, lon) {
  if (lon < LON0 - 0.5 || lon > LON1 + 0.5 || lat < LAT0 - 0.5 || lat > LAT1 + 0.5) { toast('現在地がこの地図の範囲外です（九州〜北海道の範囲です）。'); return false; }
  const p = toWorld(lon, lat);
  user = { lat, lon, _p: p, _y: heightAt(p.u, p.vv) };
  userGeo.attributes.position.array.set([p.x, user._y + 0.03, p.z]);
  userGeo.attributes.position.needsUpdate = true;
  userPoint.visible = true;
  return true;
}
function nearestShrine() {
  let best = null, bd = 1e9;
  for (const s of shrines) { const d = haversineKm(user.lat, user.lon, s.lat, s.lon); if (d < bd) { bd = d; best = s; } }
  return best;
}
function frameRoute(r) {
  const dist = Math.min(HOME.dist * 1.05, Math.max(2.4, r.len * 1.45 + 1.2));
  flyTo({ tx: r.mid.x, tz: r.mid.z, ty: 0, dist, el: 0.95, az: cam.az }, 4.2);
}
// 光の先頭を、カメラが後ろから追いかけて走る
let run = null;
let runZoom = 1;                       // 走行中の寄り引き（1=標準）
const runDistBase = () => (isNarrow() ? 0.34 : 0.26);
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function routePoint(r, f) {          // f: 0..N の小数。位置を線形補間
  const i = Math.min(r.N - 1, Math.max(0, Math.floor(f))), k = Math.min(1, Math.max(0, f - i));
  const a = i * 3, b = (i + 1) * 3, P = r.pos;
  return { x: P[a] + (P[b] - P[a]) * k, y: P[a + 1] + (P[b + 1] - P[a + 1]) * k, z: P[a + 2] + (P[b + 2] - P[a + 2]) * k };
}
function headingAt(r, f) {
  const a = routePoint(r, Math.max(0, f - r.N * 0.02)), b = routePoint(r, Math.min(r.N, f + r.N * 0.025));
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
}
function startRun() {
  if (!route) return;
  const r = route;
  run = null;
  document.body.classList.add('running');
  $('btnStop').hidden = false;
  const D = Math.min(40, Math.max(10, 8 + r.km * 0.18));   // 長い道ほど、ゆっくり走って読み込みが追いつくようにする
  const az0 = headingAt(r, 0), p0 = routePoint(r, 0);
  runZoom = 1;
  flyTo({ tx: p0.x, tz: p0.z, ty: p0.y, dist: runDistBase(), el: 0.6, az: az0 }, 2.4, () => {
    run = { t0: performance.now(), D, r };
  });
}
function endRun(userStopped) {
  const had = !!run || document.body.classList.contains('running');
  run = null; flight = null; clearTrail();
  if (route) showHud(hudFull(route));
  document.body.classList.remove('running');
  $('btnStop').hidden = true;
  if (!had) return;
  const s = selected || (route && shrines.find((x) => x.id === route.shrineId));
  if (!s) return;
  if (selected && selected === s) {
    sheetEl.classList.add('show'); photoEl.classList.add('show', 'compact');
    flyTo({ tx: s._p.x, tz: s._p.z, ty: s._y, dist: isNarrow() ? 1.25 : 0.95, el: isNarrow() ? 0.5 : 0.46, az: cam.az }, 3.2);
  } else { selectShrine(s.id); }
  if (!userStopped) toast(`${s.name}に着きました。`, 3000);
}
function stepRun(now) {
  if (!run) return null;
  const r = run.r;
  const p = Math.min(1, (now - run.t0) / (run.D * 1000));
  const f = Math.min(r.N, Math.max(0, p * r.N));
  const h = routePoint(r, f);
  cam.tx += (h.x - cam.tx) * 0.14; cam.tz += (h.z - cam.tz) * 0.14; cam.ty += (h.y - cam.ty) * 0.14;
  cam.az += angDiff(cam.az, headingAt(r, f)) * 0.045;
  cam.el += (0.6 - cam.el) * 0.05;
  cam.dist += (runDistBase() * runZoom - cam.dist) * 0.08;
  // 光が通った周辺（先頭→後ろ）を記録。道路はこの周辺だけ浮かび上がる
  const stepN = r.N * 0.02;
  for (let i = 0; i < TRAIL_N; i++) { const ff = f - i * stepN; if (ff < 0) { trailU[i].set(0, 0, 0, 0); continue; } const q = routePoint(r, ff); trailU[i].set(q.x, q.z, Math.pow(1 - i / TRAIL_N, 1.3), 0); }
  roadAhead = [0.08, 0.16, 0.24].map((k) => routePoint(r, Math.min(r.N, f + r.N * k)));
  showHud(`${shrines.find((x) => x.id === r.shrineId)?.name ?? ''}まで　残り ${fmtKm(Math.max(0, r.km * (1 - f / r.N)))} km　（全 ${fmtKm(r.km)} km）`);
  if (p >= 1) endRun(false);
  return f / r.N;
}
function routeText(s) {
  if (!user || !route || route.shrineId !== s.id) return '';
  const km = route.km, kmS = km < 10 ? km.toFixed(1) : Math.round(km);
  const alt = route.alts > 1 ? `（${route.alts}つの候補から、距離がいちばん短い道を選びました。` : '（';
  const fast = route.fastestMin && route.fastestMin < route.min - 1 ? `最速の道なら約 ${Math.round(route.fastestMin)} 分。` : '';
  return `現在地から${esc(s.name)}まで、近道を通る最短距離で道路（車）約 ${kmS} km・約 ${Math.max(1, Math.round(route.min))} 分${alt}${fast}渋滞は含みません）。光は実際の道路をたどります。`;
}
function refreshRouteBox() {
  const box = document.getElementById('routeBox');
  if (!box || !selected) return;
  const s = selected;
  const has = user && route && route.shrineId === s.id;
  const pending = user && !has && routeConsent === 'road' && !routeErr;
  const big = has ? `<div class="bignum"><div><b data-count="${route.km < 10 ? route.km.toFixed(1) : Math.round(route.km)}" data-dec="${route.km < 10 ? 1 : 0}">0</b><small>km</small></div><div><b data-count="${Math.max(1, Math.round(route.min))}">0</b><small>分（車）</small></div></div>` : '';
  box.innerHTML = `<h3>現在地から</h3>${big}
    <p>${has ? routeText(s) : pending ? '道路の経路を調べています…' : routeErr ? esc(routeErr) : '現在地を取ると、ここまでの道路の経路（近道の最短距離）を光の筋で描きます。'}</p>
    <p class="meta">現在地は、この端末の画面の中で使います。道路の経路を調べるときだけ、同意のうえで外部へ送ります（保存はしません）。</p>
    ${has ? `<button class="btn" type="button" data-route="run">光で走る</button><button class="btn" type="button" data-route="frame">経路の全体を見る</button><button class="btn" type="button" data-route="near">神社の近くへ寄る</button>`
          : `<button class="btn" type="button" data-route="${user ? 'road' : 'locate'}">${routeErr ? 'もう一度調べる' : user ? '道路の経路を調べる' : '現在地から光の筋をひく'}</button>`}`;
}
// 外部へ送る前の同意
function askConsent() {
  return new Promise((resolve) => {
    const m = $('consent');
    m.hidden = false;
    const done = (v) => { m.hidden = true; m.onclick = null; resolve(v); };
    m.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) done(b.dataset.c); };
  });
}
async function ensureConsent() {
  if (routeConsent === 'road') return true;
  if ((await askConsent()) === 'road') { routeConsent = 'road'; return true; }
  return false;
}
async function routeAction(kind) {
  const s = selected;
  if (kind === 'locate') {
    locate(async () => {
      if (!(await ensureConsent())) return;
      const target = s || nearestShrine();
      const r = await buildRoute(target);
      if (!r) return;
      toast(`${target.name}まで、道路で約${Math.round(r.km)} km。光が走ります。`, 3200);
      startRun();
    });
  } else if (kind === 'road' && user) {
    if (!(await ensureConsent())) return;
    const target = s || nearestShrine();
    const r = await buildRoute(target);
    if (r) startRun();
  } else if (kind === 'run' && route) { startRun(); }
  else if (kind === 'frame' && s && route) { frameRoute(route); }
  else if (kind === 'near' && s) { flyTo({ tx: s._p.x, tz: s._p.z, ty: s._y, dist: isNarrow() ? 1.25 : 0.95, el: isNarrow() ? 0.5 : 0.46, az: cam.az }, 3.2); }
}

// ---------- 近づくと、実際の道路がうっすら見える ----------
// 国土地理院「最適化ベクトルタイル」（experimental_bvmap）の道路の線を、近くのタイルだけ読み込んで地形に重ねる
const ROAD_Z = 14;
function parseMVTRoads(buf) {
  const u8 = new Uint8Array(buf);
  const rd = (s, e) => {
    let i = s;
    const varint = () => { let r = 0, m = 1, c; do { c = u8[i++]; r += (c & 127) * m; m *= 128; } while (c & 128); return r; };
    return { get i() { return i; }, set i(v) { i = v; }, varint, end: e, u8 };
  };
  const readMsg = (s, e, onField) => {
    const r = rd(s, e);
    while (r.i < e) {
      const key = r.varint(), f = key >> 3, wt = key & 7;
      if (wt === 0) onField(f, r.varint(), r.i, r.i, 0);
      else if (wt === 2) { const l = r.varint(), st = r.i; r.i += l; onField(f, null, st, r.i, 2); }
      else if (wt === 5) { r.i += 4; } else if (wt === 1) { r.i += 8; } else break;
    }
  };
  const out = [];
  readMsg(0, u8.length, (f, _v, st, en, wt) => {
    if (f !== 3 || wt !== 2) return;
    let name = '', extent = 4096; const keys = [], vals = [], feats = [];
    readMsg(st, en, (f2, v2, s2, e2, w2) => {
      if (f2 === 1) name = new TextDecoder().decode(u8.subarray(s2, e2));
      else if (f2 === 3) keys.push(new TextDecoder().decode(u8.subarray(s2, e2)));
      else if (f2 === 4) { let val = 0; readMsg(s2, e2, (f3, v3, s3, e3, w3) => { if (w3 === 0) val = v3; }); vals.push(val); }
      else if (f2 === 5) extent = v2;
      else if (f2 === 2) feats.push([s2, e2]);
    });
    if (name !== 'road') return;
    for (const [fs, fe] of feats) {
      let type = 0, tags = [], geo = [];
      const rr = rd(0, 0);
      readMsg(fs, fe, (f4, v4, s4, e4, w4) => {
        if (f4 === 3) type = v4;
        else if (f4 === 2 && w4 === 2) { const q = rd(s4, e4); while (q.i < e4) tags.push(q.varint()); }
        else if (f4 === 4 && w4 === 2) { const q = rd(s4, e4); while (q.i < e4) geo.push(q.varint()); }
      });
      if (type !== 2) continue;                          // 線のみ
      const at = {}; for (let j = 0; j + 1 < tags.length; j += 2) at[keys[tags[j]]] = vals[tags[j + 1]];
      const lines = []; let cur = null, x = 0, y = 0;
      for (let j = 0; j < geo.length;) {
        const ci = geo[j++], id = ci & 7, cnt = ci >> 3;
        if (id === 7) continue;
        for (let c = 0; c < cnt; c++) {
          const dx = geo[j++], dy = geo[j++];
          x += (dx >> 1) ^ -(dx & 1); y += (dy >> 1) ^ -(dy & 1);
          if (id === 1) { cur = [[x, y]]; lines.push(cur); } else if (cur) cur.push([x, y]);
        }
      }
      out.push({ rank: at.rnkWidth ?? 0, motorway: at.motorway, lines, extent });
    }
  });
  return out;
}
const TRAIL_N = 12;
const trailU = Array.from({ length: TRAIL_N }, () => new THREE.Vector4(0, 0, 0, 0));   // 光の通った場所（先頭→後ろ）x, z, 強さ
const roadMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  uniforms: { uOp: { value: 0 }, uRev: { value: 0 }, uR: { value: 0.046 }, uTrail: { value: trailU } },
  vertexShader: `
    attribute float aA; uniform float uOp, uRev, uR; uniform vec4 uTrail[${TRAIL_N}]; varying float vA;
    void main(){
      float rv = 0.0;
      for (int i = 0; i < ${TRAIL_N}; i++) { vec2 d = position.xz - uTrail[i].xy; rv = max(rv, exp(-dot(d,d)/(uR*uR))*uTrail[i].z); }
      vA = aA*(uOp + rv*uRev);
      vec3 p = position; p.y += rv*0.012;                    // 浮かび上がる
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,
  fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62,0.80,0.98)*vA, vA); }`,
});
const roadTiles = new Map();         // "x,y" → { mesh } か 読み込み中(null)
let roadBusy = 0, roadCheckAt = 0;
function buildRoadTile(x, y, roads) {
  const n2 = 2 ** ROAD_Z, pos = [], al = [];
  for (const rd of roads) {
    if (rd.rank < 1) continue;                                   // 幅3m未満の小道は省く（見やすさ優先）
    const a = rd.motorway !== 9 ? 0.85 : [0, 0.3, 0.42, 0.56, 0.7][Math.min(4, rd.rank)];
    for (const ln of rd.lines) {
      let prev = null;
      for (const [px, py] of ln) {
        const lon = ((x + px / rd.extent) / n2) * 360 - 180;
        const my = Math.PI * (1 - (2 * (y + py / rd.extent)) / n2);
        const u = (lon - LON0) / (LON1 - LON0), vv = (MY1 - my) / (MY1 - MY0);
        const q = [(u - 0.5) * W, heightLin(u, vv) + 0.012, (vv - 0.5) * H];
        if (prev) { pos.push(...prev, ...q); al.push(a, a); }
        prev = q;
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(al, 1));
  const m = new THREE.LineSegments(g, roadMat);
  m.frustumCulled = false; m.renderOrder = 5;
  scene.add(m);
  return m;
}
async function loadRoadTile(x, y) {
  const key = x + ',' + y;
  if (roadTiles.has(key)) return;
  roadTiles.set(key, null);
  roadBusy++;
  try {
    const r = await fetch(`https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/${ROAD_Z}/${x}/${y}.pbf`);
    if (!r.ok) throw new Error('http ' + r.status);
    const mesh = buildRoadTile(x, y, parseMVTRoads(await r.arrayBuffer()));
    roadTiles.set(key, { mesh });
  } catch (_) { roadTiles.set(key, { mesh: null, failedAt: performance.now() }); }
  finally { roadBusy--; }
}
let roadAhead = null;           // 走行中の「少し先」の位置（先読み用）
function tileOfWorld(x, z) {
  const lon = LON0 + (x / W + 0.5) * (LON1 - LON0), vv = z / H + 0.5, my = MY1 - vv * (MY1 - MY0);
  const n2 = 2 ** ROAD_Z;
  return [Math.floor(((lon + 180) / 360) * n2), Math.floor(((1 - my / Math.PI) / 2) * n2)];
}
function clearTrail() { trailU.forEach((v) => v.set(0, 0, 0, 0)); roadAhead = null; roadMat.uniforms.uRev.value = 0; }
function updateRoads(now) {
  const running = !!run;
  // 近づくほど見える（遠いときは見せない）。普段はごく薄く、光が通る周辺だけ強く浮かび上がる
  const op = Math.min(1, Math.max(0, (3.2 - cam.dist) / 1.4));
  roadMat.uniforms.uOp.value = op * (running ? 0.035 : 0.22);
  roadMat.uniforms.uRev.value = running ? 1.0 : 0;
  if (op <= 0 || now - roadCheckAt < 200 || roadBusy >= 8) return;
  roadCheckAt = now;
  const foci = [tileOfWorld(cam.tx, cam.tz)];
  if (running && roadAhead) roadAhead.forEach((q) => foci.push(tileOfWorld(q.x, q.z)));   // 先の道のタイルを先読み
  const R = running ? 1 : cam.dist < 1.2 ? 2 : 1;
  for (const [cx, cy] of foci) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (roadBusy < 8) loadRoadTile(cx + dx, cy + dy); }
  // 離れたタイルは捨てる
  if (roadTiles.size > 70) {
    const [cx, cy] = foci[0];
    for (const [key, v] of roadTiles) {
      const [kx, ky] = key.split(',').map(Number);
      if (v && Math.max(Math.abs(kx - cx), Math.abs(ky - cy)) > 5) { if (v.mesh) { scene.remove(v.mesh); v.mesh.geometry.dispose(); } roadTiles.delete(key); }
    }
  }
}

// ---------- カメラ ----------
const cam = { tx: 0, ty: 0, tz: 0, dist: 24, az: 0, el: 0.66 };
const deg = Math.PI / 180;
function homeState() {
  const aspect = innerWidth / innerHeight;
  const vf = camera.fov * deg;
  const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  // 日本列島の幅(約16単位)が画面幅に収まる距離
  const distW = (W * 0.5 * 0.92) / Math.tan(hf / 2) / Math.cos(0.4);
  const distH = (H * 0.46) / Math.tan(vf / 2);
  const c = toWorld(137.2, 37.3);
  if (aspect < 0.8) {
    // スマホ縦: 列島の長い向き（南西→北東）を画面の縦に近づけ、真上寄りから大きく見せる
    return { tx: c.x, ty: 0, tz: c.z, dist: Math.max(15, distH * 0.62), az: -0.62, el: 0.98 };
  }
  return { tx: c.x, ty: 0, tz: c.z, dist: Math.max(20, Math.min(distW, distH * 1.6)) * 1.18, az: 0, el: 0.7 };
}
let HOME = homeState();
Object.assign(cam, HOME);

function applyCamera() {
  // 何かの拍子に数値が壊れたら、全景の位置へ戻す（地図が真っ黒のまま動かなくなるのを防ぐ）
  if (![cam.tx, cam.ty, cam.tz, cam.dist, cam.az, cam.el].every(Number.isFinite)) { flight = null; run = null; Object.assign(cam, homeState()); }
  const ce = Math.cos(cam.el), se = Math.sin(cam.el);
  camera.position.set(
    cam.tx + cam.dist * ce * Math.sin(cam.az),
    cam.ty + cam.dist * se,
    cam.tz + cam.dist * ce * Math.cos(cam.az));
  camera.lookAt(cam.tx, cam.ty, cam.tz);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  if (!w || !h) return;                       // 画面の大きさが一瞬0になるときは、何もしない
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 50 : 42;
  camera.updateProjectionMatrix();
  markerMat.uniforms.uK.value = Math.max(0.8, Math.min(1.4, h / 800));
  userMat.uniforms.uK.value = markerMat.uniforms.uK.value;
  routeMat.uniforms.uPxK.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
  if (!selected && !flight) { HOME = homeState(); Object.assign(cam, HOME); }
}
addEventListener('resize', resize);

// ---------- 飛行（全景 → 神社のすぐ近くへ、徐々に）----------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
let flight = null;
function flyTo(goal, dur, onDone) {
  const from = { ...cam };
  const travel = Math.hypot(goal.tx - from.tx, goal.tz - from.tz);
  const arc = Math.min(2.4, 1 + travel * 0.07);          // 近い移動では高く上がらない
  let dAz = goal.az - from.az;
  dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
  const T = reduce ? 0.01 : dur;
  flight = { from, goal, t0: performance.now(), T: T * 1000, arc, dAz, onDone };
}
function stepFlight(now) {
  if (!flight) return;
  const f = flight;
  const t = Math.min(1, (now - f.t0) / f.T);
  const pos = ease(smooth(0, 0.82, t));                   // 位置は先に寄せる
  const zoom = ease(t);                                   // 距離はゆっくり詰める
  cam.tx = f.from.tx + (f.goal.tx - f.from.tx) * pos;
  cam.tz = f.from.tz + (f.goal.tz - f.from.tz) * pos;
  cam.ty = f.from.ty + (f.goal.ty - f.from.ty) * pos;
  const ld = Math.log(f.from.dist) + (Math.log(f.goal.dist) - Math.log(f.from.dist)) * zoom;
  cam.dist = Math.exp(ld + Math.sin(Math.PI * t) * Math.log(f.arc));
  cam.el = f.from.el + (f.goal.el - f.from.el) * ease(smooth(0.1, 1, t));
  cam.az = f.from.az + f.dAz * ease(smooth(0.05, 0.95, t));
  if (t >= 1) { const cb = f.onDone; flight = null; cb && cb(); }
}

// ---------- 入力 ----------
// PC: 左ドラッグ=3Dで回す（向き・傾き）／右ドラッグ（Shift+左ドラッグも可）=列島を動かす／ホイール=寄り引き
// スマホ: 1本指=3Dで回す／2本指=ドラッグで列島を動かす・ピンチで寄り引き・ひねりで向き
const ptrs = new Map();
let drag = null, gesture = null, tapCandidate = null, dragMode = 'pan', touched = false;
const gestureOf = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* 擬似イベントでは取れない */ }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) {
    drag = { x: e.clientX, y: e.clientY };
    tapCandidate = { x: e.clientX, y: e.clientY, t: performance.now() };
    dragMode = (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit';
    canvas.style.cursor = 'grabbing';
  }
  if (ptrs.size === 2) { gesture = gestureOf(); tapCandidate = null; }
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) { hoverCheck(e); return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (flight) return;
  if (run) {                                   // 走行中は、ピンチで寄り引きだけ
    if (ptrs.size === 2 && gesture) { const g = gestureOf(); if (g.d > 1 && gesture.d > 1) runZoom = Math.min(3, Math.max(0.35, runZoom * (gesture.d / g.d))); gesture = g; }
    return;
  }
  if (ptrs.size === 1 && drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (tapCandidate && Math.hypot(e.clientX - tapCandidate.x, e.clientY - tapCandidate.y) > 8) tapCandidate = null;
    if (!tapCandidate) {
      if (dragMode === 'orbit') { cam.az -= dx * 0.005; cam.el = Math.min(1.25, Math.max(0.28, cam.el + dy * 0.004)); touched = true; }
      else panBy(dx, dy);
    }
    drag = { x: e.clientX, y: e.clientY };
  } else if (ptrs.size === 2 && gesture) {
    const g = gestureOf();
    if (g.d > 1 && gesture.d > 1) zoomBy(gesture.d / g.d);
    let da = g.ang - gesture.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    cam.az += da;
    panBy(g.cx - gesture.cx, g.cy - gesture.cy);
    touched = true;
    gesture = g;
  }
});
const endPtr = (e) => {
  const was = ptrs.has(e.pointerId);
  ptrs.delete(e.pointerId);
  if (was && ptrs.size === 0) {
    if (tapCandidate && performance.now() - tapCandidate.t < 600) pickAt(e.clientX, e.clientY);
    drag = null; gesture = null; tapCandidate = null; canvas.style.cursor = 'grab';
  } else if (ptrs.size === 1) { drag = { ...[...ptrs.values()][0] }; gesture = null; tapCandidate = null; }
};
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012));      // ctrl付き=タッチパッドのピンチ
  if (run) runZoom = Math.min(3, Math.max(0.35, runZoom * k));
  else if (!flight) zoomBy(k);
}, { passive: false });
function zoomBy(k) {
  const lim = selected ? [0.15, Math.max(3.2, HOME.dist * 1.1)] : [0.2, HOME.dist * 1.15];
  cam.dist = Math.min(lim[1], Math.max(lim[0], cam.dist * k));
  touched = true;
}
// 地図をつかんで動かす（画面の動きに合わせて、注目点を地面の上で動かす）
function panBy(dx, dy) {
  touched = true;
  const s = (2 * cam.dist * Math.tan((camera.fov * deg) / 2)) / innerHeight;   // 画面1pxあたりの世界の長さ
  const rx = Math.cos(cam.az), rz = -Math.sin(cam.az);                           // 画面の右向き
  const fx = -Math.sin(cam.az), fz = -Math.cos(cam.az);                          // 画面の奥向き
  const k = s / Math.max(Math.sin(cam.el), 0.35);
  cam.tx = Math.min(W / 2, Math.max(-W / 2, cam.tx - dx * s * rx + dy * k * fx));
  cam.tz = Math.min(H / 2, Math.max(-H / 2, cam.tz - dx * s * rz + dy * k * fz));
}

// 画面上の位置から一番近い光を探す（指で押しやすいよう半径は大きめ）
const tmpV = new THREE.Vector3();
function screenOf(s) {
  tmpV.set(s._p.x, s._y + 0.02, s._p.z).project(camera);
  return { x: (tmpV.x * 0.5 + 0.5) * innerWidth, y: (-tmpV.y * 0.5 + 0.5) * innerHeight, z: tmpV.z };
}
function nearest(px, py, r) {
  let best = null, bd = r;
  for (const s of shrines) {
    const q = screenOf(s);
    if (q.z > 1) continue;
    const d = Math.hypot(q.x - px, q.y - py);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function pickAt(x, y) {
  const s = nearest(x, y, isNarrow() ? 38 : 28);
  if (s) selectShrine(s.id);
}
function hoverCheck(e) { canvas.style.cursor = nearest(e.clientX, e.clientY, 24) ? 'pointer' : 'grab'; }

// ---------- 画面表示（写真 → 項目リスト）----------
let selected = null, seq = 0;
const photoEl = $('photo'), sheetEl = $('sheet'), bodyEl = $('sheetBody');
const hint = $('hint');
const chipsEl = $('chips');

shrines.forEach((s) => {
  const b = document.createElement('button');
  b.className = 'chip'; b.type = 'button'; b.textContent = s.name; b.dataset.id = s.id;
  b.addEventListener('click', () => selectShrine(s.id));
  chipsEl.appendChild(b);
});

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function refs(ids) {
  if (!ids || !ids.length) return '';
  return ids.map((id) => `<a class="sup" href="#src-${esc(id)}" data-src="${esc(id)}">[${esc(srcMap[id]?.label ?? id)}]</a>`).join('');
}
const TYPE = { fact: ['fact', '事実'], tradition: ['trad', '伝承'], guess: ['guess', '推測'], todo: ['todo', '要確認'] };
function stBadge(status) { return status && status !== 'verified' ? '<span class="badge todo">要確認</span>' : ''; }
function item(f) {
  if (!f) return '<p><span class="badge todo">要確認</span></p>';
  if (typeof f === 'string') return `<p>${esc(f)}</p>`;
  const t = f.type && TYPE[f.type] ? `<span class="badge ${TYPE[f.type][0]}">${TYPE[f.type][1]}</span>` : '';
  return `<p>${t}${esc(f.text)}${refs(f.src)}${stBadge(f.status)}</p>`;
}
function sourceList(ids) {
  const used = [...new Set(ids)].filter((id) => srcMap[id]);
  if (!used.length) return '';
  return `<h3>出典</h3><ul class="src">` + used.map((id) => {
    const s = srcMap[id];
    const url = s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : '';
    return `<li id="src-${esc(id)}"><b>[${esc(s.label ?? id)}]</b> ${esc(s.title)}${s.publisher ? '（' + esc(s.publisher) + '）' : ''}${url}${s.accessed ? '（閲覧 ' + esc(s.accessed) + '）' : ''}</li>`;
  }).join('') + `</ul>`;
}

// 写真（権利確認済みのもの・AI生成画像・プレースホルダー）
function photoHTML(s) {
  const p = s.photo || { kind: 'placeholder' };
  if (p.kind === 'photo' && p.src) {
    return `<div class="ph-frame"><img src="${esc(p.src)}" alt="${esc(s.name)}" loading="lazy"></div>
      <figcaption>写真：${esc(p.credit || '')}／${esc(p.license || '')}${p.source_url ? '／<a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">出典</a>' : ''}</figcaption>`;
  }
  if (p.kind === 'ai' && p.src) {
    return `<div class="ph-frame"><img src="${esc(p.src)}" alt="${esc(s.name)}のイメージ図"><div class="ph-tag">AIによるイメージ図です。実在の社殿・ご神体の姿ではありません。</div></div>
      <figcaption>${esc(p.note || '古事記の記述に基づく想像図')}（生成ツール・日付は assets/generated/LOG.md に記録）</figcaption>`;
  }
  return `<div class="ph-frame">${toriiSVG()}<div class="ph-tag">写真は準備中です（権利を確認できた写真を、順に掲載します）</div></div>
    <figcaption>${esc(s.name)}</figcaption>`;
}
function toriiSVG() {
  return `<svg viewBox="0 0 400 300" role="img" aria-label="鳥居のシルエット（仮の絵）"><defs>
    <radialGradient id="mg" cx="70%" cy="22%" r="60%"><stop offset="0" stop-color="#e9dcae" stop-opacity=".55"/><stop offset="1" stop-color="#0e1210" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#mg)"/>
    <circle cx="280" cy="66" r="18" fill="#efe3b8" opacity=".85"/>
    <path d="M0 240 Q120 205 220 228 T400 214 V300 H0Z" fill="#0b0e0b"/>
    <g fill="#1a1f19" stroke="#2c3a2c" stroke-width="1"><path d="M110 120 Q200 100 290 120 L296 136 H104Z"/><rect x="118" y="150" width="164" height="12"/>
    <rect x="136" y="136" width="14" height="110"/><rect x="250" y="136" width="14" height="110"/></g></svg>`;
}

function setSheet(html, book = false) {
  sheetEl.classList.toggle('book', book);
  bodyEl.innerHTML = html; bodyEl.scrollTop = 0;
  if (book) initBook();
}

const CHAPTERS = ['はじまり', '御祭神', '由緒', '見どころ', '行き方'];
const rvs = (html, i = 0) => `<div class="rv" style="--i:${i}">${html}</div>`;
function shrineHTML(s) {
  const used = [];
  const take = (...fs) => fs.forEach((f) => f && f.src && used.push(...f.src));
  (s.history || []).forEach((h) => take(h));
  (s.highlights || []).forEach((h) => take(h));
  take(s.summary, s.address, s.access, s.hours, s.parking, s.goshuin);
  (s.deity_refs || []).forEach((r) => used.push(...(r.src || [])));
  const ds = s.deity_ids.map((id) => deities[id]).filter(Boolean);
  // 1 はじまり
  const nameSpans = [...s.name].map((ch, k) => `<span style="--k:${k}">${esc(ch)}</span>`).join('');
  const c1 = `<h2 class="nm" aria-label="${esc(s.name)}">${nameSpans}</h2>
    ${rvs(`<p class="rd">${esc(s.reading)}｜${esc(s.pref)} ${esc(s.city || '')}</p>`, 5)}
    ${rvs(`<div class="lead">${item(s.summary)}</div>`, 7)}
    ${rvs(`<p class="hintnext">上へなぞって、続きを読む<span class="arw" aria-hidden="true">⌃</span></p>`, 10)}`;
  // 2 御祭神
  const c2 = `<h3 class="chh">御祭神</h3>` + ds.map((d, k) => {
    const sc = (d.scenes || [])[0];
    return rvs(`<button class="dcard" type="button" data-deity="${esc(d.id)}"><b>${esc(d.name)}</b><small>${esc(d.reading)}${d.kojiki_name ? '｜古事記：' + esc(d.kojiki_name) : ''}</small>${sc ? `<em>神話の場面：${esc(sc.title)} ›</em>` : '<em>神様のページへ ›</em>'}</button>`, k + 1);
  }).join('') + (s.deity_note ? rvs(`<p class="meta">${esc(s.deity_note.text)}${refs(s.deity_note.src)}</p>`, ds.length + 2) : '');
  // 3 由緒（時間の線）
  const hist = (s.history || []);
  const c3 = `<h3 class="chh">由緒</h3><div class="tl">` + (hist.length ? hist.map((h, k) => {
    const ty = h.type && TYPE[h.type] ? h.type : 'fact';
    return rvs(`<div class="tli ${ty}">${item(h)}</div>`, k + 1);
  }).join('') : rvs(item(null), 1)) + `</div>` + rvs(`<button class="btn" type="button" data-emaki="1">絵巻で見る ›</button>`, hist.length + 2);
  // 4 見どころ
  const hl = (s.highlights || []);
  const same = (s.deity_ids || []).flatMap((id) => shrines.filter((o) => o.id !== s.id && o.deity_ids.includes(id)).map((o) => [o, id]));
  const c4 = `<h3 class="chh">見どころ</h3>` + (hl.length ? hl.map((h, k) => rvs(`<div class="spot">${item(h)}</div>`, k + 1)).join('') : rvs('<div class="spot"><p>見どころの記録は準備中です。<span class="badge todo">要確認</span></p></div>', 1))
    + (same.length ? rvs(`<h3 class="chh sub">同じ神様を祀る社へ</h3><ul class="linklist">` + same.map(([o, id]) => `<li><button type="button" data-shrine="${esc(o.id)}">${esc(o.name)}<small>${esc(deities[id]?.name || '')}を祀る</small></button></li>`).join('') + `</ul>`, hl.length + 2) : '');
  // 5 行き方
  const row = (k, f) => f ? `<dt>${k}</dt><dd>${typeof f === 'string' ? esc(f) : esc(f.text) + refs(f.src) + stBadge(f.status)}</dd>` : `<dt>${k}</dt><dd><span class="badge todo">要確認</span></dd>`;
  const c5 = `<h3 class="chh">行き方・参拝</h3>
    <div id="routeBox" class="routebox"></div>
    ${s.note_geo ? `<p class="meta">位置：${esc(s.note_geo)}</p>` : ''}
    <dl class="row">${row('所在地', s.address)}${row('アクセス', s.access)}${row('参拝時間', s.hours)}${row('駐車場', s.parking)}${row('御朱印', s.goshuin)}</dl>
    <h3 class="chh sub">食 <span class="badge pr">PR枠</span></h3>
    <div class="prbox">グルメの候補は、提携先が決まり次第ここに掲載します（広告を含む場合は「PR」と明記します）。現在リンクはありません。</div>
    <h3 class="chh sub">宿 <span class="badge pr">PR枠</span></h3>
    <div class="prbox">宿の候補は、同じく準備中です。未訪問の宿は「候補」として表記します。</div>
    <h3 class="chh sub">note 記事</h3>
    ${s.article_url ? `<a class="btn" href="${esc(s.article_url)}" target="_blank" rel="noopener">note で読む</a>` : `<span class="btn off">記事は準備中</span>`}
    ${sourceList(used)}
    <p class="meta">情報確認日：${esc(s.checked || '未確認')}／神社への敬意をもって、境内では現地の表示と作法に従ってください。</p>`;
  const cs = [c1, c2, c3, c4, c5];
  return `<div class="chapters" id="chapters">${cs.map((c, i) => `<section class="ch" data-ch="${i}" aria-label="${CHAPTERS[i]}">${c}</section>`).join('')}</div>
    <nav class="dots" aria-label="章">${CHAPTERS.map((n, i) => `<button type="button" data-goto="${i}" aria-label="${n}"><span>${n}</span></button>`).join('')}</nav>`;
}

// 章めくり: 入った章の行が順に現れる／数字が増える／背景の地図のカメラが動く
let bookObs = null, lastCh = -1;
function initBook() {
  const box = document.getElementById('chapters');
  if (!box) return;
  if (bookObs) bookObs.disconnect();
  lastCh = -1;
  const secs = [...box.querySelectorAll('.ch')];
  const fit = () => box.style.setProperty('--chh', box.clientHeight + 'px');
  fit(); addEventListener('resize', fit);
  new ResizeObserver(fit).observe(box);
  const dots = [...bodyEl.querySelectorAll('.dots button')];
  const setActive = (i) => {
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    if (i !== lastCh) { const first = lastCh < 0; lastCh = i; if (!first) chapterCam(i); }
  };
  bookObs = new IntersectionObserver((es) => {
    es.forEach((e) => { e.target.classList.toggle('in', e.isIntersecting); });
    countUps();
  }, { root: box, threshold: 0.2 });
  secs.forEach((el) => bookObs.observe(el));
  let raf = 0;
  box.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const top = box.scrollTop + box.clientHeight * 0.35;
      let idx = 0;
      secs.forEach((el, i) => { if (el.offsetTop <= top) idx = i; });
      setActive(idx);
    });
  }, { passive: true });
  dots.forEach((d) => d.addEventListener('click', () => secs[+d.dataset.goto].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })));
  setActive(0);
  requestAnimationFrame(() => secs[0].classList.add('in'));
}
// 章に合わせて、背景の地図のカメラを動かす（神社に寄ったまま、向き・高さ・寄りを変える）
function chapterCam(i) {
  const s = selected;
  if (!s || run || flight || !sheetEl.classList.contains('show')) return;
  const base = s._p.x > 0 ? -0.35 : 0.35;
  const P = [{ d: 0.95, e: 0.46, a: 0 }, { d: 0.7, e: 0.52, a: 0.35 }, { d: 0.5, e: 0.34, a: 0.7 }, { d: 0.85, e: 0.62, a: 0.25 }, { d: 1.5, e: 0.8, a: 0 }][i];
  flyTo({ tx: s._p.x, tz: s._p.z, ty: s._y, dist: (isNarrow() ? 1.3 : 1) * P.d, el: P.e, az: base + P.a }, 1.8);
}
// 大きな数字のカウントアップ
function countUps() {
  bodyEl.querySelectorAll('.ch.in [data-count]:not(.done)').forEach((el) => {
    el.classList.add('done');
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, t0 = performance.now();
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const tick = (now) => { const p = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

function deityHTML(d, fromShrine) {
  const used = [...(d.src || [])];
  const rel = d.relations || {};
  const linkTo = (ids, label) => ids && ids.length ? `<dt>${label}</dt><dd>${ids.map((id) => deities[id] ? `<a href="#" data-deity="${esc(id)}">${esc(deities[id].name)}</a>` : esc(id)).join('、')}</dd>` : '';
  const others = shrines.filter((o) => o.deity_ids.includes(d.id) && (!fromShrine || o.id !== fromShrine.id));
  (d.scenes || []).forEach((sc) => used.push(...(sc.src || [])));
  return `
    <button class="crumb" type="button" data-back="1">← ${fromShrine ? esc(fromShrine.name) + 'へ戻る' : '戻る'}</button>
    <h2>${esc(d.name)}<small>${esc(d.reading)}${d.aliases && d.aliases.length ? '｜別名：' + esc(d.aliases.join('、')) : ''}</small></h2>
    <p class="meta">※ 古事記・日本書紀の記述をもとにした整理です。解釈が分かれる点は「諸説あり」と添えています。</p>
    <dl class="row">
      <dt>古事記</dt><dd>${esc(d.kojiki_name || '記載なし／要確認')}${d.kojiki_where ? '（' + esc(d.kojiki_where) + '）' : ''}</dd>
      <dt>日本書紀</dt><dd>${esc(d.nihonshoki_name || '記載なし／要確認')}${d.nihonshoki_where ? '（' + esc(d.nihonshoki_where) + '）' : ''}</dd>
      ${linkTo(rel.parents, '親')}${linkTo(rel.spouses, '配偶')}${linkTo(rel.children, '子')}
    </dl>
    ${geneSVG(d)}
    <h3>神話の場面</h3>
    ${(d.scenes || []).map((sc) => `<div class="scene"><b>${esc(sc.title)}</b>${sc.where ? `<span class="meta">（${esc(sc.where)}）</span>` : ''}<p>${esc(sc.text)}${refs(sc.src)}${sc.disputed ? ' <span class="badge guess">諸説あり</span>' : ''}</p>${sc.quote ? `<div class="quote" lang="zh-Hant">原文：${esc(sc.quote)}</div>` : ''}</div>`).join('') || '<p><span class="badge todo">要確認</span></p>'}
    <h3>神徳（と信じられているもの）</h3>
    <p>${d.virtues && d.virtues.length ? esc(d.virtues.join('、')) : '<span class="badge todo">要確認</span>'}</p>
    ${d.note ? `<p class="meta">${esc(d.note)}</p>` : ''}
    ${others.length ? `<h3>この神様を祀る、ほかの神社</h3><ul class="linklist">${others.map((o) => `<li><button type="button" data-shrine="${esc(o.id)}">${esc(o.name)}<small>${esc(o.pref)} ${esc(o.city || '')}</small></button></li>`).join('')}</ul>` : ''}
    ${sourceList(used)}`;
}

// ---- 系譜図（親・配偶・子）----
function layout(ids, deityMap) {
  // 世代 = 親からの最長距離
  const gen = {};
  const memo = (id, seen = new Set()) => {
    if (gen[id] != null) return gen[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = (deityMap[id]?.relations?.parents || []).filter((p) => deityMap[p]);
    gen[id] = ps.length ? 1 + Math.max(...ps.map((p) => memo(p, seen))) : 0;
    return gen[id];
  };
  ids.forEach((id) => memo(id));
  // 夫婦は同じ世代にそろえる
  for (let k = 0; k < 3; k++) ids.forEach((id) => (deityMap[id]?.relations?.spouses || []).forEach((sp) => { if (gen[sp] != null) { const m = Math.max(gen[id], gen[sp]); gen[id] = gen[sp] = m; } }));
  const levels = {};
  ids.forEach((id) => (levels[gen[id]] = levels[gen[id]] || []).push(id));
  return { gen, levels };
}
function svgTree(ids, meId, opts = {}) {
  const map = deities;
  const { gen, levels } = layout(ids, map);
  const keys = Object.keys(levels).map(Number).sort((a, b) => a - b);
  const NW = opts.nw || 118, NH = 40, GX = 18, GY = 58;
  const maxN = Math.max(...keys.map((k) => levels[k].length));
  const wTot = Math.max(opts.minW || 340, maxN * (NW + GX) + GX);
  const pos = {};
  keys.forEach((k) => {
    // 夫婦を隣り合わせに並べる
    const arr = [];
    levels[k].forEach((id) => { if (arr.includes(id)) return; arr.push(id); (map[id].relations?.spouses || []).forEach((sp) => { if (levels[k].includes(sp) && !arr.includes(sp)) arr.push(sp); }); });
    const tot = arr.length * (NW + GX) - GX;
    arr.forEach((id, i) => { pos[id] = { x: (wTot - tot) / 2 + i * (NW + GX), y: 10 + keys.indexOf(k) * (NH + GY) }; });
  });
  const hTot = 20 + keys.length * (NH + GY) - GY + NH * 0;
  let edges = '', nodes = '';
  ids.forEach((id) => {
    const rel = map[id].relations || {};
    (rel.children || []).forEach((c) => {
      if (!pos[c]) return;
      const a = pos[id], b = pos[c];
      const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
      edges += `<path class="ed" d="M${x1} ${y1} C${x1} ${y1 + 26} ${x2} ${y2 - 26} ${x2} ${y2}"/>`;
    });
    (rel.spouses || []).forEach((sp) => {
      if (!pos[sp] || sp < id) return;
      const a = pos[id], b = pos[sp];
      if (a.y !== b.y) return;
      const [l, r] = a.x < b.x ? [a, b] : [b, a];
      edges += `<path class="ed sp" d="M${l.x + NW} ${l.y + NH / 2} H${r.x}"/>`;
    });
  });
  const enshrined = new Set(shrines.flatMap((s) => s.deity_ids));
  ids.forEach((id) => {
    const p = pos[id], d = map[id];
    const cls = ['nd', enshrined.has(id) ? 'en' : '', id === meId ? 'me' : ''].join(' ');
    nodes += `<g class="${cls}" data-deity="${esc(id)}" tabindex="0" role="button" aria-label="${esc(d.name)}"><rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="7"/>
      <text x="${p.x + NW / 2}" y="${p.y + 18}" text-anchor="middle" font-size="12.5">${esc(d.name.length > 9 ? d.name.slice(0, 9) + '…' : d.name)}</text>
      <text x="${p.x + NW / 2}" y="${p.y + 33}" text-anchor="middle" font-size="9" style="fill:#a9aa93">${esc(d.reading.length > 14 ? d.reading.slice(0, 14) + '…' : d.reading)}</text></g>`;
  });
  return `<svg class="gene" viewBox="0 0 ${wTot} ${hTot + NH}" role="img" aria-label="系譜図">${edges}${nodes}</svg>`;
}
// 全体の系譜図: 世代を左→右の列にし、各列は縦に並べる（横に長くならないように）
function svgTreeLR(ids) {
  const map = deities;
  const { gen, levels } = layout(ids, map);
  const keys = Object.keys(levels).map(Number).sort((a, b) => a - b);
  const NW = 112, NH = 44, GX = 44, GY = 12;
  const parentsOf = (id) => (map[id].relations?.parents || []).filter((p) => ids.includes(p));
  const childrenOf = (id) => (map[id].relations?.children || []).filter((c) => ids.includes(c));
  const spousesOf = (id) => (map[id].relations?.spouses || []).filter((s) => ids.includes(s));
  const order = {};   // id -> 列内の順番（小数）
  const cols = {};
  keys.forEach((k) => { cols[k] = levels[k].slice(); cols[k].forEach((id, i) => { order[id] = i; }); });
  const place = (k) => {   // 夫婦を隣り合わせにして、順番を振り直す
    const arr = [];
    cols[k].forEach((id) => { if (arr.includes(id)) return; arr.push(id); spousesOf(id).forEach((sp) => { if (cols[k].includes(sp) && !arr.includes(sp)) arr.push(sp); }); });
    cols[k] = arr; arr.forEach((id, i) => { order[id] = i; });
  };
  const bary = (id, f) => { const v = f(id).map((x) => order[x]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  for (let it = 0; it < 4; it++) {          // 親の位置の平均／子の位置の平均で並べ替えて、線の交差を減らす
    keys.slice(1).forEach((k) => { cols[k].sort((a, b) => (bary(a, parentsOf) ?? order[a]) - (bary(b, parentsOf) ?? order[b])); place(k); });
    keys.slice().reverse().slice(1).forEach((k) => { cols[k].sort((a, b) => (bary(a, childrenOf) ?? order[a]) - (bary(b, childrenOf) ?? order[b])); place(k); });
  }
  const maxN = Math.max(...keys.map((k) => cols[k].length));
  const pos = {};
  keys.forEach((k, ci) => { cols[k].forEach((id, i) => { pos[id] = { x: 10 + ci * (NW + GX), y: 10 + i * (NH + GY) }; }); });
  const W = 20 + keys.length * (NW + GX) - GX, Hh = 20 + maxN * (NH + GY) - GY;
  let edges = '', nodes = '';
  ids.forEach((id) => {
    childrenOf(id).forEach((c) => {
      const a = pos[id], b = pos[c];
      const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, mx = (x1 + x2) / 2;
      edges += `<path class="ed" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
    });
    spousesOf(id).forEach((sp) => {
      if (sp < id) return;
      const a = pos[id], b = pos[sp];
      if (a.x !== b.x) return;
      const [u, l] = a.y < b.y ? [a, b] : [b, a];
      edges += `<path class="ed sp" d="M${u.x + NW / 2} ${u.y + NH} V${l.y}"/>`;
    });
  });
  const enshrined = new Set(shrines.flatMap((s) => s.deity_ids));
  ids.forEach((id) => {
    const p = pos[id], d = map[id];
    const cls = ['nd', enshrined.has(id) ? 'en' : ''].join(' ');
    nodes += `<g class="${cls}" data-deity="${esc(id)}" tabindex="0" role="button" aria-label="${esc(d.name)}"><rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="7"/>
      <text x="${p.x + NW / 2}" y="${p.y + 19}" text-anchor="middle" font-size="12.5">${esc(d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name)}</text>
      <text x="${p.x + NW / 2}" y="${p.y + 34}" text-anchor="middle" font-size="8.5" style="fill:#a9aa93">${esc(d.reading.length > 13 ? d.reading.slice(0, 13) + '…' : d.reading)}</text></g>`;
  });
  return `<svg class="gene" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="神々の系譜図">${edges}${nodes}</svg>`;
}
function geneSVG(d) {
  const rel = d.relations || {};
  const set = new Set([d.id]);
  (rel.parents || []).forEach((p) => deities[p] && set.add(p));
  (rel.spouses || []).forEach((p) => deities[p] && set.add(p));
  (rel.children || []).forEach((p) => deities[p] && set.add(p));
  // 親の配偶（もう片方の親）も出す
  (rel.parents || []).forEach((p) => (deities[p]?.relations?.spouses || []).forEach((q) => deities[q] && set.add(q)));
  if (set.size < 2) return '';
  return `<h3>系譜</h3>${svgTree([...set], d.id, { nw: 112, minW: 330 })}<p class="meta">実線＝親子／点線＝夫婦。金の枠＝特集した神社の御祭神。</p>`;
}

// ---- 選択・遷移 ----
let current = null;
function setMarkerSel(id) {
  shrines.forEach((s, i) => { mSel[i] = s.id === id ? 1 : 0; s._lbl.classList.toggle('sel', s.id === id); });
  mGeo.attributes.aSel.needsUpdate = true;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.id === id));
}
function selectShrine(id) {
  const s = shrines.find((x) => x.id === id);
  if (!s) return;
  const my = ++seq;
  const wasOpen = !!selected;
  selected = s; current = { shrine: s };
  document.body.classList.add('open');
  hint.classList.add('off');
  $('btnBack').hidden = false;
  setMarkerSel(id);
  // 写真・リストをいったん下げる
  photoEl.classList.remove('show', 'compact'); sheetEl.classList.remove('show');
  if (user && routeConsent === 'road') buildRoute(s);
  const goal = { tx: s._p.x, tz: s._p.z, ty: s._y, dist: isNarrow() ? 1.25 : 0.95, el: isNarrow() ? 0.5 : 0.46, az: (s._p.x > 0 ? -0.35 : 0.35) };
  const dur = wasOpen ? 3.2 : 5.6;
  flyTo(goal, dur, () => { if (my === seq) arrive(s, my); });
  // 到着の少し前から、光の柱をやわらげる
}
function arrive(s, my) {
  photoEl.innerHTML = photoHTML(s);
  photoEl.hidden = false;
  setSheet(shrineHTML(s), true);
  refreshRouteBox();
  sheetEl.hidden = false;
  const d1 = reduce ? 0 : 250, d2 = reduce ? 0 : 2600;
  setTimeout(() => { if (my === seq) photoEl.classList.add('show'); }, d1);       // まず写真が夜空に浮かぶ
  setTimeout(() => { if (my === seq) { sheetEl.classList.add('show'); photoEl.classList.add('compact'); } }, d2); // 続いて項目リスト（写真は脇へ）
}
function showDeity(id) {
  const d = deities[id];
  if (!d) return;
  current = { ...current, deity: d };
  setSheet(deityHTML(d, current.shrine));
  openTree(false);
}
function backToShrine() {
  if (current && current.shrine) { setSheet(shrineHTML(current.shrine), true); refreshRouteBox(); }
}
function goHome() {
  seq++;
  touched = false;
  run = null; clearTrail(); document.body.classList.remove('running'); $('btnStop').hidden = true;
  clearRoute();
  selected = null; current = null;
  photoEl.classList.remove('show', 'compact'); sheetEl.classList.remove('show');
  document.body.classList.remove('open');
  $('btnBack').hidden = true;
  setMarkerSel(null);
  terrainMat.uniforms.uSel.value.y = 0;
  HOME = homeState();
  flyTo({ ...HOME }, 3.6, () => { hint.classList.remove('off'); });
}
$('btnBack').addEventListener('click', goHome);

// クリックの委譲（神様・神社・戻る・出典）
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-deity],[data-shrine],[data-back],[data-route],[data-emaki]');
  if (!t) return;
  if (t.dataset.deity) { e.preventDefault(); if (!selected) { current = { shrine: null }; sheetEl.hidden = false; sheetEl.classList.add('show'); } showDeity(t.dataset.deity); }
  else if (t.dataset.shrine) { selectShrine(t.dataset.shrine); }
  else if (t.dataset.back) { backToShrine(); }
  else if (t.dataset.route) { routeAction(t.dataset.route); }
  else if (t.dataset.emaki) { openEmaki(selected); }
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-deity]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (e.key === 'Escape') { if (!emakiEl.hidden) closeEmaki(); else if (!$('tree').hidden) openTree(false); else if (selected) goHome(); }
});


// ---------- 絵巻（年表）: 横になぞる。時代の言葉が大きく現れ、金の墨線が伸びていく ----------
const emakiEl = document.getElementById('emaki'), emakiTrack = document.getElementById('emakiTrack');
function emakiHTML(s) {
  const ds = s.deity_ids.map((id) => deities[id]).filter(Boolean);
  const head = `<article class="sp sp0"><h2 class="vt">${esc(s.name)}</h2><p class="vr">${esc(s.reading)}</p><p class="vh">横になぞって、時をたどる <span aria-hidden="true">›››</span></p></article>`;
  const mid = (s.history || []).map((h, i) => {
    const ty = h.type && TYPE[h.type] ? h.type : 'fact';
    return `<article class="sp ${ty}"><div class="when rv2" style="--i:0">${esc(h.when || '')}</div><div class="rv2 body" style="--i:2">${item(h)}</div></article>`;
  }).join('');
  const km = user && route && route.shrineId === s.id ? route : null;
  const tail = `<article class="sp spE"><div class="rv2" style="--i:0"><p class="when s">御祭神</p><p class="gods">${ds.map((d) => esc(d.name)).join('<br>')}</p></div>
    ${km ? `<div class="rv2 bignum" style="--i:3"><div><b>${km.km < 10 ? km.km.toFixed(1) : Math.round(km.km)}</b><small>km</small></div><div><b>${Math.max(1, Math.round(km.min))}</b><small>分（車）</small></div></div>` : ''}
    <button class="btn rv2" style="--i:4" type="button" data-emakiclose="1">神社へもどる</button></article>`;
  return head + mid + tail;
}
let emakiRaf = 0;
function openEmaki(s) {
  if (!s) return;
  emakiTrack.innerHTML = `<svg class="ink" aria-hidden="true"><path id="inkPath" /><circle id="inkDot" r="6" /></svg>` + emakiHTML(s);
  emakiEl.hidden = false;
  document.body.classList.add('emaki-open');
  emakiTrack.scrollLeft = 0;
  requestAnimationFrame(layoutEmaki);
  emakiTrack.onscroll = () => { if (!emakiRaf) emakiRaf = requestAnimationFrame(() => { emakiRaf = 0; updateEmaki(); }); };
}
function closeEmaki() { emakiEl.hidden = true; document.body.classList.remove('emaki-open'); emakiTrack.onscroll = null; }
function layoutEmaki() {
  const svg = emakiTrack.querySelector('.ink');
  const w = emakiTrack.scrollWidth, h = emakiTrack.clientHeight;
  svg.setAttribute('width', w); svg.setAttribute('height', h); svg.style.width = w + 'px'; svg.style.height = h + 'px';
  // 波打つ墨線（パネルごとにゆるくうねる）
  const n = emakiTrack.querySelectorAll('.sp').length, step = w / n;
  let d = `M 0 ${h * 0.5}`;
  for (let i = 0; i < n; i++) { const x0 = i * step, y = h * (0.5 + (i % 2 ? 0.07 : -0.07)); d += ` C ${x0 + step * 0.35} ${h * 0.5 + (i % 2 ? -0.1 : 0.1) * h}, ${x0 + step * 0.65} ${y}, ${x0 + step} ${h * 0.5}`; }
  const path = svg.querySelector('#inkPath');
  path.setAttribute('d', d);
  const len = path.getTotalLength();
  path.style.strokeDasharray = len; path.dataset.len = len;
  updateEmaki();
}
function updateEmaki() {
  const svg = emakiTrack.querySelector('.ink'); if (!svg) return;
  const path = svg.querySelector('#inkPath'), dot = svg.querySelector('#inkDot'), len = +path.dataset.len || 1;
  const prog = Math.min(1, (emakiTrack.scrollLeft + emakiTrack.clientWidth * 0.78) / emakiTrack.scrollWidth);
  path.style.strokeDashoffset = reduce ? 0 : len * (1 - prog);
  const pt = path.getPointAtLength(len * (reduce ? 1 : prog));
  dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
  // 画面に入ったパネルの文字を現す
  const L = emakiTrack.scrollLeft, R = L + emakiTrack.clientWidth;
  emakiTrack.querySelectorAll('.sp').forEach((el) => { const x0 = el.offsetLeft, x1 = x0 + el.offsetWidth; el.classList.toggle('in', x1 > L + 40 && x0 < R - 60); });
}
$('emakiClose').addEventListener('click', closeEmaki);
emakiEl.addEventListener('click', (e) => { if (e.target.closest('[data-emakiclose]')) closeEmaki(); });
addEventListener('resize', () => { if (!emakiEl.hidden) layoutEmaki(); });

// 神々の系譜図（全体）
function openTree(show) {
  const el = $('tree');
  if (show) {
    const ids = deityData.deities.map((d) => d.id);
    $('treeBody').innerHTML = svgTreeLR(ids);
    const sv = $('treeBody').querySelector('svg');
    sv.style.width = sv.viewBox.baseVal.width + 'px'; sv.style.minWidth = '0';   // 原寸で、縦にスクロール
  }
  el.hidden = !show;
}
$('btnTree').addEventListener('click', () => openTree(true));
$('btnGps').addEventListener('click', () => routeAction('locate'));
$('btnStop').addEventListener('click', () => endRun(true));
$('btnTreeClose').addEventListener('click', () => openTree(false));
$('tree').addEventListener('click', (e) => {
  const t = e.target.closest('[data-deity]');
  if (!t) return;
  e.preventDefault();
  if (!selected) { /* 神社未選択のときは神様ページだけ開く */
    current = { shrine: null };
    sheetEl.hidden = false; document.body.classList.add('open'); $('btnBack').hidden = false;
    requestAnimationFrame(() => sheetEl.classList.add('show'));
  }
  showDeity(t.dataset.deity);
});

// ---------- 描画ループ ----------
resize();
applyCamera();
const clock0 = performance.now();
const lblPos = new THREE.Vector3();
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) requestAnimationFrame(loop); });
let driftT = 0;
const vo = { x: 0, y: 0 };
// 重い端末では、画質を段階的に下げる（解像度 → 近景の細かな起伏）
let qual = 2, accDt = 0, nDt = 0, prevT = 0;
function setQuality(q) {
  qual = q;
  const pr = q >= 2 ? DPR : q === 1 ? Math.min(DPR, 1.25) : 1;
  renderer.setPixelRatio(pr);
  [markerMat, routeMat, userMat].forEach((m) => { m.uniforms.uPx.value = pr; });
  resize();
}
function watchFrame(now) {
  if (document.visibilityState !== 'visible' || flight === undefined) { prevT = now; return; }
  const dt = now - prevT; prevT = now;
  if (dt > 400 || dt <= 0) return;
  accDt += dt; nDt++;
  if (nDt >= 50) { if (accDt / nDt > 40 && qual > 0) setQuality(qual - 1); accDt = 0; nDt = 0; }
}
function loop(now) {
  if (!visible) return;
  requestAnimationFrame(loop);
  watchFrame(now);
  updateRoads(now);
  const t = (now - clock0) / 1000;
  stepFlight(now);
  // 待機中は、全景をゆっくり漂わせる
  if (!selected && !flight && !run && !drag && !touched) { driftT += 0.0006; cam.az = HOME.az + Math.sin(driftT * 6) * 0.07; }
  // ズームの深さに応じて、近景の細かな起伏を効かせる
  const dTarget = Math.min(1, Math.max(0, 1 - (cam.dist - 0.8) / 7));
  terrainMat.uniforms.uDetail.value = qual > 0 ? dTarget : 0;
  terrainMat.uniforms.uTime.value = t;
  markerMat.uniforms.uTime.value = t;
  userMat.uniforms.uTime.value = t;
  { const rp = stepRun(now); routeMat.uniforms.uHead.value = rp != null ? rp : (t * 0.3) % 1; }
  scene.userData.starMat.uniforms.uTime.value = t;
  if (selected) { terrainMat.uniforms.uSel.value.set(selected._p.x, 1, selected._p.z); }
  scene.userData.beamMat.uniforms.uOp.value = selected ? 0.5 : 1;
  // 選択中は、写真・リストに隠れない側へ見どころをずらす（PC=左へ／スマホ=上へ）
  const vt = (!selected || run || document.body.classList.contains('running')) ? { x: 0, y: 0 } : isNarrow() ? { x: 0, y: 0.2 } : { x: 0.19, y: 0 };
  vo.x += (vt.x - vo.x) * 0.05; vo.y += (vt.y - vo.y) * 0.05;
  if (Math.abs(vo.x) + Math.abs(vo.y) > 0.002) camera.setViewOffset(innerWidth, innerHeight, vo.x * innerWidth, vo.y * innerHeight, innerWidth, innerHeight);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  applyCamera();
  camera.updateMatrixWorld();
  // 名札（重なるものは隠す）
  const taken = [];
  for (const s of shrines) {
    lblPos.set(s._p.x, s._y + 0.02, s._p.z).project(camera);
    const x = (lblPos.x * 0.5 + 0.5) * innerWidth, y = (-lblPos.y * 0.5 + 0.5) * innerHeight;
    let show = lblPos.z < 1 && (!selected || selected === s) && x > -20 && x < innerWidth - 40;
    const w = s.name.length * 13 + 14;
    if (show) {
      const r = { x0: x + 8, x1: x + 8 + w, y0: y - 10, y1: y + 6 };
      if (selected !== s && taken.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0)) show = false;
      else taken.push(r);
    }
    s._lbl.style.opacity = show ? (selected === s ? 0.95 : 0.8) : 0;
    s._lbl.style.transform = `translate3d(${(x + 10).toFixed(1)}px, ${(y - 8).toFixed(1)}px, 0)`;
  }
  if (user) {
    lblPos.set(user._p.x, user._y + 0.03, user._p.z).project(camera);
    const ux = (lblPos.x * 0.5 + 0.5) * innerWidth, uy = (-lblPos.y * 0.5 + 0.5) * innerHeight;
    userLbl.style.opacity = lblPos.z < 1 && ux > -20 && ux < innerWidth - 40 ? 0.85 : 0;
    userLbl.style.transform = `translate3d(${(ux + 12).toFixed(1)}px, ${(uy - 8).toFixed(1)}px, 0)`;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// 試験・確認用に最小限の窓口を出す
window.__shrineMap = { cam, selectShrine, goHome, shrines, isFlying: () => !!flight, setUserForTest: (la, lo) => setUser(la, lo), routeAction, getRoute: () => route, routeMat, isRunning: () => !!run, startRun,
  // 1フレームの描画時間(ms)を、GPUの完了まで待って測る（確認用）
  benchmark: (n = 40) => { const gl = renderer.getContext(); applyCamera(); camera.updateMatrixWorld(); renderer.render(scene, camera); gl.finish(); const t0 = performance.now(); for (let i = 0; i < n; i++) { renderer.render(scene, camera); gl.finish(); } return (performance.now() - t0) / n; } };
// ?s=katori のように開くと、その神社へ直接飛ぶ
const q = new URLSearchParams(location.search).get('s');
if (q) setTimeout(() => selectShrine(q), 600);
