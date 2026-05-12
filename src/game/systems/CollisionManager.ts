// シーンとエンティティ群の衝突セットアップを薄くまとめる。
// GameScene を肥大化させないための薄いラッパ。

import Phaser from 'phaser';

export interface CollisionGroups {
  player: Phaser.Physics.Arcade.Sprite;
  ground: Phaser.Physics.Arcade.StaticGroup;
  trashes: Phaser.Physics.Arcade.Group;
  obstacles: Phaser.Physics.Arcade.Group;
  bins: Phaser.Physics.Arcade.StaticGroup;
}

export class CollisionManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setup(
    g: CollisionGroups,
    handlers: {
      onTrashOverlap: (player: Phaser.Physics.Arcade.Sprite, trash: Phaser.GameObjects.GameObject) => void;
      onObstacleOverlap: (
        player: Phaser.Physics.Arcade.Sprite,
        obstacle: Phaser.GameObjects.GameObject
      ) => void;
      onBinOverlap: (player: Phaser.Physics.Arcade.Sprite, bin: Phaser.GameObjects.GameObject) => void;
    }
  ): void {
    // 物理衝突（地面のみ）
    this.scene.physics.add.collider(g.player, g.ground);

    // 重なり検出（取得・接触判定）
    this.scene.physics.add.overlap(
      g.player,
      g.trashes,
      handlers.onTrashOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
    );
    this.scene.physics.add.overlap(
      g.player,
      g.obstacles,
      handlers.onObstacleOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
    );
    this.scene.physics.add.overlap(
      g.player,
      g.bins,
      handlers.onBinOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
    );
  }
}
