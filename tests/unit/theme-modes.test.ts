import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { contrastRatio, isDarkColor, mixHex } from '@/lib/color';
import { THEME_PRESETS, presetPalette } from '@/lib/theme-presets';
import { THEME_COLOR_KEYS, THEME_DEFAULTS, sanitizeTheme, type SiteTheme } from '@/lib/theme-model';
import {
  THEME_STORAGE_KEY,
  alternatePalette,
  alternatePresets,
  alternateTheme,
  deriveAlternate,
  siteThemeCss,
  themeSwitchFor,
  visitorModeCss,
  visitorModeScript,
} from '@/lib/theme-modes';

const HEX = /^#[0-9a-f]{6}$/i;
const themeOf = (preset: (typeof THEME_PRESETS)[number]): SiteTheme =>
  sanitizeTheme({ ...presetPalette(preset) });

describe('visitor theme: settings', () => {
  it('defaults to a switch, and keeps only valid choices', () => {
    expect(THEME_DEFAULTS.visitorTheme).toBe('switch');
    expect(sanitizeTheme({}).visitorTheme).toBe('switch');
    expect(sanitizeTheme({ visitorTheme: 'fixed' }).visitorTheme).toBe('fixed');
    expect(sanitizeTheme({ visitorTheme: 'device' }).visitorTheme).toBe('device');
    expect(sanitizeTheme({ visitorTheme: 'anything' as never }).visitorTheme).toBe('switch');
  });

  it('keeps a scheme id only when it looks like one (nothing that could reach the CSS)', () => {
    expect(sanitizeTheme({ altPreset: 'clean-white' }).altPreset).toBe('clean-white');
    for (const bad of ['', 'Has Space', 'a;b', '</style>', 'x'.repeat(60), 12 as never]) {
      expect(sanitizeTheme({ altPreset: bad }).altPreset).toBe('');
    }
  });

  it('shows the button unless the owner chose "same for everyone"', () => {
    expect(themeSwitchFor(sanitizeTheme({ visitorTheme: 'fixed' }))).toBeNull();
    expect(themeSwitchFor(THEME_DEFAULTS)).toEqual({ mainDark: true });
    expect(themeSwitchFor(sanitizeTheme({ ...presetPalette(THEME_PRESETS[0]) }))).toEqual({
      mainDark: false,
    });
  });
});

