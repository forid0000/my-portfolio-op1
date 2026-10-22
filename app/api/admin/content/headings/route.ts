import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import connectToDatabase from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { headingsContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'headings_content' });
    return NextResponse.json(doc || {});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch headings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`admin-write:${clientIp(req)}`, 60, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const body = await req.json();
    const result = headingsContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const updateData = result.data;

    const db = await connectToDatabase();
    await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .updateOne(
        { type: 'headings_content' },
        { $set: { ...updateData, type: 'headings_content', updatedAt: new Date() } },
        { upsert: true }
      );
    revalidatePublicContent();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to save headings' }, { status: 500 });
  }
}
