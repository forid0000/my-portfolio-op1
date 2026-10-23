/**
 * Resolves and caches the active avatar's Cloudinary URL. Shared by
 * app/api/avatar (redirect target), app/icon.tsx (favicon), and
 * app/layout.tsx (OG/Twitter image) so all three ever only agree on one
 * fallback chain and one cache, instead of three copies drifting apart.
 * Mirrors the pattern used by lib/site.ts and lib/theme.ts.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { AVATAR_PLACEHOLDER_URL } from '@/lib/content-defaults';

/**
 * Shown until an avatar is uploaded in Admin -> Media Manager. A local path
 * (public/avatar-placeholder.png), so it works with next/image without any
 * remote host config. Callers that need an absolute URL must resolve it.
 */
export const AVATAR_FALLBACK_URL = AVATAR_PLACEHOLDER_URL;

type AvatarCacheEntry = { url: string; at: number };

const store = sharedState<{ cache: AvatarCacheEntry | null; fetchPromise: Promise<string> | null }>(
  'avatar',
  () => ({
    cache: null,
    fetchPromise: null,
  })
);

export function invalidateAvatarCache() {
  store.cache = null;
}

export function setAvatarCache(url: string) {
  store.cache = { url, at: Date.now() };
}

/**
 * Server-side, TTL-cached, fail-safe read of the active avatar's Cloudinary
 * URL. Falls back to the placeholder avatar if the database is unreachable, times
 * out, or no avatar has ever been set/migrated - callers never need their own
 * fallback logic.
 */
export async function getActiveAvatarUrl(): Promise<string> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.url;
  if (store.fetchPromise) return store.fetchPromise;

  store.fetchPromise = (async () => {
    try {
      const fetchAvatar = async () => {
        const db = await connectToDatabase();
        const collection = db.connection.client.db('portfolio_cms').collection('avatars');
        return await collection.findOne({ isActive: true });
      };

      const doc = (await fetchAvatar()) as any;

      // A doc without secure_url is either absent, or a legacy base64-only
      // record that hasn't been lazily migrated yet (visit Admin -> Media
      // Manager once to trigger that migration).
      const url = doc?.secure_url || AVATAR_FALLBACK_URL;
      setAvatarCache(url);
      return url;
    } catch (error) {
      console.warn(
        'Avatar lookup failed or timed out, falling back to the placeholder avatar:',
        error
      );
      return AVATAR_FALLBACK_URL;
    } finally {
      store.fetchPromise = null;
    }
  })();

  return store.fetchPromise;
}
