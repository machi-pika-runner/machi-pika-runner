// PCキーボードを抽象化する層。
// 後からタッチボタンを追加する際は setVirtualButton() で論理ボタンを差し込めるようにしている。

import Phaser from 'phaser';

export type ButtonName = 'left' | 'right' | 'jump' | 'duck' | 'pickup' | 'sort' | 'action' | 'pause' | 'restart';

export class InputManager {
  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private virtual: Partial<Record<ButtonName, boolean>> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bindKeys();
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) {
      this.keys = {} as Record<string, Phaser.Input.Keyboard.Key>;
      return;
    }
    this.keys = {
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      F: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      Z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      X: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      P: kb.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      R: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      ENTER: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    };
  }

  // 押下中
  isDown(b: ButtonName): boolean {
    if (this.virtual[b]) return true;
    switch (b) {
      case 'left':
        return this.keys.LEFT?.isDown || this.keys.A?.isDown;
      case 'right':
        return this.keys.RIGHT?.isDown || this.keys.D?.isDown;
      case 'jump':
        return this.keys.SPACE?.isDown || this.keys.UP?.isDown || this.keys.W?.isDown;
      case 'duck':
        return this.keys.DOWN?.isDown || this.keys.S?.isDown;
      case 'pickup':
        return this.keys.E?.isDown;
      case 'sort':
        return this.keys.F?.isDown;
      case 'action':
        return this.keys.Z?.isDown || this.keys.X?.isDown;
      case 'pause':
        return this.keys.P?.isDown;
      case 'restart':
        return this.keys.R?.isDown;
      default:
        return false;
    }
  }

  // 押した瞬間（エッジ）
  justPressed(b: ButtonName): boolean {
    const j = (k: Phaser.Input.Keyboard.Key | undefined): boolean =>
      !!k && Phaser.Input.Keyboard.JustDown(k);
    switch (b) {
      case 'jump':
        return j(this.keys.SPACE) || j(this.keys.UP) || j(this.keys.W);
      case 'pickup':
        return j(this.keys.E);
      case 'sort':
        return j(this.keys.F);
      case 'action':
        return j(this.keys.Z) || j(this.keys.X);
      case 'pause':
        return j(this.keys.P);
      case 'restart':
        return j(this.keys.R);
      default:
        return false;
    }
  }

  // 仮想ボタン用（タッチUIなどから）
  setVirtualButton(b: ButtonName, down: boolean): void {
    this.virtual[b] = down;
  }

  // 全入力を解除（blur / visibilitychange / scene resume などで使う）。
  // keyboard.resetKeys は Phaser のキー状態を全クリアする。
  resetAll(): void {
    this.virtual = {};
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    if (typeof kb.resetKeys === 'function') {
      kb.resetKeys();
    } else {
      // フォールバック：各キーを isDown=false に
      Object.values(this.keys).forEach((k) => {
        if (k && typeof k.reset === 'function') k.reset();
      });
    }
  }

  // 診断用：全ボタンの現在状態を返す
  debugSnapshot(): {
    logical: Record<ButtonName, boolean>;
    keyboard: Record<string, boolean>;
    virtual: Record<string, boolean>;
  } {
    const names: ButtonName[] = ['left', 'right', 'jump', 'duck', 'pickup', 'sort', 'action', 'pause', 'restart'];
    const logical = {} as Record<ButtonName, boolean>;
    names.forEach((n) => { logical[n] = this.isDown(n); });
    const keyboard: Record<string, boolean> = {};
    Object.entries(this.keys).forEach(([k, key]) => { keyboard[k] = !!key?.isDown; });
    return {
      logical,
      keyboard,
      virtual: { ...this.virtual } as Record<string, boolean>
    };
  }

  destroy(): void {
    this.virtual = {};
  }
}
