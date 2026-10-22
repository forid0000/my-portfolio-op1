import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

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

    // Verify current token
    const { payload } = await jwtVerify(token, secretKey);
    const exp = payload.exp as number;
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = exp - now;

    if (remainingSeconds <= 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Only allow refresh if less than or equal to 5 minutes (300 seconds) remain
    if (remainingSeconds > 300) {
      return NextResponse.json({ error: 'Cannot refresh yet' }, { status: 400 });
    }

    // Absolute max session limit: 45 minutes (2700 seconds) from original login
    const originalIat = payload.iat as number;
    const absoluteExpiry = originalIat + 45 * 60;

    if (now >= absoluteExpiry) {
      return NextResponse.json({ error: 'Absolute session limit reached' }, { status: 401 });
    }

    // Add 5 minutes (300 seconds), capped at 20 minutes (1200 seconds) from now,
    // and ALSO capped absolutely at the 45-minute mark from original login.
    let newRemainingSeconds = Math.min(1200, remainingSeconds + 300);
    let newExp = now + newRemainingSeconds;

    if (newExp > absoluteExpiry) {
      newExp = absoluteExpiry;
      newRemainingSeconds = newExp - now;
    }

    const newToken = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
      .setExpirationTime(newExp)
      .setIssuedAt(originalIat) // Preserve original login time
      .setNotBefore(now)
      .sign(secretKey);

    const response = NextResponse.json(
      {
        success: true,
        remainingSeconds: newRemainingSeconds,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: 'admin_session',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: newRemainingSeconds,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
