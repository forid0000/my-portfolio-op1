import { NextResponse } from 'next/server';
import { revalidatePublicContent } from '@/lib/revalidate';
import { notifyProfileReadme } from '@/lib/github-dispatch';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { skillsContentSchema } from '@/lib/validation/content-schemas';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('homepage');
    const doc = await collection.findOne({ type: 'skills_content' });

    if (!doc) {
      return NextResponse.json({
        categories: [
          {
            name: 'Frontend_Stack',
            icon: 'Layout',
            skills: [
              { name: 'React.js / Next.js', progress: 98 },
              { name: 'TypeScript', progress: 90 },
              { name: 'Tailwind CSS', progress: 95 },
              { name: 'Framer Motion', progress: 85 },
            ],
          },
          {
            name: 'Backend_Core',
            icon: 'Server',
            skills: [
              { name: 'Node.js & Express', progress: 98 },
              { name: 'Python', progress: 90 },
              { name: 'Redis (Caching)', progress: 92 },
              { name: 'REST & GraphQL', progress: 95 },
            ],
          },
          {
            name: 'Database_&_ORM',
            icon: 'Database',
            skills: [
              { name: 'PostgreSQL', progress: 98 },
              { name: 'MongoDB', progress: 96 },
              { name: 'Prisma ORM', progress: 97 },
              { name: 'Supabase / Firebase', progress: 88 },
            ],
          },
          {
            name: 'DevOps_&_Cloud',
            icon: 'Cpu',
            skills: [
              { name: 'Docker & Compose', progress: 95 },
              { name: 'Cloud (AWS/Azure/Linode)', progress: 90 },
              { name: 'CI/CD Pipelines', progress: 92 },
              { name: 'Linux (Manjaro/Server)', progress: 99 },
            ],
          },
          {
            name: 'Infrastructure_&_Net',
            icon: 'Globe',
            skills: [
              { name: 'Coolify (Self-Host)', progress: 95 },
              { name: 'Nginx / Caddy', progress: 94 },
              { name: 'System Hardening', progress: 90 },
              { name: 'Reverse Proxies', progress: 96 },
            ],
          },
          {
            name: 'R&D_&_Workflow',
            icon: 'Users',
            skills: [
              { name: 'Open Source Scouting (300+)', progress: 100 },
              { name: 'Mentorship & Team Lead', progress: 95 },
              { name: 'Rapid Prototyping', progress: 92 },
              { name: 'Tech Exploration', progress: 100 },
            ],
          },
        ],
      });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error('skills Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch skills content',
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
    const result = skillsContentSchema.safeParse(body);
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
      { type: 'skills_content' },
      {
        $set: {
          categories: data.categories,
          type: 'skills_content',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    revalidatePublicContent();
    notifyProfileReadme('skills');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('skills Save Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update skills content',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
