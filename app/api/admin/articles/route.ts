import { NextResponse, after } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { articleInputSchema } from '@/lib/validation/article-schemas';
import { buildArticleDoc, pruneArticleMedia } from '@/lib/article-write';
import {
  articlesCollection,
  commentsCollection,
  uniqueSlug,
  type ArticleView,
} from '@/lib/articles';
import { destroyMedia, mediaRefs } from '@/lib/media-server';
import { revalidateArticleIndex } from '@/lib/revalidate';
import { problem } from '@/lib/api/respond';
import { emptyReactionCounts, slugify } from '@/lib/articles-model';

/** Every article (drafts included), newest first, without the text, plus the comments waiting for approval. */
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const [docs, pending] = await Promise.all([
      (await articlesCollection())
        .find({}, { projection: { body: 0, footerNote: 0, media: 0 } })
        .sort({ updatedAt: -1 })
        .toArray(),
      (await commentsCollection())
        .aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$articleId', n: { $sum: 1 } } },
        ])
        .toArray(),
    ]);
    const pendingBy = new Map(pending.map((p: any) => [String(p._id), p.n as number]));
    const items = docs.map((d: any) => ({
      id: String(d._id),
      slug: d.slug,
      title: d.title,
      status: d.status,
      tags: d.tags ?? [],
      cover: d.cover ?? null,
      publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
      updatedAt: new Date(d.updatedAt ?? d.createdAt).toISOString(),
      readingMinutes: d.readingMinutes ?? 1,
      commentCount: d.commentCount ?? 0,
      pendingComments: pendingBy.get(String(d._id)) ?? 0,
      reactionTotal: Object.values((d.reactionTotals ?? {}) as Record<string, number>).reduce(
        (a, b) => a + b,
        0
      ),
    })) satisfies Partial<ArticleView & { pendingComments: number; reactionTotal: number }>[];
    return NextResponse.json({ articles: items });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch articles', details: error.message },
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
    const parsed = articleInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const col = await articlesCollection();

    let slug = input.slug || slugify(input.title);
    if (input.slug && (await col.findOne({ slug }, { projection: { _id: 1 } }))) {
      return problem(['slug'], 'That address is already used by another article.');
    }
    if (!input.slug) slug = await uniqueSlug(slug);

    const { media, unused } = pruneArticleMedia(input);
    const doc = buildArticleDoc({ ...input, media }, { slug });
    const result = await col.insertOne({
      ...doc,
      commentCount: 0,
      reactionTotals: emptyReactionCounts(),
    } as any);

    after(() => destroyMedia(mediaRefs(unused)));
    revalidateArticleIndex(slug);
    return NextResponse.json({ success: true, id: String(result.insertedId), slug });
  } catch (error: any) {
    console.error('Article create error:', error);
    return NextResponse.json(
      { error: 'Failed to save the article', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
