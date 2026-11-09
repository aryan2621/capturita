export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const clamp01 = (value: number) => clamp(value, 0, 1);
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const smoothstep = (x: number) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeOutQuart = (x: number) => 1 - (1 - clamp01(x)) ** 4;
export const easeOutBack = (x: number) => 1 + 2.2 * (clamp01(x) - 1) ** 3 + 1.2 * (clamp01(x) - 1) ** 2;
export const easeInOutCubic = (x: number) => {
    const t = clamp01(x);
    return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};
