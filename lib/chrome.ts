/**
 * Server-side access to the navigation / visibility settings (lib/chrome-model.ts): a cached,
 * fail-safe read of the `chrome_content` document. Mirrors lib/theme.ts and lib/site.ts.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import {
  CHROME_DEFAULTS,
  mergeChrome,
  resolveNav,
  type ChromeContent,
  type ResolvedNavItem,
} from '@/lib/chrome-model';
import { isSectionEnabled, type PortfolioSectionConfig } from '@/lib/sections-registry';

export * from '@/lib/chrome-model';

const store = sharedState<{
  cache: { value: ChromeContent; at: number } | null;
  fetchPromise: Promise<ChromeContent> | null;
}>('chrome', () => ({ cache: null, fetchPromise: null }));

export function invalidateChromeCache() {
  store.cache = null;
}

export async function getChrome(): Promise<ChromeContent> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.value;
  if (store.fetchPromise) return store.fetchPromise;

  store.fetchPromise = (async () => {
    let value = CHROME_DEFAULTS;
    let ok = false;
    try {
      const db = await connectToDatabase();
      const doc = await db.connection.client
        .db('portfolio_cms')
        .collection('homepage')
        .findOne({ type: 'chrome_content' });
      value = mergeChrome(doc);
      ok = true;
    } catch {
      value = CHROME_DEFAULTS;
    } finally {
      // A failed read falls back to the defaults for this request only; it must not be remembered.
      if (ok) store.cache = { value, at: Date.now() };
      store.fetchPromise = null;
    }
    return value;
  })();
  return store.fetchPromise;
}

/** The links the header and footer show, given the section switches. */
export function navFor(
  chrome: ChromeContent,
  sections: PortfolioSectionConfig[]
): ResolvedNavItem[] {
  return resolveNav(chrome, (id) => isSectionEnabled(sections, id));
}
