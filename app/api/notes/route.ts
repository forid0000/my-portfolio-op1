import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyNotesSession } from '@/lib/auth';
import { isSameOrigin, problem } from '@/lib/api/respond';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { deleteFilesIfUnused, resolveAttachments } from '@/lib/note-files';
import { escapeRegex, notesCollection, serializeNote } from '@/lib/notes';
import { excerptFrom, normalizeNoteTags } from '@/lib/notes-model';
import { revalidateNotes } from '@/lib/revalidate';
import { noteInputSchema, noteUpdateSchema, objectIdSchema } from '@/lib/validation/note-schemas';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const failed = (error: unknown) => {
  console.error('[notes]', error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
};

/** Every write: the vault session, this site's own pages only, and a sane request rate. */
async function guardWrite(request: Request): Promise<NextResponse | null> {
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
  return null;
}

/** A list row: enough to show and find a note, never its whole text. */
function listItem(doc: Record<string, any>) {
  const note = serializeNote(doc);
  return {
    _id: note._id,
    title: note.title,
    excerpt: excerptFrom(note.content.slice(0, 1500), 140),
    tags: note.tags,
    attachmentCount: note.attachments.length,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    published: Boolean(note.published),
    slug: note.slug,
  };
}

export async function GET(request: Request) {
  if (!(await verifyNotesSession())) return unauthorized();
  try {
    const collection = await notesCollection();
    const { searchParams } = new URL(request.url);

    const idParam = searchParams.get('id');
    if (idParam) {
      if (!objectIdSchema.safeParse(idParam).success) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      }
      const note = await collection.findOne({ _id: new mongoose.Types.ObjectId(idParam) });
      if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ note: serializeNote(note) });
    }

    const search = (searchParams.get('search') || '').trim().slice(0, 100);
    const tagList = (searchParams.get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const query: Record<string, unknown> = {};
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [{ title: pattern }, { content: pattern }, { tags: pattern }];
    }
    if (tagList.length) query.tags = { $in: tagList };

    const [totalCount, notes, allTags] = await Promise.all([
      collection.countDocuments(query),
      collection
        .aggregate([
          { $match: query },
          { $sort: { updatedAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              title: 1,
              tags: 1,
              attachments: 1,
              createdAt: 1,
              updatedAt: 1,
              published: 1,
              slug: 1,
              // The list only shows a summary, so only the start of the text is sent.
              content: { $substrCP: [{ $ifNull: ['$content', ''] }, 0, 1500] },
            },
          },
        ])
        .toArray(),
      collection.distinct('tags', {}),
    ]);

    return NextResponse.json({
      notes: notes.map(listItem),
      totalCount,
      page,
      limit,
      allTags: (allTags as string[]).filter(Boolean).sort(),
    });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const blocked = await guardWrite(request);
  if (blocked) return blocked;
  try {
    const parsed = noteInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const files = await resolveAttachments(parsed.data.attachments);
    if (!files.ok) {
      return problem(['attachments', files.index], 'This file is no longer stored. Add it again.');
    }

    const now = new Date();
    const collection = await notesCollection();
    const result = await collection.insertOne({
      title: parsed.data.title,
      content: parsed.data.content,
      tags: normalizeNoteTags(parsed.data.tags),
      attachments: files.attachments,
      createdAt: now,
      updatedAt: now,
    });
    const note = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ success: true, note: serializeNote(note!) });
  } catch (error) {
    return failed(error);
  }
}

export async function PUT(request: Request) {
  const blocked = await guardWrite(request);
  if (blocked) return blocked;
  try {
    const parsed = noteUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { id, ...data } = parsed.data;
    const oid = new mongoose.Types.ObjectId(id);
    const collection = await notesCollection();
    const existing = await collection.findOne({ _id: oid });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const files = await resolveAttachments(data.attachments);
    if (!files.ok) {
      return problem(['attachments', files.index], 'This file is no longer stored. Add it again.');
    }

    await collection.updateOne(
      { _id: oid },
      {
        $set: {
          title: data.title,
          content: data.content,
          tags: normalizeNoteTags(data.tags),
          attachments: files.attachments,
          updatedAt: new Date(),
        },
      }
    );

    // Files the note no longer lists are deleted (unless another note keeps them).
    const keep = new Set(files.attachments.map((a) => a.id));
    const dropped = serializeNote(existing).attachments.filter((a) => !keep.has(a.id));
    if (dropped.length)
      await deleteFilesIfUnused(
        dropped.map((a) => a.id),
        id
      );

    // A published note is a public page: show the edit there too.
    if (existing.published) revalidateNotes(existing.slug);

    const note = await collection.findOne({ _id: oid });
    return NextResponse.json({ success: true, note: serializeNote(note!) });
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(request: Request) {
  const blocked = await guardWrite(request);
  if (blocked) return blocked;
  try {
    const parsed = objectIdSchema.safeParse(
      ((await request.json().catch(() => null)) as { id?: unknown } | null)?.id
    );
    if (!parsed.success) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const oid = new mongoose.Types.ObjectId(parsed.data);

    const collection = await notesCollection();
    const existing = await collection.findOne({ _id: oid });
    const result = await collection.deleteOne({ _id: oid });
    if (existing) {
      const files = serializeNote(existing).attachments;
      if (files.length)
        await deleteFilesIfUnused(
          files.map((a) => a.id),
          parsed.data
        );
      if (existing.published) revalidateNotes(existing.slug);
    }
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    return failed(error);
  }
}
