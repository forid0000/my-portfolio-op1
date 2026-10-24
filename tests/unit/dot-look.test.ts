import { describe, expect, it } from 'vitest';
import {
  REST_ALPHA,
  REST_COLOR_CSS,
  buildLook,
  chroma,
  contrast,
  luminance,
  mix,
  over,
  parseRgb,
  restTint,
  rgba,
  type Rgb,
} from '@/lib/dot-look';
import { THEME_PRESETS, presetPalette } from '@/lib/theme-presets';
import { THEME_DEFAULTS } from '@/lib/theme-model';

const hex = (value: string): Rgb => {
  const v = value.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as Rgb;
};
const lookFor = (p: { primary: string; foreground: string; background: string }) =>
  buildLook({
    primary: hex(p.primary),
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
    expect(over([100, 100, 100], 0.5, [0, 0, 0])).toEqual([50, 50, 50]);
    expect(chroma([10, 10, 10])).toBe(0);
    expect(chroma([0, 255, 0])).toBe(1);
    expect(luminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(luminance([0, 0, 0])).toBe(0);
  });

  it('builds the resting tint the same way as the plain CSS grid', () => {
    // 40% of the brand colour kept (the rest is grey), then half way toward the text colour
    expect(restTint([200, 0, 0], [0, 0, 200])).toEqual(
      mix(mix([200, 0, 0], [128, 128, 128], 0.6), [0, 0, 200], 0.5)
    );
    expect(REST_COLOR_CSS).toBe(
      'color-mix(in srgb, color-mix(in srgb, var(--primary) 40%, #808080) 50%, var(--foreground))'
    );
  });

  it('is much quieter than the old neon look: weak strengths on a dark and a light page', () => {
    for (const bg of ['#1d232a', '#ffffff']) {
      const look = lookFor({ ...THEME_DEFAULTS, background: bg });
      expect(look.restAlpha).toBe(REST_ALPHA);
      expect(look.restAlpha).toBeLessThanOrEqual(0.1);
      expect(look.haloAlpha).toBeLessThanOrEqual(0.16);
      expect(look.lineAlpha).toBeLessThanOrEqual(0.3);
      expect(look.spotAlpha).toBeLessThanOrEqual(0.06);
      expect(look.coreAlpha).toBeLessThanOrEqual(0.45);
    }
  });

  describe.each(THEME_PRESETS.map((p) => [p.name, p] as const))('%s', (_name, preset) => {
    const palette = presetPalette(preset);
    const look = lookFor(palette);
    const background = hex(palette.background);

    it('is calm: one muted tint, far less colourful than the brand colour', () => {
      const brand = chroma(hex(palette.primary));
      const text = chroma(hex(palette.foreground));
      for (const c of [look.rest, look.core, look.halo, look.line]) {
        // by construction: at most a third of the brand colour plus what the text colour itself carries
        expect(chroma(c)).toBeLessThanOrEqual(0.24 * brand + 0.5 * text + 0.01);
        // a neutral text colour (most schemes) leaves a faint tint, never a vivid one
        if (text < 0.15) expect(chroma(c)).toBeLessThanOrEqual(0.23);
      }
    });

    it('is still there: the resting dots and the excited dots can be seen on the page', () => {
      expect(contrast(over(look.rest, look.restAlpha, background), background)).toBeGreaterThan(
        1.03
      );
      expect(contrast(over(look.core, look.coreAlpha, background), background)).toBeGreaterThan(
        1.2
      );
      expect(contrast(over(look.line, look.lineAlpha, background), background)).toBeGreaterThan(
        1.1
      );
    });

    it('stays below the text: even the strongest dot is far weaker than the text colour', () => {
      const text = hex(palette.foreground);
      const strongest = over(look.core, look.coreAlpha, background);
      expect(contrast(strongest, background)).toBeLessThan(contrast(text, background) / 2);
    });

    it('tells light pages from dark ones', () => {
      expect(look.light).toBe(luminance(background) > 0.2);
    });
  });
});
