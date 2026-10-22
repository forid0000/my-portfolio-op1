import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession } from '@/lib/auth';
import {
  ADMIN_PASSWORD_MIN,
  NOTES_PASSWORD_MIN,
  PASSWORD_MAX,
  buildTotpUri,
  checkTotp,
  generateTotpSecret,
  getAdminAuth,
  getNotesPasswordHash,
  getNotesTotpSecret,
  hashPassword,
  isValidTotpSecret,
  removeNotesPassword,
  removeNotesTotpSecret,
  replaceAdminTotpSecret,
  setAdminPasswordHash,
  setNotesPassword,
  setNotesTotpSecret,
} from '@/lib/credentials';
import { INTEGRATION_GROUPS, describeIntegrations, saveIntegrations } from '@/lib/integrations';
import { clientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';

// Everything credential-related that the admin can change from the dashboard.
// Every change (except generating a fresh authenticator seed, which stores
// nothing) needs a current authenticator code on top of the session, so a stolen
// 15-minute session cookie cannot be turned into a permanent takeover.

const totp = z.string().max(20);
const seed = z.string().max(200);

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate-secret'), purpose: z.enum(['admin', 'notes']) }),
  z.object({
    action: z.literal('admin-set-password'),
    currentTotp: totp,
    newPassword: z.string().min(ADMIN_PASSWORD_MIN).max(PASSWORD_MAX),
  }),
  z.object({ action: z.literal('admin-remove-password'), currentTotp: totp }),
  z.object({
    action: z.literal('admin-rotate-totp'),
    currentTotp: totp,
    newSecret: seed,
    newCode: totp,
  }),
  z.object({
    action: z.literal('notes-set-password'),
    currentTotp: totp,
    newPassword: z.string().min(NOTES_PASSWORD_MIN).max(PASSWORD_MAX),
  }),
  z.object({ action: z.literal('notes-remove-password'), currentTotp: totp }),
  z.object({
    action: z.literal('notes-enable-totp'),
    currentTotp: totp,
    newSecret: seed,
    newCode: totp,
  }),
  z.object({ action: z.literal('notes-disable-totp'), currentTotp: totp }),
  z.object({
    action: z.literal('integrations-save'),
    currentTotp: totp,
    values: z.record(z.string().max(100), z.string().max(500).nullable()),
  }),
]);

async function buildOverview() {
  const [auth, notesPassword, notesTotp, integrations] = await Promise.all([
    getAdminAuth(),
    getNotesPasswordHash(),
    getNotesTotpSecret(),
    describeIntegrations(),
  ]);
  return {
    admin: { hasPassword: Boolean(auth?.passwordHash) },
    notes: { hasPassword: Boolean(notesPassword), quickUnlock: Boolean(notesTotp) },
    integrations,
    groups: INTEGRATION_GROUPS,
  };
}

export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await buildOverview());
  } catch (error: any) {
    console.error('Security overview error:', error);
    return NextResponse.json({ error: 'Failed to load security settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = clientIp(request);
  const rlKey = `admin-stepup:${ip}`;
  const rl = rateLimit(rlKey, 15, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path.join('.');
      const message =
        field === 'newPassword'
          ? 'That password is too short.'
          : 'Invalid request. Check the values and try again.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const body = parsed.data;

    // Generating a seed stores nothing; it only needs the session.
    if (body.action === 'generate-secret') {
      const secret = generateTotpSecret();
      return NextResponse.json({
        secret,
        uri: buildTotpUri(secret, body.purpose === 'notes' ? 'notes-vault' : 'admin'),
      });
    }

    const auth = await getAdminAuth();
    if (!auth) {
      return NextResponse.json({ error: 'No admin account is configured.' }, { status: 409 });
    }
    if (!checkTotp(auth.totpSecret, body.currentTotp).valid) {
      return NextResponse.json(
        { error: 'Your current authenticator code is not correct.' },
        { status: 401 }
      );
    }
    resetRateLimit(rlKey);

    // A new authenticator seed must be proven before it replaces anything.
    const checkNewSeed = (): string | null => {
      if (!('newSecret' in body)) return 'Missing authenticator secret.';
      if (!isValidTotpSecret(body.newSecret)) return 'Invalid authenticator secret.';
      if (!checkTotp(body.newSecret, body.newCode).valid) {
        return 'The code from your new authenticator entry is not correct.';
      }
      return null;
    };

    switch (body.action) {
      case 'admin-set-password':
        await setAdminPasswordHash(await hashPassword(body.newPassword));
        break;
      case 'admin-remove-password':
        await setAdminPasswordHash(null);
        break;
      case 'admin-rotate-totp': {
        const problem = checkNewSeed();
        if (problem) return NextResponse.json({ error: problem }, { status: 400 });
        await replaceAdminTotpSecret(body.newSecret);
        break;
      }
      case 'notes-set-password':
        await setNotesPassword(body.newPassword);
        break;
      case 'notes-remove-password':
        await removeNotesPassword();
        break;
      case 'notes-enable-totp': {
        const problem = checkNewSeed();
        if (problem) return NextResponse.json({ error: problem }, { status: 400 });
        await setNotesTotpSecret(body.newSecret);
        break;
      }
      case 'notes-disable-totp':
        await removeNotesTotpSecret();
        break;
      case 'integrations-save':
        try {
          await saveIntegrations(body.values);
        } catch (error: any) {
          return NextResponse.json({ error: error?.message || 'Invalid value.' }, { status: 400 });
        }
        break;
    }

    console.info(`[my-portfolio-op1] Security change "${body.action}" by admin from ${ip}`);
    return NextResponse.json({ success: true, ...(await buildOverview()) });
  } catch (error: any) {
    console.error('Security update error:', error);
    return NextResponse.json({ error: 'Failed to save. Check the server log.' }, { status: 500 });
  }
}
