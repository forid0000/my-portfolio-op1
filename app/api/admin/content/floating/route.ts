import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { mergeFloating, floatingContentSchema } from '@/lib/floating';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'floating_contact' });
    return NextResponse.json(mergeFloating(doc as any));
  } catch (error: any) {
    console.error('floating GET Error:', error);
    return NextResponse.json(mergeFloating(null));
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
    const result = floatingContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const clean = mergeFloating(result.data); // normalize + fill any missing fields
    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'floating_contact' },
        { $set: { ...clean, type: 'floating_contact', updatedAt: new Date() } },
        { upsert: true }
      );
    revalidatePublicContent();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('floating Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update floating contact',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
