import { NextResponse } from 'next/server';
import {
  CLOUDINARY_NOT_CONNECTED_MESSAGE,
  cloudinaryErrorMessage,
  cloudinaryHttpCode,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { applySync, computeSync } from '@/lib/avatar-store';

function failure(error: unknown): NextResponse {
  console.error('Avatar sync failed', error);
  const limited = [420, 429].includes(cloudinaryHttpCode(error) ?? 0);
  return NextResponse.json(
    { error: cloudinaryErrorMessage(error, 'Could not compare with Cloudinary.') },
    { status: limited ? 429 : 502 }
  );
}

/** Dry run: what differs between the avatar library and Cloudinary right now. */
export async function GET() {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isCloudinaryConfigured())) {
    return NextResponse.json({
      cloudinaryConfigured: false,
      error: CLOUDINARY_NOT_CONNECTED_MESSAGE,
    });
  }
  try {
    return NextResponse.json({ cloudinaryConfigured: true, ...(await computeSync()) });
  } catch (error) {
    return failure(error);
  }
}

/** Repairs drift: removes entries whose file is gone, refreshes changed ones, imports unknown files. */
export async function POST(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  if (!(await isCloudinaryConfigured())) {
    return NextResponse.json({ error: CLOUDINARY_NOT_CONNECTED_MESSAGE }, { status: 503 });
  }
  try {
    return NextResponse.json({ success: true, ...(await applySync()) });
  } catch (error) {
    return failure(error);
  }
}
