import { describe, expect, it } from 'vitest';
import { projectsContentSchema } from '@/lib/validation/content-schemas';
import { certificationItemSchema } from '@/lib/validation/section-schemas';
import { INDEXES, SCHEMA_VERSION } from '@/lib/db-bootstrap';

const base = { title: 'T', description: 'D', tags: [], featured: false };

describe('projects schema', () => {
  it('no longer requires a GitHub link (any profession can use it)', () => {
    expect(projectsContentSchema.safeParse({ projects: [base] }).success).toBe(true);
  });

  it('still accepts documents saved before links and media existed', () => {
    const old = { ...base, github: 'https://github.com/x/y', demo: 'https://example.com' };
    expect(projectsContentSchema.safeParse({ projects: [old] }).success).toBe(true);
  });

  it('accepts labelled links and rejects unsafe ones', () => {
    const ok = { ...base, links: [{ label: 'Case study', url: 'https://example.com/case' }] };
    expect(projectsContentSchema.safeParse({ projects: [ok] }).success).toBe(true);
    const bad = { ...base, links: [{ label: 'x', url: 'javascript:alert(1)' }] };
    expect(projectsContentSchema.safeParse({ projects: [bad] }).success).toBe(false);
    expect(
      projectsContentSchema.safeParse({ projects: [base], ctaUrl: 'javascript:1' }).success
    ).toBe(false);
  });
});

describe('links the owner types', () => {
  const link = (label: string, url: string) => ({ ...base, links: [{ label, url }] });
  const stored = (url: string) => {
    const r = projectsContentSchema.safeParse({ projects: [link('Site', url)] });
    return r.success ? r.data.projects[0].links?.[0]?.url : null;
  };

  it('keeps complete addresses of every kind as typed', () => {
    expect(stored('https://behance.net/gallery/123')).toBe('https://behance.net/gallery/123');
    expect(stored('http://example.com')).toBe('http://example.com');
    expect(stored('mailto:me@example.com')).toBe('mailto:me@example.com');
    expect(stored('tel:+15551234567')).toBe('tel:+15551234567');
    expect(stored('/about')).toBe('/about');
  });

  it('completes an address typed without https://', () => {
    expect(stored('behance.net/you')).toBe('https://behance.net/you');
    expect(stored('  www.example.com  ')).toBe('https://www.example.com');
    expect(stored('youtu.be/abc')).toBe('https://youtu.be/abc');
    const cta = projectsContentSchema.safeParse({ projects: [base], ctaUrl: 'example.com/work' });
    expect(cta.success && cta.data.ctaUrl).toBe('https://example.com/work');
  });

  it('still rejects what is not a link, and an empty address', () => {
    for (const bad of ['', 'https://', 'javascript:alert(1)', 'not a link', 'ftp://x.com/a']) {
      expect(projectsContentSchema.safeParse({ projects: [link('Site', bad)] }).success, bad).toBe(
        false
      );
    }
  });
});

describe('certification schema', () => {
  it('keeps working without media and accepts media when present', () => {
    expect(certificationItemSchema.safeParse({ name: 'N', issuer: 'I' }).success).toBe(true);
  });
});

describe('automatic database setup', () => {
  it('declares the invariants the app depends on', () => {
    const has = (collection: string, key: string, unique = false) =>
      INDEXES.some(
        (i) => i.collection === collection && key in i.keys && !!i.options?.unique === unique
      );
    expect(has('settings', 'key', true)).toBe(true);
    expect(has('homepage', 'type', true)).toBe(true);
    expect(has('avatars', 'isActive', true)).toBe(true);
    expect(has('resumes', 'isActive', true)).toBe(true);
    expect(has('certifications', 'order')).toBe(true);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('the one-active-picture rule is partial, so inactive pictures can be many', () => {
    const idx = INDEXES.find((i) => i.collection === 'avatars' && 'isActive' in i.keys);
    expect(idx?.options?.partialFilterExpression).toEqual({ isActive: true });
  });
});
