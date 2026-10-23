/**
 * Client-only: smart, size-aware image compression done in the browser before an
 * upload, so a 12 MB phone photo becomes a few hundred KB without anyone having
 * to think about it. Never import this from server code.
 *
 * The rule is "touch it as little as possible":
 *   - an image that is already small enough is uploaded byte-for-byte (no loss);
 *   - otherwise it is re-encoded as WebP (JPEG where the browser cannot encode
 *     WebP). The starting quality depends on how oversized the file is: a slightly
 *     large photo keeps 95%, a huge one starts at 85%. If it still does not fit,
 *     quality steps down to a floor of 80% and only then is the picture made
 *     smaller, so visible quality never collapses;
 *   - animated GIFs are never re-encoded (it would freeze them).
 */
import { MAX_IMAGE_UPLOAD_BYTES, formatBytes } from '@/lib/media-types';

export type ImageUsage = 'avatar' | 'cover' | 'badge';

interface Preset {
  /** Longest side in pixels after resizing. */
  maxEdge: number;
  /** Largest file that is uploaded as-is; anything bigger is re-encoded to fit. */
  maxBytes: number;
}

export const IMAGE_PRESETS: Record<ImageUsage, Preset> = {
  // Shown small and cropped square (hero circle, header, favicon): 1200 px is plenty.
  avatar: { maxEdge: 1200, maxBytes: 700 * 1024 },
  // Project and certificate pictures: sharp on large screens and in the lightbox.
  cover: { maxEdge: 2400, maxBytes: 2.5 * 1024 * 1024 },
  // Badges, logos and small thumbnails.
  badge: { maxEdge: 1000, maxBytes: 800 * 1024 },
};

const PASS_THROUGH_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const QUALITY_FLOOR = 0.8;
const QUALITY_STEP = 0.04;

export interface PreparedImage {
  file: File;
  originalBytes: number;
  /** False when the original was already small enough and is uploaded untouched. */
  optimized: boolean;
}

/** How hard to squeeze first: the more oversized the file, the lower the starting quality. */
function startQuality(ratio: number): number {
  if (ratio <= 1.5) return 0.95;
  if (ratio <= 3) return 0.92;
  if (ratio <= 6) return 0.88;
  return 0.85;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, ext: string): string {
  return `${name.replace(/\.[^./\\]+$/, '') || 'image'}.${ext}`;
}

/** WebP first; Safari returns PNG for WebP requests, so fall back to JPEG on a white background. */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  return canvasToBlob(flat, 'image/jpeg', quality);
}

export async function prepareImageForUpload(
  file: File,
  usage: ImageUsage = 'cover'
): Promise<PreparedImage> {
  const { maxEdge, maxBytes } = IMAGE_PRESETS[usage];
  const originalBytes = file.size;

  if (file.type === 'image/svg+xml') {
    throw new Error('SVG images are not allowed. Use a JPG, PNG or WebP picture.');
  }
  if (file.type === 'image/gif') {
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error(
        `This GIF is ${formatBytes(file.size)}. Convert it to an MP4 video, or use a GIF under 10 MB.`
      );
    }
    return { file, originalBytes, optimized: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This file could not be read as an image. Use a JPG, PNG or WebP picture.');
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const tooBig = file.size > maxBytes;
    const tooWide = longest > maxEdge;

    if (PASS_THROUGH_TYPES.has(file.type) && !tooBig && !tooWide) {
      return { file, originalBytes, optimized: false };
    }

    let edge = Math.min(longest, maxEdge);
    const firstQuality = tooBig ? startQuality(file.size / maxBytes) : 0.92;
    let smallest: Blob | null = null;

    // Each round: try the quality ladder at this size; if nothing fits, make the picture smaller.
    for (let round = 0; round < 5; round++) {
      const scale = edge / longest;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser cannot resize images.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (let q = firstQuality; q >= QUALITY_FLOOR - 0.001; q -= QUALITY_STEP) {
        const blob = await encode(canvas, q);
        if (!blob) continue;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) {
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
          return {
            file: new File([blob], renamed(file.name, ext), { type: blob.type }),
            originalBytes,
            optimized: true,
          };
        }
      }
      edge = Math.round(edge * 0.85);
    }

    // Could not reach the target; still fine if it is under Cloudinary's own limit.
    if (smallest && smallest.size <= MAX_IMAGE_UPLOAD_BYTES) {
      const ext = smallest.type === 'image/webp' ? 'webp' : 'jpg';
      return {
        file: new File([smallest], renamed(file.name, ext), { type: smallest.type }),
        originalBytes,
        optimized: true,
      };
    }
    throw new Error('This image is too large to upload. Try a smaller picture.');
  } finally {
    bitmap.close();
  }
}
