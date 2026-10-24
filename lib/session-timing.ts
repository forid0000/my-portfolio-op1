/**
 * How long the admin session lasts. Pure numbers and one pure function, so the sign-in route, the
 * "add time" route, the dashboard timer and the unit tests all read the same rules.
 *
 *   - a new sign-in lasts 45 minutes;
 *   - each click on "+15 min" adds 15 minutes to what is left;
 *   - however often it is extended, a session never lasts longer than 3 hours from sign-in.
 */
export const ADMIN_SESSION_SECONDS = 45 * 60;
export const ADMIN_SESSION_EXTEND_SECONDS = 15 * 60;
export const ADMIN_SESSION_MAX_SECONDS = 3 * 60 * 60;

export interface SessionExtension {
  /** Expiry (seconds since the epoch) after the extension. */
  exp: number;
  /** Seconds actually added; less than a full step near the limit, 0 at the limit. */
  added: number;
  /** True when the session cannot be extended any further. */
  atLimit: boolean;
  /** The latest moment this session may ever last until (sign-in time + 3 hours). */
  limit: number;
}

/**
 * The expiry after one more "add time" click, or null when the session has already ended.
 * `iat` is the original sign-in time (kept across extensions), `exp` the current expiry.
 */
export function extendSession(input: {
  iat: number;
  exp: number;
  now: number;
}): SessionExtension | null {
  const { iat, exp, now } = input;
  if (exp <= now) return null;
  const limit = iat + ADMIN_SESSION_MAX_SECONDS;
  const next = Math.min(exp + ADMIN_SESSION_EXTEND_SECONDS, limit);
  const newExp = Math.max(next, exp); // a session already past the limit is never shortened
  return { exp: newExp, added: newExp - exp, atLimit: newExp >= limit, limit };
}

/**
 * The private notes vault follows the same rules for its authenticator unlock (45 minutes, +15 per
 * click, 3 hours at most from unlocking). A vault password gives a 7-day session instead, which is
 * already longer than the cap, so it has nothing to extend.
 */
export const NOTES_QUICK_SESSION_SECONDS = ADMIN_SESSION_SECONDS;
export const NOTES_PASSWORD_SESSION_SECONDS = 7 * 24 * 60 * 60;

export type NotesSessionKind = 'quick' | 'password';

/** Which kind of unlock a session came from, worked out from its length (no extra claim needed). */
export function notesSessionKind(iat: number, exp: number): NotesSessionKind {
  return exp - iat > ADMIN_SESSION_MAX_SECONDS ? 'password' : 'quick';
}

/** When a notes session can last until at the latest, in seconds since the epoch. */
export function notesSessionLimit(iat: number, exp: number): number {
  return notesSessionKind(iat, exp) === 'quick' ? iat + ADMIN_SESSION_MAX_SECONDS : exp;
}
