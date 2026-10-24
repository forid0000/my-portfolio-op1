import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { getJwtSecret } from '@/lib/auth';
import {
  checkTotp,
  getNotesPasswordHash,
  getNotesTotpSecret,
  normalizeTotpCode,
  verifyPassword,
} from '@/lib/credentials';
import { fileLimitBytes, getNotesSettings } from '@/lib/notes-settings';
import { rateLimit, resetRateLimit, clientIp } from '@/lib/rate-limit';

const NOTES_LIMIT = 30;
const NOTES_WINDOW_MS = 15 * 60 * 1000;

// The vault is unlocked with credentials managed in Admin -> Security:
//  - a vault password (7-day session), and/or
//  - an authenticator code (45-minute session).
// Both are optional, but the vault stays locked until at least one is set.
// Neither can be derived from the source code or the clock.

/** Tells the lock screen which unlock methods exist (reveals nothing secret). */
export async function GET() {
  try {
    const [password, totp] = await Promise.all([getNotesPasswordHash(), getNotesTotpSecret()]);
    return NextResponse.json({
      passwordSet: Boolean(password),
      quickUnlock: Boolean(totp),
      configured: Boolean(password || totp),
    });
  } catch {
    return NextResponse.json({ passwordSet: false, quickUnlock: false, configured: false });
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rlKey = `notes-auth:${ip}`;
  const rl = rateLimit(rlKey, NOTES_LIMIT, NOTES_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const input = typeof body?.password === 'string' ? body.password : '';
    if (!input) return NextResponse.json({ error: 'Password required' }, { status: 400 });

    const [passwordHash, totpSecret] = await Promise.all([
      getNotesPasswordHash(),
      getNotesTotpSecret(),
    ]);

    if (!passwordHash && !totpSecret) {
      return NextResponse.json(
        { error: 'The notes vault is not set up. Set a password in Admin -> Security.' },
        { status: 503 }
      );
    }

    let maxAgeSec: number | null = null;
    let jwtExp = '';

    if (totpSecret && normalizeTotpCode(input) && checkTotp(totpSecret, input).valid) {
      maxAgeSec = 45 * 60;
      jwtExp = '45m';
    } else if (passwordHash) {
      if (!passwordHash.startsWith('scrypt:')) {
        return NextResponse.json(
          { error: 'Notes password is outdated. Please reset it from the admin panel.' },
          { status: 401 }
        );
      }
      if (await verifyPassword(input, passwordHash)) {
        maxAgeSec = 7 * 24 * 60 * 60;
        jwtExp = '7d';
      }
    }

    if (maxAgeSec === null) {
      return NextResponse.json({ error: 'Invalid key or password' }, { status: 401 });
    }
    resetRateLimit(rlKey);

    const token = await new SignJWT({ auth: 'notes' })
      .setProtectedHeader({ alg: 'HS512' })
      .setIssuedAt()
      .setExpirationTime(jwtExp)
      .sign(getJwtSecret());

    (await cookies()).set('notes_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: maxAgeSec,
    });

    const settings = await getNotesSettings();
    return NextResponse.json({
      success: true,
      expiresAt: Date.now() + maxAgeSec * 1000,
      autosaveInterval: settings.autosaveInterval,
      notesPerPage: settings.notesPerPage,
      vaultTitle: settings.vaultTitle,
      lockTitle: settings.lockTitle,
      maxFileBytes: fileLimitBytes(settings),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
