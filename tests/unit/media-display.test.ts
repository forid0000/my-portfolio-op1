import { describe, expect, it } from 'vitest';
import { mediaSummary, toMediaItems } from '@/lib/media-display';

const url = (id: string, kind = 'image') =>
  `https://res.cloudinary.com/demo/${kind}/upload/v1/${id}.${kind === 'video' ? 'mp4' : 'jpg'}`;

describe('media shown on the site', () => {
  it('keeps only known, checked fields of a saved list', () => {
    const list = toMediaItems([
      {
        _id: 'x',
        kind: 'video',
        src: url('sections/projects/a', 'video'),
        public_id: 'sections/projects/a',
        width: 1280,
        height: 720,
        duration: 12,
        alt: '  A clip  ',
        autoplay: true,
        secret: 'no',
      },
      { src: url('sections/projects/b'), public_id: 'sections/projects/b' },
    ]);
    expect(list).toEqual([
      {
        kind: 'video',
        src: url('sections/projects/a', 'video'),
        public_id: 'sections/projects/a',
        width: 1280,
        height: 720,
        duration: 12,
        alt: 'A clip',
        autoplay: true,
      },
      { kind: 'image', src: url('sections/projects/b'), public_id: 'sections/projects/b' },
    ]);
  });

  it('drops anything that is not a Cloudinary picture, and survives nonsense', () => {
    expect(
      toMediaItems([
        null,
        'text',
        { src: 'http://res.cloudinary.com/x/image/upload/a.jpg' },
        { src: 'https://evil.example/a.jpg' },
        { src: 'javascript:alert(1)' },
        { public_id: 'no-src' },
      ])
    ).toEqual([]);
    expect(toMediaItems(undefined)).toEqual([]);
    expect(toMediaItems({ not: 'a list' })).toEqual([]);
  });

  it('falls back to the older single picture, but never mixes it into a list', () => {
    const banner = { src: url('sections/services/b'), public_id: 'sections/services/b' };
    expect(toMediaItems(undefined, banner)).toHaveLength(1);
    expect(toMediaItems([], banner)[0].public_id).toBe('sections/services/b');
    const list = [{ src: url('sections/services/m'), public_id: 'sections/services/m' }];
    expect(toMediaItems(list, banner).map((m) => m.public_id)).toEqual(['sections/services/m']);
    expect(toMediaItems(undefined, { src: 'https://evil.example/x.jpg' })).toEqual([]);
  });

  it('uses the address as the id when an entry has none', () => {
    const src = url('a');
    expect(toMediaItems([{ src }])[0].public_id).toBe(src);
  });

  it('describes a list in words', () => {
    expect(mediaSummary([])).toBe('');
    expect(mediaSummary([{ kind: 'image' }])).toBe('1 picture');
    expect(mediaSummary([{ kind: 'image' }, { kind: 'video' }, { kind: 'image' }])).toBe(
      '2 pictures · 1 video'
    );
    expect(mediaSummary([{ kind: 'video' }, { kind: 'video' }])).toBe('2 videos');
  });
});
