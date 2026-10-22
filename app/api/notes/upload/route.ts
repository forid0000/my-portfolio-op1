import { NextResponse } from 'next/server';
import { verifyNotesSession } from '@/lib/auth';
import { getR2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: Request) {
  if (!(await verifyNotesSession()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const r2 = await getR2();
    if (!r2) {
      return NextResponse.json(
        { error: 'Image uploads are not configured. Add R2 credentials in Admin -> Security.' },
        { status: 503 }
      );
    }

    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    const ALLOWED_TYPES = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ]);
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const key = `notes/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(r2.client, command, { expiresIn: 3600 });
    const publicUrl = `${r2.publicUrl}/${key}`;

    return NextResponse.json({ signedUrl, publicUrl, key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
