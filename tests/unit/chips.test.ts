import { describe, expect, it } from 'vitest';
import { CHIP_HUES, chipClass, chipHue } from '@/lib/chip-hue';
import { THEME_PRESETS, presetPalette } from '@/lib/theme-presets';
import { contrastRatio, mixHex } from '@/lib/color';
import { THEME_DEFAULTS } from '@/lib/theme-model';

/** The `.chip` rule of app/globals.css, worked out in sRGB like `color-mix(in srgb, ...)`. */
function chipColours(
  palette: { background: string; foreground: string },
  hue: string,
  { textShare = 0.36, fillShare = 0.12 } = {}
) {
  return {
    text: mixHex(palette.foreground, hue, textShare),
    fill: mixHex(palette.background, hue, fillShare),
  };
}

describe('tags', () => {
  it('always gives the same word the same colour, whatever its case', () => {
    expect(chipHue('Branding')).toBe(chipHue('  branding '));
    expect(chipClass('UX')).toBe(chipClass('ux'));
    expect(chipClass('UX')).toMatch(/^chip chip-(primary|secondary|info|success|warning)$/);
  });

  it('uses every colour and not only one', () => {
    const words = [
      'React',
      'Design',
      'Print',
      'Vision',
      'Goal',
      'Skill',
      'Photo',
      'Ads',
      'UX',
      'Web',
    ];
    const seen = new Set(words.map(chipHue));
    expect(seen.size).toBeGreaterThanOrEqual(3);
    for (const hue of seen) expect(CHIP_HUES).toContain(hue);
  });

  describe.each(THEME_PRESETS.map((p) => [p.name, p] as const))('%s', (_name, preset) => {
    const palette = presetPalette(preset);
    it('has readable tag text for every tag colour', () => {
      for (const key of [...CHIP_HUES, 'neutral'] as const) {
        const hue = key === 'neutral' ? palette.foreground : palette[key];
        const { text, fill } = chipColours(palette, hue);
        expect(contrastRatio(text, fill), key).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  it('is readable with the default colours too', () => {
    for (const key of CHIP_HUES) {
      const { text, fill } = chipColours(THEME_DEFAULTS, THEME_DEFAULTS[key]);
      expect(contrastRatio(text, fill), key).toBeGreaterThanOrEqual(4.5);
    }
  });
});
