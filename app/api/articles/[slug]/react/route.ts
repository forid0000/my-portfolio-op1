import { NextResponse } from 'next/server';
import { emptyReactionCounts } from '@/lib/articles-model';
import {
  articlesCollection,
  getArticleSettings,
  reactionsCollection,
  refreshCounters,
  visitorFromRequest,
} from '@/lib/articles';
import { reactionInputSchema } from '@/lib/validation/article-schemas';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isSameOrigin } from '@/lib/api/respond';

/** Adds the visitor's reaction, or takes it back when they already gave it (one per kind). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rl = rateLimit(`article-react:${clientIp(request)}`, 40, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'You are reacting very fast. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const parsed = reactionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Unknown reaction.' }, { status: 400 });

  const { slug } = await params;
  try {
    const [settings, article] = await Promise.all([
      getArticleSettings(),
      (await articlesCollection()).findOne({ slug, status: 'published' }),
    ]);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!settings.reactions || article.allowReactions === false) {
      return NextResponse.json(
        { error: 'Reactions are turned off for this article.' },
        { status: 403 }
      );
    }

    const { key, setCookie } = visitorFromRequest(request);
    const col = await reactionsCollection();
    const filter = { articleId: article._id, visitor: key, kind: parsed.data.kind };
    const removed = await col.deleteOne(filter);
    let active = false;
    if (!removed.deletedCount) {
      try {
        await col.insertOne({ ...filter, createdAt: new Date() });
        active = true;
      } catch {
        // A double click raced us: the reaction already exists, which is what was asked for.
        active = true;
      }
    }
    await refreshCounters(article._id);
    const fresh = await (
      await articlesCollection()
    ).findOne({ _id: article._id }, { projection: { reactionTotals: 1 } });
    const mine = await col.find({ articleId: article._id, visitor: key }).toArray();
    const response = NextResponse.json({
      active,
      counts: { ...emptyReactionCounts(), ...(fresh?.reactionTotals ?? {}) },
      mine: mine.map((m: any) => m.kind),
    });
    if (setCookie) response.headers.append('Set-Cookie', setCookie);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json({ error: 'Could not save your reaction.' }, { status: 500 });
  }
}
