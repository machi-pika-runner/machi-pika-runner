// 算術ユーティリティ

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const approach = (current: number, target: number, step: number): number => {
  if (current < target) return Math.min(current + step, target);
  if (current > target) return Math.max(current - step, target);
  return current;
};

export const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 16進カラー (0xRRGGBB) を t∈[0,1] で線形補間。
export const lerpColor = (from: number, to: number, t: number): number => {
  const tt = clamp(t, 0, 1);
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * tt);
  const g = Math.round(fg + (tg - fg) * tt);
  const b = Math.round(fb + (tb - fb) * tt);
  return (r << 16) | (g << 8) | b;
};

export const hexString = (color: number): string =>
  '#' + color.toString(16).padStart(6, '0');
