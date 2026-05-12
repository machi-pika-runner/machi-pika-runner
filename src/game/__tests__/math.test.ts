import { describe, it, expect } from 'vitest';
import { clamp, lerpColor, hexString, approach, pick } from '../utils/math';
import { getComboTier, COMBO_TIERS } from '../constants';

describe('clamp', () => {
  it('clips below min and above max', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('approach', () => {
  it('approaches the target without overshoot', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(10, 5, 3)).toBe(7);
    expect(approach(5, 5, 3)).toBe(5);
  });
});

describe('lerpColor / hexString', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });
  it('mixes channels at t=0.5', () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });
  it('clamps t outside [0,1]', () => {
    expect(lerpColor(0x000000, 0xffffff, -1)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 2)).toBe(0xffffff);
  });
  it('hexString pads to 6 digits', () => {
    expect(hexString(0xff)).toBe('#0000ff');
    expect(hexString(0xa1b2c3)).toBe('#a1b2c3');
  });
});

describe('pick', () => {
  it('returns an element of the array', () => {
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 20; i++) expect(arr).toContain(pick(arr));
  });
});

describe('getComboTier', () => {
  it('returns multiplier 1.0 for combo 0/1', () => {
    expect(getComboTier(0).multiplier).toBe(1.0);
    expect(getComboTier(1).multiplier).toBe(1.0);
  });
  it('progresses through tiers', () => {
    expect(getComboTier(2).multiplier).toBe(1.2);
    expect(getComboTier(4).multiplier).toBe(1.5);
    expect(getComboTier(7).multiplier).toBe(2.0);
    expect(getComboTier(10).multiplier).toBe(2.5);
    expect(getComboTier(99).multiplier).toBe(2.5);
  });
  it('thresholds are strictly decreasing', () => {
    for (let i = 0; i < COMBO_TIERS.length - 1; i++) {
      expect(COMBO_TIERS[i].threshold).toBeGreaterThan(COMBO_TIERS[i + 1].threshold);
    }
  });
});
