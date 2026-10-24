import 'server-only';
import connectToDatabase from '@/lib/db';
import {
  excerptFrom,
  readingMinutes,
  type Note,
  type NoteAttachment,
  type PublicNoteCard,
} from '@/lib/notes-model';

/** Server-side reads of notes. Public reads are fail-safe: a database problem gives an empty page. */
export async function notesCollection() {
  const conn = await connectToDatabase();
  return conn.connection.client.db('portfolio_cms').collection('notes');
}

/** toISOString() that returns undefined instead of throwing for a missing or invalid date. */
export function isoOrUndefined(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function attachmentsOf(raw: unknown): NoteAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is NoteAttachment => Boolean(a) && typeof a.id === 'string')
    .map((a) => ({
      id: a.id,
      name: String(a.name ?? 'file'),
      type: String(a.type ?? 'application/octet-stream'),
      size: Number(a.size) || 0,
      ...(a.path ? { path: String(a.path) } : {}),
    }));
}

/** A stored note as JSON-friendly data (ids and dates as strings, missing fields filled in). */
export function serializeNote(doc: Record<string, any>): Note {
  const created = isoOrUndefined(doc.createdAt) ?? new Date(0).toISOString();
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ''),
    content: String(doc.content ?? ''),
    tags: Array.isArray(doc.tags) ? doc.tags.filter((t: unknown) => typeof t === 'string') : [],
    attachments: attachmentsOf(doc.attachments),
    createdAt: created,
    updatedAt: isoOrUndefined(doc.updatedAt) ?? created,
    published: Boolean(doc.published),
    ...(doc.slug ? { slug: String(doc.slug) } : {}),
    ...(isoOrUndefined(doc.publishedAt) ? { publishedAt: isoOrUndefined(doc.publishedAt) } : {}),
  };
}

export interface PublicNote extends PublicNoteCard {
  content: string;
  attachments: NoteAttachment[];
}

function toPublic(doc: Record<string, any>): PublicNote {
  const note = serializeNote(doc);
  return {
    slug: note.slug ?? '',
    title: note.title,
    content: note.content,
    excerpt: excerptFrom(note.content, 200),
    tags: note.tags,
    attachments: note.attachments,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    publishedAt: note.publishedAt ?? note.updatedAt,
    readingMinutes: readingMinutes(note.content),
  };
}

/** The published note at this address, or null. */
export async function getPublishedNote(slug: string): Promise<PublicNote | null> {
  try {
    const col = await notesCollection();
    const doc = await col.findOne({ slug, published: true });
    return doc ? toPublic(doc) : null;
  } catch {
    return null;
  }
}

/** Every published note, newest first, without the full text (cards only need a summary). */
export async function getPublishedNotes(limit = 300): Promise<PublicNoteCard[]> {
  try {
    const col = await notesCollection();
    const docs = await col
      .aggregate([
        { $match: { published: true, slug: { $type: 'string' } } },
        { $sort: { publishedAt: -1, updatedAt: -1 } },
        { $limit: limit },
        {
          $project: {
            slug: 1,
            title: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
            publishedAt: 1,
            // Only the start of the text: enough for the summary, light on the wire.
            content: { $substrCP: [{ $ifNull: ['$content', ''] }, 0, 1500] },
            length: { $strLenCP: { $ifNull: ['$content', ''] } },
          },
        },
      ])
      .toArray();
    return docs.map((doc: Record<string, any>) => {
      const { content, attachments, ...card } = toPublic(doc);
      void content;
      void attachments;
      // About 1200 characters a minute (the same pace readingMinutes uses for words).
      return { ...card, readingMinutes: Math.max(1, Math.round(Number(doc.length) / 1200)) };
    });
  } catch {
    return [];
  }
}

/** Escapes text so it can be used inside a regular expression safely. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
