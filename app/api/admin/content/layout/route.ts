import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { layoutContentSchema } from '@/lib/validation/layout-schema';
import { getLayoutSections, invalidateLayoutCache } from '@/lib/sections-registry';

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const sections = await getLayoutSections();
    return NextResponse.json({ sections });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch layout', details: error.message },
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
    const body = await request.json();
    const result = layoutContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');

    await collection.updateOne(
      { type: 'layout_content' },
      {
        $set: {
          sections: result.data.sections,
          type: 'layout_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    invalidateLayoutCache();
    revalidatePublicContent();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update layout', details: error.message },
      { status: 500 }
    );
  }
}
