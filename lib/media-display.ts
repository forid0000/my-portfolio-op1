/**
 * What the public site does with the pictures and videos saved for a project, certification,
 * service or education entry (pure helpers, safe in server and client code).
 *
 * Saved documents come from the database as they are: other fields, object ids, dates. Only a
 * plain, checked list is handed to the browser, so nothing unexpected is sent to visitors and a
 * broken entry never crashes a page.
 */
import { isCloudinaryUrl } from '@/lib/cloudinary-url';
import type { MediaItem } from '@/lib/media-types';

const FLAGS = ['autoplay', 'loop', 'muted', 'controls'] as const;

function toItem(raw: unknown): MediaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const src = typeof value.src === 'string' ? value.src : '';
  if (!isCloudinaryUrl(src)) return null;
  const kind = value.kind === 'video' ? 'video' : 'image';
  const item: MediaItem = {
    kind,
    src,
    public_id: typeof value.public_id === 'string' && value.public_id ? value.public_id : src,
  };
  const number = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
  const width = number(value.width);
  const height = number(value.height);
  const duration = number(value.duration);
  if (width) item.width = width;
  if (height) item.height = height;
  if (duration) item.duration = duration;
  if (typeof value.alt === 'string' && value.alt.trim()) item.alt = value.alt.trim().slice(0, 200);
  for (const flag of FLAGS)
    if (typeof value[flag] === 'boolean') item[flag] = value[flag] as boolean;
  return item;
}

/**
 * The media list to show: the saved list, or, for entries saved before lists existed, the one
 * older single picture (a `banner`, a `badge`). Invalid or non-Cloudinary entries are dropped.
 */
export function toMediaItems(list: unknown, single?: unknown): MediaItem[] {
  const items = (Array.isArray(list) ? list : []).map(toItem).filter((m): m is MediaItem => !!m);
  if (items.length) return items;
  const legacy = toItem(single);
  return legacy ? [legacy] : [];
}

/** "6 pictures · 1 video", for the badge on a card and the line in a detail window. */
export function mediaSummary(items: Pick<MediaItem, 'kind'>[]): string {
  const videos = items.filter((m) => m.kind === 'video').length;
  const pictures = items.length - videos;
  const parts: string[] = [];
  if (pictures) parts.push(`${pictures} ${pictures === 1 ? 'picture' : 'pictures'}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`);
  return parts.join(' · ');
}
