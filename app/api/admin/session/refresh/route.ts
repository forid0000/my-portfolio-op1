import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { extendSession } from '@/lib/session-timing';

/**
 * "+15 min" on the dashboard: adds 15 minutes to what is left of the session, at any time, up to
 * 3 hours in total from the original sign-in (rules in lib/session-timing.ts). The sign-in time
 * stays in the token, so extending never restarts the 3-hour clock.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey);
    const iat = payload.iat as number;
    const exp = payload.exp as number;
    const now = Math.floor(Date.now() / 1000);

    const next = extendSession({ iat, exp, now });
    if (!next) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Already as long as it can be: say so, keep the session as it is.
    if (next.added === 0) {
      return NextResponse.json(
        {
          error: 'This session is already at its 3-hour limit. Sign in again for a new one.',
          atLimit: true,
          remainingSeconds: exp - now,
          limitSeconds: next.limit - now,
        },
        { status: 409 }
      );
    }

    const newToken = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
      .setExpirationTime(next.exp)
      .setIssuedAt(iat) // keep the original sign-in time: the 3-hour limit counts from it
      .setNotBefore(now)
      .sign(secretKey);

    const remainingSeconds = next.exp - now;
    const response = NextResponse.json(
      {
        success: true,
        added: next.added,
        atLimit: next.atLimit,
        remainingSeconds,
        limitSeconds: next.limit - now,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: 'admin_session',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: remainingSeconds,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
