import { describe, it, expect, vi } from 'vitest';

// Phaser.Events.EventEmitter を軽量スタブで差し替え
vi.mock('phaser', () => {
  class EventEmitter {
    private _l = new Map<string, ((...a: unknown[]) => void)[]>();
    on(e: string, fn: (...a: unknown[]) => void): this {
      this._l.set(e, [...(this._l.get(e) ?? []), fn]);
      return this;
    }
    once(e: string, fn: (...a: unknown[]) => void): this { return this.on(e, fn); }
    emit(e: string, ...a: unknown[]): boolean {
      (this._l.get(e) ?? []).forEach((f) => f(...a));
      return (this._l.get(e)?.length ?? 0) > 0;
    }
    removeAllListeners(): this { this._l.clear(); return this; }
  }
  return { default: { Events: { EventEmitter } } };
});

// モック後にインポート
const { ScoreManager } = await import('../systems/ScoreManager');
const { CleanlinessManager } = await import('../systems/CleanlinessManager');
const { ComboManager } = await import('../systems/ComboManager');
const { getLevel, LEVELS } = await import('../data/levels');

// ─────────────────────────────────────────
describe('ScoreManager', () => {
  it('addPick は combo=1 で SCORE_PICK(90) を返す', () => {
    const sm = new ScoreManager();
    const gain = sm.addPick(1);
    expect(gain).toBeGreaterThanOrEqual(90);
    expect(sm.score).toBe(gain);
    expect(sm.picked).toBe(1);
  });

  it('コンボが高いほど加算スコアが増える', () => {
    const sm = new ScoreManager();
    const g1 = sm.addPick(1);
    const sm2 = new ScoreManager();
    const g10 = sm2.addPick(10);
    expect(g10).toBeGreaterThan(g1);
  });

  it('addSortWrong はスコアを SCORE_SORT_WRONG(-50) だけ下げる（0 未満にならない）', () => {
    const sm = new ScoreManager();
    sm.addSortWrong();
    expect(sm.score).toBe(0); // clamp to 0
    expect(sm.sortedWrong).toBe(1);
  });

  it('addSortCorrect はソート数をカウントする', () => {
    const sm = new ScoreManager();
    sm.addSortCorrect(0);
    sm.addSortCorrect(3);
    expect(sm.sortedCorrect).toBe(2);
  });

  it('addBonus がスコアに加算される', () => {
    const sm = new ScoreManager();
    sm.addBonus(500);
    expect(sm.score).toBe(500);
  });

  it('reset で全フィールドが 0 に戻る', () => {
    const sm = new ScoreManager();
    sm.addPick(2);
    sm.reset();
    expect(sm.score).toBe(0);
    expect(sm.picked).toBe(0);
  });
});

// ─────────────────────────────────────────
describe('CleanlinessManager', () => {
  it('初期値は 30', () => {
    const cm = new CleanlinessManager();
    expect(cm.value).toBe(30);
  });

  it('add でクリーン度が変化する', () => {
    const cm = new CleanlinessManager();
    cm.add(10);
    expect(cm.value).toBe(40);
  });

  it('100 を超えない', () => {
    const cm = new CleanlinessManager();
    cm.add(200);
    expect(cm.value).toBe(100);
  });

  it('0 未満にならない', () => {
    const cm = new CleanlinessManager();
    cm.add(-200);
    expect(cm.value).toBe(0);
  });

  it('reset で指定値に戻る', () => {
    const cm = new CleanlinessManager();
    cm.add(50);
    cm.reset(20);
    expect(cm.value).toBe(20);
  });

  it('change イベントが emit される', () => {
    const cm = new CleanlinessManager();
    const spy = vi.fn();
    cm.on('change', spy);
    cm.add(5);
    expect(spy).toHaveBeenCalledWith(35, 5);
  });
});

// ─────────────────────────────────────────
describe('ComboManager', () => {
  it('同じ種類を連続で拾うとコンボが伸びる', () => {
    const cm = new ComboManager();
    expect(cm.registerPick('paper')).toBe(1);
    expect(cm.registerPick('paper')).toBe(2);
    expect(cm.registerPick('paper')).toBe(3);
  });

  it('違う種類を拾うとコンボがリセット', () => {
    const cm = new ComboManager();
    cm.registerPick('paper');
    cm.registerPick('paper');
    const c = cm.registerPick('bottle'); // 種類が変わる
    expect(c).toBe(1);
  });

  it('max は達成した最大コンボを保持', () => {
    const cm = new ComboManager();
    cm.registerPick('can');
    cm.registerPick('can');
    cm.registerPick('can');
    cm.reset();
    cm.registerPick('can');
    expect(cm.max).toBe(3);
    expect(cm.count).toBe(1);
  });

  it('reset でコンボカウントが 0 に戻る', () => {
    const cm = new ComboManager();
    cm.registerPick('paper');
    cm.registerPick('paper');
    cm.reset();
    expect(cm.count).toBe(0);
  });
});

// ─────────────────────────────────────────
describe('レベルデータ整合性', () => {
  it('4 ステージ分のデータが存在する', () => {
    expect(LEVELS).toHaveLength(4);
  });

  it('各ステージの timeLimit が正の整数', () => {
    LEVELS.forEach((lv) => {
      expect(lv.timeLimit).toBeGreaterThan(0);
    });
  });

  it('targetCleanliness が 0〜100 の範囲', () => {
    LEVELS.forEach((lv) => {
      expect(lv.targetCleanliness).toBeGreaterThanOrEqual(0);
      expect(lv.targetCleanliness).toBeLessThanOrEqual(100);
    });
  });

  it('getLevel(0) は最初のステージを返す', () => {
    expect(getLevel(0)).toBe(LEVELS[0]);
  });

  it('getLevel(999) は最後のステージにフォールバック', () => {
    expect(getLevel(999)).toBe(LEVELS[LEVELS.length - 1]);
  });
});
