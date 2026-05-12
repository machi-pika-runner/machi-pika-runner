// 障害物種別

export type ObstacleKind = 'puddle' | 'cone' | 'bicycle' | 'crow' | 'signboard';

export interface ObstacleDef {
  kind: ObstacleKind;
  label: string;
  damage: number; // 1以上でダメージ、0は滑るのみ
  slip: boolean;
  width: number;
  height: number;
}

export const OBSTACLE_DEFS: Record<ObstacleKind, ObstacleDef> = {
  puddle: { kind: 'puddle', label: '水たまり', damage: 0, slip: true, width: 96, height: 18 },
  cone: { kind: 'cone', label: 'カラーコーン', damage: 1, slip: false, width: 36, height: 50 },
  bicycle: { kind: 'bicycle', label: '自転車', damage: 1, slip: false, width: 80, height: 56 },
  crow: { kind: 'crow', label: 'カラス', damage: 1, slip: false, width: 44, height: 30 },
  signboard: { kind: 'signboard', label: '立看板', damage: 1, slip: false, width: 56, height: 72 }
};
