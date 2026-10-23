import { describe, expect, it } from 'vitest';
import {
  faviconUrl,
  isCloudinaryUrl,
  shareImageUrl,
  videoMp4Url,
  videoPosterUrl,
  withTransformation,
} from '@/lib/cloudinary-url';

const IMG = 'https://res.cloudinary.com/demo/image/upload/v123/avatars/me.webp';
const VID = 'https://res.cloudinary.com/demo/video/upload/v9/sections/projects/clip.mov';

describe('cloudinary-url', () => {
  it('recognises only https res.cloudinary.com', () => {
    expect(isCloudinaryUrl(IMG)).toBe(true);
    expect(isCloudinaryUrl('http://res.cloudinary.com/demo/image/upload/x.png')).toBe(false);
    expect(isCloudinaryUrl('https://evil.example.com/image/upload/x.png')).toBe(false);
    expect(isCloudinaryUrl('https://res.cloudinary.com.evil.com/x')).toBe(false);
    expect(isCloudinaryUrl(undefined)).toBe(false);
  });

  it('inserts a transformation after /upload/ and keeps the version segment', () => {
    expect(withTransformation(IMG, 'w_100')).toBe(
      'https://res.cloudinary.com/demo/image/upload/w_100/v123/avatars/me.webp'
    );
  });

  it('leaves non-Cloudinary and local URLs untouched', () => {
    expect(withTransformation('/avatar-placeholder.png', 'w_100')).toBe('/avatar-placeholder.png');
    expect(faviconUrl('/avatar-placeholder.png')).toBe('/avatar-placeholder.png');
    expect(shareImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('makes a round PNG favicon whatever the original format was', () => {
    const url = faviconUrl(IMG, 96);
    expect(url).toContain('/upload/c_fill,g_auto,w_96,h_96,r_max,f_png/');
    expect(url.endsWith('.png')).toBe(true);
  });

  it('makes a JPEG share image', () => {
    const url = shareImageUrl(IMG);
    expect(url).toContain('f_jpg');
    expect(url.endsWith('.jpg')).toBe(true);
  });

  it('derives a web-safe MP4 and a poster frame from an uploaded .mov', () => {
    expect(videoMp4Url(VID)).toBe(
      'https://res.cloudinary.com/demo/video/upload/q_auto,vc_h264/v9/sections/projects/clip.mp4'
    );
    const poster = videoPosterUrl(VID, 640);
    expect(poster).toContain('so_0,f_jpg,q_auto,w_640');
    expect(poster.endsWith('.jpg')).toBe(true);
  });
});
