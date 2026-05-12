// ゲーム全体で利用する定数

// 画面サイズ（16:9）
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ステージ
export const STAGE_WIDTH = 5400;
export const GROUND_Y = GAME_HEIGHT - 96; // 地面の上端
export const SKY_TOP = 0;

// プレイヤー
export const PLAYER_SPEED = 290;
export const PLAYER_SPEED_DUCK = 150;
export const PLAYER_JUMP_VELOCITY = -620;
export const PLAYER_GRAVITY_Y = 1500;
export const PLAYER_INITIAL_LIFE = 3;
export const PLAYER_INVINCIBLE_MS = 1100;
export const PLAYER_PICKUP_RANGE = 72;
export const PLAYER_AUTO_PICKUP_COOLDOWN_MS = 100;
export const PLAYER_KNOCKBACK_X = 220;
export const PLAYER_KNOCKBACK_Y = -260;

// ゴミ袋
export const BAG_INITIAL_CAPACITY = 6;
export const BAG_CAPACITY_PER_UPGRADE = 2;
export const BAG_UPGRADE_THRESHOLD = 8; // 拾った数が閾値を超える毎に容量が増える

// クリーン度（Sランクを「全部拾って全部正しく分別したご褒美」に近づける）
export const CLEANLINESS_PICK_GAIN = 1.6;
export const CLEANLINESS_SORT_BONUS = 4;
export const CLEANLINESS_MISS_PENALTY = 1.2;
export const CLEANLINESS_WRONG_SORT_PENALTY = 3;
export const CLEANLINESS_HIT_PENALTY = 6;

// スコア
export const SCORE_PICK = 90;
export const SCORE_SORT_CORRECT = 220;
export const SCORE_SORT_WRONG = -50;
export const SCORE_COMBO_STEP = 12;
export const SCORE_TIME_BONUS_PER_SEC = 25;
export const SCORE_CLEANLINESS_BONUS_PER_PCT = 12; // クリーン度1%につき与えるクリアボーナス

// コンボ倍率の段階
export interface ComboTier {
  threshold: number;
  multiplier: number;
  label: string;
  color: string;
}

export const COMBO_TIERS: ComboTier[] = [
  { threshold: 10, multiplier: 2.5, label: 'BURNING!', color: '#ff5e3a' },
  { threshold: 7, multiplier: 2.0, label: 'FIRE!', color: '#ff8a3d' },
  { threshold: 4, multiplier: 1.5, label: 'NICE!', color: '#ffd86b' },
  { threshold: 2, multiplier: 1.2, label: 'GOOD!', color: '#a6e3ff' },
  { threshold: 0, multiplier: 1.0, label: '', color: '#ffffff' }
];

export const getComboTier = (combo: number): ComboTier => {
  for (const t of COMBO_TIERS) if (combo >= t.threshold) return t;
  return COMBO_TIERS[COMBO_TIERS.length - 1];
};

// 拾い時のランダム掛け声
export const PICKUP_FLAVOR = ['Clean!', 'Nice!', 'Sweep!', 'Pick!'];

// 制限時間
export const TIME_LIMIT_SEC = 120;

// シーン名
export const SceneKeys = {
  Boot: 'BootScene',
  Title: 'TitleScene',
  StageSelect: 'StageSelectScene',
  Game: 'GameScene',
  Result: 'ResultScene'
} as const;

// テクスチャキー（assetFactory で生成）
export const Tex = {
  PlayerIdle: 'tex_player_idle',
  PlayerRun: 'tex_player_run',
  PlayerJump: 'tex_player_jump',
  PlayerDuck: 'tex_player_duck',
  PlayerHurt: 'tex_player_hurt',
  GroundTile: 'tex_ground',
  GroundDecor: 'tex_ground_decor',
  Tree: 'tex_tree',
  Bench: 'tex_bench',
  Bush: 'tex_bush',
  Cloud: 'tex_cloud',
  Mountain: 'tex_mountain',
  Bird: 'tex_bird',
  Flower: 'tex_flower',
  Goal: 'tex_goal',
  Bin: 'tex_bin',
  Trash_paper: 'tex_trash_paper',
  Trash_bottle: 'tex_trash_bottle',
  Trash_can: 'tex_trash_can',
  Trash_plastic: 'tex_trash_plastic',
  Trash_food: 'tex_trash_food',
  Obs_puddle: 'tex_obs_puddle',
  Obs_cone: 'tex_obs_cone',
  Obs_bicycle: 'tex_obs_bicycle',
  Obs_crow: 'tex_obs_crow',
  Obs_signboard: 'tex_obs_signboard',
  SandTile: 'tex_sand',
  AsphaltTile: 'tex_asphalt',
  PalmTree: 'tex_palm',
  Building: 'tex_building',
  WaveStrip: 'tex_wave',
  TreeLine: 'tex_treeline',
  Pixel: 'tex_pixel'
} as const;

export type StageTheme = 'park' | 'river' | 'town' | 'beach';

// テーマごとの色味（背景補間に使う）
export const THEME_COLORS: Record<
  StageTheme,
  { skyDirty: number; skyClean: number; bgDirty: number; bgClean: number }
> = {
  park: { skyDirty: 0xc9a787, skyClean: 0xffd6a8, bgDirty: 0x8c9eaf, bgClean: 0xa8e0ff },
  river: { skyDirty: 0xa6a39b, skyClean: 0xd6efff, bgDirty: 0x6e90a8, bgClean: 0x9fd6f5 },
  town: { skyDirty: 0xb3a59b, skyClean: 0xf6d6b9, bgDirty: 0x7c7e88, bgClean: 0xc7c3d6 },
  beach: { skyDirty: 0xd6c69a, skyClean: 0xffe6b3, bgDirty: 0xa3b6c5, bgClean: 0xb3e5f5 }
};

// 評価ランク
export type Rank = 'S' | 'A' | 'B' | 'C';

export interface RunResult {
  score: number;
  cleanliness: number;
  picked: number;
  sortedCorrect: number;
  sortedWrong: number;
  remainingSec: number;
  cleared: boolean;
  rank: Rank;
  maxCombo: number;
  levelIndex: number;
  levelName: string;
}

export const RANK_COMMENTS: Record<Rank, string> = {
  S: '最高のプロギング！街が見違えるほどきれいになりました',
  A: 'かなりきれいになりました！あと少しで完璧です',
  B: 'いいスタートです。次は分別も意識してみましょう',
  C: 'まずは一歩。街をきれいにする旅はここからです'
};

export const Depth = {
  BgFar: 0,
  BgMid: 5,
  BgNear: 10,
  Ground: 15,
  Decor: 20,
  Trash: 25,
  Obstacle: 27,
  Bin: 28,
  Player: 30,
  Particle: 32,
  Hud: 50,
  Overlay: 60
} as const;
