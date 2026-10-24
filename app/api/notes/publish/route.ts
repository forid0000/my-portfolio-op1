import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyNotesSession } from '@/lib/auth';
import { isSameOrigin, problem } from '@/lib/api/respond';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { notesCollection, serializeNote } from '@/lib/notes';
import { cleanSlug, isReservedSlug } from '@/lib/notes-model';
import { revalidateNotes } from '@/lib/revalidate';
import { objectIdSchema, publishSchema } from '@/lib/validation/note-schemas';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET /api/notes/publish?slug=xxx&excludeId=yyy - is this address free?
export async function GET(request: Request) {
  if (!(await verifyNotesSession())) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const slug = cleanSlug(searchParams.get('slug') ?? '');
    if (!slug) return NextResponse.json({ available: false, error: 'Address required' });
    if (isReservedSlug(slug)) {
      return NextResponse.json({ available: false, reserved: true });
    }

    const query: Record<string, unknown> = { slug };
    const excludeId = searchParams.get('excludeId') || '';
    if (excludeId && objectIdSchema.safeParse(excludeId).success) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const collection = await notesCollection();
    const existing = await collection.findOne(query, { projection: { _id: 1 } });
    return NextResponse.json({ available: !existing, slug });
  } catch (error) {
    console.error('[notes/publish]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// PATCH /api/notes/publish - publish a note at an address, or take it back to private
export async function PATCH(request: Request) {
  if (!(await verifyNotesSession())) return unauthorized();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }
  const rl = rateLimit(`notes-write:${clientIp(request)}`, 600, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const parsed = publishSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const oid = new mongoose.Types.ObjectId(parsed.data.id);
    const collection = await notesCollection();
    const before = await collection.findOne({ _id: oid });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (parsed.data.published) {
      const slug = cleanSlug(parsed.data.slug);
      if (!slug) return problem(['slug'], 'Use letters, numbers and hyphens for the address.');
      if (isReservedSlug(slug)) {
        return problem(['slug'], 'That address is used by the site itself. Pick another.');
      }
      const conflict = await collection.findOne(
        { slug, _id: { $ne: oid } },
        { projection: { _id: 1 } }
      );
      if (conflict) {
        return NextResponse.json(
          { error: 'Address already taken', conflict: true },
          { status: 409 }
        );
      }
      update.published = true;
      update.slug = slug;
      if (!before.published || !before.publishedAt) update.publishedAt = new Date();
    } else {
      // The address stays stored so it can be reused when the note is published again.
      update.published = false;
    }

    await collection.updateOne({ _id: oid }, { $set: update });
    const note = await collection.findOne({ _id: oid });

    // The list, the note's page (also its old address), the sitemap and llms.txt follow at once.
    revalidateNotes(before.slug, note?.slug);
    return NextResponse.json({ success: true, note: serializeNote(note!) });
  } catch (error) {
    console.error('[notes/publish]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
