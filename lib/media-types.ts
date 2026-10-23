/**
 * Shared (client + server) vocabulary for owner-uploaded media. Everything lives
 * in Cloudinary; the database only ever stores `{ src, public_id }` plus a few
 * descriptive fields, never bytes. Keep this file free of imports so both the
 * browser uploader and the server routes can use it.
 */

export type MediaKind = 'image' | 'video';

/** One picture or video attached to a project, certification, etc. Order is meaning: index 0 is the cover. */
export interface MediaItem {
  /** Missing on documents saved before videos existed: treat as 'image'. */
  kind?: MediaKind;
  src: string;
  public_id: string;
  width?: number;
  height?: number;
  /** Seconds, videos only. */
  duration?: number;
  bytes?: number;
  alt?: string;
  /** Video playback options. Everything is off unless the owner turns it on. */
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** Defaults to true; only an explicit false hides the player controls. */
  controls?: boolean;
}

/** A Cloudinary asset the server may need to delete. */
export interface MediaRef {
  public_id: string;
  kind: MediaKind;
}

export type MediaScope = 'avatars' | 'projects' | 'certifications' | 'testimonials' | 'services';

export interface MediaScopeConfig {
  /** Cloudinary folder; every public_id of the scope must start with `${folder}/`. */
  folder: string;
  allowVideo: boolean;
  /** Incoming transformation applied by Cloudinary before the original is stored. */
  imageTransformation: string;
}

export const MEDIA_SCOPES: Record<MediaScope, MediaScopeConfig> = {
  avatars: { folder: 'avatars', allowVideo: false, imageTransformation: 'c_limit,w_1600,h_1600' },
  projects: {
    folder: 'sections/projects',
    allowVideo: true,
    imageTransformation: 'c_limit,w_2400,h_2400',
  },
  certifications: {
    folder: 'sections/certifications',
    allowVideo: true,
    imageTransformation: 'c_limit,w_2400,h_2400',
  },
  testimonials: {
    folder: 'sections/testimonials',
    allowVideo: false,
    imageTransformation: 'c_limit,w_800,h_800',
  },
  services: {
    folder: 'sections/services',
    allowVideo: false,
    imageTransformation: 'c_limit,w_1600,h_1600',
  },
};

export const MEDIA_SCOPE_NAMES = Object.keys(MEDIA_SCOPES) as MediaScope[];

export const IMAGE_FORMATS = 'jpg,jpeg,png,webp,gif';
export const VIDEO_FORMATS = 'mp4,webm,mov,m4v';

/** Cloudinary's free-plan per-file limits; bigger files are refused up front with a clear message. */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

export const MAX_MEDIA_PER_ITEM = 12;

export function isVideoItem(item: Pick<MediaItem, 'kind'>): boolean {
  return item.kind === 'video';
}

/** Browsers only autoplay muted video, so autoplay always implies muted. */
export function playbackOptions(item: MediaItem) {
  const autoplay = !!item.autoplay;
  return {
    autoplay,
    muted: autoplay || !!item.muted,
    loop: !!item.loop,
    controls: item.controls !== false,
  };
}

/** True when a picked file should go down the video path. */
export function isVideoFile(file: { type: string; name: string }): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

/** Human-readable size for toasts and tiles. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
