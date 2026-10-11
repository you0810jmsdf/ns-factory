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
      float size = clamp(max(0.0042*pxu, uSp*pxu*1.3), 3.0, 14.0);   // 細く保ちつつ、点どうしが途切れない大きさにする
      float e = clamp(uSp*pxu/size*2.2, 0.0, 1.0);           // 点の密度によらず、筋全体の明るさを一定にする
      float dw = fract(uHead - aT)*uLen;                     // 先頭からの距離（世界の長さ）
      float tail = exp(-dw/0.07);                            // 先頭の後ろに流れる尾（約6km）
      float head = exp(-dw*dw/0.00012);                      // 先頭の光
      float lit = step(aT, uHead + 0.0001);                  // 先頭が通った所だけ、うっすら残る
      vA = e*(0.35*lit + 0.9*tail + 3.2*head);
      vH = head;
      gl_PointSize = size*uPx*(1.0 + 1.6*head);
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

function clearRoute() {
  if (!route) return;
  scene.remove(route.points); route.points.geometry.dispose(); route = null;
}
// 道路の経路: OSRM 公開サーバー（無料・デモ用）。同意を得たときだけ、現在地と神社の座標を送る
let routeConsent = null;     // null=未回答 / 'road' / 'line'
let routeTok = 0;
async function fetchRoad(s) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${user.lon.toFixed(5)},${user.lat.toFixed(5)};${s.lon.toFixed(5)},${s.lat.toFixed(5)}?overview=full&geometries=geojson`;
    const r = await fetch(url, { signal: ctl.signal, referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json();
    if (d.code !== 'Ok' || !d.routes || !d.routes[0]) throw new Error(d.code || 'noroute');
    const rt = d.routes[0];
    return { ll: rt.geometry.coordinates.map(([lo, la]) => [la, lo]), km: rt.distance / 1000, min: rt.duration / 60 };
  } finally { clearTimeout(timer); }
}
async function buildRoute(s) {
  const tok = ++routeTok;
  clearRoute();
  run = null;
  if (!user) return null;
  let mode = 'line', ll = null, km = haversineKm(user.lat, user.lon, s.lat, s.lon), min = 0, why = '';
  if (routeConsent === 'road') {
    try {
      toast('道路の経路を調べています…', 12000);
      const r = await fetchRoad(s);
      if (tok !== routeTok) return null;
      ll = r.ll; km = r.km; min = r.min; mode = 'road';
      toast('道路の経路が見つかりました。', 2200);
    } catch (e) {
      if (tok !== routeTok) return null;
      why = '道路の経路を取得できなかったため（混雑・通信の失敗、または道路でつながらない場所）、直線で表示しています。';
      toast(why, 7000);
    }
  } else if (routeConsent === 'line') why = '直線を選んだため、地図上の最短（大圏）で表示しています。';
  if (!ll) ll = greatCircle(user.lat, user.lon, s.lat, s.lon, Math.min(2400, Math.max(500, Math.round(km * 3.2))));
  // 世界座標へ。道路の線は点が粗いので、一定の間隔で打ち直す
  const raw = ll.map(([la, lo]) => { const p = toWorld(lo, la); return { x: p.x, z: p.z, u: p.u, vv: p.vv }; });
  let total = 0;
  const cum = raw.map((p, i) => (i ? (total += Math.hypot(p.x - raw[i - 1].x, p.z - raw[i - 1].z)) : 0));
  const N = Math.min(2600, Math.max(300, Math.round(total / 0.004)));
  const pts = [];
  let k = 0;
  for (let i = 0; i <= N; i++) {
    const d = (total * i) / N;
    while (k < raw.length - 2 && cum[k + 1] < d) k++;
    const span = cum[k + 1] - cum[k] || 1, f = Math.min(1, Math.max(0, (d - cum[k]) / span));
    const a = raw[k], b = raw[k + 1];
    const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f, u = a.u + (b.u - a.u) * f, vv = a.vv + (b.vv - a.vv) * f;
    pts.push({ x, z, y: heightAt(u, vv) });
  }
  // 山を越えるよう、近くの最大値でならす。直線は、ゆるいアーチを足して見やすくする
  const w = Math.max(2, Math.round(N / 90));
  const ys = pts.map((_, i) => { let m = 0; for (let j = Math.max(0, i - w); j <= Math.min(N, i + w); j++) m = Math.max(m, pts[j].y); return m; });
  const sm = ys.map((_, i) => { let a = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(N, i + w); j++) { a += ys[j]; c++; } return a / c; });
  const arc = mode === 'line' ? Math.min(0.4, km * 0.0004) : 0;
  const lift = mode === 'road' ? 0.03 : 0.04;
  const pos = new Float32Array((N + 1) * 3), aT = new Float32Array(N + 1);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  pts.forEach((p, i) => {
    pos.set([p.x, sm[i] + lift + arc * Math.sin((Math.PI * i) / N), p.z], i * 3);
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
  route = { points, pos, N, total, km, min, mode, why, shrineId: s.id, mid: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 }, len: Math.hypot(maxX - minX, maxZ - minZ) };
  refreshRouteBox();
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
  const D = Math.min(30, Math.max(9, 6 + r.km * 0.12));
  const az0 = headingAt(r, 0), p0 = routePoint(r, 0);
  flyTo({ tx: p0.x, tz: p0.z, ty: p0.y, dist: isNarrow() ? 0.8 : 0.62, el: 0.55, az: az0 }, 2.4, () => {
    run = { t0: performance.now(), D, r };
  });
}
function endRun(userStopped) {
  const had = !!run || document.body.classList.contains('running');
  run = null; flight = null;
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
  cam.el += (0.55 - cam.el) * 0.05;
  cam.dist += ((isNarrow() ? 0.8 : 0.62) - cam.dist) * 0.05;
  if (p >= 1) endRun(false);
  return f / r.N;
}
function routeText(s) {
  if (!user || !route || route.shrineId !== s.id) return '';
  const km = route.km, kmS = km < 10 ? km.toFixed(1) : Math.round(km);
  if (route.mode === 'road') return `現在地から${esc(s.name)}まで、道路（車）で約 ${kmS} km・約 ${Math.max(1, Math.round(route.min))} 分（渋滞は含みません）。光は実際の道路をたどります。`;
  return `現在地から${esc(s.name)}まで、直線の最短経路で約 ${kmS} km。${esc(route.why || '')}道路や鉄道の経路ではありません。`;
}
function refreshRouteBox() {
  const box = document.getElementById('routeBox');
  if (!box || !selected) return;
  const s = selected;
  const has = user && route && route.shrineId === s.id;
  const pending = user && !has && routeConsent === 'road';
  box.innerHTML = `<h3>現在地から</h3>
    <p>${has ? routeText(s) : pending ? '道路の経路を調べています…' : '現在地を取ると、ここまでの道路の経路を光の筋で描きます。'}</p>
    <p class="meta">現在地は、この端末の画面の中で使います。道路の経路を調べるときだけ、同意のうえで外部へ送ります（保存はしません）。</p>
    ${has ? `<button class="btn" type="button" data-route="run">光で走る</button><button class="btn" type="button" data-route="frame">経路の全体を見る</button><button class="btn" type="button" data-route="near">神社の近くへ寄る</button>${route.mode !== 'road' ? '<button class="btn" type="button" data-route="road">道路の経路にする</button>' : ''}`
          : `<button class="btn" type="button" data-route="${user ? 'road' : 'locate'}">${user ? '道路の経路を調べる' : '現在地から光の筋をひく'}</button>`}`;
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
  const v = await askConsent();
  if (v === 'road') { routeConsent = 'road'; return true; }
  if (v === 'line') { routeConsent = 'line'; return true; }
  return false;      // やめる
}
async function routeAction(kind) {
  const s = selected;
  if (kind === 'locate') {
    locate(async () => {
      if (!(await ensureConsent())) return;
      const target = s || nearestShrine();
      const r = await buildRoute(target);
      if (!r) return;
      toast(`${target.name}まで、${r.mode === 'road' ? '道路で' : '直線で'}約${Math.round(r.km)} km。光が走ります。`, 3200);
      startRun();
    });
  } else if (kind === 'road' && user) {
    routeConsent = null;                    // 直線を選んでいた人が、あとから道路にするとき
    if (!(await ensureConsent())) return;
    const target = s || nearestShrine();
    const r = await buildRoute(target);
    if (r) startRun();
  } else if (kind === 'run' && route) { startRun(); }
  else if (kind === 'frame' && s && route) { frameRoute(route); }
  else if (kind === 'near' && s) { flyTo({ tx: s._p.x, tz: s._p.z, ty: s._y, dist: isNarrow() ? 1.25 : 0.95, el: isNarrow() ? 0.5 : 0.46, az: cam.az }, 3.2); }
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
  const ce = Math.cos(cam.el), se = Math.sin(cam.el);
  camera.position.set(
    cam.tx + cam.dist * ce * Math.sin(cam.az),
    cam.ty + cam.dist * se,
    cam.tz + cam.dist * ce * Math.cos(cam.az));
  camera.lookAt(cam.tx, cam.ty, cam.tz);
}

function resize() {
  const w = innerWidth, h = innerHeight;
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
  if (flight || run) return;
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
    zoomBy(gesture.d / g.d);
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
canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!flight && !run) zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
function zoomBy(k) {
  const lim = selected ? [0.35, Math.max(3.2, HOME.dist * 1.1)] : [4.5, HOME.dist * 1.15];
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

function setSheet(html) { bodyEl.innerHTML = html; bodyEl.scrollTop = 0; }

function shrineHTML(s) {
  const used = [];
  const take = (...fs) => fs.forEach((f) => f && f.src && used.push(...f.src));
  (s.history || []).forEach((h) => take(h));
  (s.highlights || []).forEach((h) => take(h));
  take(s.summary, s.address, s.access, s.hours, s.parking, s.goshuin);
  (s.deity_refs || []).forEach((r) => used.push(...(r.src || [])));
  const dch = s.deity_ids.map((id) => deities[id]).filter(Boolean).map((d) =>
    `<button class="dchip" type="button" data-deity="${esc(d.id)}">${esc(d.name)}<small>${esc(d.reading)}${d.kojiki_name ? '｜古事記：' + esc(d.kojiki_name) : ''}</small></button>`).join('');
  const same = (s.deity_ids || []).flatMap((id) => shrines.filter((o) => o.id !== s.id && o.deity_ids.includes(id)).map((o) => [o, id]));
  const sameHTML = same.length ? `<h3>同じ神様を祀る社</h3><ul class="linklist">` + same.map(([o, id]) =>
    `<li><button type="button" data-shrine="${esc(o.id)}">${esc(o.name)}<small>${esc(deities[id]?.name || '')}を祀る</small></button></li>`).join('') + `</ul>` : '';
  const row = (k, f) => f ? `<dt>${k}</dt><dd>${typeof f === 'string' ? esc(f) : esc(f.text) + refs(f.src) + stBadge(f.status)}</dd>` : `<dt>${k}</dt><dd><span class="badge todo">要確認</span></dd>`;
  return `
    <h2>${esc(s.name)}<small>${esc(s.reading)}｜${esc(s.pref)} ${esc(s.city || '')}</small></h2>
    ${item(s.summary)}
    <h3>御祭神</h3>
    <div class="deities">${dch}</div>
    ${(s.deity_note ? `<p class="meta">${esc(s.deity_note.text)}${refs(s.deity_note.src)}</p>` : '')}
    <h3>由緒</h3>
    ${(s.history || []).map(item).join('') || item(null)}
    <h3>見どころ</h3>
    ${(s.highlights || []).map(item).join('') || item(null)}
    <div id="routeBox" class="routebox"></div>
    <h3>アクセス・参拝</h3>
    ${s.note_geo ? `<p class="meta">位置：${esc(s.note_geo)}</p>` : ''}
    <dl class="row">${row('所在地', s.address)}${row('アクセス', s.access)}${row('参拝時間', s.hours)}${row('駐車場', s.parking)}${row('御朱印', s.goshuin)}</dl>
    <h3>食 <span class="badge pr">PR枠</span></h3>
    <div class="prbox">グルメの候補は、提携先が決まり次第ここに掲載します（広告を含む場合は「PR」と明記します）。現在リンクはありません。</div>
    <h3>宿 <span class="badge pr">PR枠</span></h3>
    <div class="prbox">宿の候補は、同じく準備中です。未訪問の宿は「候補」として表記します。</div>
    <h3>note 記事</h3>
    ${s.article_url ? `<a class="btn" href="${esc(s.article_url)}" target="_blank" rel="noopener">note で読む</a>` : `<span class="btn off">記事は準備中</span>`}
    ${sameHTML}
    ${sourceList(used)}
    <p class="meta">情報確認日：${esc(s.checked || '未確認')}／神社への敬意をもって、境内では現地の表示と作法に従ってください。</p>`;
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
  if (user && routeConsent) buildRoute(s);
  const goal = { tx: s._p.x, tz: s._p.z, ty: s._y, dist: isNarrow() ? 1.25 : 0.95, el: isNarrow() ? 0.5 : 0.46, az: (s._p.x > 0 ? -0.35 : 0.35) };
  const dur = wasOpen ? 3.2 : 5.6;
  flyTo(goal, dur, () => { if (my === seq) arrive(s, my); });
  // 到着の少し前から、光の柱をやわらげる
}
function arrive(s, my) {
  photoEl.innerHTML = photoHTML(s);
  photoEl.hidden = false;
  setSheet(shrineHTML(s));
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
  if (current && current.shrine) { setSheet(shrineHTML(current.shrine)); refreshRouteBox(); }
}
function goHome() {
  seq++;
  touched = false;
  run = null; document.body.classList.remove('running'); $('btnStop').hidden = true;
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
  const t = e.target.closest('[data-deity],[data-shrine],[data-back],[data-route]');
  if (!t) return;
  if (t.dataset.deity) { e.preventDefault(); if (!selected) { current = { shrine: null }; sheetEl.hidden = false; sheetEl.classList.add('show'); } showDeity(t.dataset.deity); }
  else if (t.dataset.shrine) { selectShrine(t.dataset.shrine); }
  else if (t.dataset.back) { backToShrine(); }
  else if (t.dataset.route) { routeAction(t.dataset.route); }
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-deity]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (e.key === 'Escape') { if (!$('tree').hidden) openTree(false); else if (selected) goHome(); }
});

// 神々の系譜図（全体）
function openTree(show) {
  const el = $('tree');
  if (show) {
    const ids = deityData.deities.map((d) => d.id);
    $('treeBody').innerHTML = svgTree(ids, null, { nw: 128, minW: 760 });
    const sv = $('treeBody').querySelector('svg');
    sv.style.minWidth = sv.viewBox.baseVal.width + 'px';
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
