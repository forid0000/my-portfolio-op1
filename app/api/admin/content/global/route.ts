import { NextResponse } from 'next/server';
import { revalidateSiteChrome } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { mergeGlobal, invalidateGlobalCache, globalContentSchema } from '@/lib/site';
import { invalidateIdentityCache } from '@/lib/identity';
import { invalidateAvatarCache } from '@/lib/avatar-cache';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'global_content' });
    // Always return every field (stored values merged over defaults) so the
    // editor can show and manage newly-added fields.
    return NextResponse.json(mergeGlobal(doc as any));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch global content' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const result = globalContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const updateData = result.data;

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');

    await collection.updateOne(
      { type: 'global_content' },
      {
        $set: {
          ...updateData,
          type: 'global_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    invalidateGlobalCache();
    invalidateIdentityCache();
    // The GitHub profile link is the avatar's fallback source.
    invalidateAvatarCache();
    revalidateSiteChrome();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Global CMS Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update global content',
        details: error.message || 'Unknown database error',
      },
      { status: 500 }
    );
  }
}
