import { NextResponse } from 'next/server';
import {
  addressHash,
  articlesCollection,
  commentsCollection,
  getArticleSettings,
  refreshCounters,
  visitorFromRequest,
} from '@/lib/articles';
import { commentInputSchema } from '@/lib/validation/article-schemas';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isSameOrigin, problem } from '@/lib/api/respond';
import { revalidateArticleIndex } from '@/lib/revalidate';

const MAX_LINKS = 2;

/**
 * A visitor's comment. Spam defences, in order: same-site only, a per-address rate limit, a
 * hidden field real people leave empty, a cap on links, and a check for the same text twice.
 * By default the comment then waits for approval in Admin -> Articles.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const ip = clientIp(request);
  const rl = rateLimit(`article-comment:${ip}`, 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'You are commenting very fast. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const parsed = commentInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload data', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Bots fill every field. Pretend it worked so they do not adapt, and store nothing.
  if (input.hp) return NextResponse.json({ status: 'pending' });

  const links = (input.body.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links > MAX_LINKS) {
    return problem(['body'], `Please keep links to ${MAX_LINKS} or fewer in a comment.`);
  }

  const { slug } = await params;
  try {
    const [settings, article] = await Promise.all([
      getArticleSettings(),
      (await articlesCollection()).findOne({ slug, status: 'published' }),
    ]);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!settings.comments || article.allowComments === false) {
      return NextResponse.json(
        { error: 'Comments are turned off for this article.' },
        { status: 403 }
      );
    }

    const { key, setCookie } = visitorFromRequest(request);
    const col = await commentsCollection();
    const duplicate = await col.findOne({
      articleId: article._id,
      visitor: key,
      body: input.body,
      createdAt: { $gt: new Date(Date.now() - 60 * 60_000) },
    });
    if (duplicate) {
      return problem(['body'], 'You already posted this comment.');
    }

    const status = settings.moderate ? 'pending' : 'approved';
    const result = await col.insertOne({
      articleId: article._id,
      parentId: null,
      name: input.name,
      email: input.email,
      body: input.body,
      status,
      byAuthor: false,
      visitor: key,
      addressHash: addressHash(ip),
      createdAt: new Date(),
    });

    if (status === 'approved') {
      await refreshCounters(article._id);
      revalidateArticleIndex(slug);
    }
    const response = NextResponse.json({
      status,
      comment:
        status === 'approved'
          ? {
              id: String(result.insertedId),
              name: input.name,
              body: input.body,
              createdAt: new Date().toISOString(),
              byAuthor: false,
              parentId: null,
            }
          : null,
    });
    if (setCookie) response.headers.append('Set-Cookie', setCookie);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Could not save your comment.' }, { status: 500 });
  }
}
