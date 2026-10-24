import { NextResponse } from 'next/server';
import { verifyNotesSession } from '@/lib/auth';
import { isSameOrigin } from '@/lib/api/respond';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { FileTooLargeError, storeFile, sweepOrphans } from '@/lib/note-files';
import { fileLimitBytes, getNotesSettings } from '@/lib/notes-settings';
import { formatBytes } from '@/lib/notes-model';

// The file itself is the request body (no multipart parsing, nothing buffered in memory):
//   POST /api/notes/files?name=report.pdf&path=Trip/2026   Content-Type: <the file's type>
export async function POST(request: Request) {
  if (!(await verifyNotesSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }
  const rl = rateLimit(`notes-upload:${clientIp(request)}`, 300, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const params = new URL(request.url).searchParams;
  const name = (params.get('name') ?? '').trim();
  if (!name || name.length > 300) {
    return NextResponse.json({ error: 'The file needs a name.' }, { status: 400 });
  }
  if (!request.body) {
    return NextResponse.json({ error: 'No file was sent.' }, { status: 400 });
  }

  const limit = fileLimitBytes(await getNotesSettings());
  const tooLarge = (size?: number) =>
    NextResponse.json(
      {
        error: `${size ? `This file is ${formatBytes(size)}. ` : ''}Files can be up to ${formatBytes(limit)}.`,
        limit,
      },
      { status: 413 }
    );
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return tooLarge(declared);

  try {
    const file = await storeFile(
      request.body,
      {
        name,
        claimedType: request.headers.get('content-type') ?? '',
        path: params.get('path') ?? '',
      },
      limit
    );
    // Files from drafts that were never saved are cleaned up here, so nothing piles up.
    await sweepOrphans().catch(() => 0);
    return NextResponse.json({
      file: { id: file.id, name: file.name, type: file.type, size: file.size, path: file.path },
    });
  } catch (error) {
    if (error instanceof FileTooLargeError) return tooLarge();
    console.error('[notes/files]', error);
    return NextResponse.json({ error: 'The file could not be stored.' }, { status: 500 });
  }
}
