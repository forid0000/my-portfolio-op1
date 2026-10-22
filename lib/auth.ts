/**
 * Centralised admin-auth primitives.
 *
 * Edge-safe: this module must NOT import Node-only APIs (e.g. `node:crypto`)
 * or `next/headers` at the top level, because `middleware.ts` (Edge runtime)
 * imports `getJwtSecret` from here. Cookie-based helpers that rely on
 * `next/headers` live in `verifyAdminSession` and only run in the Node
 * route-handler runtime.
 */
import { jwtVerify } from 'jose';

let cachedSecret: Uint8Array | null = null;

/**
 * Returns the JWT signing key as bytes. Throws (fail-closed) if the secret is
 * missing or too weak - we never fall back to a hardcoded default, which would
 * let anyone forge an admin session.
 */
export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not configured. Set a strong (>= 32 char) value in the environment.'
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/**
 * Constant-time string comparison. Avoids leaking secret length/content via
 * early-exit timing. Pure JS so it works in both Edge and Node runtimes.
 */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Fold the length difference into the accumulator so unequal lengths still
  // run a full pass and return false.
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Verifies the `admin_session` cookie. Node runtime only (uses `next/headers`).
 * Returns true when a valid, unexpired admin JWT is present.
 */
export async function verifyAdminSession(): Promise<boolean> {
  // Imported lazily to keep this module importable from the Edge runtime.
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('admin_session')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies the `notes_session` cookie. Node runtime only (uses `next/headers`).
 * Returns true when a valid, unexpired notes JWT is present.
 */
export async function verifyNotesSession(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('notes_session')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}
