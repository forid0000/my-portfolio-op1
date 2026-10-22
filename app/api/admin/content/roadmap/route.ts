import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { roadmapContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'roadmap_content' });

    if (!doc) {
      return NextResponse.json({
        roadmapItems: [
          {
            year: 'Q2 2026',
            title: 'AWS_Infrastructure_Mastery',
            description:
              'Moving from console to code. Implementing multi-region VPC peering, Transit Gateways, and immutable infrastructure patterns.',
            tech: ['Terraform', 'CloudFormation', 'VPC', 'Lambda'],
            icon: 'Server',
          },
        ],
      });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('roadmap Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch roadmap content',
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
    const result = roadmapContentSchema.safeParse(body);
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
      { type: 'roadmap_content' },
      {
        $set: {
          roadmapItems: data.roadmapItems,
          type: 'roadmap_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    revalidatePublicContent();
    notifyProfileReadme('roadmap');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('roadmap Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update roadmap content',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
