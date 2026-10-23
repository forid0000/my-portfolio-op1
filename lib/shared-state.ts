/**
 * Process-wide state for the in-process content caches.
 *
 * Module-level variables are NOT shared in a production build: every route and every page is its
 * own bundle with its own copy of each module. A cache kept in a module variable was therefore
 * invalidated only in the copy the admin's save route owned, while the static page that
 * regenerated afterwards read its own stale copy and froze the old content into the HTML.
 * `globalThis` is the same object for every bundle in the process, so an invalidation reaches all
 * of them. (Separate serverless instances still keep separate caches; the TTL bounds that.)
 */
export function sharedState<T extends object>(name: string, init: () => T): T {
  const bag = globalThis as unknown as Record<string, unknown>;
  const key = `__portfolio_state_${name}`;
  return (bag[key] ??= init()) as T;
}