describe('visitor theme: the switched look is made from the owner colours', () => {
  const mains = [
    ['the default theme', THEME_DEFAULTS],
    ...THEME_PRESETS.map((p) => [p.name, themeOf(p)] as const),
  ] as const;

  describe.each(mains)('%s', (_name, main) => {
    const alt = deriveAlternate(main);

    it('is the opposite tone', () => {
      expect(isDarkColor(alt.background)).toBe(!isDarkColor(main.background));
    });

    it('defines every colour as a valid hex', () => {
      for (const key of THEME_COLOR_KEYS) expect(alt[key], key).toMatch(HEX);
    });

    it('keeps text readable: page, cards, buttons, quiet text, brand colours, fields', () => {
      expect(contrastRatio(alt.foreground, alt.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(alt.cardForeground, alt.card)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(alt.primaryForeground, alt.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(alt.secondaryForeground, alt.secondary)).toBeGreaterThanOrEqual(4.5);
      for (const surface of [alt.background, alt.card]) {
        expect(contrastRatio(alt.mutedForeground, surface)).toBeGreaterThanOrEqual(3.5);
        expect(contrastRatio(alt.primary, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(alt.secondary, alt.background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(alt.foreground, alt.input)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(alt.mutedForeground, alt.input)).toBeGreaterThanOrEqual(3);
      const edge = mixHex(alt.background, alt.foreground, 0.2);
      expect(contrastRatio(edge, alt.background)).toBeGreaterThanOrEqual(1.3);
      for (const key of ['destructive', 'success', 'warning', 'info'] as const) {
        expect(contrastRatio(alt[key], alt.background), key).toBeGreaterThanOrEqual(3);
      }
    });

    it('lets the whole switched theme go through the same sanitising as any theme', () => {
      const full = alternateTheme(main);
      expect(sanitizeTheme(full)).toEqual(full);
      expect(full.radius).toBe(main.radius);
      expect(full.uiStyle).toBe(main.uiStyle);
    });
  });
});

describe('visitor theme: the owner can pick the switched look', () => {
  const dark = THEME_DEFAULTS;
  const light = themeOf(THEME_PRESETS.find((p) => p.id === 'clean-white')!);

  it('offers only schemes of the opposite tone', () => {
    for (const main of [dark, light]) {
      const offered = alternatePresets(main);
      expect(offered.length).toBeGreaterThanOrEqual(10);
      for (const p of offered) {
        expect(isDarkColor(presetPalette(p).background)).toBe(!isDarkColor(main.background));
      }
    }
  });

  it('uses the picked scheme when it is of the opposite tone', () => {
    const pick = alternatePresets(dark)[0];
    expect(alternatePalette({ ...dark, altPreset: pick.id })).toEqual(presetPalette(pick));
    const darkPick = alternatePresets(light)[0];
    expect(alternatePalette({ ...light, altPreset: darkPick.id })).toEqual(presetPalette(darkPick));
  });

  it('falls back to the made-from-your-colours look for an unknown or same-tone scheme', () => {
    const sameTone = THEME_PRESETS.find(
      (p) => isDarkColor(presetPalette(p).background) && p.id !== 'midnight'
    )!;
    for (const id of ['', 'does-not-exist', sameTone.id]) {
      expect(alternatePalette({ ...dark, altPreset: id })).toEqual(deriveAlternate(dark));
    }
  });
});

describe('visitor theme: the CSS', () => {
  it('has nothing extra when everyone sees the same theme', () => {
    const fixed = sanitizeTheme({ visitorTheme: 'fixed' });
    expect(visitorModeCss(fixed)).toBe('');
    expect(siteThemeCss(fixed)).not.toContain('data-mode');
  });

  it('adds one rule for the switched look, with its own page colour and colour scheme', () => {
    const css = visitorModeCss(THEME_DEFAULTS);
    expect(css.startsWith(':root[data-mode="alt"]{')).toBe(true);
    expect(css.endsWith('}')).toBe(true);
    expect(css.match(/\{/g)).toHaveLength(1);
    expect(css).toContain('color-scheme:light');
    expect(css).toContain(`--background:${deriveAlternate(THEME_DEFAULTS).background}`);
    expect(css).not.toMatch(/[<>]/);
    // the main look comes first, so the switched rule (more specific) wins when it applies
    const all = siteThemeCss(THEME_DEFAULTS);
    expect(all.indexOf(':root,.dark{')).toBeLessThan(all.indexOf(':root[data-mode="alt"]{'));
    expect(visitorModeCss(themeOf(THEME_PRESETS[0]))).toContain('color-scheme:dark');
  });
});

describe('visitor theme: the script that applies the choice before the first paint', () => {
  const run = (
    script: string,
    env: { stored?: string | null; deviceDark?: boolean; path?: string; storageThrows?: boolean }
  ) => {
    const classes = new Set<string>();
    const attrs: Record<string, string> = {};
    const sandbox = {
      location: { pathname: env.path ?? '/' },
      localStorage: {
        getItem: (key: string) => {
          if (env.storageThrows) throw new Error('blocked');
          return key === THEME_STORAGE_KEY ? (env.stored ?? null) : null;
        },
      },
      matchMedia: () => ({ matches: !!env.deviceDark }),
      window: {} as Record<string, unknown>,
      document: {
        documentElement: {
          setAttribute: (k: string, v: string) => (attrs[k] = v),
          classList: {
            toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
          },
        },
      },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(script, sandbox);
    return { mode: attrs['data-mode'], dark: classes.has('dark') };
  };
  const darkMain = visitorModeScript(sanitizeTheme({ visitorTheme: 'switch' }));
  const lightMain = visitorModeScript(
    sanitizeTheme({ ...presetPalette(THEME_PRESETS[0]), visitorTheme: 'switch' })
  );
  const deviceDarkMain = visitorModeScript(sanitizeTheme({ visitorTheme: 'device' }));
  const deviceLightMain = visitorModeScript(
    sanitizeTheme({ ...presetPalette(THEME_PRESETS[0]), visitorTheme: 'device' })
  );

  it('is empty when everyone sees the same theme', () => {
    expect(visitorModeScript(sanitizeTheme({ visitorTheme: 'fixed' }))).toBe('');
  });

  it('changes nothing for a first visit when the owner theme is the start', () => {
    expect(run(darkMain, {})).toEqual({ mode: undefined, dark: false });
    expect(run(lightMain, { deviceDark: true })).toEqual({ mode: undefined, dark: false });
  });

  it('applies the visitor’s remembered choice when it differs from the owner theme', () => {
    // a dark owner theme, the visitor chose light: switched look, and no "dark" class
    expect(run(darkMain, { stored: 'light' })).toEqual({ mode: 'alt', dark: false });
    // a light owner theme, the visitor chose dark: switched look with the "dark" class
    expect(run(lightMain, { stored: 'dark' })).toEqual({ mode: 'alt', dark: true });
    // the choice that matches the owner theme needs nothing
    expect(run(darkMain, { stored: 'dark' })).toEqual({ mode: undefined, dark: false });
    expect(run(lightMain, { stored: 'light' })).toEqual({ mode: undefined, dark: false });
  });

  it('ignores a damaged value, blocked storage and the admin', () => {
    expect(run(darkMain, { stored: 'purple' }).mode).toBeUndefined();
    expect(run(darkMain, { storageThrows: true }).mode).toBeUndefined();
    expect(
      run(darkMain, { stored: 'light', path: '/administrator/appearance' }).mode
    ).toBeUndefined();
  });

  it('can start from the device setting, but the visitor’s own choice wins', () => {
    expect(run(deviceDarkMain, { deviceDark: false })).toEqual({ mode: 'alt', dark: false });
    expect(run(deviceDarkMain, { deviceDark: true }).mode).toBeUndefined();
    expect(run(deviceLightMain, { deviceDark: true })).toEqual({ mode: 'alt', dark: true });
    expect(run(deviceLightMain, { deviceDark: false }).mode).toBeUndefined();
    expect(run(deviceDarkMain, { deviceDark: false, stored: 'dark' }).mode).toBeUndefined();
    expect(run(deviceLightMain, { deviceDark: true, stored: 'light' }).mode).toBeUndefined();
  });

  it('is only plain script text: no markup that could end the tag early', () => {
    for (const s of [darkMain, lightMain, deviceDarkMain, deviceLightMain]) {
      expect(s).not.toMatch(/<\/?script|<!--/i);
    }
  });
});
