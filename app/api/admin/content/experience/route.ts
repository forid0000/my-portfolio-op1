import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { EXPERIENCE_DEFAULTS } from '@/lib/content-defaults';
import { experienceContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'experience_content' });

    if (!doc) {
      return NextResponse.json({ experiences: EXPERIENCE_DEFAULTS });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('experience Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch experience content',
        details: error.message || 'Unknown error occurred',
      },
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
    const result = experienceContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const data = result.data;
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');

    await collection.updateOne(
      { type: 'experience_content' },
      {
        $set: {
          experiences: data.experiences,
          type: 'experience_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    revalidatePublicContent();
    notifyProfileReadme('experience');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('experience Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update experience content',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
