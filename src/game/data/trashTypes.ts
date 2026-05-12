// ゴミ種別と分別カテゴリの定義

export type TrashCategory = 'burnable' | 'recyclable' | 'plastic' | 'food';
export type TrashKind = 'paper' | 'bottle' | 'can' | 'plastic' | 'food';

export interface TrashTypeDef {
  kind: TrashKind;
  label: string;
  category: TrashCategory;
  color: number;
  outline: number;
}

export const TRASH_TYPES: Record<TrashKind, TrashTypeDef> = {
  paper: {
    kind: 'paper',
    label: '紙くず',
    category: 'burnable',
    color: 0xfff5cc,
    outline: 0x8a7239
  },
  bottle: {
    kind: 'bottle',
    label: 'ペットボトル',
    category: 'recyclable',
    color: 0xb6e8ff,
    outline: 0x2680b6
  },
  can: {
    kind: 'can',
    label: '空き缶',
    category: 'recyclable',
    color: 0xd6d6da,
    outline: 0x4b4b55
  },
  plastic: {
    kind: 'plastic',
    label: 'ビニール袋',
    category: 'plastic',
    color: 0xffd1ec,
    outline: 0xa84a87
  },
  food: {
    kind: 'food',
    label: '食品ごみ',
    category: 'food',
    color: 0xc4965b,
    outline: 0x5a3413
  }
};

export interface CategoryInfo {
  category: TrashCategory;
  label: string;
  short: string; // A11y: 色覚多様性配慮の略号
  color: number;
  accepts: TrashKind[]; // 受け入れ可能なゴミ種（テキスト併記用）
}

export const CATEGORIES: Record<TrashCategory, CategoryInfo> = {
  burnable: { category: 'burnable', label: '燃えるごみ', short: 'BURN', color: 0xee5a5a, accepts: ['paper'] },
  recyclable: { category: 'recyclable', label: '資源ごみ', short: 'REC', color: 0x4aa8e0, accepts: ['bottle', 'can'] },
  plastic: { category: 'plastic', label: 'プラスチック', short: 'PLA', color: 0xeeb13c, accepts: ['plastic'] },
  food: { category: 'food', label: '食品ごみ', short: 'FOOD', color: 0x6cc270, accepts: ['food'] }
};

export const TRASH_KINDS: TrashKind[] = ['paper', 'bottle', 'can', 'plastic', 'food'];
