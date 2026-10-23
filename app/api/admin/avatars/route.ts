import { NextResponse } from 'next/server';
import { z } from 'zod';
import cloudinary, {
  CLOUDINARY_NOT_CONNECTED_MESSAGE,
  cloudinaryErrorMessage,
  configureCloudinary,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import {
  AvatarError,
  activateAvatar,
  avatarsCollection,
  deleteAvatar,
  registerAvatar,
  toAvatarView,
  type AvatarDoc,
} from '@/lib/avatar-store';

const AVATAR_FOLDER = 'avatars';

// The file itself never reaches this route: the browser uploads it straight to
// Cloudinary (lib/media-upload.ts) and then registers it here by public_id, so the
// server reads the real details back from Cloudinary instead of trusting the client.
const registerSchema = z.object({
  public_id: z.string().min(3).max(300),
  name: z.string().max(255).optional(),
  setActive: z.boolean().optional(),
});

const patchSchema = z.object({ action: z.literal('set_active'), id: z.string().min(1) });

/** Session + (for writes) rate limit. Returns an error response, or null when the request may proceed. */
async function guard(request: Request, write: boolean): Promise<NextResponse | null> {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (write) {
    const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }
  }
  return null;
}

function failure(error: unknown, fallback: string): NextResponse {
  if (error instanceof AvatarError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: cloudinaryErrorMessage(error, fallback) }, { status: 502 });
}

/**
 * One-time, self-healing migration for avatar docs saved before this route stored
 * images in Cloudinary: uploads the stored base64 to Cloudinary, then rewrites the
 * doc to the new shape and drops the binary field. Runs lazily when an admin loads
 * the Media Manager, so there is no separate migration script to remember to run.
 */
async function migrateLegacyDoc(
  collection: Awaited<ReturnType<typeof avatarsCollection>>,
  doc: AvatarDoc
): Promise<AvatarDoc> {
  if (doc.secure_url || !doc.base64) return doc;
  try {
    const uploaded = await cloudinary.uploader.upload(doc.base64, {
      folder: AVATAR_FOLDER,
      resource_type: 'image',
    });
    const update = {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
      etag: uploaded.etag,
      updatedAt: new Date(),
    };
    await collection.updateOne({ _id: doc._id }, { $set: update, $unset: { base64: '' } });
    return { ...doc, ...update, base64: undefined };
  } catch (error) {
    console.error(`Failed to migrate legacy avatar doc ${doc._id}`, error);
    return doc;
  }
}

export async function GET(request: Request) {
  const denied = await guard(request, false);
  if (denied) return denied;
  try {
    const cloudinaryConfigured = await isCloudinaryConfigured();
    const collection = await avatarsCollection();
    let docs = (await collection.find({}).sort({ uploadedAt: -1 }).toArray()) as AvatarDoc[];
    if (cloudinaryConfigured) {
      await configureCloudinary();
      docs = await Promise.all(docs.map((doc) => migrateLegacyDoc(collection, doc)));
    }
    return NextResponse.json({ avatars: docs.map(toAvatarView), cloudinaryConfigured });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch avatars', details: error.message },
      { status: 500 }
    );
  }
}

/** Adds an uploaded picture to the library; by default it becomes the live profile picture. */
export async function POST(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  if (!(await isCloudinaryConfigured())) {
    return NextResponse.json({ error: CLOUDINARY_NOT_CONNECTED_MESSAGE }, { status: 503 });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid picture reference.' }, { status: 400 });
  }
  try {
    const { avatar, duplicate } = await registerAvatar(parsed.data.public_id, {
      name: parsed.data.name,
      setActive: parsed.data.setActive ?? true,
    });
    return NextResponse.json({ success: true, avatar, duplicate });
  } catch (error) {
    return failure(error, 'Failed to add the picture');
  }
}

export async function PATCH(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  try {
    await activateAvatar(parsed.data.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, 'Failed to update avatar');
  }
}

export async function DELETE(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  try {
    await deleteAvatar(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error, 'Failed to delete avatar');
  }
}
