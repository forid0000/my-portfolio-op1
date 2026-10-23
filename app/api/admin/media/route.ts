import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { destroyMedia, isManagedPublicId, isMediaReferenced } from '@/lib/media-server';

const discardSchema = z.object({
  public_id: z.string().min(3).max(300),
  kind: z.enum(['image', 'video']).default('image'),
});

/**
 * Deletes an upload the owner removed again before saving (an abandoned file would
 * otherwise sit in Cloudinary forever). Refuses anything that a saved document
 * still points at, and anything outside the folders this app manages, so it can
 * never be used to delete live content or someone else's assets.
 */
export async function DELETE(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const parsed = discardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isManagedPublicId(parsed.data.public_id)) {
    return NextResponse.json({ error: 'Invalid media reference.' }, { status: 400 });
  }
  const { public_id, kind } = parsed.data;

  try {
    if (await isMediaReferenced(public_id)) {
      return NextResponse.json(
        { error: 'This file is still used by saved content.' },
        { status: 409 }
      );
    }
    await destroyMedia([{ public_id, kind }]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Media discard failed', error);
    return NextResponse.json({ error: 'Could not remove the file.' }, { status: 500 });
  }
}
