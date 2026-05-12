import Phaser from 'phaser';
import {
  SCORE_PICK,
  SCORE_SORT_CORRECT,
  SCORE_SORT_WRONG,
  SCORE_COMBO_STEP,
  getComboTier
} from '../constants';

export class ScoreManager extends Phaser.Events.EventEmitter {
  private _score = 0;
  private _picked = 0;
  private _sortedCorrect = 0;
  private _sortedWrong = 0;

  get score(): number {
    return this._score;
  }
  get picked(): number {
    return this._picked;
  }
  get sortedCorrect(): number {
    return this._sortedCorrect;
  }
  get sortedWrong(): number {
    return this._sortedWrong;
  }

  // コンボ段に応じた倍率込みの加算
  addPick(combo: number): number {
    const tier = getComboTier(combo);
    const base = SCORE_PICK + combo * SCORE_COMBO_STEP;
    const gain = Math.floor(base * tier.multiplier);
    this._score += gain;
    this._picked++;
    this.emit('change', this._score);
    return gain;
  }

  addSortCorrect(combo: number): number {
    const tier = getComboTier(combo);
    const base = SCORE_SORT_CORRECT + combo * SCORE_COMBO_STEP;
    const gain = Math.floor(base * tier.multiplier);
    this._score += gain;
    this._sortedCorrect++;
    this.emit('change', this._score);
    return gain;
  }

  addSortWrong(): number {
    this._score = Math.max(0, this._score + SCORE_SORT_WRONG);
    this._sortedWrong++;
    this.emit('change', this._score);
    return SCORE_SORT_WRONG;
  }

  addBonus(amount: number): void {
    this._score += amount;
    this.emit('change', this._score);
  }

  reset(): void {
    this._score = 0;
    this._picked = 0;
    this._sortedCorrect = 0;
    this._sortedWrong = 0;
    this.emit('change', this._score);
  }
}
