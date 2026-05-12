import Phaser from 'phaser';
import { Depth, GROUND_Y, Tex } from '../constants';
import { CATEGORIES, type TrashCategory } from '../data/trashTypes';

// 分別ボックス。Sprite ベースで物理ボディを持ち、
// ラベル/プロンプトはシーンに直接追加して位置追従する。
export class SortingBin extends Phaser.Physics.Arcade.Sprite {
  readonly category: TrashCategory;
  private labelText: Phaser.GameObjects.Text;
  private labelBg: Phaser.GameObjects.Rectangle;
  private prompt: Phaser.GameObjects.Text;
  private flashTween?: Phaser.Tweens.Tween;
  private originalTint: number;

  constructor(scene: Phaser.Scene, x: number, category: TrashCategory) {
    super(scene, x, GROUND_Y, Tex.Bin);
    this.category = category;
    const info = CATEGORIES[category];

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 1);
    this.setDepth(Depth.Bin);
    this.setTint(info.color);
    this.originalTint = info.color;

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(96, 96);
    body.setOffset(0, 0);
    body.updateFromGameObject();

    // ラベル（カテゴリ名）
    this.labelBg = scene.add
      .rectangle(x, GROUND_Y - 100, 130, 26, 0xffffff, 1)
      .setStrokeStyle(2, info.color, 1)
      .setDepth(Depth.Bin);
    this.labelText = scene.add
      .text(x, GROUND_Y - 100, `${info.short} ${info.label}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#222222',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Bin);

    // 受入ゴミの記号併記（色だけに頼らない）
    const acceptLetters = info.accepts
      .map((k) => ({ paper: 'P', bottle: 'B', can: 'C', plastic: 'V', food: 'F' })[k])
      .join('/');
    scene.add
      .text(x, GROUND_Y - 80, `受入: ${acceptLetters}`, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#10131caa',
        padding: { x: 4, y: 1 }
      })
      .setOrigin(0.5)
      .setDepth(Depth.Bin);

    this.prompt = scene.add
      .text(x, GROUND_Y - 130, 'F: 分別する', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#066c30',
        padding: { x: 6, y: 2 }
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(Depth.Bin);
  }

  // near: 近接しているか
  // matchingCount: このビンに投入できるゴミの数
  // bagHasItems: 袋に何か入っているか
  setReady(near: boolean, matchingCount: number, bagHasItems: boolean): void {
    if (!near || !bagHasItems) {
      this.prompt.setAlpha(0);
      return;
    }
    this.prompt.setAlpha(1);
    if (matchingCount > 0) {
      this.prompt.setText(`F: ${matchingCount}個 投入できる！`);
      this.prompt.setBackgroundColor('#066c30');
      this.prompt.setColor('#ffffff');
    } else {
      this.prompt.setText('ここでは投入できないよ');
      this.prompt.setBackgroundColor('#641e1e');
      this.prompt.setColor('#ffd1d1');
    }
  }

  flash(color: number): void {
    this.flashTween?.stop();
    this.setTint(color);
    this.flashTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 280,
      onComplete: () => this.setTint(this.originalTint)
    });
  }

  destroy(fromScene?: boolean): void {
    this.labelBg?.destroy();
    this.labelText?.destroy();
    this.prompt?.destroy();
    super.destroy(fromScene);
  }
}
