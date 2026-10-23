/**
 * Site theme (admin-customizable accent colors + corner radius).
 *
 * Stored as a single document (`type: 'theme_content'`) in the
 * portfolio_cms.homepage collection and injected as CSS-variable overrides in
 * the root layout. Values are sanitized before they ever reach a <style> tag.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { shadesFromHex } from '@/lib/color';

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
  secondaryForeground: '#ffffff',
  accent: '#34d399',
  muted: '#6b7280',
  mutedForeground: '#9ca3af',
  border: '#3f4655',
  input: '#252d38',
  ring: '#34d399',
  radius: '0.5rem',
  uiStyle: 'clean',
  adminAccentMode: 'default',
  adminAccent: '#34d399',
};

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RADIUS_RE = /^(?:0|[0-9]+(?:\.[0-9]+)?(?:px|rem|em))$/;

function safeHex(val: string | undefined, fallback: string): string {
  return typeof val === 'string' && HEX_RE.test(val) ? val : fallback;
}

/** Coerce arbitrary input into a safe SiteTheme, falling back to defaults. */
export function sanitizeTheme(input: Partial<SiteTheme> | null | undefined): SiteTheme {
  return {
    background: safeHex(input?.background, THEME_DEFAULTS.background),
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

// Short in-process cache so the root layout (which wraps every route) does not
// hit MongoDB on every request. Admin saves invalidate it immediately.
const store = sharedState<{
  cache: { theme: SiteTheme; at: number } | null;
  fetchPromise: Promise<SiteTheme> | null;
}>('theme', () => ({
  cache: null,
  fetchPromise: null,
}));

export function invalidateThemeCache() {
  store.cache = null;
}

export async function getTheme(): Promise<SiteTheme> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.theme;
  if (store.fetchPromise) return store.fetchPromise;

  store.fetchPromise = (async () => {
    let theme = THEME_DEFAULTS;
    let ok = false;
    try {
      const db = await connectToDatabase();
      const doc = await db.connection.client
        .db('portfolio_cms')
        .collection('homepage')
        .findOne({ type: 'theme_content' });
      theme = sanitizeTheme(doc as Partial<SiteTheme> | null);
      ok = true;
    } catch {
      theme = THEME_DEFAULTS;
    } finally {
      // A failed read falls back to the defaults for this request only; it must not be remembered.
      if (ok) store.cache = { theme, at: Date.now() };
      store.fetchPromise = null;
    }
    return theme;
  })();

  return store.fetchPromise;
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

/** Build the CSS-variable override block injected into the document. */
export function themeToCssVars(theme: SiteTheme): string {
  const t = sanitizeTheme(theme);
  return (
    `:root,.dark{` +
    `--background:${t.background};--foreground:${t.foreground};` +
    `--card:${t.card};--card-foreground:${t.cardForeground};` +
    `--primary:${t.primary};--primary-foreground:${t.primaryForeground};` +
    `--secondary:${t.secondary};--secondary-foreground:${t.secondaryForeground};` +
    `--accent:${t.accent};` +
    `--muted:${t.muted};--muted-foreground:${t.mutedForeground};` +
    `--border:${t.border};--input:${t.input};--ring:${t.ring};` +
    `--radius:${t.radius};` +
    `}` +
    adminAccentCss(t)
  );
}
