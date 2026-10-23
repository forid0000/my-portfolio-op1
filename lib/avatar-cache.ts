/**
 * Resolves and caches the picture shown as the owner's avatar. Shared by app/api/avatar (redirect
 * target), the browser-tab icon and share image in app/layout.tsx, the hero and the header, so
 * they all agree on one fallback chain and one cache instead of drifting apart.
 *
 * The chain, first match wins:
 *   1. the active picture uploaded in Admin -> Media Manager (Cloudinary),
 *   2. the public GitHub picture of the GitHub profile link kept in Global Settings (or among the
 *      social links), so an owner who never uploads anything still gets their own face,
 *   3. the neutral placeholder.
 * Mirrors the pattern used by lib/site.ts and lib/theme.ts.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { AVATAR_PLACEHOLDER_URL } from '@/lib/content-defaults';
import { githubAvatarUrl, githubUsernameFromGlobal } from '@/lib/github-avatar';

/**
 * Shown when there is neither an upload nor a GitHub profile. A local path
 * (public/avatar-placeholder.png), so it works with next/image without any
 * remote host config. Callers that need an absolute URL must resolve it.
 */
export const AVATAR_FALLBACK_URL = AVATAR_PLACEHOLDER_URL;

export type AvatarSource = 'upload' | 'github' | 'placeholder';

export interface ResolvedAvatar {
  url: string;
  source: AvatarSource;
  /** Set when source is 'github'. */
  githubUsername?: string;
}

const PLACEHOLDER: ResolvedAvatar = { url: AVATAR_FALLBACK_URL, source: 'placeholder' };

type AvatarCacheEntry = { value: ResolvedAvatar; at: number };

const store = sharedState<{
  cache: AvatarCacheEntry | null;
  fetchPromise: Promise<ResolvedAvatar> | null;
}>('avatar', () => ({
  cache: null,
  fetchPromise: null,
}));

export function invalidateAvatarCache() {
  store.cache = null;
}

export function setAvatarCache(url: string) {
  store.cache = { value: { url, source: 'upload' }, at: Date.now() };
}

/**
 * Server-side, TTL-cached, fail-safe read of the avatar with its source. Falls back to the
 * placeholder if the database is unreachable or times out; a failed read is not remembered.
 */
export async function getResolvedAvatar(): Promise<ResolvedAvatar> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.value;
  if (store.fetchPromise) return store.fetchPromise;

  store.fetchPromise = (async () => {
    try {
      const db = await connectToDatabase();
      const client = db.connection.client.db('portfolio_cms');
      const [doc, global] = await Promise.all([
        client.collection('avatars').findOne({ isActive: true }) as Promise<any>,
        client.collection('homepage').findOne({ type: 'global_content' }),
      ]);

      // A doc without secure_url is either absent, or a legacy base64-only
      // record that hasn't been lazily migrated yet (visit Admin -> Media
      // Manager once to trigger that migration).
      let value: ResolvedAvatar = PLACEHOLDER;
      if (doc?.secure_url) {
        value = { url: doc.secure_url, source: 'upload' };
      } else {
        const username = githubUsernameFromGlobal(global);
        if (username) {
          value = { url: githubAvatarUrl(username), source: 'github', githubUsername: username };
        }
      }
      store.cache = { value, at: Date.now() };
      return value;
    } catch (error) {
      console.warn(
        'Avatar lookup failed or timed out, falling back to the placeholder avatar:',
        error
      );
      return PLACEHOLDER;
    } finally {
      store.fetchPromise = null;
    }
  })();

  return store.fetchPromise;
}

/** The avatar's URL: see the fallback chain above. Callers never need their own fallback. */
export async function getActiveAvatarUrl(): Promise<string> {
  return (await getResolvedAvatar()).url;
}
