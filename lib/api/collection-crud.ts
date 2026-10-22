/**
 * Shared CRUD factory for the "independent entity" collections (education,
 * certifications, testimonials, services, publications, ...). Each of these
 * collections holds many small documents (one per item) rather than a single
 * type-keyed doc like `homepage` - the same shape as the existing `gallery`
 * collection. Centralizing the GET/POST/PATCH/DELETE wiring here means a new
 * collection-backed section is a ~15 line route file, not a ~150 line one.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { revalidatePublicContent } from '@/lib/revalidate';

async function getCollection(name: string) {
  const db = await connectToDatabase();
  return db.connection.client.db('portfolio_cms').collection(name);
}

/**
 * Server-only, unauthenticated read for the public homepage. Callers gate this
 * behind their own `sections` toggle check first, so a disabled section never
 * even reaches this query.
 */
export async function getPublicItems(collectionName: string): Promise<any[]> {
  try {
    const collection = await getCollection(collectionName);
    return await collection.find({}).sort({ order: 1 }).toArray();
  } catch (error) {
    console.error(`Failed to fetch ${collectionName}`, error);
    return [];
  }
}

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

/** Best-effort Cloudinary cleanup - never lets a destroy failure block the DB delete. */
async function destroyPublicIds(publicIds: (string | undefined | null)[]) {
  await configureCloudinary();
  for (const id of publicIds) {
    if (!id) continue;
    try {
      await cloudinary.uploader.destroy(id);
    } catch (e) {
      console.error('Cloudinary destroy failed for', id, e);
    }
  }
}

interface CollectionCrudOptions<T extends z.ZodObject<any>> {
  /** Extract the Cloudinary public_id(s) embedded in a document, for delete-time cleanup. */
  getPublicIds?: (doc: any) => (string | undefined | null)[];
}

export function createCollectionHandlers<T extends z.ZodRawShape>(
  collectionName: string,
  itemSchema: z.ZodObject<T>,
  opts: CollectionCrudOptions<z.ZodObject<T>> = {}
) {
  const bulkItemSchema = itemSchema.extend({ _id: z.string().optional() });

  async function GET() {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const collection = await getCollection(collectionName);
      const docs = await collection.find({}).sort({ order: 1 }).toArray();
      return NextResponse.json(docs);
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch ${collectionName}`, details: error.message },
        { status: 500 }
      );
    }
  }

  async function POST(request: Request) {
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

      // Array payload = bulk upsert (used by the admin list editor to save
      // every item - including reordered `order` values - in one round trip).
      if (Array.isArray(body)) {
        const parsed = z.array(bulkItemSchema).safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'Invalid payload data', details: parsed.error.issues },
            { status: 400 }
          );
        }
        if (parsed.data.length === 0) {
          return NextResponse.json({ success: true, count: 0 });
        }
        // The Zod-extended generic makes `_id` opaque to the type checker, so
        // work with a concrete shape (validated identically at runtime).
        const items = parsed.data as Array<Record<string, unknown> & { _id?: string }>;
        // Reject a present-but-malformed _id up front: otherwise the filter
        // below would fall through to a fresh ObjectId and `upsert` would INSERT
        // a duplicate instead of updating the intended document.
        const badId = items.find((it) => it._id && !toObjectId(it._id));
        if (badId) {
          return NextResponse.json({ error: 'Invalid _id in payload' }, { status: 400 });
        }
        const collection = await getCollection(collectionName);
        const result = await collection.bulkWrite(
          items.map(({ _id, ...rest }) => ({
            updateOne: {
              filter: {
                _id: _id && toObjectId(_id) ? toObjectId(_id)! : new mongoose.Types.ObjectId(),
              },
              update: { $set: { ...rest, updatedAt: new Date() } },
              upsert: true,
            },
          })),
          { ordered: false }
        );
        revalidatePublicContent();
        return NextResponse.json({
          success: true,
          count: result.upsertedCount + result.modifiedCount,
        });
      }

      // Single-object payload = create one new item.
      const parsed = itemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const collection = await getCollection(collectionName);
      const now = new Date();
      const result = await collection.insertOne({ ...parsed.data, createdAt: now, updatedAt: now });
      revalidatePublicContent();
      return NextResponse.json({ success: true, id: result.insertedId });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to save ${collectionName}`, details: error.message },
        { status: 500 }
      );
    }
  }

  async function PATCH(request: Request) {
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
      if (!body.id || typeof body.id !== 'string') {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }
      const objectId = toObjectId(body.id);
      if (!objectId) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const parsed = itemSchema.partial().safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const collection = await getCollection(collectionName);
      await collection.updateOne(
        { _id: objectId },
        { $set: { ...parsed.data, updatedAt: new Date() } }
      );
      revalidatePublicContent();
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to update ${collectionName}`, details: error.message },
        { status: 500 }
      );
    }
  }

  async function DELETE(request: Request) {
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
      const objectId = toObjectId(id);
      if (!objectId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

      const collection = await getCollection(collectionName);

      if (opts.getPublicIds) {
        const doc = await collection.findOne({ _id: objectId });
        if (doc) await destroyPublicIds(opts.getPublicIds(doc));
      }

      await collection.deleteOne({ _id: objectId });
      revalidatePublicContent();
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to delete from ${collectionName}`, details: error.message },
        { status: 500 }
      );
    }
  }

  return { GET, POST, PATCH, DELETE };
}
