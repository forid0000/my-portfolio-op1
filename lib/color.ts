/**
 * Tiny colour helpers (safe in server and client code). Used to turn one chosen accent colour
 * into a full 11-step shade ramp, so the admin panel can follow the site's colours without
 * anyone hand-picking eleven values. Input must already be a validated hex colour.
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

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
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

function hslToHex(h: number, s: number, l: number): string {
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
