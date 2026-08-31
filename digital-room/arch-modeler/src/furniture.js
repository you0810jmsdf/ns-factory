// 家具ライブラリ
// 各家具は実寸(m)のTHREE.Groupを返す。原点=底面中心、+Z方向が正面
import * as THREE from 'three';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cyl(r, h, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

const WOOD = 0x9a6a3f, WOOD_L = 0xc59a6d, FABRIC = 0x6b7f9e, WHITE = 0xf2f2f0,
      DARK = 0x4a4a4a, STEEL = 0xb8bcc0;

export const CATALOG = {
  bed: {
    name: 'シングルベッド',
    build() {
      const g = new THREE.Group();
      g.add(box(0.97, 0.25, 1.95, WOOD, 0, 0.225, 0));        // フレーム
      g.add(box(0.94, 0.18, 1.92, WHITE, 0, 0.44, 0));        // マットレス
      g.add(box(0.97, 0.5, 0.05, WOOD, 0, 0.35, -0.95));      // ヘッドボード
      g.add(box(0.5, 0.08, 0.32, 0xe8e0d0, 0, 0.56, -0.7));   // 枕
      return g;
    }
  },
  table: {
    name: 'ダイニングテーブル',
    build() {
      const g = new THREE.Group();
      g.add(box(1.4, 0.04, 0.8, WOOD_L, 0, 0.7, 0));
      for (const [x, z] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]])
        g.add(box(0.06, 0.68, 0.06, WOOD, x, 0.34, z));
      return g;
    }
  },
  chair: {
    name: '椅子',
    build() {
      const g = new THREE.Group();
      g.add(box(0.42, 0.04, 0.42, WOOD_L, 0, 0.43, 0));
      g.add(box(0.42, 0.45, 0.04, WOOD_L, 0, 0.68, -0.19));
      for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
        g.add(box(0.04, 0.42, 0.04, WOOD, x, 0.21, z));
      return g;
    }
  },
  sofa: {
    name: 'ソファ(2人掛け)',
    build() {
      const g = new THREE.Group();
      g.add(box(1.6, 0.35, 0.8, FABRIC, 0, 0.175, 0));        // 座面ベース
      g.add(box(1.6, 0.45, 0.2, FABRIC, 0, 0.575, -0.3));     // 背もたれ
      g.add(box(0.2, 0.25, 0.6, FABRIC, -0.7, 0.475, 0.05));  // 肘掛け左
      g.add(box(0.2, 0.25, 0.6, FABRIC, 0.7, 0.475, 0.05));   // 肘掛け右
      return g;
    }
  },
  shelf: {
    name: '本棚',
    build() {
      const g = new THREE.Group();
      g.add(box(0.8, 1.8, 0.03, WOOD, 0, 0.9, -0.135));       // 背板
      g.add(box(0.03, 1.8, 0.3, WOOD, -0.385, 0.9, 0));
      g.add(box(0.03, 1.8, 0.3, WOOD, 0.385, 0.9, 0));
      for (let i = 0; i <= 4; i++) g.add(box(0.74, 0.025, 0.3, WOOD, 0, 0.02 + i * 0.44, 0));
      return g;
    }
  },
  desk: {
    name: 'デスク',
    build() {
      const g = new THREE.Group();
      g.add(box(1.2, 0.03, 0.6, WOOD_L, 0, 0.72, 0));
      g.add(box(0.04, 0.7, 0.55, STEEL, -0.56, 0.35, 0));
      g.add(box(0.04, 0.7, 0.55, STEEL, 0.56, 0.35, 0));
      return g;
    }
  },
  tv: {
    name: 'テレビボード',
    build() {
      const g = new THREE.Group();
      g.add(box(1.5, 0.4, 0.4, WOOD, 0, 0.2, 0));             // ボード
      g.add(box(1.1, 0.65, 0.05, DARK, 0, 0.75, 0));          // テレビ
      return g;
    }
  },
  fridge: {
    name: '冷蔵庫',
    build() {
      const g = new THREE.Group();
      g.add(box(0.65, 1.7, 0.65, STEEL, 0, 0.85, 0));
      g.add(box(0.04, 0.5, 0.04, DARK, -0.28, 1.2, 0.34));    // 取っ手
      return g;
    }
  },
  kitchen: {
    name: 'キッチン',
    build() {
      const g = new THREE.Group();
      g.add(box(2.4, 0.85, 0.65, WHITE, 0, 0.425, 0));        // 本体
      g.add(box(2.4, 0.03, 0.65, STEEL, 0, 0.865, 0));        // 天板
      g.add(box(0.5, 0.02, 0.4, 0x8a9298, -0.6, 0.89, 0));    // シンク
      g.add(cyl(0.02, 0.25, STEEL, -0.6, 1.0, -0.2));         // 水栓
      return g;
    }
  },
  bath: {
    name: '浴槽',
    build() {
      const g = new THREE.Group();
      g.add(box(1.6, 0.55, 0.75, WHITE, 0, 0.275, 0));
      g.add(box(1.4, 0.1, 0.55, 0xcfe8f0, 0, 0.5, 0));        // 水面
      return g;
    }
  },
  toilet: {
    name: 'トイレ',
    build() {
      const g = new THREE.Group();
      g.add(box(0.4, 0.4, 0.5, WHITE, 0, 0.2, 0.1));          // 便座
      g.add(box(0.42, 0.5, 0.2, WHITE, 0, 0.45, -0.2));       // タンク
      return g;
    }
  },
  plant: {
    name: '観葉植物',
    build() {
      const g = new THREE.Group();
      g.add(cyl(0.15, 0.3, 0xa0522d, 0, 0.15, 0));            // 鉢
      g.add(cyl(0.03, 0.5, 0x5a4a3a, 0, 0.55, 0));            // 幹
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a7d3a, roughness: 0.9 })
      );
      leaves.position.y = 0.95;
      leaves.castShadow = true;
      g.add(leaves);
      return g;
    }
  }
};

/** 種別キーから家具グループを生成する */
export function createFurniture(type) {
  const def = CATALOG[type];
  if (!def) return null;
  const g = def.build();
  g.userData.furnitureType = type;
  return g;
}
