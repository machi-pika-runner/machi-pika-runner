// ステージ定義
// ビンの直前に同種ゴミの「クラスタ」を配置することで
// コンボ → 分別ボーナスの気持ちよさが連結するように設計している。

import { GROUND_Y, STAGE_WIDTH, type StageTheme } from '../constants';
import type { TrashKind } from './trashTypes';
import type { ObstacleKind } from './obstacleTypes';

export interface TrashSpawn {
  x: number;
  y: number;
  kind: TrashKind;
}

export interface ObstacleSpawn {
  x: number;
  y?: number;
  kind: ObstacleKind;
}

export interface BinSpawn {
  x: number;
  category: 'burnable' | 'recyclable' | 'plastic' | 'food';
}

export interface LevelDef {
  id: string;
  name: string;
  subtitle: string; // ステージ選択画面用の短い説明
  theme: StageTheme;
  width: number;
  goalX: number;
  spawnX: number;
  timeLimit: number; // 秒
  targetCleanliness: number; // A ランク到達ライン（%）
  wind?: number; // プラスチック等が左右に揺れる強さ（0 = 無風）
  trashes: TrashSpawn[];
  obstacles: ObstacleSpawn[];
  bins: BinSpawn[];
}

const G = GROUND_Y;
const onGround = (x: number, kind: TrashKind): TrashSpawn => ({ x, y: G - 16, kind });

// ─────────── Stage 1：朝の公園コース（チュートリアル） ───────────
export const LEVEL_1: LevelDef = {
  id: 'park-morning',
  name: '朝の公園コース',
  subtitle: '走って・拾って・分別を覚えよう',
  theme: 'park',
  width: STAGE_WIDTH,
  goalX: STAGE_WIDTH - 240,
  spawnX: 120,
  timeLimit: 120,
  targetCleanliness: 60,

  trashes: [
    onGround(360, 'paper'),
    onGround(450, 'paper'),
    onGround(540, 'paper'),
    onGround(720, 'paper'),
    { x: 920, y: G - 80, kind: 'paper' },
    onGround(1140, 'paper'),
    onGround(1280, 'paper'),
    onGround(1700, 'bottle'),
    onGround(1800, 'bottle'),
    onGround(1900, 'bottle'),
    onGround(2080, 'can'),
    onGround(2180, 'can'),
    onGround(2280, 'can'),
    { x: 2480, y: G - 80, kind: 'bottle' },
    onGround(2900, 'plastic'),
    onGround(3000, 'plastic'),
    onGround(3100, 'plastic'),
    onGround(3300, 'plastic'),
    onGround(3500, 'plastic'),
    onGround(3700, 'plastic'),
    onGround(4060, 'food'),
    onGround(4160, 'food'),
    onGround(4260, 'food'),
    onGround(4400, 'food'),
    onGround(4540, 'food'),
    onGround(4680, 'food')
  ],

  obstacles: [
    { x: 640, kind: 'puddle' },
    { x: 1050, kind: 'cone' },
    { x: 1600, kind: 'bicycle' },
    { x: 1680, kind: 'bicycle' },
    { x: 1980, kind: 'puddle' },
    { x: 2060, kind: 'puddle' },
    { x: 2140, kind: 'puddle' },
    { x: 2380, kind: 'crow', y: G - 130 },
    { x: 2820, kind: 'cone' },
    { x: 2890, kind: 'cone' },
    { x: 2960, kind: 'cone' },
    { x: 3200, kind: 'crow', y: G - 80 },
    { x: 3260, kind: 'crow', y: G - 160 },
    { x: 3520, kind: 'bicycle' },
    { x: 4000, kind: 'puddle' },
    { x: 4080, kind: 'cone' },
    { x: 4220, kind: 'crow', y: G - 120 },
    { x: 4380, kind: 'puddle' },
    { x: 4500, kind: 'bicycle' },
    { x: 4640, kind: 'crow', y: G - 140 },
    { x: 4780, kind: 'cone' }
  ],

  bins: [
    { x: 1500, category: 'burnable' },
    { x: 2700, category: 'recyclable' },
    { x: 3900, category: 'plastic' },
    { x: 4900, category: 'food' }
  ]
};

