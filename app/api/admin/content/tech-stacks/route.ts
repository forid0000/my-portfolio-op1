import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { techStacksContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'techstacks_content' });

    if (!doc) {
      return NextResponse.json({
        content: {
          row1: [
            'React',
            'TypeScript',
            'Node js',
            'Next js',
            'Python',
            'Go',
            'JavaScript',
            'Tailwind',
            'GraphQL',
            'Docker',
          ],
          row2: [
            'Kubernetes',
            'Aws',
            'Azure',
            'PostgreSQL',
            'MongoDB',
            'Redis',
            'MySQL',
            'Firebase',
            'Rust',
            'C++',
          ],
          row3: [
            'PHP',
            'Laravel',
            'Vue js',
            'Angular',
            'Svelte',
            'Ruby',
            'Rails',
            'Django',
            'Flask',
            'Spring',
          ],
        },
      });
    }
    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`admin-write:${clientIp(request)}`, 60, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const result = techStacksContentSchema.safeParse(body);
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
      { type: 'techstacks_content' },
      { $set: { content: data.content, type: 'techstacks_content', updatedAt: new Date() } },
      { upsert: true }
    );
    revalidatePublicContent();
    notifyProfileReadme('tech-stacks');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
