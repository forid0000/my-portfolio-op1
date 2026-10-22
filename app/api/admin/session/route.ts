import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret());
    const exp = payload.exp as number;

    return NextResponse.json({
      active: true,
      exp: exp,
      remainingSeconds: Math.floor(exp - Date.now() / 1000),
    });
  } catch (error) {
    return NextResponse.json({ active: false }, { status: 401 });
  }
}
