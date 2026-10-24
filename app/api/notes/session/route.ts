import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { fileLimitBytes, getNotesSettings } from '@/lib/notes-settings';

/** Is the vault unlocked in this browser, and with which options? Same answer shape as the login. */
export async function GET() {
  try {
    const token = (await cookies()).get('notes_session')?.value;
    if (!token) return NextResponse.json({ active: false }, { status: 401 });

    const { payload } = await jwtVerify(token, getJwtSecret());
    const expiresAt = (payload.exp as number) * 1000;
    if (expiresAt <= Date.now()) return NextResponse.json({ active: false }, { status: 401 });

    const settings = await getNotesSettings();
    return NextResponse.json({
      active: true,
      expiresAt,
      autosaveInterval: settings.autosaveInterval,
      notesPerPage: settings.notesPerPage,
      vaultTitle: settings.vaultTitle,
      lockTitle: settings.lockTitle,
      maxFileBytes: fileLimitBytes(settings),
    });
  } catch {
    return NextResponse.json({ active: false }, { status: 401 });
  }
}
