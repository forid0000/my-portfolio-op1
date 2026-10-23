import { NextResponse, after } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { articleInputSchema } from '@/lib/validation/article-schemas';
import { buildArticleDoc, pruneArticleMedia } from '@/lib/article-write';
import {
  articlesCollection,
  commentsCollection,
  reactionsCollection,
  toObjectId,
  toView,
  uniqueSlug,
} from '@/lib/articles';
import { destroyUnreferenced, mediaRefs, removedRefs } from '@/lib/media-server';
import { revalidateArticleIndex } from '@/lib/revalidate';
import { problem } from '@/lib/api/respond';
import { slugify } from '@/lib/articles-model';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const oid = toObjectId((await params).id);
  if (!oid) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  try {
    const doc = await (await articlesCollection()).findOne({ _id: oid });
    if (!doc) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return NextResponse.json(toView(doc, { admin: true }));
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch the article', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Ctx) {
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
  const oid = toObjectId((await params).id);
  if (!oid) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

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
    const existing = await col.findOne({ _id: oid });
    if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    let slug = input.slug || existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      if (await col.findOne({ slug, _id: { $ne: oid } }, { projection: { _id: 1 } })) {
        return problem(['slug'], 'That address is already used by another article.');
      }
    } else if (!input.slug && !existing.slug) {
      slug = await uniqueSlug(slugify(input.title), oid);
    }

    const { media, unused } = pruneArticleMedia(input);
    const doc = buildArticleDoc(
      { ...input, media },
      {
        slug,
        existing: {
          createdAt: existing.createdAt,
          publishedAt: existing.publishedAt ?? null,
          status: existing.status,
        },
      }
    );
    // Counters (reactions, comment count) are owned by their own routes: never overwritten here.
    await col.updateOne({ _id: oid }, { $set: doc });

    // Files that were part of the article before and are gone from it now, plus fresh uploads
    // that never made it into the text, are deleted from Cloudinary.
    const gone = removedRefs(
      mediaRefs(existing.media, existing.cover),
      mediaRefs(media, input.cover)
    );
    after(() => destroyUnreferenced([...gone, ...mediaRefs(unused)]));

    revalidateArticleIndex(slug, existing.slug);
    return NextResponse.json({ success: true, id: String(oid), slug });
  } catch (error: any) {
    console.error('Article update error:', error);
    return NextResponse.json(
      { error: 'Failed to save the article', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
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
  const oid = toObjectId((await params).id);
  if (!oid) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  try {
    const col = await articlesCollection();
    const existing = await col.findOne({ _id: oid });
    if (!existing) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    await col.deleteOne({ _id: oid });
    await Promise.all([
      (await commentsCollection()).deleteMany({ articleId: oid }),
      (await reactionsCollection()).deleteMany({ articleId: oid }),
    ]);

    // Deleting an article deletes everything it uploaded.
    after(() => destroyUnreferenced(mediaRefs(existing.media, existing.cover)));
    revalidateArticleIndex(existing.slug);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete the article', details: error.message },
      { status: 500 }
    );
  }
}
