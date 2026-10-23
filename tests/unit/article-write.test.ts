import { describe, expect, it } from 'vitest';
import { buildArticleDoc, pruneArticleMedia } from '@/lib/article-write';
import { articleInputSchema, commentInputSchema } from '@/lib/validation/article-schemas';

const media = (id: string) => ({
  kind: 'image' as const,
  src: `https://res.cloudinary.com/demo/image/upload/v1/${id}.png`,
  public_id: id,
});

describe('article write helpers', () => {
  it('keeps the files the text and cover use and flags the rest', () => {
    const a = media('sections/articles/a');
    const b = media('sections/articles/b');
    const c = media('sections/articles/c');
    const { media: kept, unused } = pruneArticleMedia({
      body: `text ![x](${a.src}) more`,
      cover: { src: c.src, public_id: c.public_id },
      media: [a, b, c],
    });
    expect(kept.map((m) => m.public_id)).toEqual(['sections/articles/a', 'sections/articles/c']);
    expect(unused.map((m) => m.public_id)).toEqual(['sections/articles/b']);
  });

  it('sets dates sensibly on first publish and keeps them afterwards', () => {
    const now = new Date('2026-06-01T10:00:00Z');
    const input = articleInputSchema.parse({
      title: 'T',
      body: 'Hello world',
      status: 'published',
    });
    const first = buildArticleDoc(input, { slug: 't', now });
    expect(first.publishedAt).toEqual(now);
    expect(first.createdAt).toEqual(now);
    expect(first.readingMinutes).toBe(1);
    expect(first.autoExcerpt).toBe('Hello world');

    const later = new Date('2026-07-01T10:00:00Z');
    const edited = buildArticleDoc(input, {
      slug: 't',
      now: later,
      existing: { createdAt: now, publishedAt: now, status: 'published' },
    });
    expect(edited.publishedAt).toEqual(now);
    expect(edited.createdAt).toEqual(now);
    expect(edited.updatedAt).toEqual(later);

    const draft = buildArticleDoc({ ...input, status: 'draft' }, { slug: 't', now });
    expect(draft.publishedAt).toBeNull();
    const custom = buildArticleDoc(
      { ...input, publishedAt: '2026-01-02T00:00:00Z' },
      { slug: 't', now }
    );
    expect(custom.publishedAt).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('cleans tags and design on the way in', () => {
    const input = articleInputSchema.parse({
      title: 'T',
      tags: ['#One', 'one', ' Two '],
      design: { font: 'serif', accent: 'nope', width: 'huge' },
    });
    const doc = buildArticleDoc(input, { slug: 't' });
    expect(doc.tags).toEqual(['One', 'Two']);
    expect(doc.design.font).toBe('serif');
    expect(doc.design.accent).toBe('');
    expect(doc.design.width).toBe('normal');
  });

  it('refuses media that is not on our Cloudinary folder', () => {
    const bad = articleInputSchema.safeParse({
      title: 'T',
      cover: { src: 'https://evil.example/x.png', public_id: 'sections/articles/x' },
    });
    expect(bad.success).toBe(false);
    const wrongFolder = articleInputSchema.safeParse({
      title: 'T',
      media: [media('sections/projects/x')],
    });
    expect(wrongFolder.success).toBe(false);
    expect(
      articleInputSchema.safeParse({ title: 'T', media: [media('sections/articles/x')] }).success
    ).toBe(true);
  });

  it('names the field when an article or comment is not valid', () => {
    const noTitle = articleInputSchema.safeParse({ title: '  ' });
    expect(noTitle.success).toBe(false);
    if (!noTitle.success) expect(noTitle.error.issues[0].path).toEqual(['title']);
    const badSlug = articleInputSchema.safeParse({ title: 'T', slug: 'not a slug!' });
    expect(badSlug.success).toBe(false);
    expect(articleInputSchema.safeParse({ title: 'T', slug: 'আমার-লেখা' }).success).toBe(true);

    const comment = commentInputSchema.safeParse({ name: '', body: 'x', email: 'nope' });
    expect(comment.success).toBe(false);
    if (!comment.success) {
      expect(comment.error.issues.map((i) => i.path[0]).sort()).toEqual(['body', 'email', 'name']);
    }
  });
});
