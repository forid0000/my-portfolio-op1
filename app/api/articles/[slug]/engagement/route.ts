import { NextResponse } from 'next/server';
import { emptyReactionCounts } from '@/lib/articles-model';
import { articlesCollection, reactionsCollection, visitorFromRequest } from '@/lib/articles';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * Fresh reaction counts and the reactions this browser already gave. The article page itself is
 * static, so this small request keeps the numbers current without rebuilding the page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rl = rateLimit(`article-read:${clientIp(request)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const { slug } = await params;
  try {
    const article = await (
      await articlesCollection()
    ).findOne(
      { slug, status: 'published' },
      { projection: { reactionTotals: 1, commentCount: 1 } }
    );
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { key } = visitorFromRequest(request);
    const mine = await (
      await reactionsCollection()
    )
      .find({ articleId: article._id, visitor: key }, { projection: { kind: 1 } })
      .toArray();
    return NextResponse.json(
      {
        counts: { ...emptyReactionCounts(), ...(article.reactionTotals ?? {}) },
        mine: mine.map((m: any) => m.kind),
        commentCount: article.commentCount ?? 0,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  }
}
