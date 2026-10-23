import { describe, expect, it } from 'vitest';
import {
  ARTICLE_DESIGN_DEFAULTS,
  excerptFrom,
  isPubliclyVisible,
  normalizeTags,
  plainText,
  readingMinutes,
  sanitizeDesign,
  slugify,
} from '@/lib/articles-model';
import {
  createSlugger,
  extractHeadings,
  splitBlocks,
  textOfChildren,
} from '@/lib/article-markdown';

describe('article model', () => {
  it('makes addresses from titles in any language', () => {
    expect(slugify('Hello, World! It’s 2026')).toBe('hello-world-its-2026');
    expect(slugify('  --Leading and trailing--  ')).toBe('leading-and-trailing');
    expect(slugify('আমার প্রথম লেখা')).toBe('আমার-প্রথম-লেখা');
    expect(slugify('مرحبا بالعالم')).toBe('مرحبا-بالعالم');
    expect(slugify('नमस्ते दुनिया')).toBe('नमस्ते-दुनिया');
    expect(slugify('!!!')).toBe('article');
    expect(slugify('!!!', 'untitled')).toBe('untitled');
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('strips markup for summaries and counts reading time', () => {
    const md =
      '# Title\n\nSome **bold** text with a [link](https://x.y) and `code`.\n\n```js\nignored()\n```\n\n- one\n- two';
    expect(plainText(md)).toBe('Title Some bold text with a link and . one two');
    expect(excerptFrom('word '.repeat(100), 50).endsWith('…')).toBe(true);
    expect(excerptFrom('short text')).toBe('short text');
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('word '.repeat(1000))).toBe(5);
    expect(readingMinutes('字'.repeat(800))).toBe(2);
  });

  it('cleans tags', () => {
    expect(normalizeTags([' #Design ', 'design', 'UX  Research', '', 7, 'x'.repeat(50)])).toEqual([
      'Design',
      'UX Research',
      'x'.repeat(30),
    ]);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(8);
    expect(normalizeTags('nope')).toEqual([]);
  });

  it('always yields a complete valid design', () => {
    expect(sanitizeDesign(undefined)).toEqual(ARTICLE_DESIGN_DEFAULTS);
    const d = sanitizeDesign({
      font: 'serif',
      size: 'huge',
      accent: 'red;}',
      showToc: true,
      width: 'wide',
    });
    expect(d.font).toBe('serif');
    expect(d.size).toBe(ARTICLE_DESIGN_DEFAULTS.size);
    expect(d.accent).toBe('');
    expect(d.showToc).toBe(true);
    expect(d.width).toBe('wide');
    expect(sanitizeDesign({ accent: '#0d9488' }).accent).toBe('#0d9488');
  });

  it('shows only published articles whose date has come', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(
      isPubliclyVisible({ status: 'published', publishedAt: new Date('2026-05-01') }, now)
    ).toBe(true);
    expect(
      isPubliclyVisible({ status: 'published', publishedAt: new Date('2026-07-01') }, now)
    ).toBe(false);
    expect(isPubliclyVisible({ status: 'draft', publishedAt: new Date('2026-05-01') }, now)).toBe(
      false
    );
    expect(isPubliclyVisible({ status: 'published', publishedAt: null }, now)).toBe(false);
  });
});

describe('article markdown blocks', () => {
  it('splits text into plain markdown and blocks', () => {
    const segs = splitBlocks(
      'Intro\n\n::: center\nMiddle *text*\n:::\n\n::: note\nWatch out\n:::\n\nOutro'
    );
    expect(segs.map((s) => s.kind)).toEqual(['md', 'center', 'note', 'md']);
    expect(segs[1].text).toBe('Middle *text*');
    expect(segs[2].text).toBe('Watch out');
  });

  it('ignores block markers inside code fences and unknown block names', () => {
    const segs = splitBlocks('```\n::: center\nnot a block\n:::\n```\n\n::: sparkle\nplain\n:::');
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe('md');
    expect(segs[0].text).toContain('::: center');
  });

  it('keeps an unfinished block rather than losing text', () => {
    const segs = splitBlocks('::: tip\nno closing marker');
    expect(segs).toEqual([{ kind: 'tip', text: 'no closing marker' }]);
  });

  it('lists headings with unique ids, skipping code', () => {
    const headings = extractHeadings(
      '# One\n\n## Two\n\n```\n# not a heading\n```\n\n## Two\n\n### **Three** [x](y)'
    );
    expect(headings.map((h) => [h.level, h.text, h.id])).toEqual([
      [1, 'One', 'one'],
      [2, 'Two', 'two'],
      [2, 'Two', 'two-1'],
      [3, 'Three x', 'three-x'],
    ]);
  });

  it('builds heading ids from rendered children the same way', () => {
    const slug = createSlugger();
    expect(slug('Same')).toBe('same');
    expect(slug('Same')).toBe('same-1');
    expect(textOfChildren(['Hello ', { props: { children: 'world' } }, 3])).toBe('Hello world3');
  });
});
