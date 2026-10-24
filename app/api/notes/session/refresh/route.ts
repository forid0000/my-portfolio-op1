import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { extendSession, notesSessionKind, notesSessionLimit } from '@/lib/session-timing';

/**
 * "+15 min" in the private notes: adds 15 minutes to an authenticator-unlocked vault session, up to
 * 3 hours in total from unlocking (rules in lib/session-timing.ts). A vault-password session lasts
 * 7 days and has nothing to extend. The unlock time stays in the token, so extending never
 * restarts the 3-hour clock.
 */
export async function POST(request: Request) {
  try {
    const token = (await cookies()).get('notes_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`notes-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const iat = payload.iat as number;
    const exp = payload.exp as number;
    const now = Math.floor(Date.now() / 1000);
    const kind = notesSessionKind(iat, exp);

    const next = extendSession({ iat, exp, now });
    if (!next) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

    if (next.added === 0) {
      return NextResponse.json(
        {
          error:
            kind === 'password'
              ? 'A vault-password session lasts 7 days and cannot be extended.'
              : 'This session is already at its 3-hour limit. Unlock again for a new one.',
          atLimit: true,
          kind,
          expiresAt: exp * 1000,
          limitAt: notesSessionLimit(iat, exp) * 1000,
        },
        { status: 409 }
      );
    }

    const newToken = await new SignJWT({ auth: 'notes' })
      .setProtectedHeader({ alg: 'HS512' })
      .setIssuedAt(iat) // keep the unlock time: the 3-hour limit counts from it
      .setExpirationTime(next.exp)
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      added: next.added,
      atLimit: next.atLimit,
      kind,
      expiresAt: next.exp * 1000,
      limitAt: next.limit * 1000,
    });
    response.cookies.set('notes_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: next.exp - now,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
