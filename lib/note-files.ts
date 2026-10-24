import 'server-only';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import {
  NOTE_LIMITS,
  resolveFileType,
  safeFileName,
  safeFolderPath,
  type NoteAttachment,
} from '@/lib/notes-model';

/**
 * Files attached to notes, kept in MongoDB (GridFS) so the vault works with no extra service and
 * a private note's files are really private: they are only served to the owner, or to everyone
 * once the note they belong to is published (see app/api/notes/files/[id]/route.ts).
 */
const BUCKET = 'note_files';
const DB_NAME = 'portfolio_cms';

/** A file uploaded but never saved with a note is removed after this long. */
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;

export class FileTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super('The file is larger than the allowed size.');
    this.name = 'FileTooLargeError';
  }
}

async function handles() {
  const conn = await connectToDatabase();
  const db = conn.connection.client.db(DB_NAME);
  return {
    db,
    bucket: new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET }),
    files: db.collection(`${BUCKET}.files`),
    notes: db.collection('notes'),
  };
}

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  return /^[a-f0-9]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : null;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  path?: string;
  uploadedAt: Date;
}

function toStored(doc: {
  _id: mongoose.Types.ObjectId;
  filename: string;
  length: number;
  uploadDate: Date;
  metadata?: { type?: string; path?: string };
}): StoredFile {
  return {
    id: String(doc._id),
    name: doc.filename,
    type: doc.metadata?.type || 'application/octet-stream',
    size: doc.length,
    path: doc.metadata?.path || undefined,
    uploadedAt: doc.uploadDate,
  };
}

/**
 * Streams a request body into storage, stopping (and cleaning up) as soon as it passes `maxBytes`
 * so a huge upload never fills the memory or the database.
 */
export async function storeFile(
  body: ReadableStream<Uint8Array>,
  meta: { name: string; claimedType?: string; path?: string },
  maxBytes: number
): Promise<StoredFile> {
  const { bucket } = await handles();
  const name = safeFileName(meta.name);
  const type = resolveFileType(name, meta.claimedType);
  const path = meta.path ? safeFolderPath(meta.path) : '';
  const upload = bucket.openUploadStream(name, {
    metadata: { type, ...(path ? { path } : {}) },
  });

  let size = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (size > maxBytes) return callback(new FileTooLargeError(maxBytes));
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as never), counter, upload);
  } catch (error) {
    await bucket.delete(upload.id).catch(() => {});
    throw error;
  }
  return {
    id: String(upload.id),
    name,
    type,
    size,
    path: path || undefined,
    uploadedAt: new Date(),
  };
}

export async function findFile(id: string): Promise<StoredFile | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  const { files } = await handles();
  const doc = await files.findOne({ _id: oid });
  return doc ? toStored(doc as never) : null;
}

/** A readable stream of the file (optionally just bytes `start`..`end`, both inclusive). */
export async function openFile(id: string, range?: { start: number; end: number }) {
  const oid = toObjectId(id);
  if (!oid) return null;
  const { bucket } = await handles();
  return bucket.openDownloadStream(
    oid,
    range ? { start: range.start, end: range.end + 1 } : undefined
  );
}

/** True when the file belongs to a published note, so anyone may read it. */
export async function isFilePublic(id: string): Promise<boolean> {
  const { notes } = await handles();
  const note = await notes.findOne(
    { published: true, 'attachments.id': id },
    { projection: { _id: 1 } }
  );
  return Boolean(note);
}

/**
 * Deletes files that no other note keeps. `exceptNoteId` is the note being edited or deleted, so
 * its own list does not protect the files it is giving up.
 */
export async function deleteFilesIfUnused(ids: string[], exceptNoteId?: string): Promise<number> {
  const unique = [...new Set(ids)].filter((id) => toObjectId(id));
  if (!unique.length) return 0;
  const { bucket, notes } = await handles();
  const except = exceptNoteId ? toObjectId(exceptNoteId) : null;
  let removed = 0;
  for (const id of unique) {
    const stillUsed = await notes.findOne(
      { 'attachments.id': id, ...(except ? { _id: { $ne: except } } : {}) },
      { projection: { _id: 1 } }
    );
    if (stillUsed) continue;
    try {
      await bucket.delete(new mongoose.Types.ObjectId(id));
      removed += 1;
    } catch {
      /* already gone */
    }
  }
  return removed;
}

/** Deletes one uploaded file that no saved note keeps (the "remove" button before saving). */
export async function deleteUnsavedFile(id: string): Promise<'deleted' | 'in-use' | 'missing'> {
  const oid = toObjectId(id);
  if (!oid) return 'missing';
  const { bucket, notes, files } = await handles();
  if (!(await files.findOne({ _id: oid }, { projection: { _id: 1 } }))) return 'missing';
  if (await notes.findOne({ 'attachments.id': id }, { projection: { _id: 1 } })) return 'in-use';
  await bucket.delete(oid).catch(() => {});
  return 'deleted';
}

/**
 * Removes files uploaded long ago that no note keeps (a draft that was never saved, a browser
 * closed mid-edit). Cheap enough to run on every upload for a personal vault.
 */
export async function sweepOrphans(now = Date.now()): Promise<number> {
  const { bucket, files, notes } = await handles();
  const cutoff = new Date(now - ORPHAN_AFTER_MS);
  const old = await files
    .find({ uploadDate: { $lt: cutoff } }, { projection: { _id: 1 } })
    .limit(500)
    .toArray();
  if (!old.length) return 0;
  const kept = new Set<string>((await notes.distinct('attachments.id')) as string[]);
  let removed = 0;
  for (const doc of old) {
    if (kept.has(String(doc._id))) continue;
    await bucket.delete(doc._id as mongoose.Types.ObjectId).catch(() => {});
    removed += 1;
  }
  return removed;
}

/**
 * Checks the attachments a note is saved with against storage: unknown ids are reported, and the
 * name, type and size always come from what is stored, never from the browser.
 */
export async function resolveAttachments(
  input: { id: string; path?: string }[]
): Promise<{ ok: true; attachments: NoteAttachment[] } | { ok: false; index: number }> {
  const { files } = await handles();
  const oids = input.map((a) => toObjectId(a.id));
  const found = await files
    .find({ _id: { $in: oids.filter(Boolean) as mongoose.Types.ObjectId[] } })
    .toArray();
  const byId = new Map<string, StoredFile>(
    found.map((doc: Record<string, any>) => [String(doc._id), toStored(doc as never)])
  );
  const out: NoteAttachment[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const stored = byId.get(input[index].id.toLowerCase());
    if (!stored) return { ok: false, index };
    if (seen.has(stored.id)) continue;
    seen.add(stored.id);
    const path = safeFolderPath(input[index].path ?? stored.path ?? '').slice(0, NOTE_LIMITS.path);
    out.push({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      size: stored.size,
      ...(path ? { path } : {}),
    });
  }
  return { ok: true, attachments: out };
}
