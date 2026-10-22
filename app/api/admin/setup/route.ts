import { NextResponse } from 'next/server';
import { z } from 'zod';
import { attachAdminSession } from '@/lib/admin-session';
import {
  ADMIN_PASSWORD_MIN,
  PASSWORD_MAX,
  buildTotpUri,
  checkTotp,
  createAdminAuth,
  generateTotpSecret,
  hashPassword,
  isValidTotpSecret,
  needsAdminSetup,
} from '@/lib/credentials';
import { clientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { announceSetupCode, verifySetupCode } from '@/lib/setup-code';

// First-run setup. Public by necessity (there is no admin yet) and therefore
// locked behind the setup code printed in the server log, rate limited, and
// permanently closed once the admin account exists.

const SETUP_LIMIT = 10;
const SETUP_WINDOW_MS = 15 * 60 * 1000;

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('begin'), setupCode: z.string().max(64) }),
  z.object({
    action: z.literal('complete'),
    setupCode: z.string().max(64),
    secret: z.string().max(200),
    totpCode: z.string().max(20),
    password: z.string().min(ADMIN_PASSWORD_MIN).max(PASSWORD_MAX).optional(),
  }),
]);

export async function GET() {
  try {
    const needsSetup = await needsAdminSetup();
    if (needsSetup) announceSetupCode();
    return NextResponse.json({ needsSetup });
  } catch (error: any) {
    console.error('Setup status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not read the setup state.' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const rlKey = `admin-setup:${clientIp(request)}`;
  const rl = rateLimit(rlKey, SETUP_LIMIT, SETUP_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const tooShort = parsed.error.issues.some((i) => i.path[0] === 'password');
      return NextResponse.json(
        {
          error: tooShort
            ? `The password must be at least ${ADMIN_PASSWORD_MIN} characters.`
            : 'Invalid request.',
        },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (!(await needsAdminSetup())) {
      return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 409 });
    }
    if (!verifySetupCode(body.setupCode)) {
      return NextResponse.json({ error: 'That setup code is not correct.' }, { status: 401 });
    }

    if (body.action === 'begin') {
      const secret = generateTotpSecret();
      return NextResponse.json({ secret, uri: buildTotpUri(secret, 'admin') });
    }

    // action === 'complete': the browser proves it holds the authenticator entry.
    if (!isValidTotpSecret(body.secret)) {
      return NextResponse.json({ error: 'Invalid authenticator secret.' }, { status: 400 });
    }
    if (!checkTotp(body.secret, body.totpCode).valid) {
      return NextResponse.json(
        { error: 'That authenticator code is not correct. Check your device clock and try again.' },
        { status: 401 }
      );
    }

    const passwordHash = body.password ? await hashPassword(body.password) : null;
    const created = await createAdminAuth(body.secret, passwordHash);
    if (!created) {
      return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 409 });
    }

    resetRateLimit(rlKey);
    console.info('[my-portfolio-op1] Admin account created via first-run setup.');
    return attachAdminSession(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed. Check the server log.' }, { status: 500 });
  }
}
