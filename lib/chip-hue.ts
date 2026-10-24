/**
 * Tags on the public site get a colour from the theme, picked from the label itself so the same
 * word always has the same colour and neighbouring tags differ. Only theme colours are used
 * (see `.chip` in app/globals.css), so every combination is readable on every theme.
 */
export const CHIP_HUES = ['primary', 'secondary', 'info', 'success', 'warning'] as const;
export type ChipHue = (typeof CHIP_HUES)[number];

/** A small, stable hash of the label (case and surrounding spaces do not matter). */
function hash(text: string): number {
  let h = 5381;
  for (const ch of text.trim().toLowerCase()) h = ((h << 5) + h + ch.codePointAt(0)!) >>> 0;
  return h;
}

export function chipHue(label: string): ChipHue {
  return CHIP_HUES[hash(label) % CHIP_HUES.length];
}

/** The classes for a tag: `chip chip-info` and so on. Add size and shape classes next to it. */
export function chipClass(label: string): string {
  return `chip chip-${chipHue(label)}`;
}
