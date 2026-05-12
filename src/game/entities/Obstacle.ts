import Phaser from 'phaser';
import { Depth, GROUND_Y } from '../constants';
import { OBSTACLE_DEFS, type ObstacleKind } from '../data/obstacleTypes';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ObstacleKind;
  // カラスは飛行する
  private flightAnchorY: number | null = null;
  private flightT = 0;
  private flightSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number | undefined, kind: ObstacleKind) {
    const def = OBSTACLE_DEFS[kind];
    const tex = `tex_obs_${kind}`;
    const placeY = y && y > 0 ? y : GROUND_Y;
    super(scene, x, placeY, tex);
    this.kind = kind;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(def.width, def.height);

    this.setOrigin(0.5, 1);
    this.setDepth(Depth.Obstacle);

    if (kind === 'crow') {
      this.flightAnchorY = placeY;
      this.flightSpeed = 1.6 + Math.random() * 0.8;
      this.flightT = Math.random() * Math.PI * 2;
    }

    if (kind === 'puddle') {
      // 水たまりはダメージ無しなので衝突感を弱める
      body.setSize(def.width - 8, 12);
    }

    if (kind === 'signboard') {
      // 風で揺れる
      scene.tweens.add({
        targets: this,
        angle: { from: -3, to: 3 },
        yoyo: true,
        repeat: -1,
        duration: 1400 + Math.random() * 600,
        ease: 'Sine.easeInOut'
      });
    }
  }

  tick(dt: number): void {
    if (this.kind === 'crow' && this.flightAnchorY !== null) {
      this.flightT += dt * 0.0035 * this.flightSpeed;
      this.y = this.flightAnchorY + Math.sin(this.flightT) * 24;
      // 翼ばたつき表現として小さくスケール変動
      const s = 1 + Math.sin(this.flightT * 6) * 0.06;
      this.setScale(1, s);
    }
  }

  get damage(): number {
    return OBSTACLE_DEFS[this.kind].damage;
  }
  get isSlippery(): boolean {
    return OBSTACLE_DEFS[this.kind].slip;
  }
}
