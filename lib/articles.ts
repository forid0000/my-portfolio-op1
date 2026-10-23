/**
 * Server-side access to articles, their comments and reactions. Public reads are fail-safe (a
 * database problem shows an empty list, never an error page); writes live in the route handlers
 * under app/api/admin/articles and app/api/articles.
 */
import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import {
  emptyReactionCounts,
  isPubliclyVisible,
  sanitizeDesign,
  type ArticleCover,
  type ArticleDesign,
  type PublicComment,
  type ReactionCounts,
} from '@/lib/articles-model';
import { ARTICLE_TEXT_DEFAULTS, DEFAULT_DEVTO_USERNAME } from '@/lib/content-defaults';
import type { ArticleSettings } from '@/lib/validation/article-schemas';
import type { MediaItem } from '@/lib/media-types';

export const ARTICLE_SETTINGS_DEFAULTS: ArticleSettings = {
  moderate: true,
  reactions: true,
  comments: true,
};

async function cms() {
  return (await connectToDatabase()).connection.client.db('portfolio_cms');
}

export async function articlesCollection() {
  return (await cms()).collection('articles');
}
export async function commentsCollection() {
  return (await cms()).collection('article_comments');
}
export async function reactionsCollection() {
  return (await cms()).collection('article_reactions');
}

export function toObjectId(id: string): mongoose.Types.ObjectId | null {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

/** An article as the pages need it: plain values only, safe to pass to client components. */
export interface ArticleView {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: ArticleCover | null;
  media: MediaItem[];
  tags: string[];
  status: 'draft' | 'published';
  publishedAt: string | null;
  updatedAt: string;
  design: ArticleDesign;
  footerNote: string;
  allowReactions: boolean;
  allowComments: boolean;
  seoTitle: string;
  seoDescription: string;
  readingMinutes: number;
  reactionTotals: ReactionCounts;
  commentCount: number;
}

export function toView(doc: any, opts: { admin?: boolean } = {}): ArticleView {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title ?? '',
    // Visitors see the written summary or, failing that, the start of the text.
    excerpt: opts.admin ? (doc.excerpt ?? '') : doc.excerpt || doc.autoExcerpt || '',
    body: doc.body ?? '',
    cover: doc.cover?.src ? (doc.cover as ArticleCover) : null,
    media: Array.isArray(doc.media) ? (doc.media as MediaItem[]) : [],
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status === 'published' ? 'published' : 'draft',
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    updatedAt: new Date(doc.updatedAt ?? doc.createdAt ?? Date.now()).toISOString(),
    design: sanitizeDesign(doc.design),
    footerNote: doc.footerNote ?? '',
    allowReactions: doc.allowReactions !== false,
    allowComments: doc.allowComments !== false,
    seoTitle: doc.seoTitle ?? '',
    seoDescription: doc.seoDescription ?? '',
    readingMinutes: typeof doc.readingMinutes === 'number' ? doc.readingMinutes : 1,
    reactionTotals: { ...emptyReactionCounts(), ...(doc.reactionTotals ?? {}) },
    commentCount: typeof doc.commentCount === 'number' ? doc.commentCount : 0,
  };
}

/** Published articles, newest first, without their (long) text. Never throws. */
export async function getPublishedArticles(limit = 200): Promise<ArticleView[]> {
  try {
    const col = await articlesCollection();
    const docs = await col
      .find(
        { status: 'published', publishedAt: { $lte: new Date() } },
        { projection: { body: 0, footerNote: 0 } }
      )
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toView);
  } catch (error) {
    console.error('Failed to read articles', error);
    return [];
  }
}

/** One published article by address, or null (also for drafts and for database problems). */
export async function getPublishedArticle(slug: string): Promise<ArticleView | null> {
  try {
    const col = await articlesCollection();
    const doc = await col.findOne({ slug });
    if (!doc) return null;
    const view = toView(doc);
    return isPubliclyVisible({
      status: view.status,
      publishedAt: view.publishedAt ? new Date(view.publishedAt) : null,
    })
      ? view
      : null;
  } catch (error) {
    console.error('Failed to read article', error);
    return null;
  }
}

/** Approved comments of an article, oldest first (author replies sit under their parent). */
export async function getApprovedComments(articleId: string): Promise<PublicComment[]> {
  const oid = toObjectId(articleId);
  if (!oid) return [];
  try {
    const col = await commentsCollection();
    const docs = await col
      .find({ articleId: oid, status: 'approved' })
      .sort({ createdAt: 1 })
      .toArray();
    return docs.map((d: any) => ({
      id: String(d._id),
      name: d.name,
      body: d.body,
      createdAt: new Date(d.createdAt).toISOString(),
      byAuthor: !!d.byAuthor,
      parentId: d.parentId ? String(d.parentId) : null,
    }));
  } catch (error) {
    console.error('Failed to read comments', error);
    return [];
  }
}

