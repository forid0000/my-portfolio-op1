/**
 * Colours of the interactive background dots (components/dot-weave.tsx), worked out from the live
 * theme. Pure, so the unit tests can check every theme preset.
 *
 * The look is deliberately calm: one muted tint (the brand colour with most of its colour taken out
 * and pulled toward the text colour), painted at low strength with ordinary alpha blending, on a
 * light page and on a dark one. No added light, no second colour, no glow, so the background never
 * competes with the content or tires the eyes.
 */
export type Rgb = [number, number, number];

/** "rgb(52, 211, 153)" (what the browser reports for a resolved colour) -> [52, 211, 153]. */
export function parseRgb(css: string, fallback: Rgb): Rgb {
  const parts = css.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return fallback;
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

export const rgba = (c: Rgb, a: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Relative luminance 0..1 (sRGB). */
export function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `fg` laid over `bg` at opacity `alpha`: what the eye actually sees. */
export function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return mix(bg, fg, alpha);
}

/** How colourful a colour is, 0 (grey) to 1 (fully saturated): the spread of its channels. */
export function chroma([r, g, b]: Rgb): number {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

const GREY: Rgb = [128, 128, 128];
/** How much of the brand colour's colour is kept, and how far the tint leans toward the text colour. */
const KEEP_COLOUR = 0.4;
const TOWARD_TEXT = 0.5;

/**
 * The tint of the resting dots. The static CSS grid builds the very same colour with nested
 * `color-mix()` (REST_COLOR_CSS), so the canvas and the plain grid are one picture.
 */
export function restTint(primary: Rgb, foreground: Rgb): Rgb {
  return mix(mix(primary, GREY, 1 - KEEP_COLOUR), foreground, TOWARD_TEXT);
}
const pct = (v: number) => `${Math.round(v * 100)}%`;
export const REST_COLOR_CSS = `color-mix(in srgb, color-mix(in srgb, var(--primary) ${pct(KEEP_COLOUR)}, #808080) ${pct(1 - TOWARD_TEXT)}, var(--foreground))`;
/** Strength of a resting dot (the CSS grid draws the same). */
export const REST_ALPHA = 0.09;

/** The colours and strengths used for the excited dots. */
export interface Look {
  light: boolean;
  rest: Rgb;
  restAlpha: number;
  core: Rgb;
  halo: Rgb;
  line: Rgb;
  /** Strongest alpha of a core / halo / line / the light under the pointer. */
  coreAlpha: number;
  haloAlpha: number;
  lineAlpha: number;
  spotAlpha: number;
}

/** Luminance where black and white text read equally well; lighter pages count as light. */
const TONE_PIVOT = 0.2;

export function buildLook(colors: { primary: Rgb; foreground: Rgb; background: Rgb }): Look {
  const { primary, foreground, background } = colors;
  const light = luminance(background) > TONE_PIVOT;
  const base = mix(primary, GREY, 1 - KEEP_COLOUR);
  return {
    light,
    rest: restTint(primary, foreground),
    restAlpha: REST_ALPHA,
    core: mix(base, foreground, 0.4),
    halo: mix(base, foreground, 0.5),
    line: mix(base, foreground, TOWARD_TEXT),
    // A light page shows ink a little more strongly than a dark page shows pale dots.
    coreAlpha: light ? 0.4 : 0.36,
    haloAlpha: light ? 0.14 : 0.12,
    lineAlpha: light ? 0.26 : 0.22,
    spotAlpha: light ? 0.05 : 0.045,
  };
}
