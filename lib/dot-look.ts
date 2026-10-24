/**
 * Colours of the interactive background dots (components/dot-weave.tsx), worked out from the live
 * theme. Pure, so the unit tests can check every theme preset: on a light page the effect is drawn
 * in deeper, "inkier" versions of the theme colours; on a dark page it is drawn as added light.
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

/** The colours and blend used for the excited dots, chosen from the page's tone. */
export interface Look {
  light: boolean;
  core: Rgb;
  halo: Rgb;
  line: Rgb;
  /** 'lighter' adds light on a dark page; 'source-over' paints ink on a light one. */
  blend: 'lighter' | 'source-over';
  haloAlpha: number;
  lineAlpha: number;
  spotAlpha: number;
}

/** Luminance where black and white text read equally well; lighter pages get ink, darker get light. */
const TONE_PIVOT = 0.2;

export function buildLook(colors: {
  primary: Rgb;
  secondary: Rgb;
  foreground: Rgb;
  background: Rgb;
}): Look {
  const { primary, secondary, foreground, background } = colors;
  if (luminance(background) > TONE_PIVOT) {
    // Ink on paper: the theme colours pulled toward the text colour so they keep their punch.
    return {
      light: true,
      core: mix(primary, foreground, 0.2),
      halo: mix(secondary, foreground, 0.1),
      line: mix(primary, foreground, 0.25),
      blend: 'source-over',
      haloAlpha: 0.32,
      lineAlpha: 0.5,
      spotAlpha: 0.1,
    };
  }
  // Light on dark: the theme colours lifted a little and added to what is already there.
  return {
    light: false,
    core: mix(primary, [255, 255, 255], 0.2),
    halo: secondary,
    line: mix(primary, [255, 255, 255], 0.1),
    blend: 'lighter',
    haloAlpha: 0.5,
    lineAlpha: 0.45,
    spotAlpha: 0.16,
  };
}
