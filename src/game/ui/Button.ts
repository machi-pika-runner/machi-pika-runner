import Phaser from 'phaser';
import { Sound } from '../systems/SoundService';

export interface ButtonStyle {
  width?: number;
  height?: number;
  bg?: number;
  bgHover?: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  border?: number;
}

// 共通のテキストボタン。タイトル・リザルトの両方で使う。
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private bgColor: number;
  private hoverColor: number;
  private onClickCb: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, style: ButtonStyle = {}) {
    super(scene, x, y);
    const w = style.width ?? 240;
    const h = style.height ?? 56;
    this.bgColor = style.bg ?? 0xff7a3d;
    this.hoverColor = style.bgHover ?? 0xffa672;
    this.onClickCb = onClick;

    this.bg = scene.add
      .rectangle(0, 0, w, h, this.bgColor, 1)
      .setStrokeStyle(style.border ?? 3, 0xffffff, 1);
    this.label = scene.add
      .text(0, 0, label, {
        fontFamily: 'sans-serif',
        fontSize: `${style.fontSize ?? 22}px`,
        color: style.textColor ?? '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(w, h);

    scene.add.existing(this);

    this.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerover', () => {
      this.bg.setFillStyle(this.hoverColor, 1);
      Sound.play('hover');
    });
    this.on('pointerout', () => this.bg.setFillStyle(this.bgColor, 1));
    this.on('pointerdown', () => {
      this.scene.tweens.add({ targets: this, scale: 0.95, duration: 80, yoyo: true });
      Sound.unlock();
      Sound.play('button');
      this.onClickCb();
    });
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }
}
