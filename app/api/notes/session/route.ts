import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import connectToDatabase from '@/lib/db';

export async function GET() {
  try {
    const token = (await cookies()).get('notes_session')?.value;
    if (!token) return NextResponse.json({ active: false }, { status: 401 });

    const { payload } = await jwtVerify(token, getJwtSecret());
    const exp = payload.exp as number;
    const expiresAt = exp * 1000;

    if (expiresAt <= Date.now()) return NextResponse.json({ active: false }, { status: 401 });

    const db = await connectToDatabase();
    const col = db.connection.client.db('portfolio_cms').collection('settings');
    const [asDoc, ppDoc, vtDoc, ltDoc] = await Promise.all([
      col.findOne({ key: 'notes_autosave_interval' }),
      col.findOne({ key: 'notes_per_page' }),
      col.findOne({ key: 'notes_vault_title' }),
      col.findOne({ key: 'notes_lock_title' }),
    ]);

    return NextResponse.json({
      active: true,
      expiresAt,
      autosaveInterval: (asDoc?.value ?? 30) as number,
      notesPerPage: (ppDoc?.value ?? 20) as number,
      vaultTitle: (vtDoc?.value ?? 'Notes Vault') as string,
      lockTitle: (ltDoc?.value ?? 'VAULT LOCKED') as string,
    });
  } catch {
    return NextResponse.json({ active: false }, { status: 401 });
  }
}
