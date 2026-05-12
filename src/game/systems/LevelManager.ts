// レベル定義に従ってオブジェクトを配置するヘルパ。
// オブジェクトの実体生成はシーンに任せ、ここはコールバック呼び出しに専念。

import type { LevelDef } from '../data/levels';

export interface LevelHooks {
  onTrash: (x: number, y: number, kind: import('../data/trashTypes').TrashKind) => void;
  onObstacle: (x: number, y: number, kind: import('../data/obstacleTypes').ObstacleKind) => void;
  onBin: (x: number, category: import('../data/trashTypes').TrashCategory) => void;
  onGoal: (x: number) => void;
}

export class LevelManager {
  build(level: LevelDef, hooks: LevelHooks): void {
    for (const t of level.trashes) hooks.onTrash(t.x, t.y, t.kind);
    for (const o of level.obstacles) hooks.onObstacle(o.x, o.y ?? 0, o.kind);
    for (const b of level.bins) hooks.onBin(b.x, b.category);
    hooks.onGoal(level.goalX);
  }
}
