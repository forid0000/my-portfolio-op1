/**
 * Articles written inside the site (Admin -> Articles). Pure types and helpers with no server
 * imports, shared by the editor, the public pages, the API validation and the unit tests.
 *
 * An article is Markdown text plus a small "design" (font, size, width, header style, ...) chosen
 * by the writer. Reactions and comments belong to the article but live in their own collections.
 */
import type { MediaItem } from '@/lib/media-types';

export type ArticleStatus = 'draft' | 'published';

export interface ArticleCover {
  src: string;
  public_id: string;
  alt?: string;
  width?: number;
  height?: number;
}

/* ---------------------------------- design ---------------------------------- */

export const ARTICLE_FONTS = {
  sans: { label: 'Clean sans-serif', hint: 'Modern and neutral' },
  serif: { label: 'Book serif', hint: 'Classic, good for long reads' },
  rounded: { label: 'Friendly rounded', hint: 'Soft and approachable' },
  mono: { label: 'Monospace', hint: 'Technical notes' },
} as const;
export type ArticleFont = keyof typeof ARTICLE_FONTS;

export const ARTICLE_SIZES = {
  sm: { label: 'Small', css: '1rem' },
  md: { label: 'Medium', css: '1.125rem' },
  lg: { label: 'Large', css: '1.25rem' },
  xl: { label: 'Extra large', css: '1.375rem' },
} as const;
export type ArticleSize = keyof typeof ARTICLE_SIZES;

export const ARTICLE_WIDTHS = {
  narrow: { label: 'Narrow', css: '40rem' },
  normal: { label: 'Normal', css: '48rem' },
  wide: { label: 'Wide', css: '62rem' },
} as const;
export type ArticleWidth = keyof typeof ARTICLE_WIDTHS;

export const ARTICLE_ALIGNS = {
  left: 'Left',
  center: 'Centered',
  justify: 'Justified',
} as const;
export type ArticleAlign = keyof typeof ARTICLE_ALIGNS;

export const ARTICLE_HEADERS = {
  cover: { label: 'Cover on top', hint: 'Picture first, then the title' },
  overlay: { label: 'Title over the cover', hint: 'Big banner with the title on it' },
  centered: { label: 'Centered title', hint: 'Title in the middle, cover below' },
  minimal: { label: 'Text only', hint: 'No cover on the page' },
} as const;
export type ArticleHeaderStyle = keyof typeof ARTICLE_HEADERS;

export interface ArticleDesign {
  font: ArticleFont;
  size: ArticleSize;
  width: ArticleWidth;
  align: ArticleAlign;
  header: ArticleHeaderStyle;
  /** Optional accent for this article only (links, quotes, tags). Empty = the site's brand color. */
  accent: string;
  showToc: boolean;
  showAuthor: boolean;
  showShare: boolean;
  showTags: boolean;
  showDate: boolean;
  showReadingTime: boolean;
}

