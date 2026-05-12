import Phaser from 'phaser';
import type { TrashKind } from '../data/trashTypes';

// 同じ種類のゴミを連続で拾うとコンボが伸びる。
// 違う種類を拾う、ダメージを受ける等でリセット。
export class ComboManager extends Phaser.Events.EventEmitter {
  private _count = 0;
  private _max = 0;
  private _last: TrashKind | null = null;

  get count(): number {
    return this._count;
  }
  get max(): number {
    return this._max;
  }

  // ゴミを拾った時に呼ぶ。新しいコンボ数を返す。
  registerPick(kind: TrashKind): number {
    if (this._last === kind) {
      this._count++;
    } else {
      this._count = 1;
    }
    if (this._count > this._max) this._max = this._count;
    this._last = kind;
    this.emit('change', this._count, kind);
    return this._count;
  }

  reset(): void {
    if (this._count !== 0) {
      this._count = 0;
      this._last = null;
      this.emit('change', 0, null);
    }
  }
}
