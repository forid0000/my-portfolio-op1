/**
 * Site theme model: the ONE place every colour of the public site comes from. Pure functions and
 * types with no server imports, so the Appearance editor, its live preview and the unit tests
 * share exactly the code the real pages use (the database part lives in lib/theme.ts).
 *
 * Stored as a single document (`type: 'theme_content'`) in the portfolio_cms.homepage
 * collection and injected as CSS-variable overrides in the root layout. Components never pick
 * their own colours: they use the semantic Tailwind tokens (`bg-background`, `text-foreground`,
 * `bg-card`, `border-border`, `text-primary`, `text-success`, `bg-scrim`, ...) that map to the
 * variables built here, so changing a colour in Admin -> Appearance changes it everywhere.
 * Values are sanitized before they ever reach a <style> tag.
 */
import {
  huePalette,
  isDarkColor,
  mixHex,
  readableOn,
  rgbTriplet,
  shadesFromHex,
} from '@/lib/color';

/** 'clean' is a plain, friendly portfolio; 'terminal' is the developer-prompt look. */
export type UiStyle = 'clean' | 'terminal';
/** Where the admin panel takes its accent colour from. */
export type AdminAccentMode = 'default' | 'site' | 'custom';

export interface SiteTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  /** Errors and destructive actions. */
  destructive: string;
  /** Success messages and confirmations. */
  success: string;
  /** Cautions. */
  warning: string;
  /** Neutral information. */
  info: string;
  radius: string;
  uiStyle: UiStyle;
  adminAccentMode: AdminAccentMode;
  /** Used when adminAccentMode is 'custom'. */
  adminAccent: string;
}

export const THEME_DEFAULTS: SiteTheme = {
  background: '#1d232a',
  foreground: '#e5e7eb',
  card: '#2a3142',
  cardForeground: '#e5e7eb',
  primary: '#34d399',
  primaryForeground: '#1d232a',
  secondary: '#60a5fa',
  secondaryForeground: '#0b1220',
  accent: '#34d399',
  muted: '#6b7280',
  mutedForeground: '#9ca3af',
  border: '#3f4655',
  input: '#252d38',
  ring: '#34d399',
  destructive: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',
  radius: '0.5rem',
  uiStyle: 'clean',
  adminAccentMode: 'default',
  adminAccent: '#34d399',
};

/** The colour fields (everything except radius, style and the admin accent). */
export const THEME_COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'muted',
  'mutedForeground',
  'border',
  'input',
  'ring',
  'destructive',
  'success',
  'warning',
  'info',
] as const;
export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

/** Status colours that read well on a light page / on a dark page. */
const STATUS_LIGHT = {
  destructive: '#b91c1c',
  success: '#15803d',
  warning: '#b45309',
  info: '#1d4ed8',
};
const STATUS_DARK = {
  destructive: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',
};

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RADIUS_RE = /^(?:0|[0-9]+(?:\.[0-9]+)?(?:px|rem|em))$/;

function safeHex(val: string | undefined, fallback: string): string {
  return typeof val === 'string' && HEX_RE.test(val) ? val : fallback;
}

/** Coerce arbitrary input into a safe SiteTheme, falling back to defaults. */
export function sanitizeTheme(input: Partial<SiteTheme> | null | undefined): SiteTheme {
  // Themes saved before the status colours existed get ones that suit their own background.
  const background = safeHex(input?.background, THEME_DEFAULTS.background);
  const status = isDarkColor(background) ? STATUS_DARK : STATUS_LIGHT;
  return {
    background,
    foreground: safeHex(input?.foreground, THEME_DEFAULTS.foreground),
    card: safeHex(input?.card, THEME_DEFAULTS.card),
    cardForeground: safeHex(input?.cardForeground, THEME_DEFAULTS.cardForeground),
    primary: safeHex(input?.primary, THEME_DEFAULTS.primary),
    primaryForeground: safeHex(input?.primaryForeground, THEME_DEFAULTS.primaryForeground),
    secondary: safeHex(input?.secondary, THEME_DEFAULTS.secondary),
    secondaryForeground: safeHex(input?.secondaryForeground, THEME_DEFAULTS.secondaryForeground),
    accent: safeHex(input?.accent, THEME_DEFAULTS.accent),
    muted: safeHex(input?.muted, THEME_DEFAULTS.muted),
    mutedForeground: safeHex(input?.mutedForeground, THEME_DEFAULTS.mutedForeground),
    border: safeHex(input?.border, THEME_DEFAULTS.border),
    input: safeHex(input?.input, THEME_DEFAULTS.input),
    ring: safeHex(input?.ring, THEME_DEFAULTS.ring),
    destructive: safeHex(input?.destructive, status.destructive),
    success: safeHex(input?.success, status.success),
    warning: safeHex(input?.warning, status.warning),
    info: safeHex(input?.info, status.info),
    radius:
      typeof input?.radius === 'string' && RADIUS_RE.test(input.radius)
        ? input.radius
        : THEME_DEFAULTS.radius,
    uiStyle: input?.uiStyle === 'terminal' ? 'terminal' : 'clean',
    adminAccentMode:
      input?.adminAccentMode === 'site' || input?.adminAccentMode === 'custom'
        ? input.adminAccentMode
        : 'default',
    adminAccent: safeHex(input?.adminAccent, THEME_DEFAULTS.adminAccent),
  };
}

