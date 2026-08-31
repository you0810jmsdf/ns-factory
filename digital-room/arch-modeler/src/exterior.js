// 外構ライブラリ
// 隣家・塀・樹木・カーポート等をパラメトリックに生成する。原点=底面中心、地面(y=0)に置く
// 配置物は日照シミュレーションの影と照度解析の遮蔽物として扱われる（STL出力には含まない）
import * as THREE from 'three';

function box(w, h, d, color, x = 0, y = 0, z = 0, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cyl(r, h, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

const CONCRETE = 0xb8b8b2, WOOD = 0x9a6a3f, GREEN_D = 0x2f6b2f, GREEN_L = 0x4e8b3a,
      TRUNK = 0x6b5138, STEEL = 0x9aa2a8, HOUSE_G = 0xd8d4cc;

// 外構カタログ: name / params（サイズ調整可能な寸法）/ build(p)
export const EXT_CATALOG = {
  neighbor: {
    name: '隣家（日影検討用）',
    params: [
      { key: 'w', label: '幅(m)', def: 7, min: 2, max: 20, step: 0.5 },
      { key: 'd', label: '奥行(m)', def: 6, min: 2, max: 20, step: 0.5 },
      { key: 'h', label: '軒高(m)', def: 6, min: 2, max: 12, step: 0.5 }
    ],
    build(p) {
      const g = new THREE.Group();
      g.add(box(p.w, p.h, p.d, HOUSE_G, 0, p.h / 2, 0));
      // 簡易寄棟屋根
      const rise = Math.min(p.w, p.d) / 4;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.hypot(p.w, p.d) / 2 * 0.9, rise, 4),
        new THREE.MeshStandardMaterial({ color: 0x7a6a5e, roughness: 0.9 })
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(p.w / Math.max(p.w, p.d), 1, p.d / Math.max(p.w, p.d));
      roof.position.y = p.h + rise / 2;
      roof.castShadow = true;
      g.add(roof);
      return g;
    }
  },
  block_wall: {
    name: 'ブロック塀',
    params: [
      { key: 'len', label: '長さ(m)', def: 4, min: 0.5, max: 30, step: 0.5 },
      { key: 'h', label: '高さ(m)', def: 1.6, min: 0.4, max: 3, step: 0.2 }
    ],
    build(p) {
      const g = new THREE.Group();
      g.add(box(p.len, p.h, 0.12, CONCRETE, 0, p.h / 2, 0));
      g.add(box(p.len, 0.05, 0.16, 0xa5a59e, 0, p.h + 0.025, 0)); // 笠木
      return g;
    }
  },
  fence: {
    name: 'フェンス',
    params: [
      { key: 'len', label: '長さ(m)', def: 4, min: 0.5, max: 30, step: 0.5 },
      { key: 'h', label: '高さ(m)', def: 1.2, min: 0.4, max: 2.4, step: 0.2 }
    ],
    build(p) {
      const g = new THREE.Group();
      const n = Math.max(2, Math.round(p.len / 2) + 1);
      for (let i = 0; i < n; i++)
        g.add(box(0.06, p.h, 0.06, STEEL, -p.len / 2 + i * p.len / (n - 1), p.h / 2, 0));
      for (const fy of [0.3, 0.65, 1.0])
        if (fy < p.h) g.add(box(p.len, 0.04, 0.03, STEEL, 0, p.h * fy, 0));
      return g;
    }
  },
  hedge: {
    name: '生垣',
    params: [
      { key: 'len', label: '長さ(m)', def: 3, min: 0.5, max: 30, step: 0.5 },
      { key: 'h', label: '高さ(m)', def: 1.2, min: 0.4, max: 3, step: 0.2 }
    ],
    build(p) {
      const g = new THREE.Group();
      g.add(box(p.len, p.h, 0.6, GREEN_D, 0, p.h / 2, 0));
      return g;
    }
  },
  tree_d: {
    name: '落葉樹',
    params: [{ key: 'h', label: '樹高(m)', def: 4, min: 1.5, max: 12, step: 0.5 }],
    build(p) {
      const g = new THREE.Group();
      g.add(cyl(p.h * 0.04, p.h * 0.45, TRUNK, 0, p.h * 0.225, 0));
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(p.h * 0.3, 12, 10),
        new THREE.MeshStandardMaterial({ color: GREEN_L, roughness: 0.95 })
      );
      crown.position.y = p.h * 0.65;
      crown.castShadow = crown.receiveShadow = true;
      g.add(crown);
      return g;
    }
  },
  tree_c: {
    name: '針葉樹',
    params: [{ key: 'h', label: '樹高(m)', def: 5, min: 1.5, max: 15, step: 0.5 }],
    build(p) {
      const g = new THREE.Group();
      g.add(cyl(p.h * 0.035, p.h * 0.3, TRUNK, 0, p.h * 0.15, 0));
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(p.h * 0.22, p.h * 0.75, 10),
        new THREE.MeshStandardMaterial({ color: GREEN_D, roughness: 0.95 })
      );
      crown.position.y = p.h * 0.3 + p.h * 0.375;
      crown.castShadow = crown.receiveShadow = true;
      g.add(crown);
      return g;
    }
  },
  carport: {
    name: 'カーポート',
    params: [
      { key: 'w', label: '幅(m)', def: 2.7, min: 2, max: 6, step: 0.1 },
      { key: 'd', label: '奥行(m)', def: 5, min: 3, max: 7, step: 0.5 },
      { key: 'h', label: '高さ(m)', def: 2.2, min: 1.8, max: 3, step: 0.1 }
    ],
    build(p) {
      const g = new THREE.Group();
      for (const z of [-p.d / 2 + 0.3, p.d / 2 - 0.3])
        g.add(box(0.08, p.h, 0.08, STEEL, -p.w / 2 + 0.1, p.h / 2, z));
      g.add(box(p.w, 0.04, p.d, 0x8aa0b0, 0, p.h, 0, 0.55)); // 半透明屋根
      return g;
    }
  },
  parking: {
    name: '駐車場（土間）',
    params: [
      { key: 'w', label: '幅(m)', def: 2.5, min: 2, max: 10, step: 0.5 },
      { key: 'd', label: '奥行(m)', def: 5, min: 3, max: 12, step: 0.5 }
    ],
    build(p) {
      const g = new THREE.Group();
      const slab = box(p.w, 0.05, p.d, 0xc5c5c0, 0, 0.025, 0);
      slab.castShadow = false;
      g.add(slab);
      return g;
    }
  },
  deck: {
    name: 'ウッドデッキ',
    params: [
      { key: 'w', label: '幅(m)', def: 3.6, min: 1, max: 8, step: 0.3 },
      { key: 'd', label: '奥行(m)', def: 1.8, min: 0.9, max: 4, step: 0.3 },
      { key: 'h', label: '高さ(m)', def: 0.4, min: 0.2, max: 0.8, step: 0.1 }
    ],
    build(p) {
      const g = new THREE.Group();
      g.add(box(p.w, 0.05, p.d, WOOD, 0, p.h, 0));
      for (const [x, z] of [[-p.w / 2 + 0.1, -p.d / 2 + 0.1], [p.w / 2 - 0.1, -p.d / 2 + 0.1],
                            [-p.w / 2 + 0.1, p.d / 2 - 0.1], [p.w / 2 - 0.1, p.d / 2 - 0.1]])
        g.add(box(0.09, p.h, 0.09, 0x7a5230, x, p.h / 2, z));
      return g;
    }
  },
  storage: {
    name: '物置',
    params: [
      { key: 'w', label: '幅(m)', def: 1.8, min: 0.9, max: 3, step: 0.3 },
      { key: 'd', label: '奥行(m)', def: 0.9, min: 0.6, max: 2.4, step: 0.3 },
      { key: 'h', label: '高さ(m)', def: 1.9, min: 1, max: 2.5, step: 0.1 }
    ],
    build(p) {
      const g = new THREE.Group();
      g.add(box(p.w, p.h, p.d, 0xb0b8a8, 0, p.h / 2, 0));
      g.add(box(p.w + 0.06, 0.04, p.d + 0.06, 0x8a9288, 0, p.h + 0.02, 0));
      return g;
    }
  },
  gate: {
    name: '門柱',
    params: [{ key: 'h', label: '高さ(m)', def: 1.5, min: 0.8, max: 2.2, step: 0.1 }],
    build(p) {
      const g = new THREE.Group();
      g.add(box(0.35, p.h, 0.35, CONCRETE, 0, p.h / 2, 0));
      g.add(box(0.25, 0.15, 0.03, 0x6a5a4a, 0, p.h * 0.75, 0.19)); // 表札
      return g;
    }
  },
  lawn: {
    name: '芝生',
    params: [
      { key: 'w', label: '幅(m)', def: 5, min: 1, max: 20, step: 0.5 },
      { key: 'd', label: '奥行(m)', def: 5, min: 1, max: 20, step: 0.5 }
    ],
    build(p) {
      const g = new THREE.Group();
      const turf = box(p.w, 0.03, p.d, 0x6f9e58, 0, 0.015, 0);
      turf.castShadow = false;
      g.add(turf);
      return g;
    }
  }
};

/** 種別キーとパラメータから外構オブジェクトを生成する */
export function createExterior(type, params) {
  const def = EXT_CATALOG[type];
  if (!def) return null;
  const p = { ...defaultParams(type), ...(params ?? {}) };
  const g = def.build(p);
  g.userData.exteriorType = type;
  return g;
}

/** 種別のデフォルトパラメータ */
export function defaultParams(type) {
  const def = EXT_CATALOG[type];
  return def ? Object.fromEntries(def.params.map(p => [p.key, p.def])) : {};
}

/** state.exterior全体からグループを構築する（照度解析の遮蔽物にも使用） */
export function buildExteriorGroup(state) {
  const group = new THREE.Group();
  (state.exterior ?? []).forEach((it, i) => {
    const obj = createExterior(it.type, it.params);
    if (!obj) return;
    obj.position.set(it.x, 0, it.z);
    obj.rotation.y = it.rot ?? 0;
    obj.userData.kind = 'exterior';
    obj.userData.idx = i;
    group.add(obj);
  });
  return group;
}
