/**
 * Shared TTL for every in-process content cache (site.ts, theme.ts,
 * sections-registry.ts, avatar-cache.ts). In production this trades a bounded
 * staleness window for far fewer MongoDB round trips on hot paths (every page
 * render). In development that same window would mean CMS edits appear to
 * "not save" for up to 3 minutes on a page you didn't hard-navigate - so the
 * cache is disabled outright (`Date.now() - cache.at < 0` is never true) and
 * every read hits the database fresh.
 */
export const CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 0 : 180_000;
