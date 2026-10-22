import { NextResponse } from 'next/server';
import { attachAdminSession } from '@/lib/admin-session';
import { checkTotp, consumeAdminTotpStep, getAdminAuth, verifyPassword } from '@/lib/credentials';
import { clientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { announceSetupCode } from '@/lib/setup-code';

// Max 10 full login attempts per IP per 15 minutes.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * What the login form needs to render itself: whether first-run setup is still
 * pending, and whether a password field is required. (The authenticator code is
 * always required.)
 */
export async function GET() {
  try {
    const auth = await getAdminAuth();
    if (!auth) announceSetupCode();
    return NextResponse.json({
      needsSetup: !auth,
      passwordRequired: Boolean(auth?.passwordHash),
    });
  } catch (error: any) {
    console.error('Login status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not reach the database.' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const rlKey = `login:${ip}`;
    const rl = rateLimit(rlKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { password, totpCode } = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);

    const auth = await getAdminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: 'Setup has not been completed yet.', needsSetup: true },
        { status: 409 }
      );
    }

    // Both factors are always evaluated and answered with one generic message, so
    // the response never reveals which of them was wrong.
    const passwordOk = auth.passwordHash
      ? typeof password === 'string' && (await verifyPassword(password, auth.passwordHash))
      : true;
    const totp = checkTotp(auth.totpSecret, totpCode);

    if (!passwordOk || !totp.valid) {
      return NextResponse.json({ error: 'Invalid code or password.' }, { status: 401 });
    }

    // A code can only be used once, so one captured over a shoulder is useless.
    if (totp.timeStep !== undefined && !(await consumeAdminTotpStep(totp.timeStep))) {
      return NextResponse.json(
        { error: 'That code was already used. Wait for the next one.' },
        { status: 401 }
      );
    }

    // Successful login clears the attempt counter for this IP.
    resetRateLimit(rlKey);

    return attachAdminSession(
      NextResponse.json({ success: true, message: 'Logged in successfully' }, { status: 200 })
    );
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