export const ARTICLE_DESIGN_DEFAULTS: ArticleDesign = {
  font: 'sans',
  size: 'md',
  width: 'normal',
  align: 'left',
  header: 'cover',
  accent: '',
  showToc: false,
  showAuthor: true,
  showShare: true,
  showTags: true,
  showDate: true,
  showReadingTime: true,
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Coerce whatever is stored into a complete, valid design. */
export function sanitizeDesign(input: unknown): ArticleDesign {
  const d = (input ?? {}) as Record<string, unknown>;
  const base = ARTICLE_DESIGN_DEFAULTS;
  return {
    font: oneOf(d.font, Object.keys(ARTICLE_FONTS) as ArticleFont[], base.font),
    size: oneOf(d.size, Object.keys(ARTICLE_SIZES) as ArticleSize[], base.size),
    width: oneOf(d.width, Object.keys(ARTICLE_WIDTHS) as ArticleWidth[], base.width),
    align: oneOf(d.align, Object.keys(ARTICLE_ALIGNS) as ArticleAlign[], base.align),
    header: oneOf(d.header, Object.keys(ARTICLE_HEADERS) as ArticleHeaderStyle[], base.header),
    accent: typeof d.accent === 'string' && HEX.test(d.accent) ? d.accent : '',
    showToc: flag(d.showToc, base.showToc),
    showAuthor: flag(d.showAuthor, base.showAuthor),
    showShare: flag(d.showShare, base.showShare),
    showTags: flag(d.showTags, base.showTags),
    showDate: flag(d.showDate, base.showDate),
    showReadingTime: flag(d.showReadingTime, base.showReadingTime),
  };
}

/* --------------------------------- reactions --------------------------------- */

export const REACTIONS = [
  { kind: 'like', emoji: '👍', label: 'Like' },
  { kind: 'love', emoji: '❤️', label: 'Love' },
  { kind: 'insightful', emoji: '💡', label: 'Insightful' },
  { kind: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { kind: 'curious', emoji: '🤔', label: 'Curious' },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]['kind'];
export const REACTION_KINDS = REACTIONS.map((r) => r.kind) as [ReactionKind, ...ReactionKind[]];

export type ReactionCounts = Record<ReactionKind, number>;

export function emptyReactionCounts(): ReactionCounts {
  return Object.fromEntries(REACTIONS.map((r) => [r.kind, 0])) as ReactionCounts;
}

/* ----------------------------------- stored ----------------------------------- */

export interface ArticleDoc {
  _id?: unknown;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown, see lib/article-markdown.ts for the extra block syntax. */
  body: string;
  cover?: ArticleCover | null;
  /** Every Cloudinary file the body or cover uses, so removing them also deletes the files. */
  media: MediaItem[];
  tags: string[];
  status: ArticleStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  design: ArticleDesign;
  /** Short Markdown shown after the article ("Thanks for reading...", links, a sign-off). */
  footerNote: string;
  allowReactions: boolean;
  allowComments: boolean;
  seoTitle?: string;
  seoDescription?: string;
  readingMinutes: number;
}

export const ARTICLE_LIMITS = {
  title: 160,
  slug: 80,
  excerpt: 300,
  body: 120_000,
  footerNote: 2_000,
  tags: 8,
  tag: 30,
  seoTitle: 70,
  seoDescription: 200,
} as const;

/* ----------------------------------- helpers ----------------------------------- */

/**
 * Address-friendly version of a title. Keeps letters and digits of any language (Bangla, Arabic,
 * Hindi, ...), turns everything else into single hyphens, and never returns an empty string.
 */
export function slugify(text: string, fallback = 'article'): string {
  const slug = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ARTICLE_LIMITS.slug)
    .replace(/-+$/g, '');
  return slug || fallback;
}

/** Markdown with the markup removed, for reading time and the automatic summary. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^:::.*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?(?:\s*:?-{3,}:?\s*\|?)+\s*$/gm, ' ') // rules and table separator rows
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+\[[ xX]\]\s+/gm, '') // checklist marks
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** About 200 words a minute; scripts without spaces (Chinese, Japanese) count ~400 characters. */
export function readingMinutes(markdown: string): number {
  const text = plainText(markdown);
  if (!text) return 1;
  const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  const words = text
    .replace(/[぀-ヿ㐀-鿿가-힯]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200 + cjk / 400));
}

/** A short summary taken from the start of the text when the writer did not write one. */
export function excerptFrom(markdown: string, max = 180): string {
  const text = plainText(markdown);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Tags as people type them: trimmed, `#` removed, no duplicates, limited in number and length. */
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const tag = raw
      .trim()
      .replace(/^#+/, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, ARTICLE_LIMITS.tag);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= ARTICLE_LIMITS.tags) break;
  }
  return out;
}

/** An article is public only when published and its date is not in the future. */
export function isPubliclyVisible(
  doc: Pick<ArticleDoc, 'status' | 'publishedAt'>,
  now = new Date()
) {
  return (
    doc.status === 'published' && !!doc.publishedAt && doc.publishedAt.getTime() <= now.getTime()
  );
}

/** Comments as shown to visitors (no email, no hashes). */
export interface PublicComment {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  byAuthor?: boolean;
  parentId?: string | null;
}

/** What a card in the article list needs, whether the article is written here or comes from Dev.to. */
export interface ArticleCardItem {
  key: string;
  href: string;
  title: string;
  description: string;
  cover: string | null;
  tags: string[];
  publishedAt: string | null;
  minutes: number;
  reactions: number;
  comments: number;
  author: { name: string; image: string | null } | null;
  source: 'native' | 'devto';
}

/** "Oct 24, 2026": fixed locale and zone so the server and the browser print the same text. */
export function formatArticleDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
