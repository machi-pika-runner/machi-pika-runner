import Phaser from 'phaser';
import { Depth } from '../constants';
import { TRASH_TYPES, type TrashKind } from '../data/trashTypes';

export class TrashItem extends Phaser.Physics.Arcade.Sprite {
  readonly kind: TrashKind;
  picked = false;
  private badge: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: TrashKind) {
    const tex = `tex_trash_${kind}`;
    super(scene, x, y, tex);
    this.kind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(28, 28);
    this.setOrigin(0.5, 1);
    this.setDepth(Depth.Trash);

    // 色だけに依存しないようテキスト記号バッジを添える（A11y）
    this.badge = scene.add
      .image(x, y - 36, `tex_trash_badge_${kind}`)
      .setDepth(Depth.Trash + 1);

    // ふわふわ
    scene.tweens.add({
      targets: [this, this.badge],
      y: '-=4',
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // 風効果（ステージ 2/4 で plastic / paper にかかる）
  applyWind(amplitude: number): void {
    if (!amplitude) return;
    const dx = amplitude * (this.kind === 'plastic' ? 1.3 : this.kind === 'paper' ? 0.9 : 0.5);
    this.scene.tweens.add({
      targets: [this, this.badge],
      x: `+=${dx}`,
      duration: 1200 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  pickUp(): void {
    if (this.picked) return;
    this.picked = true;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.badge);
    const badge = this.badge;
    this.scene.tweens.add({
      targets: [this, badge],
      y: '-=60',
      alpha: 0,
      scale: 0.3,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        badge.destroy();
        this.destroy();
      }
    });
  }

  static labelOf(kind: TrashKind): string {
    return TRASH_TYPES[kind].label;
  }
}
