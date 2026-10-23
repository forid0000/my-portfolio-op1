/**
 * Turns validated article input into the document that is stored, and works out which uploaded
 * files the text still uses. Pure (no database), so it is unit-tested.
 */
import {
  ARTICLE_LIMITS,
  excerptFrom,
  normalizeTags,
  readingMinutes,
  sanitizeDesign,
  type ArticleDoc,
} from '@/lib/articles-model';
import type { ArticleInput } from '@/lib/validation/article-schemas';
import type { MediaItem } from '@/lib/media-types';

/**
 * Files the writer uploaded for this article, split into the ones the text or cover still uses
 * (kept) and the ones it no longer mentions (to be deleted from Cloudinary).
 */
export function pruneArticleMedia(input: Pick<ArticleInput, 'body' | 'cover' | 'media'>): {
  media: MediaItem[];
  unused: MediaItem[];
} {
  const media: MediaItem[] = [];
  const unused: MediaItem[] = [];
  for (const item of input.media as MediaItem[]) {
    const used =
      input.body.includes(item.src) ||
      input.body.includes(item.public_id) ||
      input.cover?.public_id === item.public_id;
    (used ? media : unused).push(item);
  }
  return { media, unused };
}

export interface BuildContext {
  slug: string;
  /** The stored document when editing; keeps creation date and first publish date. */
  existing?: Pick<ArticleDoc, 'createdAt' | 'publishedAt' | 'status'> | null;
  now?: Date;
}

export function buildArticleDoc(input: ArticleInput, ctx: BuildContext) {
  const now = ctx.now ?? new Date();
  const wantsPublic = input.status === 'published';

  let publishedAt: Date | null = null;
  if (input.publishedAt) publishedAt = new Date(input.publishedAt);
  else if (wantsPublic) publishedAt = ctx.existing?.publishedAt ?? now;
  else publishedAt = ctx.existing?.publishedAt ?? null;

  return {
    slug: ctx.slug,
    title: input.title,
    excerpt: input.excerpt,
    autoExcerpt: excerptFrom(input.body, 180),
    body: input.body,
    cover: input.cover ?? null,
    media: input.media,
    tags: normalizeTags(input.tags),
    status: input.status,
    publishedAt,
    createdAt: ctx.existing?.createdAt ?? now,
    updatedAt: now,
    design: sanitizeDesign(input.design),
    footerNote: input.footerNote.slice(0, ARTICLE_LIMITS.footerNote),
    allowReactions: input.allowReactions,
    allowComments: input.allowComments,
    seoTitle: input.seoTitle ?? '',
    seoDescription: input.seoDescription ?? '',
    readingMinutes: readingMinutes(input.body),
  };
}