/**
 * The admin panel is styled with Tailwind's emerald palette. Re-pointing the eleven emerald
 * variables inside `.admin-accent` (the admin layout wrapper) re-tints every button, badge and
 * focus ring there at once, without touching a single admin component.
 */
function adminAccentCss(t: SiteTheme): string {
  if (t.adminAccentMode === 'default') return '';
  const shades = shadesFromHex(t.adminAccentMode === 'site' ? t.primary : t.adminAccent);
  const vars = Object.entries(shades)
    .map(([step, hex]) => `--color-emerald-${step}:${hex};`)
    .join('');
  return `.admin-accent{${vars}}`;
}

/** Number of `--chart-N` colours generated from the palette. */
export const CHART_COLOR_COUNT = 12;

/**
 * Every CSS custom property the theme defines, including the ones derived from the palette
 * (readable text on status colours, glow triplets, chart colours, the light/dark hint).
 * `themeToCssVars` serialises this for the document; the Appearance preview applies the same
 * object inline, so the preview can never drift from the real site.
 */
export function themeCssVariables(theme: SiteTheme): Record<string, string> {
  const t = sanitizeTheme(theme);
  const dark = isDarkColor(t.background);
  const vars: Record<string, string> = {
    '--background': t.background,
    '--foreground': t.foreground,
    '--card': t.card,
    '--card-foreground': t.cardForeground,
    '--popover': t.card,
    '--popover-foreground': t.cardForeground,
    '--primary': t.primary,
    '--primary-foreground': t.primaryForeground,
    '--secondary': t.secondary,
    '--secondary-foreground': t.secondaryForeground,
    '--accent': t.accent,
    '--accent-foreground': readableOn(t.accent),
    '--muted': t.muted,
    '--muted-foreground': t.mutedForeground,
    '--border': t.border,
    '--input': t.input,
    '--ring': t.ring,
    '--destructive': t.destructive,
    '--destructive-foreground': readableOn(t.destructive),
    '--success': t.success,
    '--success-foreground': readableOn(t.success),
    '--warning': t.warning,
    '--warning-foreground': readableOn(t.warning),
    '--info': t.info,
    '--info-foreground': readableOn(t.info),
    '--radius': t.radius,
    // r g b triplets for rgb(var(--primary-rgb) / 0.4) style glows
    '--background-rgb': rgbTriplet(t.background),
    '--foreground-rgb': rgbTriplet(t.foreground),
    '--primary-rgb': rgbTriplet(t.primary),
    '--secondary-rgb': rgbTriplet(t.secondary),
    '--accent-rgb': rgbTriplet(t.accent),
    // Code blocks sit slightly apart from the page in either direction.
    '--code-background': dark
      ? mixHex(t.background, '#000000', 0.35)
      : mixHex(t.background, t.foreground, 0.06),
    '--code-header': dark
      ? mixHex(t.background, '#000000', 0.2)
      : mixHex(t.background, t.foreground, 0.1),
    '--code-foreground': t.foreground,
    '--code-muted': t.mutedForeground,
    // Makes form controls, scrollbars and the browser's own widgets match the palette.
    'color-scheme': dark ? 'dark' : 'light',
  };
  huePalette(t.primary, t.background, CHART_COLOR_COUNT).forEach((hex, i) => {
    vars[`--chart-${i + 1}`] = hex;
  });
  return vars;
}

/** Build the CSS-variable override block injected into the document. */
export function themeToCssVars(theme: SiteTheme): string {
  const t = sanitizeTheme(theme);
  const body = Object.entries(themeCssVariables(t))
    .map(([name, value]) => `${name}:${value};`)
    .join('');
  return `:root,.dark{${body}}` + adminAccentCss(t);
}
