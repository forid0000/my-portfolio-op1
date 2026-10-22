import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { z } from 'zod';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import cloudinary, { configureCloudinary } from '@/lib/cloudinary';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const galleryItemSchema = z.object({
  public_id: z.string(),
  src: z.string(),
  alt: z.string(),
  date: z.string(),
  category: z.string(),
  width: z.number(),
  height: z.number(),
  order: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// Public: list all gallery items (ordered)
export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('gallery');
    const items = await collection.find({}).sort({ order: 1 }).toArray();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

// Admin: upsert a single item, or replace the whole set with { items: [...] }
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
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('gallery');

    // Bulk upsert (partial patch) without wiping the collection - backs the
    // admin page's "Save N changes" button so a batch of dirty items (drag
    // reorders and/or field edits) commits as one atomic MongoDB round-trip
    // instead of N sequential fetch()->updateOne() calls. `ordered: false`
    // is deliberate: each op targets a different public_id with no
    // cross-document invariant between them, so an error on one item
    // shouldn't block the rest from applying.
    if (Array.isArray(body.bulkPatch)) {
      const parsed = z.array(galleryItemSchema).safeParse(body.bulkPatch);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const patches = parsed.data;
      if (patches.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      const result = await collection.bulkWrite(
        patches.map((it) => ({
          updateOne: {
            filter: { public_id: it.public_id },
            update: { $set: { ...it, updatedAt: new Date() } },
            upsert: true,
          },
        })),
        { ordered: false }
      );

      // Best-effort Cloudinary tag sync, same as the single-item path below.
      for (const it of patches) {
        if (!it.public_id) continue;
        try {
          if (Array.isArray(it.tags) && it.tags.length > 0) {
            await cloudinary.uploader.replace_tag(it.tags.join(','), [it.public_id]);
          } else if (it.tags !== undefined) {
            await cloudinary.uploader.remove_all_tags([it.public_id]);
          }
        } catch (e) {
          console.error('Failed to sync tags to Cloudinary for', it.public_id, e);
        }
      }

      revalidatePublicContent();
      return NextResponse.json({
        success: true,
        count: result.upsertedCount + result.modifiedCount,
      });
    }

    if (Array.isArray(body.items)) {
      const parsed = z.array(galleryItemSchema).safeParse(body.items);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const items = parsed.data;

      // Full replace: wipe and re-insert in order
      await collection.deleteMany({});
      if (items.length) {
        await collection.insertMany(
          items.map((it, i) => ({
            public_id: it.public_id,
            src: it.src,
            alt: it.alt,
            date: it.date,
            width: it.width,
            height: it.height,
            category: it.category,
            tags: it.tags || [],
            order: typeof it.order === 'number' ? it.order : i + 1,
            updatedAt: new Date(),
          }))
        );

        // SYNC TAGS TO CLOUDINARY
        for (const it of items) {
          if (it.public_id) {
            try {
              if (Array.isArray(it.tags) && it.tags.length > 0) {
                await cloudinary.uploader.replace_tag(it.tags.join(','), [it.public_id]);
              } else {
                await cloudinary.uploader.remove_all_tags([it.public_id]);
              }
            } catch (e) {
              console.error('Failed to sync tags to Cloudinary for', it.public_id, e);
            }
          }
        }
      }
      revalidatePublicContent();
      return NextResponse.json({ success: true, count: items.length });
    }

    // Single upsert by public_id
    if (body.public_id) {
      const parsed = galleryItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid payload data', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const item = parsed.data;

      await collection.updateOne(
        { public_id: item.public_id },
        { $set: { ...item, updatedAt: new Date() } },
        { upsert: true }
      );

      // SYNC TAGS TO CLOUDINARY
      try {
        if (Array.isArray(item.tags) && item.tags.length > 0) {
          await cloudinary.uploader.replace_tag(item.tags.join(','), [item.public_id]);
        } else if (item.tags !== undefined) {
          await cloudinary.uploader.remove_all_tags([item.public_id]);
        }
      } catch (e) {
        console.error('Failed to sync tags to Cloudinary for', item.public_id, e);
      }

      revalidatePublicContent();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No items or public_id provided' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 });
  }
}

// Admin: rename a category across all items, or merge into another
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
    const { action, from, to } = await request.json();
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('gallery');

    if (action === 'rename' && from && to) {
      const res = await collection.updateMany(
        { category: from },
        { $set: { category: to, updatedAt: new Date() } }
      );
      revalidatePublicContent();
      return NextResponse.json({ success: true, modified: res.modifiedCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// Admin: delete an item by public_id (also removes the Cloudinary asset)
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
    const { public_id } = await request.json();
    if (!public_id) {
      return NextResponse.json({ error: 'No public_id provided' }, { status: 400 });
    }
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('gallery');
    await collection.deleteOne({ public_id });

    // Best-effort: remove the underlying Cloudinary asset too
    try {
      await cloudinary.uploader.destroy(public_id);
    } catch (e) {
      console.error('Cloudinary destroy failed for', public_id, e);
    }

    revalidatePublicContent();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
  }
}
