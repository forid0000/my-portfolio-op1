/**
 * Zod schemas for owner media (server only). The important rule: a stored media
 * reference must point at OUR Cloudinary folder for its scope, so a client can
 * never save an arbitrary external image URL or aim the delete-cleanup at an
 * asset that belongs to something else.
 */
import { z } from 'zod';
import { isCloudinaryUrl } from '@/lib/cloudinary-url';
import { MAX_MEDIA_PER_ITEM, MEDIA_SCOPES, type MediaScope } from '@/lib/media-types';

const PUBLIC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

const dimension = z.number().int().positive().max(20000).optional();

export const mediaItemSchema = z.object({
  kind: z.enum(['image', 'video']).optional(),
  src: z.string().max(700),
  public_id: z.string().min(3).max(300).regex(PUBLIC_ID_RE),
  width: dimension,
  height: dimension,
  duration: z.number().positive().max(86400).optional(),
  bytes: z.number().int().nonnegative().optional(),
  alt: z.string().max(200).optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  controls: z.boolean().optional(),
});

/** Adds the scope rules (Cloudinary host, folder prefix, video allowed) to one item. */
function checkItem(
  scope: MediaScope,
  item: { kind?: 'image' | 'video'; src: string; public_id: string },
  ctx: z.RefinementCtx,
  path: (string | number)[]
) {
  const cfg = MEDIA_SCOPES[scope];
  const kind = item.kind ?? 'image';
  if (!isCloudinaryUrl(item.src) || !item.src.includes(`/${kind}/upload/`)) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'src'],
      message: 'Media must be hosted on Cloudinary.',
    });
  }
  if (!item.public_id.startsWith(`${cfg.folder}/`) || item.public_id.includes('..')) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'public_id'],
      message: `Media must live in the ${cfg.folder} folder.`,
    });
  }
  if (kind === 'video' && !cfg.allowVideo) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'kind'],
      message: 'Videos are not allowed here.',
    });
  }
}

/** A list of pictures/videos for one project, certification, etc. (index 0 = cover). */
export function mediaListSchema(scope: MediaScope, max = MAX_MEDIA_PER_ITEM) {
  return z
    .array(mediaItemSchema)
    .max(max, `At most ${max} pictures or videos.`)
    .superRefine((items, ctx) => {
      items.forEach((item, i) => checkItem(scope, item, ctx, [i]));
    });
}

/** The older single-image field (badge, banner, testimonial avatar): `{ src, public_id }`. */
export function singleMediaSchema(scope: MediaScope) {
  return z
    .object({ src: z.string().max(700), public_id: z.string().min(3).max(300).regex(PUBLIC_ID_RE) })
    .superRefine((item, ctx) => checkItem(scope, { ...item, kind: 'image' }, ctx, []));
}

/** One cover picture for an article (kept apart from the inline media list). */
export function coverSchema(scope: MediaScope) {
  return z
    .object({
      src: z.string().max(700),
      public_id: z.string().min(3).max(300).regex(PUBLIC_ID_RE),
      alt: z.string().max(200).optional(),
      width: dimension,
      height: dimension,
    })
    .superRefine((item, ctx) => checkItem(scope, { ...item, kind: 'image' }, ctx, []));
}
