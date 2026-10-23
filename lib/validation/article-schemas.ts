/**
 * Validation for everything that writes articles, comments and reactions (server only).
 * Messages are written for the person who sees them next to the field.
 */
import { z } from 'zod';
import { ARTICLE_LIMITS, REACTION_KINDS } from '@/lib/articles-model';
import { coverSchema, mediaListSchema } from '@/lib/validation/media-schemas';

const SLUG_RE = /^[\p{L}\p{N}\p{M}]+(?:-[\p{L}\p{N}\p{M}]+)*$/u;

export const articleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your article a title.')
    .max(ARTICLE_LIMITS.title, `Keep the title under ${ARTICLE_LIMITS.title} characters.`),
  /** Empty means "make one from the title". */
  slug: z
    .string()
    .trim()
    .max(ARTICLE_LIMITS.slug)
    .refine((v) => v === '' || SLUG_RE.test(v), 'Use letters, numbers and single hyphens only.')
    .default(''),
  excerpt: z.string().trim().max(ARTICLE_LIMITS.excerpt).default(''),
  body: z
    .string()
    .max(ARTICLE_LIMITS.body, `The article is too long (limit ${ARTICLE_LIMITS.body} characters).`)
    .default(''),
  cover: coverSchema('articles').nullable().optional(),
  media: mediaListSchema('articles', 80).default([]),
  tags: z.array(z.string().max(60)).max(30).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  /** ISO date-time; empty/omitted means "now" when publishing. */
  publishedAt: z
    .string()
    .nullable()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'That date is not valid.'),
  design: z.record(z.string(), z.unknown()).optional(),
  footerNote: z.string().max(ARTICLE_LIMITS.footerNote).default(''),
  allowReactions: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  seoTitle: z.string().trim().max(ARTICLE_LIMITS.seoTitle).optional(),
  seoDescription: z.string().trim().max(ARTICLE_LIMITS.seoDescription).optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

/** A visitor's comment. `hp` is a hidden field that people leave empty and bots fill in. */
export const commentInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name.')
    .max(60, 'Keep the name under 60 characters.'),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.')
    .default(''),
  body: z
    .string()
    .trim()
    .min(2, 'Write a few words first.')
    .max(2000, 'Keep the comment under 2000 characters.'),
  hp: z.string().max(200).optional(),
});

export const reactionInputSchema = z.object({
  kind: z.enum(REACTION_KINDS),
});

/** Admin actions on comments. */
export const commentModerationSchema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(['approved', 'pending', 'spam']),
});

export const authorReplySchema = z.object({
  articleId: z.string().min(1).max(40),
  parentId: z.string().min(1).max(40).optional(),
  body: z.string().trim().min(1, 'Write your reply first.').max(2000),
});

export const articleSettingsSchema = z.object({
  /** New comments wait for approval before they appear. */
  moderate: z.boolean(),
  reactions: z.boolean(),
  comments: z.boolean(),
});
export type ArticleSettings = z.infer<typeof articleSettingsSchema>;
