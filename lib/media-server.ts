/**
 * Server side of the single upload pipeline.
 *
 * Files never pass through our server: the browser compresses the picture, asks
 * `signUpload()` (via /api/admin/media/sign) for a short-lived signature scoped to
 * one folder, and posts the bytes straight to Cloudinary. That avoids Vercel's
 * 4.5 MB request cap and Next's 10 MiB middleware buffer, and is the only way a
 * 100 MB video can be uploaded at all. This module also owns deleting assets, so
 * "can upload" and "can remove" always travel together.
 */
import 'server-only';
import cloudinary, {
  CLOUDINARY_NOT_CONNECTED_MESSAGE,
  configureCloudinary,
} from '@/lib/cloudinary';
import connectToDatabase from '@/lib/db';
import { getIntegrations } from '@/lib/integrations';
import {
  IMAGE_FORMATS,
  MEDIA_SCOPES,
  VIDEO_FORMATS,
  type MediaKind,
  type MediaRef,
  type MediaScope,
} from '@/lib/media-types';

export interface SignedUpload {
  /** Where the browser posts the multipart form. */
  endpoint: string;
  apiKey: string;
  /** Exactly these fields must be sent, unchanged, alongside `file`, `api_key` and `signature`. */
  params: Record<string, string | number>;
  signature: string;
}

export class CloudinaryNotConnectedError extends Error {
  constructor() {
    super(CLOUDINARY_NOT_CONNECTED_MESSAGE);
    this.name = 'CloudinaryNotConnectedError';
  }
}

/** Builds a signed direct-upload request locked to the scope's folder and formats. */
export async function signUpload(scope: MediaScope, kind: MediaKind): Promise<SignedUpload> {
  const cfg = MEDIA_SCOPES[scope];
  if (kind === 'video' && !cfg.allowVideo) throw new Error('Videos are not allowed here.');

  const v = await getIntegrations([
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ] as const);
  if (!v.CLOUDINARY_CLOUD_NAME || !v.CLOUDINARY_API_KEY || !v.CLOUDINARY_API_SECRET) {
    throw new CloudinaryNotConnectedError();
  }

  // Cloudinary signs every param except file, cloud_name, resource_type and api_key,
  // so the folder and allowed formats below cannot be changed by the browser.
  const params: Record<string, string | number> = {
    folder: cfg.folder,
    timestamp: Math.round(Date.now() / 1000),
    allowed_formats: kind === 'image' ? IMAGE_FORMATS : VIDEO_FORMATS,
  };
  if (kind === 'image') params.transformation = cfg.imageTransformation;

  return {
    endpoint: `https://api.cloudinary.com/v1_1/${encodeURIComponent(v.CLOUDINARY_CLOUD_NAME)}/${kind}/upload`,
    apiKey: v.CLOUDINARY_API_KEY,
    params,
    signature: cloudinary.utils.api_sign_request(params, v.CLOUDINARY_API_SECRET),
  };
}

/** Only assets inside a folder this app manages may ever be deleted through the cleanup helpers. */
export function isManagedPublicId(publicId: string): boolean {
  if (publicId.includes('..')) return false;
  return Object.values(MEDIA_SCOPES).some((s) => publicId.startsWith(`${s.folder}/`));
}

/**
 * Pulls Cloudinary references out of whatever a document holds: a legacy single
 * `{ src, public_id }`, a list of media items, or a mix. Duplicates collapse.
 */
export function mediaRefs(...values: unknown[]): MediaRef[] {
  const found = new Map<string, MediaRef>();
  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value !== 'object') return;
    const item = value as { public_id?: unknown; kind?: unknown };
    if (typeof item.public_id === 'string' && item.public_id) {
      found.set(item.public_id, {
        public_id: item.public_id,
        kind: item.kind === 'video' ? 'video' : 'image',
      });
    }
  };
  values.forEach(visit);
  return [...found.values()];
}

/**
 * True when any saved document still points at this asset. Used before deleting an
 * abandoned upload so live content can never lose its picture by accident.
 */
export async function isMediaReferenced(publicId: string): Promise<boolean> {
  const db = (await connectToDatabase()).connection.client.db('portfolio_cms');
  const hits = await Promise.all([
    db
      .collection('homepage')
      .countDocuments({ 'projects.media.public_id': publicId }, { limit: 1 }),
    db
      .collection('certifications')
      .countDocuments(
        { $or: [{ 'media.public_id': publicId }, { 'badge.public_id': publicId }] },
        { limit: 1 }
      ),
    db.collection('testimonials').countDocuments({ 'avatar.public_id': publicId }, { limit: 1 }),
    db.collection('services').countDocuments({ 'banner.public_id': publicId }, { limit: 1 }),
    db.collection('avatars').countDocuments({ public_id: publicId }, { limit: 1 }),
    db
      .collection('articles')
      .countDocuments(
        { $or: [{ 'media.public_id': publicId }, { 'cover.public_id': publicId }] },
        { limit: 1 }
      ),
  ]);
  return hits.some((n) => n > 0);
}

/** References present in `before` but gone from `after`: the ones to delete after a save. */
export function removedRefs(before: MediaRef[], after: MediaRef[]): MediaRef[] {
  const keep = new Set(after.map((r) => r.public_id));
  return before.filter((r) => !keep.has(r.public_id));
}

/**
 * Deletes the given files unless some saved document still points at them. Used after an article
 * is saved or deleted: the same picture can be pasted into two articles, and deleting one article
 * must not break the other.
 */
export async function destroyUnreferenced(refs: MediaRef[]): Promise<void> {
  const free: MediaRef[] = [];
  for (const ref of refs) {
    try {
      if (!(await isMediaReferenced(ref.public_id))) free.push(ref);
    } catch {
      // If we cannot tell, keep the file: a stray file is better than a broken page.
    }
  }
  await destroyMedia(free);
}

/**
 * Best-effort delete in Cloudinary (videos need their own resource type). Never
 * throws: a failed destroy must not block a save or a delete the owner asked for,
 * it only leaves a stray file, which the Cloudinary explorer can still remove.
 */
export async function destroyMedia(refs: MediaRef[]): Promise<void> {
  const targets = refs.filter((r) => {
    const ok = isManagedPublicId(r.public_id);
    if (!ok) console.warn('Refusing to delete unmanaged Cloudinary asset', r.public_id);
    return ok;
  });
  if (!targets.length) return;
  try {
    await configureCloudinary();
  } catch (error) {
    console.error('Cloudinary is not configured, skipping media cleanup', error);
    return;
  }
  await Promise.all(
    targets.map(async (ref) => {
      try {
        await cloudinary.uploader.destroy(ref.public_id, {
          resource_type: ref.kind,
          invalidate: true,
        });
      } catch (error) {
        console.error('Cloudinary destroy failed for', ref.public_id, error);
      }
    })
  );
}
