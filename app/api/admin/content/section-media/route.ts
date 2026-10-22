import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MiB, matching the gallery upload cap

// Shared image upload for the section modules that need Cloudinary-hosted
// media (testimonial avatars, certification badges, service banners). Every
// caller gets back only { src, public_id } - never a base64 payload - so
// nothing binary ever reaches MongoDB.
const FOLDER_ALLOWLIST = new Set(['testimonials', 'certifications', 'services']);

// Explicit allowlist, NOT a `startsWith('image/')` prefix check - `image/svg+xml`
// matches that prefix too, and an SVG can carry an inline <script>/event-handler
// payload that Cloudinary happily serves back verbatim (stored XSS), same class
// of bug fixed for avatar uploads in app/api/admin/avatars/route.ts.
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function POST(request: Request) {
  await configureCloudinary();
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

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!FOLDER_ALLOWLIST.has(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }
    if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'File must be a PNG, JPEG, WebP, or GIF image' },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `sections/${folder}`, resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return NextResponse.json({ src: result.secure_url, public_id: result.public_id });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}
