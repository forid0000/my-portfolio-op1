import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { HERO_DEFAULTS } from '@/lib/content-defaults';
import { invalidateIdentityCache } from '@/lib/identity';
import { heroContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'hero_content' });

    if (!doc) {
      return NextResponse.json(HERO_DEFAULTS);
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('homepage Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch homepage content',
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
    const result = heroContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const data = result.data;
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');

    const updateFields: any = {
      greeting: data.greeting,
      aiPhrases: data.aiPhrases,
      firstName: data.firstName,
      lastName: data.lastName,
      subtitle: data.subtitle,
      description: data.description,
      type: 'hero_content',
      updatedAt: new Date(),
    };

    await collection.updateOne({ type: 'hero_content' }, { $set: updateFields }, { upsert: true });

    invalidateIdentityCache();
    revalidatePublicContent();
    notifyProfileReadme('homepage');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('homepage Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update homepage content',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
