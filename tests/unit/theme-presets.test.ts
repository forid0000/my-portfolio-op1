import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/color';
import { THEME_PRESETS, presetPalette } from '@/lib/theme-presets';
import {
  THEME_COLOR_KEYS,
  THEME_DEFAULTS,
  sanitizeTheme,
  themeCssVariables,
} from '@/lib/theme-model';

const HEX = /^#[0-9a-f]{6}$/i;

describe('theme presets', () => {
  it('offers plenty of schemes in each group, with unique ids and names', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(40);
    for (const group of ['light', 'dark', 'mixed'] as const) {
      expect(THEME_PRESETS.filter((p) => p.group === group).length).toBeGreaterThanOrEqual(10);
    }
    expect(new Set(THEME_PRESETS.map((p) => p.id)).size).toBe(THEME_PRESETS.length);
    expect(new Set(THEME_PRESETS.map((p) => p.name)).size).toBe(THEME_PRESETS.length);
  });

  it('keeps the default scheme identical to the built-in default colours', () => {
    const midnight = THEME_PRESETS.find((p) => p.id === 'midnight');
    expect(midnight).toBeDefined();
    const palette = presetPalette(midnight!);
    expect(palette.background).toBe(THEME_DEFAULTS.background);
    expect(palette.card).toBe(THEME_DEFAULTS.card);
    expect(palette.primary).toBe(THEME_DEFAULTS.primary);
    expect(palette.border).toBe(THEME_DEFAULTS.border);
  });

  describe.each(THEME_PRESETS.map((p) => [p.name, p] as const))('%s', (_name, preset) => {
    const palette = presetPalette(preset);

    it('defines every colour as a valid hex', () => {
      for (const key of THEME_COLOR_KEYS) expect(palette[key], key).toMatch(HEX);
    });

    it('has readable body text on the page and on cards', () => {
      expect(contrastRatio(palette.foreground, palette.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.cardForeground, palette.card)).toBeGreaterThanOrEqual(4.5);
    });

    it('has readable text on buttons', () => {
      expect(contrastRatio(palette.primaryForeground, palette.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.secondaryForeground, palette.secondary)).toBeGreaterThanOrEqual(
        4.5
      );
    });

    it('keeps quiet text and brand colours visible on the page and on cards', () => {
      for (const surface of [palette.background, palette.card]) {
        expect(contrastRatio(palette.mutedForeground, surface)).toBeGreaterThanOrEqual(3.5);
        expect(contrastRatio(palette.primary, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(palette.secondary, palette.background)).toBeGreaterThanOrEqual(3);
    });

    it('keeps status colours visible on the page', () => {
      for (const key of ['destructive', 'success', 'warning', 'info'] as const) {
        expect(contrastRatio(palette[key], palette.background), key).toBeGreaterThanOrEqual(3);
      }
    });

    it('survives sanitising unchanged and yields a complete set of CSS variables', () => {
      const theme = sanitizeTheme({ ...palette });
      for (const key of THEME_COLOR_KEYS) expect(theme[key]).toBe(palette[key]);
      const vars = themeCssVariables(theme);
      expect(vars['--background']).toBe(palette.background);
      expect(vars['--chart-12']).toMatch(HEX);
      expect(['dark', 'light']).toContain(vars['color-scheme']);
    });
  });
});
