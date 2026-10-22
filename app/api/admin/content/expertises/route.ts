import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { expertisesContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'expertises_content' });

    if (!doc) {
      return NextResponse.json({
        content: [
          {
            title: 'Frontend_Architecture',
            description:
              'Building scalable, accessible, and high-performance user interfaces with modern frameworks and state management.',
            icon: 'Layers',
            skills: [
              'React/Next.js',
              'Vue/Nuxt',
              'TypeScript',
              'TailwindCSS',
              'Redux/Zustand',
              'Framer Motion',
            ],
          },
          {
            title: 'Backend_Systems',
            description:
              'Designing robust APIs, microservices, and database architectures optimized for high concurrency and secure data handling.',
            icon: 'Server',
            skills: [
              'Node.js/Express',
              'Python/Django',
              'Go (Golang)',
              'PostgreSQL',
              'MongoDB',
              'GraphQL',
            ],
          },
          {
            title: 'DevOps_&_Cloud',
            description:
              'Automating deployment pipelines, containerizing applications, and orchestrating cloud infrastructure for zero-downtime scalability.',
            icon: 'CloudCog',
            skills: [
              'Docker',
              'Kubernetes',
              'AWS (EC2/S3)',
              'CI/CD Pipelines',
              'Nginx',
              'Linux Server Admin',
            ],
          },
        ],
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
    const result = expertisesContentSchema.safeParse(body);
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
      { type: 'expertises_content' },
      { $set: { content: data.content, type: 'expertises_content', updatedAt: new Date() } },
      { upsert: true }
    );
    revalidatePublicContent();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
