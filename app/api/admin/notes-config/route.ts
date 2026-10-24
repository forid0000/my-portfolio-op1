import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { fileLimitBytes, getNotesSettings, saveNotesSettings } from '@/lib/notes-settings';
import { PLATFORM_FILE_LIMIT } from '@/lib/notes-model';
import { revalidateNotes } from '@/lib/revalidate';
import { notesConfigSchema } from '@/lib/validation/note-schemas';

export async function GET() {
  if (!(await verifyAdminSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = await connectToDatabase();
    const col = db.connection.client.db('portfolio_cms').collection('settings');
    const [pwdDoc, totpDoc, settings] = await Promise.all([
      col.findOne({ key: 'notes_password' }),
      col.findOne({ key: 'notes_totp' }),
      getNotesSettings(),
    ]);
    const serverless = Boolean(process.env.VERCEL);
    return NextResponse.json({
      // Passwords and authenticator codes are managed in Admin -> Security.
      hasPassword: !!pwdDoc,
      hasQuickUnlock: !!totpDoc,
      ...settings,
      // The largest value the platform allows (a request body is limited on Vercel).
      maxFileMbAllowed: Math.floor(
        (serverless ? PLATFORM_FILE_LIMIT.serverless : PLATFORM_FILE_LIMIT.selfHosted) /
          (1024 * 1024)
      ),
      effectiveFileMb: Math.round((fileLimitBytes(settings) / (1024 * 1024)) * 10) / 10,
    });
  } catch (error) {
    console.error('[admin/notes-config]', error);
    return NextResponse.json({ error: 'Could not load the notes options.' }, { status: 500 });
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
    const parsed = notesConfigSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    await saveNotesSettings(parsed.data);
    // The wording of the public notes page is part of its static HTML.
    revalidateNotes();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/notes-config]', error);
    return NextResponse.json({ error: 'Could not save the notes options.' }, { status: 500 });
  }
}
