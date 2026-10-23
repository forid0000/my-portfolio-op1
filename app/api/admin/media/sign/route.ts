import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { CloudinaryNotConnectedError, signUpload } from '@/lib/media-server';
import { MEDIA_SCOPE_NAMES, type MediaScope } from '@/lib/media-types';

const signSchema = z.object({
  scope: z.enum(MEDIA_SCOPE_NAMES as [MediaScope, ...MediaScope[]]),
  kind: z.enum(['image', 'video']),
});

/**
 * Hands the admin's browser a short-lived, folder-locked Cloudinary signature so the
 * file can be uploaded straight to Cloudinary (see lib/media-server.ts). The API key
 * returned here is the public half of the pair; the secret never leaves the server.
 */
export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Several files can be picked at once and each needs its own signature.
  const rl = rateLimit(`admin-sign:${clientIp(request)}`, 120, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  try {
    const signed = await signUpload(parsed.data.scope, parsed.data.kind);
    return NextResponse.json(signed, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof CloudinaryNotConnectedError) {
      return NextResponse.json({ error: error.message, code: 'not_connected' }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not start the upload.' },
      { status: 400 }
    );
  }
}
