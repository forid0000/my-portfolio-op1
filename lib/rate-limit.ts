/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Intended as a brute-force deterrent for the single-admin auth endpoints.
 * Note: state lives in the Node process, so it resets on redeploy and is not
 * shared across multiple instances. For a single-admin portfolio that is an
 * acceptable trade-off; move to a shared store (Redis/Upstash) if the app is
 * ever horizontally scaled.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Opportunistic cleanup so the map can't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when ok === false). */
  retryAfter: number;
  /** Remaining attempts in the current window. */
  remaining: number;
}

/**
 * Records an attempt for `key` and reports whether it is allowed.
 * @param key     Unique bucket key (e.g. `login:<ip>`).
 * @param limit   Max attempts allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000), remaining: 0 };
  }
  return { ok: true, retryAfter: 0, remaining: limit - existing.count };
}

/** Resets the window for a key (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP extraction from proxy headers. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
