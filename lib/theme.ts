/**
 * Site theme (admin-customizable accent colors + corner radius).
 *
 * Stored as a single document (`type: 'theme_content'`) in the
 * portfolio_cms.homepage collection and injected as CSS-variable overrides in
 * the root layout. Values are sanitized before they ever reach a <style> tag.
 */
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';

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
  };
}

// Short in-process cache so the root layout (which wraps every route) does not
// hit MongoDB on every request. Admin saves invalidate it immediately.
let cache: { theme: SiteTheme; at: number } | null = null;
let fetchPromise: Promise<SiteTheme> | null = null;

export function invalidateThemeCache() {
  cache = null;
}

export async function getTheme(): Promise<SiteTheme> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.theme;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    let theme = THEME_DEFAULTS;
    try {
      const db = await connectToDatabase();
      const doc = await db.connection.client
        .db('portfolio_cms')
        .collection('homepage')
        .findOne({ type: 'theme_content' });
      theme = sanitizeTheme(doc as Partial<SiteTheme> | null);
    } catch {
      theme = THEME_DEFAULTS;
    } finally {
      cache = { theme, at: Date.now() };
      fetchPromise = null;
    }
    return theme;
  })();

  return fetchPromise;
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
    `}`
  );
}
