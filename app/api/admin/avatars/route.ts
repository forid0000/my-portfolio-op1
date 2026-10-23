import { NextResponse } from 'next/server';
import { revalidateSiteChrome } from '@/lib/revalidate';
import { z } from 'zod';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { invalidateAvatarCache } from '@/lib/avatar-cache';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const AVATAR_FOLDER = 'avatars';

// SVG is deliberately excluded: this drives the favicon (app/icon.tsx) and the
// OG/Twitter share image (app/layout.tsx), so an SVG upload could carry an
// inline <script>/event-handler payload (stored XSS).
const avatarUploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  base64: z.string().min(1),
  isActive: z.boolean().optional(),
});

interface AvatarDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  mimeType: string;
  secure_url?: string;
  public_id?: string;
  base64?: string; // legacy field, only present on docs saved before the Cloudinary migration
  isActive: boolean;
  uploadedAt: Date;
  updatedAt?: Date;
}

/**
 * One-time, self-healing migration for avatar docs saved before this route
 * stored images in Cloudinary: uploads the stored base64 to Cloudinary, then
 * rewrites the doc to the new shape and drops the binary field. Runs lazily
 * (only when an admin loads the Media Manager), so there is no separate
 * migration script to remember to run.
 */
async function migrateLegacyDoc(collection: any, doc: AvatarDoc): Promise<AvatarDoc> {
  if (doc.secure_url || !doc.base64) return doc;
  try {
    const uploadResponse = await cloudinary.uploader.upload(doc.base64, {
      folder: AVATAR_FOLDER,
      resource_type: 'image',
    });
    const update = {
      secure_url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      updatedAt: new Date(),
    };
    await collection.updateOne({ _id: doc._id }, { $set: update, $unset: { base64: '' } });
    return { ...doc, ...update, base64: undefined };
  } catch (error) {
    console.error(`Failed to migrate legacy avatar doc ${doc._id}`, error);
    return doc;
  }
}

export async function GET() {
  await configureCloudinary();
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('avatars');
    const docs = (await collection.find({}).sort({ uploadedAt: -1 }).toArray()) as AvatarDoc[];

    const migrated = await Promise.all(docs.map((doc) => migrateLegacyDoc(collection, doc)));

    return NextResponse.json(migrated.map(({ base64: _base64, ...rest }) => rest));
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch avatars', details: error.message },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const parsed = avatarUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // base64 adds ~33% overhead; this is a pre-upload guard against pathologically large payloads.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (data.base64.length > MAX_BYTES * 1.4) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(data.base64, {
        folder: AVATAR_FOLDER,
        resource_type: 'image',
      });
    } catch (error: any) {
      console.error('Cloudinary avatar upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudinary', details: error.message },
        { status: 502 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('avatars');

    if (data.isActive) {
      await collection.updateMany({}, { $set: { isActive: false } });
    }

    const doc = {
      name: data.name,
      mimeType: data.mimeType,
      secure_url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      isActive: data.isActive || false,
      uploadedAt: new Date(),
    };

    const result = await collection.insertOne(doc);
    if (data.isActive) {
      invalidateAvatarCache();
      revalidateSiteChrome();
    }
    return NextResponse.json({ success: true, id: result.insertedId, secure_url: doc.secure_url });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to upload avatar', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const data = await request.json();
    if (data.action !== 'set_active' || typeof data.id !== 'string') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(data.id);
    } catch {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('avatars');

    await collection.updateMany({}, { $set: { isActive: false, updatedAt: new Date() } });
    await collection.updateOne(
      { _id: objectId },
      { $set: { isActive: true, updatedAt: new Date() } }
    );
    invalidateAvatarCache();
    revalidateSiteChrome();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update avatar', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let objectId: mongoose.Types.ObjectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('avatars');

    const doc = (await collection.findOne({ _id: objectId })) as AvatarDoc | null;
    await collection.deleteOne({ _id: objectId });

    if (doc?.public_id) {
      try {
        await cloudinary.uploader.destroy(doc.public_id);
      } catch (error) {
        // Doc is already gone from Mongo; an orphaned Cloudinary asset is a
        // minor storage cost, not a correctness problem - log and continue.
        console.error(`Failed to delete Cloudinary asset ${doc.public_id}`, error);
      }
    }

    if (doc?.isActive) {
      invalidateAvatarCache();
      revalidateSiteChrome();
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete avatar', details: error.message },
      { status: 500 }
    );
  }
}
