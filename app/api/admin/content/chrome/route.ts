import { NextResponse } from 'next/server';
import { revalidateSiteChrome } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { chromeContentSchema } from '@/lib/validation/chrome-schema';
import { getChrome, invalidateChromeCache, mergeChrome } from '@/lib/chrome';

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await getChrome());
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch navigation settings', details: error.message },
      { status: 500 }
    );
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
    const result = chromeContentSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    // Normalise through the same merge the public pages use (drops unknown ids, fills gaps).
    const clean = mergeChrome(result.data);

    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'chrome_content' },
        { $set: { ...clean, type: 'chrome_content', updatedAt: new Date() } },
        { upsert: true }
      );

    invalidateChromeCache();
    revalidateSiteChrome();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update navigation settings', details: error.message },
      { status: 500 }
    );
  }
}
