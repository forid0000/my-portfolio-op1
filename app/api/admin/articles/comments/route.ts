import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { authorReplySchema, commentModerationSchema } from '@/lib/validation/article-schemas';
import {
  articlesCollection,
  commentsCollection,
  refreshCounters,
  toObjectId,
} from '@/lib/articles';
import { getSiteIdentity } from '@/lib/identity';
import { revalidateArticleIndex } from '@/lib/revalidate';

function limited(request: Request) {
  const rl = rateLimit(`admin-write:${clientIp(request)}`, 120, 5 * 60 * 1000);
  return rl.ok
    ? null
    : NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
}

/** Comments for the moderation screen: `?status=pending|approved|spam|all` and optional `articleId`. */
export async function GET(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const articleId = url.searchParams.get('articleId');
  const query: Record<string, unknown> = {};
  if (status !== 'all') query.status = status;
  if (articleId) {
    const oid = toObjectId(articleId);
    if (!oid) return NextResponse.json({ comments: [] });
    query.articleId = oid;
  }
  try {
    const [docs, titles] = await Promise.all([
      (await commentsCollection()).find(query).sort({ createdAt: -1 }).limit(300).toArray(),
      (await articlesCollection()).find({}, { projection: { title: 1, slug: 1 } }).toArray(),
    ]);
    const titleOf = new Map<string, { title?: string; slug?: string }>(
      titles.map((t: any) => [String(t._id), t])
    );
    return NextResponse.json({
      comments: docs.map((d: any) => ({
        id: String(d._id),
        articleId: String(d.articleId),
        articleTitle: titleOf.get(String(d.articleId))?.title ?? '(deleted article)',
        articleSlug: titleOf.get(String(d.articleId))?.slug ?? '',
        parentId: d.parentId ? String(d.parentId) : null,
        name: d.name,
        email: d.email ?? '',
        body: d.body,
        status: d.status,
        byAuthor: !!d.byAuthor,
        createdAt: new Date(d.createdAt).toISOString(),
        addressHash: d.addressHash ?? '',
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error.message },
      { status: 500 }
    );
  }
}

/** Approve, send back to pending, or mark as spam. */
export async function PATCH(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const blocked = limited(request);
  if (blocked) return blocked;

  const parsed = commentModerationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload data', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const oid = toObjectId(parsed.data.id);
  if (!oid) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  try {
    const col = await commentsCollection();
    const doc = await col.findOne({ _id: oid });
    if (!doc) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    await col.updateOne(
      { _id: oid },
      { $set: { status: parsed.data.status, moderatedAt: new Date() } }
    );
    await refreshCounters(doc.articleId);
    const article = await (
      await articlesCollection()
    ).findOne({ _id: doc.articleId }, { projection: { slug: 1 } });
    revalidateArticleIndex(article?.slug);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update the comment', details: error.message },
      { status: 500 }
    );
  }
}

/** The owner's own reply, shown under the comment (or as a top-level note). Published at once. */
export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const blocked = limited(request);
  if (blocked) return blocked;

  const parsed = authorReplySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload data', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const articleOid = toObjectId(parsed.data.articleId);
  const parentOid = parsed.data.parentId ? toObjectId(parsed.data.parentId) : null;
  if (!articleOid) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  try {
    const article = await (
      await articlesCollection()
    ).findOne({ _id: articleOid }, { projection: { slug: 1 } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    const identity = await getSiteIdentity();
    await (
      await commentsCollection()
    ).insertOne({
      articleId: articleOid,
      parentId: parentOid,
      name: identity.personName,
      email: '',
      body: parsed.data.body,
      status: 'approved',
      byAuthor: true,
      createdAt: new Date(),
    });
    await refreshCounters(articleOid);
    revalidateArticleIndex(article.slug);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to post the reply', details: error.message },
      { status: 500 }
    );
  }
}

/** Deletes a comment and the replies under it. */
export async function DELETE(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const blocked = limited(request);
  if (blocked) return blocked;

  const id = new URL(request.url).searchParams.get('id');
  const oid = id ? toObjectId(id) : null;
  if (!oid) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  try {
    const col = await commentsCollection();
    const doc = await col.findOne({ _id: oid });
    if (!doc) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    await col.deleteMany({ $or: [{ _id: oid }, { parentId: oid }] });
    await refreshCounters(doc.articleId);
    const article = await (
      await articlesCollection()
    ).findOne({ _id: doc.articleId }, { projection: { slug: 1 } });
    revalidateArticleIndex(article?.slug);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete the comment', details: error.message },
      { status: 500 }
    );
  }
}
