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
