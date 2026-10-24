import { describe, expect, it } from 'vitest';
import { buildLook, contrast, luminance, mix, parseRgb, rgba, type Rgb } from '@/lib/dot-look';
import { THEME_PRESETS, presetPalette } from '@/lib/theme-presets';
import { THEME_DEFAULTS } from '@/lib/theme-model';

const hex = (value: string): Rgb => {
  const v = value.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as Rgb;
};
const lookFor = (p: {
  primary: string;
  secondary: string;
  foreground: string;
  background: string;
}) =>
  buildLook({
    primary: hex(p.primary),
    secondary: hex(p.secondary),
    foreground: hex(p.foreground),
    background: hex(p.background),
  });

describe('background dots: colours', () => {
  it('reads what the browser reports', () => {
    expect(parseRgb('rgb(52, 211, 153)', [0, 0, 0])).toEqual([52, 211, 153]);
    expect(parseRgb('rgba(1, 2, 3, 0.5)', [0, 0, 0])).toEqual([1, 2, 3]);
    expect(parseRgb('nonsense', [9, 9, 9])).toEqual([9, 9, 9]);
    expect(rgba([52.4, 211.6, 153], 0.4)).toBe('rgba(52, 212, 153, 0.4)');
    expect(mix([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25]);
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(luminance([0, 0, 0])).toBe(0);
  });

  it('adds light on a dark page and paints ink on a light one', () => {
    expect(lookFor(THEME_DEFAULTS).blend).toBe('lighter');
    expect(lookFor({ ...THEME_DEFAULTS, background: '#ffffff', foreground: '#111827' }).blend).toBe(
      'source-over'
    );
  });

  describe.each(THEME_PRESETS.map((p) => [p.name, p] as const))('%s', (_name, preset) => {
    const palette = presetPalette(preset);
    const look = lookFor(palette);
    const background = hex(palette.background);

    it('keeps the excited dots, their halo and the lines visible on the page', () => {
      expect(contrast(look.core, background)).toBeGreaterThanOrEqual(2.2);
      // the halo is a soft wash: it only has to be clearly different from the page
      expect(contrast(look.halo, background)).toBeGreaterThanOrEqual(1.6);
      expect(contrast(look.line, background)).toBeGreaterThanOrEqual(2.2);
    });

    it('draws ink on light pages and light on dark ones', () => {
      expect(look.light).toBe(luminance(background) > 0.2);
      expect(look.blend).toBe(look.light ? 'source-over' : 'lighter');
    });
  });
});
