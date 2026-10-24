/**
 * The light / dark choice of the public site. Pure functions (no server imports), shared by the
 * root layout, the header button, the Appearance editor and the unit tests.
 *
 * The owner's theme (Admin -> Appearance) is the "main" look. A visitor may be offered the other
 * tone (light when the main look is dark, dark when it is light), which is either a ready-made
 * scheme the owner picked or one made from the owner's own colours (`deriveAlternate`). Both looks
 * are plain CSS variables in the page: the main one on `:root`, the other on
 * `:root[data-mode="alt"]`, so switching is one attribute and costs no request.
 *
 * What the visitor chose is kept only in their own browser (localStorage `site-theme`, "light" or
 * "dark"; never sent anywhere). A tiny inline script in <head> applies it before the first paint,
 * so a returning visitor never sees a flash of the other look, and the pages stay static HTML.
 */
import { ensureContrast, isDarkColor, mixHex } from '@/lib/color';
import {
  sanitizeTheme,
  themeCssVariables,
  themeToCssVars,
  type SiteTheme,
} from '@/lib/theme-model';
import {
  THEME_PRESETS,
  derivePalette,
  presetPalette,
  type ThemePalette,
  type ThemePreset,
} from '@/lib/theme-presets';

/** The browser-side key of the visitor's choice. */
export const THEME_STORAGE_KEY = 'site-theme';

export const VISITOR_THEME_OPTIONS = [
  {
    value: 'fixed',
    title: 'Same for everyone',
    text: 'Everyone sees the theme you set on this page. There is no button.',
  },
  {
    value: 'switch',
    title: 'Visitors can switch',
    text: 'A sun/moon button in the header. First visit shows your theme; the choice is remembered.',
  },
  {
    value: 'device',
    title: 'Visitors can switch, start from their device',
    text: 'Same button, but the first visit follows the visitor’s own light or dark setting.',
  },
] as const;

/** True when the main look is a dark one. */
export function isMainDark(theme: SiteTheme): boolean {
  return isDarkColor(theme.background);
}

/**
 * The other tone made from the owner's own colours: same brand hue, quiet tinted page, readable text,
 * brand and secondary colours moved along their lightness until they read on the new page and cards.
 */
export function deriveAlternate(input: SiteTheme): ThemePalette {
  const theme = sanitizeTheme(input);
  if (isMainDark(theme)) {
    // A light look.
    const background = mixHex('#ffffff', theme.primary, 0.05);
    const card = '#ffffff';
    const surfaces = [background, card];
    return derivePalette({
      background,
      foreground: mixHex('#0f172a', theme.primary, 0.08),
      card,
      primary: ensureContrast(theme.primary, surfaces, 4.5),
      secondary: ensureContrast(theme.secondary, surfaces, 4.5),
    });
  }
  // A dark look.
  const background = mixHex('#0b0f14', theme.primary, 0.08);
  const card = mixHex(background, '#ffffff', 0.07);
  const surfaces = [background, card];
  return derivePalette({
    background,
    foreground: mixHex('#eef2f7', theme.primary, 0.05),
    card,
    primary: ensureContrast(theme.primary, surfaces, 4.5),
    secondary: ensureContrast(theme.secondary, surfaces, 4.5),
  });
}

/** Ready-made schemes of the opposite tone: what the owner can pick as the switched look. */
export function alternatePresets(input: SiteTheme): ThemePreset[] {
  const mainDark = isMainDark(sanitizeTheme(input));
  return THEME_PRESETS.filter((p) => isDarkColor(presetPalette(p).background) !== mainDark);
}

/**
 * The palette a visitor gets after switching: the scheme the owner picked, or (when none is picked,
 * or it is no longer the opposite tone because the main look changed) one made from the main colours.
 */
export function alternatePalette(input: SiteTheme): ThemePalette {
  const theme = sanitizeTheme(input);
  const picked = alternatePresets(theme).find((p) => p.id === theme.altPreset);
  return picked ? presetPalette(picked) : deriveAlternate(theme);
}

/** The whole theme as a visitor sees it after switching (the owner's style and corners stay). */
export function alternateTheme(input: SiteTheme): SiteTheme {
  const theme = sanitizeTheme(input);
  return { ...theme, ...alternatePalette(theme) };
}

/** What the header needs to draw the button, or null when visitors may not switch. */
export function themeSwitchFor(input: SiteTheme): { mainDark: boolean } | null {
  const theme = sanitizeTheme(input);
  return theme.visitorTheme === 'fixed' ? null : { mainDark: isMainDark(theme) };
}

/** The CSS of the switched look; empty when visitors may not switch. */
export function visitorModeCss(input: SiteTheme): string {
  const theme = sanitizeTheme(input);
  if (theme.visitorTheme === 'fixed') return '';
  const body = Object.entries(themeCssVariables(alternateTheme(theme)))
    .map(([name, value]) => `${name}:${value};`)
    .join('');
  return `:root[data-mode="alt"]{${body}}`;
}

/** Everything the root layout puts in its <style>: the main look and, if allowed, the switched one. */
export function siteThemeCss(theme: SiteTheme): string {
  return themeToCssVars(theme) + visitorModeCss(theme);
}

/**
 * The inline script that applies the visitor's look before anything is painted. It never runs in
 * the admin, and it never throws (storage can be blocked): in that case the main look stays.
 * Empty when visitors may not switch.
 */
export function visitorModeScript(input: SiteTheme): string {
  const theme = sanitizeTheme(input);
  if (theme.visitorTheme === 'fixed') return '';
  const mainDark = isMainDark(theme);
  const device =
    theme.visitorTheme === 'device'
      ? "if(window.matchMedia)w=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';"
      : '';
  return (
    "(function(){try{if(location.pathname.indexOf('/administrator')===0)return;var w=null;" +
    `try{w=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}` +
    `if(w!=='dark'&&w!=='light'){w=null;${device}}` +
    `if(w&&(w==='dark')!==${mainDark}){var d=document.documentElement;` +
    `d.setAttribute('data-mode','alt');d.classList.toggle('dark',${!mainDark})}` +
    '}catch(e){}})();'
  );
}