// ─────────── Stage 2：川沿いランニングコース ───────────
// 道が長め、水たまり多め、ビニール袋が風で揺れる
export const LEVEL_2: LevelDef = {
  id: 'riverside',
  name: '川沿いランニングコース',
  subtitle: '水たまりに注意。ジャンプを使いこなそう',
  theme: 'river',
  width: 6000,
  goalX: 6000 - 240,
  spawnX: 120,
  timeLimit: 140,
  targetCleanliness: 65,
  wind: 10,

  trashes: [
    onGround(360, 'bottle'),
    onGround(460, 'bottle'),
    onGround(560, 'can'),
    onGround(660, 'can'),
    onGround(840, 'bottle'),
    onGround(1080, 'can'),
    onGround(1600, 'plastic'),
    onGround(1700, 'plastic'),
    onGround(1800, 'plastic'),
    onGround(1900, 'plastic'),
    onGround(2100, 'plastic'),
    // 川縁にゴミが落ちそう（少し高め）
    { x: 2500, y: G - 70, kind: 'plastic' },
    onGround(2900, 'paper'),
    onGround(3000, 'paper'),
    onGround(3100, 'paper'),
    onGround(3200, 'paper'),
    onGround(3420, 'paper'),
    onGround(4000, 'food'),
    onGround(4100, 'food'),
    onGround(4200, 'food'),
    onGround(4350, 'food'),
    { x: 4700, y: G - 80, kind: 'plastic' },
    onGround(5100, 'bottle'),
    onGround(5200, 'paper'),
    onGround(5300, 'plastic'),
    onGround(5400, 'food')
  ],

  obstacles: [
    { x: 760, kind: 'puddle' },
    { x: 1000, kind: 'puddle' },
    { x: 1300, kind: 'cone' },
    { x: 1480, kind: 'bicycle' },
    // 水たまり街道
    { x: 2000, kind: 'puddle' },
    { x: 2080, kind: 'puddle' },
    { x: 2200, kind: 'puddle' },
    { x: 2280, kind: 'puddle' },
    { x: 2600, kind: 'crow', y: G - 130 },
    { x: 3100, kind: 'cone' },
    { x: 3160, kind: 'cone' },
    { x: 3400, kind: 'puddle' },
    { x: 3580, kind: 'bicycle' },
    { x: 3720, kind: 'crow', y: G - 110 },
    { x: 4280, kind: 'puddle' },
    { x: 4380, kind: 'puddle' },
    { x: 4500, kind: 'cone' },
    { x: 4900, kind: 'puddle' },
    { x: 4980, kind: 'puddle' },
    { x: 5500, kind: 'crow', y: G - 140 }
  ],

  bins: [
    { x: 1250, category: 'recyclable' },
    { x: 2300, category: 'plastic' },
    { x: 3550, category: 'burnable' },
    { x: 4500, category: 'food' }
  ]
};

// ─────────── Stage 3：駅前・商店街コース ───────────
// 障害物が多く、ビン配置がやや難しい
export const LEVEL_3: LevelDef = {
  id: 'town-station',
  name: '駅前・商店街コース',
  subtitle: '人通りと自転車を縫って走り抜けろ',
  theme: 'town',
  width: 5800,
  goalX: 5800 - 240,
  spawnX: 120,
  timeLimit: 130,
  targetCleanliness: 70,

  trashes: [
    // 各種ゴミが混在。プレイヤーは持ち越し前提で動く
    onGround(360, 'paper'),
    onGround(440, 'plastic'),
    onGround(560, 'bottle'),
    onGround(680, 'food'),
    onGround(840, 'can'),
    onGround(1000, 'paper'),
    onGround(1100, 'plastic'),
    onGround(1280, 'paper'),
    onGround(1460, 'bottle'),
    onGround(1600, 'food'),
    onGround(1800, 'can'),
    { x: 2000, y: G - 80, kind: 'paper' }, // ベンチ上
    onGround(2200, 'plastic'),
    onGround(2400, 'food'),
    onGround(2600, 'bottle'),
    onGround(2800, 'can'),
    onGround(3000, 'paper'),
    onGround(3200, 'plastic'),
    onGround(3400, 'food'),
    onGround(3600, 'bottle'),
    onGround(3800, 'can'),
    onGround(4000, 'paper'),
    onGround(4200, 'plastic'),
    onGround(4400, 'food'),
    onGround(4600, 'paper'),
    onGround(4800, 'plastic'),
    onGround(5000, 'bottle'),
    onGround(5200, 'food')
  ],

  obstacles: [
    // 序盤：自転車並び
    { x: 500, kind: 'bicycle' },
    { x: 580, kind: 'bicycle' },
    { x: 760, kind: 'signboard' },
    { x: 900, kind: 'crow', y: G - 120 },
    // 商店街中盤：看板＋自転車＋コーン
    { x: 1180, kind: 'signboard' },
    { x: 1380, kind: 'cone' },
    { x: 1520, kind: 'bicycle' },
    { x: 1720, kind: 'signboard' },
    { x: 1900, kind: 'crow', y: G - 90 },
    { x: 2100, kind: 'cone' },
    { x: 2300, kind: 'bicycle' },
    { x: 2500, kind: 'puddle' },
    { x: 2680, kind: 'signboard' },
    { x: 2900, kind: 'cone' },
    { x: 3100, kind: 'bicycle' },
    { x: 3300, kind: 'signboard' },
    { x: 3500, kind: 'crow', y: G - 140 },
    { x: 3700, kind: 'cone' },
    { x: 3900, kind: 'bicycle' },
    { x: 4100, kind: 'signboard' },
    { x: 4300, kind: 'cone' },
    { x: 4500, kind: 'bicycle' },
    { x: 4700, kind: 'crow', y: G - 100 },
    { x: 4900, kind: 'signboard' },
    { x: 5100, kind: 'cone' }
  ],

  // ビン配置を「ゴミと逆順」気味にして思考を要求
  bins: [
    { x: 1240, category: 'food' },
    { x: 2360, category: 'recyclable' },
    { x: 3650, category: 'burnable' },
    { x: 4860, category: 'plastic' }
  ]
};

