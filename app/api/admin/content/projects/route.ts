import { NextResponse, after } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { PROJECTS_DEFAULTS } from '@/lib/content-defaults';
import { projectsContentSchema } from '@/lib/validation/content-schemas';
import { destroyMedia, mediaRefs, removedRefs } from '@/lib/media-server';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'projects_content' });

    if (!doc) {
      return NextResponse.json({ projects: PROJECTS_DEFAULTS });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('projects Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects content',
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
    const result = projectsContentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: result.error.issues },
        { status: 400 }
      );
    }
    const data = result.data;
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');

    const previous = await collection.findOne({ type: 'projects_content' });

    await collection.updateOne(
      { type: 'projects_content' },
      {
        $set: {
          projects: data.projects,
          ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
          ...(data.ctaUrl !== undefined ? { ctaUrl: data.ctaUrl } : {}),
          type: 'projects_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Pictures and videos the owner removed (or whose project was deleted) are deleted from
    // Cloudinary now that the save succeeded. Only files that were in the previously stored
    // document are ever touched, never ids supplied by the browser.
    const stale = removedRefs(
      mediaRefs((previous?.projects ?? []).map((p: { media?: unknown }) => p.media)),
      mediaRefs(data.projects.map((p) => p.media))
    );
    if (stale.length) after(() => destroyMedia(stale));

    revalidatePublicContent();
    notifyProfileReadme('projects');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('projects Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update projects content',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
