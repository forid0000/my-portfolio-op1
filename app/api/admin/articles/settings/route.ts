import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { articleSettingsSchema } from '@/lib/validation/article-schemas';
import { getArticleSettings } from '@/lib/articles';
import { revalidateArticleIndex } from '@/lib/revalidate';

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await getArticleSettings());
}

export async function PUT(request: Request) {
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
  const parsed = articleSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload data', details: parsed.error.issues },
      { status: 400 }
    );
  }
  try {
    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'articles_settings' },
        { $set: { ...parsed.data, type: 'articles_settings', updatedAt: new Date() } },
        { upsert: true }
      );
    // Article pages show or hide the reaction bar and the comment form accordingly.
    revalidateArticleIndex();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save the settings', details: error.message },
      { status: 500 }
    );
  }
}