// ─────────── Stage 4：海辺クリーンアップコース ───────────
// プラスチック多め、風強め、障害物は少なめ
export const LEVEL_4: LevelDef = {
  id: 'seaside-cleanup',
  name: '海辺クリーンアップ',
  subtitle: '風で動くゴミを追え。海をきれいに',
  theme: 'beach',
  width: 6200,
  goalX: 6200 - 240,
  spawnX: 120,
  timeLimit: 150,
  targetCleanliness: 75,
  wind: 18,

  trashes: [
    // 砂浜にプラスチック大量
    onGround(360, 'plastic'),
    onGround(450, 'plastic'),
    onGround(540, 'plastic'),
    onGround(700, 'bottle'),
    onGround(820, 'plastic'),
    onGround(940, 'plastic'),
    onGround(1080, 'bottle'),
    onGround(1240, 'plastic'),
    onGround(1380, 'plastic'),
    onGround(1520, 'food'),
    onGround(1700, 'plastic'),
    onGround(1860, 'plastic'),
    onGround(2020, 'bottle'),
    onGround(2200, 'plastic'),
    onGround(2400, 'plastic'),
    onGround(2600, 'food'),
    onGround(2780, 'plastic'),
    onGround(2960, 'bottle'),
    onGround(3140, 'plastic'),
    onGround(3340, 'food'),
    onGround(3540, 'plastic'),
    onGround(3740, 'plastic'),
    onGround(3940, 'bottle'),
    onGround(4140, 'food'),
    onGround(4340, 'plastic'),
    onGround(4540, 'plastic'),
    onGround(4740, 'paper'),
    onGround(4940, 'plastic'),
    onGround(5140, 'food'),
    onGround(5340, 'bottle'),
    onGround(5540, 'plastic')
  ],

  obstacles: [
    // 海辺なので障害物少なめ＆カラス（カモメ）多め
    { x: 600, kind: 'puddle' },
    { x: 900, kind: 'crow', y: G - 130 },
    { x: 1300, kind: 'puddle' },
    { x: 1700, kind: 'crow', y: G - 90 },
    { x: 2100, kind: 'puddle' },
    { x: 2500, kind: 'crow', y: G - 150 },
    { x: 3000, kind: 'puddle' },
    { x: 3400, kind: 'crow', y: G - 100 },
    { x: 3700, kind: 'cone' },
    { x: 4100, kind: 'puddle' },
    { x: 4500, kind: 'crow', y: G - 130 },
    { x: 4900, kind: 'puddle' },
    { x: 5300, kind: 'crow', y: G - 110 }
  ],

  bins: [
    { x: 1100, category: 'plastic' },
    { x: 2300, category: 'recyclable' },
    { x: 3500, category: 'food' },
    { x: 4700, category: 'plastic' },
    { x: 5700, category: 'burnable' }
  ]
};

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4];
export const getLevel = (idx: number): LevelDef =>
  LEVELS[Math.min(Math.max(0, idx), LEVELS.length - 1)];
