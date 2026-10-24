/**
 * Issues the admin session cookie. Shared by the login and first-run setup
 * routes so both create byte-for-byte the same kind of session.
 */
import { SignJWT } from 'jose';
import type { NextResponse } from 'next/server';
import { getJwtSecret } from '@/lib/auth';
import { ADMIN_SESSION_SECONDS } from '@/lib/session-timing';

export { ADMIN_SESSION_SECONDS };

export async function attachAdminSession<T>(response: NextResponse<T>): Promise<NextResponse<T>> {
  const iat = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
    .setExpirationTime(iat + ADMIN_SESSION_SECONDS)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getJwtSecret());

  response.cookies.set({
    name: 'admin_session',
    value: token,
    httpOnly: true, // not readable from JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // CSRF protection
    maxAge: ADMIN_SESSION_SECONDS,
    path: '/',
  });
  return response;
}
