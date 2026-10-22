import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const notesConfigSchema = z.object({
  autosaveInterval: z.number().min(5).max(300).optional(),
  notesPerPage: z.number().min(5).max(100).optional(),
  vaultTitle: z.string().trim().min(1).max(60).optional(),
  lockTitle: z.string().trim().min(1).max(60).optional(),
});

export async function GET() {
  if (!(await verifyAdminSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await connectToDatabase();
    const col = db.connection.client.db('portfolio_cms').collection('settings');
    const [pwdDoc, totpDoc, asDoc, ppDoc, vtDoc, ltDoc] = await Promise.all([
      col.findOne({ key: 'notes_password' }),
      col.findOne({ key: 'notes_totp' }),
      col.findOne({ key: 'notes_autosave_interval' }),
      col.findOne({ key: 'notes_per_page' }),
      col.findOne({ key: 'notes_vault_title' }),
      col.findOne({ key: 'notes_lock_title' }),
    ]);
    return NextResponse.json({
      // Passwords and authenticator codes are managed in Admin -> Security.
      hasPassword: !!pwdDoc,
      hasQuickUnlock: !!totpDoc,
      autosaveInterval: asDoc?.value ?? 30,
      notesPerPage: ppDoc?.value ?? 20,
      vaultTitle: vtDoc?.value ?? 'Notes Vault',
      lockTitle: ltDoc?.value ?? 'VAULT LOCKED',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await verifyAdminSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const raw = await request.json();
    const parsed = notesConfigSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const db = await connectToDatabase();
    const col = db.connection.client.db('portfolio_cms').collection('settings');

    if (body.autosaveInterval !== undefined) {
      await col.updateOne(
        { key: 'notes_autosave_interval' },
        { $set: { value: body.autosaveInterval } },
        { upsert: true }
      );
    }

    if (body.notesPerPage !== undefined) {
      await col.updateOne(
        { key: 'notes_per_page' },
        { $set: { value: body.notesPerPage } },
        { upsert: true }
      );
    }

    if (body.vaultTitle !== undefined) {
      await col.updateOne(
        { key: 'notes_vault_title' },
        { $set: { value: body.vaultTitle } },
        { upsert: true }
      );
    }

    if (body.lockTitle !== undefined) {
      await col.updateOne(
        { key: 'notes_lock_title' },
        { $set: { value: body.lockTitle } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
