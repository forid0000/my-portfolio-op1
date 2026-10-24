import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { verifyNotesSession } from '@/lib/auth';
import { isSameOrigin } from '@/lib/api/respond';
import { deleteUnsavedFile, findFile, isFilePublic, openFile } from '@/lib/note-files';
import { fileKind, servesInline } from '@/lib/notes-model';

/** Content-Disposition value with a plain fallback name and the real (UTF-8) name. */
function disposition(kind: 'inline' | 'attachment', name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** A single "bytes=start-end" range (what video and audio players ask for), or null. */
function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | 'bad' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return 'bad';
  let start: number;
  let end: number;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (!(start <= end) || start >= size) return 'bad';
  return { start, end };
}

/**
 * Serves a stored file. The owner (vault session) can read everything; everyone else only the
 * files of a published note. Anything else answers 404, so a private file's existence is not
 * revealed. Files are never run: text is sent as plain text, scripts and pages as downloads.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await findFile(id);
  const [owner, published] = await Promise.all([
    verifyNotesSession(),
    file ? isFilePublic(id) : Promise.resolve(false),
  ]);
  if (!file || (!owner && !published)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const wantsDownload = new URL(request.url).searchParams.get('download') === '1';
  const inline = !wantsDownload && servesInline(file.type);
  const kind = fileKind(file.type, file.name);
  const etag = `"${file.id}"`;

  const headers = new Headers({
    'Content-Type': file.type === 'text/plain' ? 'text/plain; charset=utf-8' : file.type,
    'Content-Disposition': disposition(inline ? 'inline' : 'attachment', file.name),
    'Accept-Ranges': 'bytes',
    ETag: etag,
    // Files never change, but who may read them does (publish / unpublish).
    'Cache-Control': published ? 'public, max-age=300' : 'private, no-cache',
    'X-Content-Type-Options': 'nosniff',
    // Shown only inside this site's own pages. A PDF needs the viewer to run, so it gets the
    // lighter policy; everything else is sandboxed with no scripts and no network.
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy':
      kind === 'pdf'
        ? "frame-ancestors 'self'"
        : "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'self'",
    'Cross-Origin-Resource-Policy': 'same-origin',
  });

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  const range = parseRange(request.headers.get('range'), file.size);
  if (range === 'bad') {
    headers.set('Content-Range', `bytes */${file.size}`);
    return new Response(null, { status: 416, headers });
  }

  if (file.size === 0) {
    headers.set('Content-Length', '0');
    return new Response(null, { status: 200, headers });
  }

  const stream = await openFile(id, range ?? undefined);
  if (!stream) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
  } else {
    headers.set('Content-Length', String(file.size));
  }
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: range ? 206 : 200,
    headers,
  });
}

/** Removes an uploaded file that no saved note keeps (the remove button before saving). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyNotesSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }
  const { id } = await params;
  const result = await deleteUnsavedFile(id);
  if (result === 'missing') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // A file a saved note keeps is removed by saving that note without it.
  return NextResponse.json({ success: true, deleted: result === 'deleted' });
}
