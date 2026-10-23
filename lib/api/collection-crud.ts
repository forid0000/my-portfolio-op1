/**
 * Shared CRUD factory for the "independent entity" collections (education,
 * certifications, testimonials, services, publications, ...). Each of these
 * collections holds many small documents (one per item) rather than a single
 * type-keyed doc like `homepage` - the same shape as the existing `gallery`
 * collection. Centralizing the GET/POST/PATCH/DELETE wiring here means a new
 * collection-backed section is a ~15 line route file, not a ~150 line one.
 */
import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { destroyMedia, mediaRefs, removedRefs } from '@/lib/media-server';
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

interface CollectionCrudOptions<T extends z.ZodObject<any>> {
  /**
   * Fields of a document that hold Cloudinary media (a single `{ src, public_id }` or a
   * list of media items). The factory then (a) deletes the files when the document is
   * deleted, (b) deletes files that were removed from a field on save, and (c) really
   * removes a field the editor dropped: the editor omits an emptied field from the
   * payload, and a plain `$set` of the remaining keys would silently keep the old image.
   */
  mediaFields?: string[];
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
        const mediaFields = opts.mediaFields ?? [];

        // Remember what each document held before this save so removed files can be deleted.
        const previous = new Map<string, any>();
        if (mediaFields.length) {
          const ids = items.flatMap((it) =>
            it._id && toObjectId(it._id) ? [toObjectId(it._id)!] : []
          );
          if (ids.length) {
            for (const doc of await collection.find({ _id: { $in: ids } }).toArray()) {
              previous.set(String(doc._id), doc);
            }
          }
        }

        const result = await collection.bulkWrite(
          items.map(({ _id, ...rest }) => {
            const dropped = mediaFields.filter((field) => !(field in rest));
            return {
              updateOne: {
                filter: {
                  _id: _id && toObjectId(_id) ? toObjectId(_id)! : new mongoose.Types.ObjectId(),
                },
                update: {
                  $set: { ...rest, updatedAt: new Date() },
                  ...(dropped.length
                    ? { $unset: Object.fromEntries(dropped.map((field) => [field, ''])) }
                    : {}),
                },
                upsert: true,
              },
            };
          }),
          { ordered: false }
        );

        if (mediaFields.length) {
          const stale = items.flatMap((it) => {
            const before = it._id ? previous.get(it._id) : undefined;
            if (!before) return [];
            return removedRefs(
              mediaRefs(...mediaFields.map((f) => before[f])),
              mediaRefs(...mediaFields.map((f) => it[f]))
            );
          });
          if (stale.length) after(() => destroyMedia(stale));
        }
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
      const mediaFields = (opts.mediaFields ?? []).filter((f) => f in parsed.data);
      const before = mediaFields.length ? await collection.findOne({ _id: objectId }) : null;
      await collection.updateOne(
        { _id: objectId },
        { $set: { ...parsed.data, updatedAt: new Date() } }
      );
      if (before) {
        const data = parsed.data as Record<string, unknown>;
        const stale = removedRefs(
          mediaRefs(...mediaFields.map((f) => before[f])),
          mediaRefs(...mediaFields.map((f) => data[f]))
        );
        if (stale.length) after(() => destroyMedia(stale));
      }
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

      const mediaFields = opts.mediaFields ?? [];
      const doc = mediaFields.length ? await collection.findOne({ _id: objectId }) : null;

      await collection.deleteOne({ _id: objectId });
      if (doc) {
        const refs = mediaRefs(...mediaFields.map((f) => doc[f]));
        if (refs.length) after(() => destroyMedia(refs));
      }
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
