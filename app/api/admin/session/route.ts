import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { ADMIN_SESSION_MAX_SECONDS } from '@/lib/session-timing';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getJwtSecret());
    const exp = payload.exp as number;
    const iat = payload.iat as number;
    const now = Date.now() / 1000;

    return NextResponse.json({
      active: true,
      exp: exp,
      remainingSeconds: Math.floor(exp - now),
      // How long until the 3-hour limit from sign-in, however often the session is extended.
      limitSeconds: Math.floor(iat + ADMIN_SESSION_MAX_SECONDS - now),
    });
  } catch (error) {
    return NextResponse.json({ active: false }, { status: 401 });
  }
}
