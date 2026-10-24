/**
 * Tiny colour helpers (safe in server and client code). Used to turn one chosen accent colour
 * into a full 11-step shade ramp (so the admin panel can follow the site's colours), to derive
 * the colour tokens that depend on the chosen palette (readable text colours, chart colours,
 * glow triplets) and to check contrast. Input must already be a validated hex colour.
 */

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{3,8})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: Rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

// Lightness of each step on a dark admin surface: 400 is the text/icon accent, 500-600 the
// filled buttons, 900-950 the tinted backgrounds. Fixed on purpose so contrast never depends
// on how light or dark the chosen colour is.
const STEPS: Record<string, number> = {
  '50': 0.97,
  '100': 0.93,
  '200': 0.86,
  '300': 0.77,
  '400': 0.67,
  '500': 0.56,
  '600': 0.47,
  '700': 0.39,
  '800': 0.31,
  '900': 0.25,
  '950': 0.15,
};

/** Shade ramp (50..950) of a hex colour; a grey input gives a neutral grey ramp. */
export function shadesFromHex(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex) ?? [52, 211, 153];
  const [h, s] = rgbToHsl(rgb);
  const saturation = s < 0.08 ? s : Math.min(0.95, Math.max(0.45, s));
  return Object.fromEntries(
    Object.entries(STEPS).map(([step, lightness]) => [step, hslToHex(h, saturation, lightness)])
  );
}

/** `r g b` triplet (space separated) for `rgb(var(--x-rgb) / 0.4)` style CSS. */
export function rgbTriplet(hex: string): string {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  return rgb.join(' ');
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. Body text needs 4.5, large text 3. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** True when white text reads better than black on this background. */
export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.4;
}

/** Black or white, whichever is easier to read on `background`. */
export function readableOn(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#000000')
    ? '#ffffff'
    : '#000000';
}

/**
 * `count` evenly spaced hues around the wheel starting at `base`, with the base colour's own
 * saturation and lightness (clamped so every colour stays visible on `background`). Used for
 * charts and any other place that needs several distinct, palette-matched colours.
 */
export function huePalette(base: string, background: string, count: number): string[] {
  const rgb = hexToRgb(base) ?? [52, 211, 153];
  const [h, s, l] = rgbToHsl(rgb);
  const dark = isDarkColor(background);
  const lightness = dark ? Math.min(0.72, Math.max(0.55, l)) : Math.min(0.5, Math.max(0.36, l));
  const saturation = Math.min(0.85, Math.max(0.5, s));
  return Array.from({ length: count }, (_, i) =>
    hslToHex((h + (360 / count) * i) % 360, saturation, lightness)
  );
}

/** `t` of the way from `a` to `b` (0 = a, 1 = b), as a 6-digit hex. */
export function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a) ?? [0, 0, 0];
  const rb = hexToRgb(b) ?? [0, 0, 0];
  return (
    '#' +
    ra
      .map((v, i) =>
        Math.round(v + (rb[i] - v) * t)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/**
 * The softest colour on the way from `from` to `to` that still reaches `minContrast` against
 * every colour in `against`. Starts at `from` itself when nothing softer is readable. Used to
 * derive a secondary-text colour that is as quiet as possible and still legible.
 */
export function softenForContrast(
  from: string,
  to: string,
  against: string[],
  minContrast: number
): string {
  for (let t = 1; t > 0.0001; t -= 0.05) {
    const candidate = mixHex(from, to, t);
    if (against.every((bg) => contrastRatio(candidate, bg) >= minContrast)) return candidate;
  }
  return from;
}

/**
 * The grey that reads equally well on both `a` and `b` (equal contrast against each). For a page
 * and its cards that are opposite in tone, this is the best single colour for quiet text.
 */
export function balancedGray(a: string, b: string): string {
  let lo = 0;
  let hi = 255;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const hex = '#' + Math.round(mid).toString(16).padStart(2, '0').repeat(3);
    // Darker grey: more contrast against the lighter surface, less against the darker one.
    const lighter = luminance(a) >= luminance(b) ? a : b;
    const darker = lighter === a ? b : a;
    if (contrastRatio(hex, lighter) > contrastRatio(hex, darker)) lo = mid;
    else hi = mid;
  }
  const level = Math.round((lo + hi) / 2);
  return '#' + level.toString(16).padStart(2, '0').repeat(3);
}

/** Hue (0-360), saturation and lightness (0-1) of a hex colour. */
export function hslOf(hex: string): [number, number, number] {
  return rgbToHsl(hexToRgb(hex) ?? [0, 0, 0]);
}

/**
 * `hex` moved along its own lightness (same hue and saturation) until it reaches `minContrast`
 * against every colour in `against`: darker on a light surface, lighter on a dark one. Returns
 * the colour unchanged when it already reads, and the best the lightness range allows otherwise.
 */
export function ensureContrast(hex: string, against: string[], minContrast: number): string {
  const ok = (c: string) => against.every((bg) => contrastRatio(c, bg) >= minContrast);
  if (ok(hex)) return hex;
  const [h, s, l] = hslOf(hex);
  // On a light surface go darker, on a dark one lighter.
  const lighter = against.every((bg) => !isDarkColor(bg)) ? -1 : 1;
  let best = hex;
  for (let step = 1; step <= 100; step++) {
    const next = Math.min(1, Math.max(0, l + (lighter * step) / 100));
    best = hslToHex(h, s, next);
    if (ok(best)) return best;
    if (next === 0 || next === 1) break;
  }
  return best;
}
