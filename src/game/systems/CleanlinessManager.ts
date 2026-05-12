import Phaser from 'phaser';
import { clamp } from '../utils/math';

export class CleanlinessManager extends Phaser.Events.EventEmitter {
  private _value = 30; // ステージ開始時のクリーン度（街は少し汚れた状態）

  get value(): number {
    return this._value;
  }

  add(delta: number): void {
    const before = this._value;
    this._value = clamp(this._value + delta, 0, 100);
    if (before !== this._value) this.emit('change', this._value, delta);
  }

  reset(initial = 30): void {
    this._value = initial;
    this.emit('change', this._value, 0);
  }
}
