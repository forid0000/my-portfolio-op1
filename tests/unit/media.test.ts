import { describe, expect, it } from 'vitest';
import {
  MAX_MEDIA_PER_ITEM,
  MEDIA_SCOPES,
  formatBytes,
  isVideoFile,
  playbackOptions,
} from '@/lib/media-types';
import { mediaListSchema, singleMediaSchema } from '@/lib/validation/media-schemas';
import { isManagedPublicId, mediaRefs, removedRefs } from '@/lib/media-server';

const cloud = (kind: 'image' | 'video', id: string) =>
  `https://res.cloudinary.com/demo/${kind}/upload/v1/${id}.png`;
const img = (id: string) => ({ kind: 'image' as const, src: cloud('image', id), public_id: id });

describe('media types', () => {
  it('autoplay always implies muted; nothing plays by default', () => {
    expect(playbackOptions({ src: 's', public_id: 'p' })).toEqual({
      autoplay: false,
      muted: false,
      loop: false,
      controls: true,
    });
    expect(playbackOptions({ src: 's', public_id: 'p', autoplay: true }).muted).toBe(true);
    expect(playbackOptions({ src: 's', public_id: 'p', controls: false }).controls).toBe(false);
  });

  it('detects videos by type or extension', () => {
    expect(isVideoFile({ type: 'video/mp4', name: 'a' })).toBe(true);
    expect(isVideoFile({ type: '', name: 'clip.MOV' })).toBe(true);
    expect(isVideoFile({ type: 'image/png', name: 'a.png' })).toBe(false);
  });

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('only some areas take video', () => {
    expect(MEDIA_SCOPES.projects.allowVideo).toBe(true);
    expect(MEDIA_SCOPES.certifications.allowVideo).toBe(true);
    expect(MEDIA_SCOPES.avatars.allowVideo).toBe(false);
  });
});

describe('media validation', () => {
  const projects = mediaListSchema('projects');

  it('accepts pictures and videos in the right folder', () => {
    const ok = projects.safeParse([
      img('sections/projects/a'),
      {
        kind: 'video',
        src: cloud('video', 'sections/projects/v'),
        public_id: 'sections/projects/v',
        autoplay: true,
      },
    ]);
    expect(ok.success).toBe(true);
  });

  it('rejects anything not hosted in our Cloudinary folder', () => {
    const bad = (item: object) => projects.safeParse([item]).success;
    expect(
      bad({ kind: 'image', src: 'https://evil.com/x.png', public_id: 'sections/projects/a' })
    ).toBe(false);
    expect(bad(img('avatars/other'))).toBe(false);
    expect(bad(img('sections/projects/../avatars/x'))).toBe(false);
    expect(
      bad({
        kind: 'video',
        src: cloud('image', 'sections/projects/v'),
        public_id: 'sections/projects/v',
      })
    ).toBe(false);
    expect(bad({ ...img('sections/projects/a'), src: 'javascript:alert(1)' })).toBe(false);
  });

  it('caps the number of items', () => {
    const many = Array.from({ length: MAX_MEDIA_PER_ITEM + 1 }, (_, i) =>
      img(`sections/projects/n${i}`)
    );
    expect(projects.safeParse(many).success).toBe(false);
  });

  it('refuses video where it is not allowed', () => {
    const t = mediaListSchema('testimonials');
    expect(
      t.safeParse([
        {
          kind: 'video',
          src: cloud('video', 'sections/testimonials/v'),
          public_id: 'sections/testimonials/v',
        },
      ]).success
    ).toBe(false);
  });

  it('validates the older single-image fields too', () => {
    const badge = singleMediaSchema('certifications');
    expect(
      badge.safeParse({
        src: cloud('image', 'sections/certifications/b'),
        public_id: 'sections/certifications/b',
      }).success
    ).toBe(true);
    expect(
      badge.safeParse({ src: 'https://evil.com/b.png', public_id: 'sections/certifications/b' })
        .success
    ).toBe(false);
  });
});

describe('media cleanup helpers', () => {
  it('only manages our own folders', () => {
    expect(isManagedPublicId('sections/projects/a')).toBe(true);
    expect(isManagedPublicId('avatars/me')).toBe(true);
    expect(isManagedPublicId('somewhere/else')).toBe(false);
    expect(isManagedPublicId('sections/projects/../../x')).toBe(false);
  });

  it('collects references from legacy single fields and lists, once each', () => {
    const refs = mediaRefs(
      { src: 'x', public_id: 'sections/certifications/badge' },
      [
        { kind: 'video', public_id: 'sections/certifications/v' },
        { public_id: 'sections/certifications/badge' },
      ],
      undefined,
      null
    );
    expect(refs).toEqual([
      { public_id: 'sections/certifications/badge', kind: 'image' },
      { public_id: 'sections/certifications/v', kind: 'video' },
    ]);
  });

  it('finds what a save removed', () => {
    const before = mediaRefs([
      { public_id: 'a' },
      { public_id: 'b' },
      { kind: 'video', public_id: 'v' },
    ]);
    const after = mediaRefs([{ public_id: 'a' }]);
    expect(removedRefs(before, after).map((r) => r.public_id)).toEqual(['b', 'v']);
  });
});
