import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { InputManager, type ButtonName } from '../systems/InputManager';

// 画面下端に大型半透明ボタンを並べる。
// 視覚的に邪魔にならないよう alpha 0.5 程度、配色はテーマ統一。
const COLOR = {
  bg: 0x10131c,
  active: 0xffe066,
  jump: 0xff7a3d,
  pickup: 0x66c674,
  sort: 0x4aa8e0,
  outline: 0xffffff
};

export class TouchControls {
  private scene: Phaser.Scene;
  private input: InputManager;
  private root: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene, input: InputManager) {
    this.scene = scene;
    this.input = input;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(Depth.Hud);
    if (!TouchControls.isTouchLikely()) {
      this.root.setVisible(false);
      return;
    }
    this.visible = true;
    this.buildPad();
  }

  static isTouchLikely(): boolean {
    if (typeof window === 'undefined') return false;
    const navTouch = (navigator.maxTouchPoints ?? 0) > 0;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return navTouch || coarse;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private buildPad(): void {
    const PAD = 24;
    const BTN = 96; // 少し大きく
    const padY = GAME_HEIGHT - BTN / 2 - PAD;
    // 左下：◀ ▶（マリオ十字キー風）
    this.makeButton(PAD + BTN / 2, padY, BTN, '◀', 'left', COLOR.bg);
    this.makeButton(PAD + BTN / 2 + BTN + 10, padY, BTN, '▶', 'right', COLOR.bg);
    // 右下：A=JUMP（大）/ B=分別（アクション）
    const baseX = GAME_WIDTH - PAD - BTN / 2;
    this.makeButton(baseX, padY, BTN, 'A\nJUMP', 'jump', COLOR.jump);
    this.makeButton(baseX - BTN - 10, padY, BTN, 'B\n分別', 'action', COLOR.sort);
  }

  private makeButton(x: number, y: number, size: number, label: string, name: ButtonName, color: number): void {
    const ring = this.scene.add
      .circle(x, y, size / 2 + 4, COLOR.outline, 0.15)
      .setDepth(Depth.Hud);
    const bg = this.scene.add
      .circle(x, y, size / 2, color, 0.55)
      .setStrokeStyle(3, COLOR.outline, 0.65)
      .setInteractive({ useHandCursor: true, draggable: false })
      .setDepth(Depth.Hud);
    const t = this.scene.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);
    this.root.add([ring, bg, t]);

    const down = () => {
      this.input.setVirtualButton(name, true);
      bg.setFillStyle(COLOR.active, 0.85);
      this.scene.tweens.add({ targets: [bg, t], scale: 0.92, duration: 60, yoyo: true });
    };
    const up = () => {
      this.input.setVirtualButton(name, false);
      bg.setFillStyle(color, 0.55);
    };
    bg.on('pointerdown', down);
    bg.on('pointerup', up);
    bg.on('pointerupoutside', up);
    bg.on('pointerout', up);
  }
}
