import { describe, expect, it } from 'vitest';
import { headingsContentSchema } from '@/lib/validation/content-schemas';
import { floatingContentSchema } from '@/lib/validation/floating-schema';
import {
  certificationItemSchema,
  educationItemSchema,
  publicationItemSchema,
  serviceItemSchema,
} from '@/lib/validation/section-schemas';
import { MEDIA_SCOPES } from '@/lib/media-types';

const cloud = (kind: 'image' | 'video', id: string) =>
  `https://res.cloudinary.com/demo/${kind}/upload/v1/${id}.${kind === 'video' ? 'mp4' : 'jpg'}`;
const item = (scope: string, n: number, kind: 'image' | 'video' = 'image') => ({
  kind,
  src: cloud(kind, `sections/${scope}/m${n}`),
  public_id: `sections/${scope}/m${n}`,
});

describe('services keep several pictures and videos', () => {
  it('accepts a media list, the older banner, or neither', () => {
    const base = { title: 'Brand identity' };
    expect(serviceItemSchema.safeParse(base).success).toBe(true);
    expect(
      serviceItemSchema.safeParse({
        ...base,
        media: [item('services', 1), item('services', 2, 'video')],
      }).success
    ).toBe(true);
    expect(
      serviceItemSchema.safeParse({
        ...base,
        banner: { src: cloud('image', 'sections/services/b'), public_id: 'sections/services/b' },
      }).success
    ).toBe(true);
  });

  it('keeps pictures inside the services folder and on Cloudinary', () => {
    const wrongFolder = { ...item('services', 1), public_id: 'sections/projects/m1' };
    expect(serviceItemSchema.safeParse({ title: 'T', media: [wrongFolder] }).success).toBe(false);
    expect(
      serviceItemSchema.safeParse({
        title: 'T',
        media: [{ ...item('services', 1), src: 'https://evil.example/a.jpg' }],
      }).success
    ).toBe(false);
  });

  it('rejects a call-to-action link that is not a web address', () => {
    const r = serviceItemSchema.safeParse({ title: 'T', ctaLink: 'javascript:alert(1)' });
    expect(r.success).toBe(false);
    expect(serviceItemSchema.safeParse({ title: 'T', ctaLink: '#contact' }).success).toBe(true);
    expect(
      serviceItemSchema.safeParse({ title: 'T', ctaLink: 'https://example.com/b' }).success
    ).toBe(true);
    expect(serviceItemSchema.parse({ title: 'T' }).ctaLink).toBe('');
  });
});

describe('education can carry pictures', () => {
  const base = { institution: 'City University', degree: 'BBA' };
  it('is optional and checked like every other list', () => {
    expect(educationItemSchema.safeParse(base).success).toBe(true);
    expect(
      educationItemSchema.safeParse({
        ...base,
        media: [item('education', 1), item('education', 2)],
      }).success
    ).toBe(true);
    expect(educationItemSchema.safeParse({ ...base, media: [item('services', 1)] }).success).toBe(
      false
    );
  });

  it('has its own folder, and allows video like the other showcase sections', () => {
    expect(MEDIA_SCOPES.education.folder).toBe('sections/education');
    expect(MEDIA_SCOPES.education.allowVideo).toBe(true);
    expect(MEDIA_SCOPES.services.allowVideo).toBe(true);
  });
});

describe('links people type in sections', () => {
  it('a certificate link and a publication link must be web addresses', () => {
    const cert = { name: 'N', issuer: 'I' };
    expect(
      certificationItemSchema.safeParse({ ...cert, credentialUrl: 'https://example.com/v' }).success
    ).toBe(true);
    expect(certificationItemSchema.safeParse({ ...cert, credentialUrl: '' }).success).toBe(true);
    expect(
      certificationItemSchema.safeParse({ ...cert, credentialUrl: 'javascript:alert(1)' }).success
    ).toBe(false);
    const typed = certificationItemSchema.safeParse({ ...cert, credentialUrl: 'verify.org/c/1' });
    expect(typed.success && typed.data.credentialUrl).toBe('https://verify.org/c/1');
    const pub = { title: 'T' };
    expect(publicationItemSchema.safeParse({ ...pub, url: 'https://example.com/a' }).success).toBe(
      true
    );
    expect(publicationItemSchema.safeParse({ ...pub, url: 'data:text/html,hi' }).success).toBe(
      false
    );
  });

  it('floating contact buttons only take safe links', () => {
    const entry = (href: string) => ({
      label: 'L',
      value: 'V',
      copyValue: 'C',
      href,
      icon: 'Mail',
    });
    const shape = (href: string) =>
      floatingContentSchema.safeParse({
        heading: 'h',
        subheading: 's',
        buttonLabel: 'b',
        items: [entry(href)],
      });
    // Only the link rule is under test: whatever else the schema asks for, javascript: never passes.
    const bad = shape('javascript:alert(1)');
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(JSON.stringify(bad.error.issues)).toContain('full link');
    }
  });
});

describe('section titles', () => {
  it('every section title can be edited', () => {
    const titles = {
      educationHeading: 'Studies',
      certificationsHeading: 'Credentials',
      servicesHeading: 'What I offer',
      publicationsHeading: 'Writing',
      testimonialsHeading: 'Kind words',
      expertisesHeading: 'Expertise',
      techStacksHeading: 'Tools',
    };
    expect(headingsContentSchema.parse(titles)).toEqual(titles);
  });
});