export async function getArticleSettings(): Promise<ArticleSettings> {
  try {
    const doc = await (await cms()).collection('homepage').findOne({ type: 'articles_settings' });
    return {
      moderate:
        typeof doc?.moderate === 'boolean' ? doc.moderate : ARTICLE_SETTINGS_DEFAULTS.moderate,
      reactions:
        typeof doc?.reactions === 'boolean' ? doc.reactions : ARTICLE_SETTINGS_DEFAULTS.reactions,
      comments:
        typeof doc?.comments === 'boolean' ? doc.comments : ARTICLE_SETTINGS_DEFAULTS.comments,
    };
  } catch {
    return ARTICLE_SETTINGS_DEFAULTS;
  }
}

/** `base`, or `base-2`, `base-3`... when the address is already used by another article. */
export async function uniqueSlug(
  base: string,
  excludeId?: mongoose.Types.ObjectId
): Promise<string> {
  const col = await articlesCollection();
  let candidate = base;
  for (let n = 2; n < 200; n++) {
    const clash = await col.findOne(
      excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate },
      { projection: { _id: 1 } }
    );
    if (!clash) return candidate;
    candidate = `${base}-${n}`.slice(0, 90);
  }
  return `${base}-${randomBytes(3).toString('hex')}`;
}

/** Recomputes the counters kept on an article so lists never need to count. */
export async function refreshCounters(articleId: mongoose.Types.ObjectId): Promise<void> {
  const [comments, reactions] = await Promise.all([commentsCollection(), reactionsCollection()]);
  const [commentCount, grouped] = await Promise.all([
    comments.countDocuments({ articleId, status: 'approved' }),
    reactions
      .aggregate([{ $match: { articleId } }, { $group: { _id: '$kind', n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const totals = emptyReactionCounts();
  for (const g of grouped) if (g._id in totals) totals[g._id as keyof ReactionCounts] = g.n;
  await (
    await articlesCollection()
  ).updateOne({ _id: articleId }, { $set: { commentCount, reactionTotals: totals } });
}

/* ----------------------------- anonymous visitors ----------------------------- */

const COOKIE = 'pv';

/**
 * A stable, anonymous id for one browser: a random value kept in a first-party cookie, stored
 * only as a keyed hash, so reactions can be counted once per visitor without knowing who they
 * are. Without cookies it falls back to a hash of the network address and browser string.
 */
export function visitorFromRequest(request: Request): { key: string; setCookie?: string } {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const hash = (value: string) =>
    createHmac('sha256', secret).update(`article-visitor:${value}`).digest('hex').slice(0, 32);

  const cookie = request.headers.get('cookie') ?? '';
  const existing = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{24,64})`).exec(cookie)?.[1];
  if (existing) return { key: hash(existing) };

  const fresh = randomBytes(16).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return {
    key: hash(fresh),
    setCookie: `${COOKIE}=${fresh}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`,
  };
}

/** A keyed hash of the caller's address, kept on comments so the owner can spot spam waves. */
export function addressHash(ip: string): string {
  const secret = process.env.JWT_SECRET ?? '';
  return createHmac('sha256', secret).update(`article-ip:${ip}`).digest('hex').slice(0, 24);
}

/** Wording of the article pages (Admin -> Section Texts) over the neutral defaults. Never throws. */
export async function getArticleTexts() {
  const texts: typeof ARTICLE_TEXT_DEFAULTS & { devToUsername: string } = {
    ...ARTICLE_TEXT_DEFAULTS,
    devToUsername: DEFAULT_DEVTO_USERNAME,
  };
  let canonicalTarget: 'devto' | 'self' = 'devto';
  try {
    const doc = await (await cms()).collection('homepage').findOne({ type: 'headings_content' });
    if (doc) {
      for (const key of Object.keys(texts) as (keyof typeof texts)[]) {
        if (typeof doc[key] === 'string' && doc[key]) texts[key] = doc[key];
      }
      if (doc.articlesCanonicalTarget === 'self') canonicalTarget = 'self';
    }
  } catch (error) {
    console.error('Failed to fetch article texts', error);
  }
  return { texts, canonicalTarget };
}
