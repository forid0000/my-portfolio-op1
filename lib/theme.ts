/**
 * Server-side access to the site theme: a cached, fail-safe read of the `theme_content`
 * document. The model itself (types, defaults, sanitising, CSS variables) is in
 * lib/theme-model.ts and re-exported here so server code has one import.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { THEME_DEFAULTS, sanitizeTheme, type SiteTheme } from '@/lib/theme-model';

export * from '@/lib/theme-model';

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
