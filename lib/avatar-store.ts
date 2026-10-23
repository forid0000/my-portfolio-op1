/**
 * The avatar ("profile picture") library: the `avatars` collection plus everything
 * that keeps it in step with Cloudinary. Routes stay thin and call into here.
 *
 * Flow: the browser uploads straight to Cloudinary (lib/media-upload.ts), then calls
 * `registerAvatar()` with only the public_id. We read the asset's real details back
 * from Cloudinary rather than trusting anything the browser says, because this image
 * also drives the favicon and the social-share picture.
 */
import 'server-only';
import mongoose from 'mongoose';
import cloudinary, { cloudinaryHttpCode, configureCloudinary } from '@/lib/cloudinary';
import connectToDatabase from '@/lib/db';
import { invalidateAvatarCache } from '@/lib/avatar-cache';
import { revalidateSiteChrome } from '@/lib/revalidate';
import { MEDIA_SCOPES } from '@/lib/media-types';

const AVATAR_FOLDER = MEDIA_SCOPES.avatars.folder;
const ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export interface AvatarDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  mimeType: string;
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  version?: number;
  /** Cloudinary's content hash; two uploads of the same picture share it (duplicate detection). */
  etag?: string;
  base64?: string; // legacy field, only on docs saved before the Cloudinary migration
  isActive: boolean;
  uploadedAt: Date;
  updatedAt?: Date;
}

export interface AvatarView {
  _id: string;
  name: string;
  mimeType: string;
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  isActive: boolean;
  uploadedAt: Date;
  updatedAt?: Date;
}

export async function avatarsCollection() {
  const db = await connectToDatabase();
  return db.connection.client.db('portfolio_cms').collection('avatars');
}

export function toAvatarView(doc: AvatarDoc): AvatarView {
  const { _id, name, mimeType, secure_url, public_id, width, height, bytes, format } = doc;
  return {
    _id: String(_id),
    name,
    mimeType,
    secure_url,
    public_id,
    width,
    height,
    bytes,
    format,
    isActive: !!doc.isActive,
    uploadedAt: doc.uploadedAt,
    updatedAt: doc.updatedAt,
  };
}

/** Every change to which picture is live must refresh the caches and every page that shows it. */
export function avatarChanged() {
  invalidateAvatarCache();
  revalidateSiteChrome();
}

export class AvatarError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'AvatarError';
  }
}

function isDuplicateKey(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 11000;
}

/** Fetches one uploaded image's real details from Cloudinary, or null when it does not exist. */
async function fetchAsset(publicId: string) {
  try {
    return (await cloudinary.api.resource(publicId, { resource_type: 'image' })) as {
      public_id: string;
      type?: string;
      format: string;
      width: number;
      height: number;
      bytes: number;
      version: number;
      etag?: string;
      secure_url: string;
    };
  } catch (error) {
    if (cloudinaryHttpCode(error) === 404) return null;
    throw error;
  }
}

/**
 * Adds an already-uploaded Cloudinary image to the library. Idempotent (the same
 * public_id twice returns the existing entry) and duplicate-aware (the same picture
 * uploaded again is discarded and the existing entry is returned).
 */
export async function registerAvatar(
  publicId: string,
  opts: { name?: string; setActive: boolean }
): Promise<{ avatar: AvatarView; duplicate: boolean }> {
  if (!publicId.startsWith(`${AVATAR_FOLDER}/`) || publicId.includes('..')) {
    throw new AvatarError('That file is not in the avatars folder.', 400);
  }
  await configureCloudinary();
  const collection = await avatarsCollection();

  const known = (await collection.findOne({ public_id: publicId })) as AvatarDoc | null;
  if (known) {
    if (opts.setActive && !known.isActive) await activateAvatar(String(known._id));
    return {
      avatar: toAvatarView({ ...known, isActive: known.isActive || opts.setActive }),
      duplicate: true,
    };
  }

  const asset = await fetchAsset(publicId);
  if (!asset || asset.type !== 'upload') {
    throw new AvatarError('Cloudinary does not have that file. Upload it again.', 404);
  }
  if (!ALLOWED_FORMATS.has(asset.format.toLowerCase())) {
    await cloudinary.uploader.destroy(publicId, { invalidate: true }).catch(() => undefined);
    throw new AvatarError('Use a PNG, JPEG, WebP or GIF picture.', 400);
  }

  // Same picture uploaded before? Keep one copy, drop the new upload.
  if (asset.etag) {
    const twin = (await collection.findOne({ etag: asset.etag })) as AvatarDoc | null;
    if (twin) {
      await cloudinary.uploader.destroy(publicId, { invalidate: true }).catch(() => undefined);
      if (opts.setActive && !twin.isActive) await activateAvatar(String(twin._id));
      return {
        avatar: toAvatarView({ ...twin, isActive: twin.isActive || opts.setActive }),
        duplicate: true,
      };
    }
  }

  const now = new Date();
  const doc = {
    name: (opts.name || publicId.split('/').pop() || 'avatar').slice(0, 255),
    mimeType: `image/${asset.format.toLowerCase() === 'jpg' ? 'jpeg' : asset.format.toLowerCase()}`,
    secure_url: asset.secure_url,
    public_id: asset.public_id,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    format: asset.format,
    version: asset.version,
    etag: asset.etag,
    isActive: opts.setActive,
    uploadedAt: now,
  };

  try {
    // The partial unique index allows one active doc, so deactivate first. A racing
    // request can still win the slot; one retry settles it.
    for (let attempt = 0; ; attempt++) {
      if (opts.setActive) await collection.updateMany({}, { $set: { isActive: false } });
      try {
        const result = await collection.insertOne({ ...doc });
        if (opts.setActive) avatarChanged();
        return {
          avatar: toAvatarView({ ...doc, _id: result.insertedId } as AvatarDoc),
          duplicate: false,
        };
      } catch (error) {
        if (!(opts.setActive && isDuplicateKey(error) && attempt === 0)) throw error;
      }
    }
  } catch (error) {
    // The library entry could not be written: do not leave a stray file in Cloudinary.
    await cloudinary.uploader.destroy(publicId, { invalidate: true }).catch(() => undefined);
    throw error;
  }
}

/** Makes one library picture the live profile picture. Changes nothing if it does not exist. */
export async function activateAvatar(id: string): Promise<void> {
  let objectId: mongoose.Types.ObjectId;
  try {
    objectId = new mongoose.Types.ObjectId(id);
  } catch {
    throw new AvatarError('Invalid id', 400);
  }
  const collection = await avatarsCollection();
  const doc = (await collection.findOne({ _id: objectId })) as AvatarDoc | null;
  if (!doc) throw new AvatarError('Picture not found', 404);
  if (!doc.secure_url) {
    throw new AvatarError(
      'This picture is not stored in Cloudinary yet. Reload the page first.',
      409
    );
  }
  const now = new Date();
  await collection.updateMany(
    { _id: { $ne: objectId } },
    { $set: { isActive: false, updatedAt: now } }
  );
  await collection.updateOne({ _id: objectId }, { $set: { isActive: true, updatedAt: now } });
  avatarChanged();
}

/** Deletes a picture from Cloudinary first, then from the library. The live one cannot be deleted. */
export async function deleteAvatar(id: string): Promise<void> {
  let objectId: mongoose.Types.ObjectId;
  try {
    objectId = new mongoose.Types.ObjectId(id);
  } catch {
    throw new AvatarError('Invalid id', 400);
  }
  const collection = await avatarsCollection();
  const doc = (await collection.findOne({ _id: objectId })) as AvatarDoc | null;
  if (!doc) throw new AvatarError('Picture not found', 404);
  if (doc.isActive) {
    throw new AvatarError(
      'This is the live profile picture. Make another picture active first.',
      409
    );
  }
  if (doc.public_id) {
    await configureCloudinary();
    try {
      const result = await cloudinary.uploader.destroy(doc.public_id, { invalidate: true });
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new AvatarError('Cloudinary could not delete the file. Try again.', 502);
      }
    } catch (error) {
      if (error instanceof AvatarError) throw error;
      // Keep the entry so the owner can retry; a silent orphan is worse than an error.
      throw new AvatarError('Cloudinary could not delete the file. Try again.', 502);
    }
  }
  await collection.deleteOne({ _id: objectId });
}

// --- Sync with Cloudinary -------------------------------------------------------------

export interface SyncAsset {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  version?: number;
  etag?: string;
}

export interface SyncReport {
  checked: number;
  /** Library entries whose Cloudinary file is gone. */
  missing: string[];
  /** Entries whose stored URL or size differs from what Cloudinary has now. */
  stale: string[];
  /** Files in the avatars folder that the library does not know about. */
  untracked: SyncAsset[];
}

async function assetsByIds(ids: string[]): Promise<Map<string, SyncAsset>> {
  const found = new Map<string, SyncAsset>();
  for (let i = 0; i < ids.length; i += 100) {
    const result = await cloudinary.api.resources_by_ids(ids.slice(i, i + 100), {
      resource_type: 'image',
      type: 'upload',
    });
    for (const r of result.resources as SyncAsset[]) found.set(r.public_id, r);
  }
  return found;
}

async function folderAssets(): Promise<SyncAsset[]> {
  const all: SyncAsset[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${AVATAR_FOLDER}/`,
      max_results: 100,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    all.push(...(result.resources as SyncAsset[]));
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  return all;
}

export async function computeSync(): Promise<SyncReport> {
  await configureCloudinary();
  const collection = await avatarsCollection();
  const docs = (await collection.find({}).toArray()) as AvatarDoc[];
  const withAsset = docs.filter((d) => d.public_id);

  const [remote, inFolder] = await Promise.all([
    assetsByIds(withAsset.map((d) => d.public_id as string)),
    folderAssets(),
  ]);

  const missing: string[] = [];
  const stale: string[] = [];
  for (const doc of withAsset) {
    const asset = remote.get(doc.public_id as string);
    if (!asset) {
      missing.push(String(doc._id));
    } else if (
      asset.secure_url !== doc.secure_url ||
      asset.width !== doc.width ||
      asset.height !== doc.height ||
      asset.bytes !== doc.bytes
    ) {
      stale.push(String(doc._id));
    }
  }
  const known = new Set(docs.map((d) => d.public_id).filter(Boolean));
  const untracked = inFolder.filter((a) => !known.has(a.public_id));
  return { checked: withAsset.length, missing, stale, untracked };
}

export interface SyncResult {
  removed: number;
  refreshed: number;
  imported: number;
  /** True when the live picture was among the removed ones, so the site now shows the placeholder. */
  deactivated: boolean;
}

export async function applySync(): Promise<SyncResult> {
  const report = await computeSync();
  const collection = await avatarsCollection();
  const toId = (id: string) => new mongoose.Types.ObjectId(id);

  let deactivated = false;
  let activeTouched = false;

  if (report.missing.length) {
    const gone = (await collection
      .find({ _id: { $in: report.missing.map(toId) } })
      .toArray()) as AvatarDoc[];
    deactivated = gone.some((d) => d.isActive);
    await collection.deleteMany({ _id: { $in: report.missing.map(toId) } });
  }

  if (report.stale.length) {
    const remote = await assetsByIds(
      ((await collection.find({ _id: { $in: report.stale.map(toId) } }).toArray()) as AvatarDoc[])
        .map((d) => d.public_id as string)
        .filter(Boolean)
    );
    for (const doc of (await collection
      .find({ _id: { $in: report.stale.map(toId) } })
      .toArray()) as AvatarDoc[]) {
      const asset = remote.get(doc.public_id as string);
      if (!asset) continue;
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            secure_url: asset.secure_url,
            width: asset.width,
            height: asset.height,
            bytes: asset.bytes,
            format: asset.format,
            version: asset.version,
            etag: asset.etag,
            updatedAt: new Date(),
          },
        }
      );
      if (doc.isActive) activeTouched = true;
    }
  }

  let imported = 0;
  for (const asset of report.untracked) {
    if (!ALLOWED_FORMATS.has(asset.format.toLowerCase())) continue;
    try {
      await collection.insertOne({
        name: asset.public_id.split('/').pop() || 'avatar',
        mimeType: `image/${asset.format.toLowerCase() === 'jpg' ? 'jpeg' : asset.format.toLowerCase()}`,
        secure_url: asset.secure_url,
        public_id: asset.public_id,
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes,
        format: asset.format,
        version: asset.version,
        etag: asset.etag,
        isActive: false,
        uploadedAt: new Date(),
      });
      imported++;
    } catch (error) {
      console.error('Could not import avatar asset', asset.public_id, error);
    }
  }

  if (deactivated || activeTouched) avatarChanged();
  return {
    removed: report.missing.length,
    refreshed: report.stale.length,
    imported,
    deactivated,
  };
}

// --- Called from the Cloudinary explorer routes so deleting/renaming there stays in sync ----

/** Drops library entries whose Cloudinary file was just deleted. Never throws. */
export async function forgetAvatarAssets(publicIds: string[]): Promise<void> {
  const ids = publicIds.filter((id) => id.startsWith(`${AVATAR_FOLDER}/`));
  if (!ids.length) return;
  try {
    const collection = await avatarsCollection();
    const gone = (await collection.find({ public_id: { $in: ids } }).toArray()) as AvatarDoc[];
    if (!gone.length) return;
    await collection.deleteMany({ public_id: { $in: ids } });
    if (gone.some((d) => d.isActive)) avatarChanged();
  } catch (error) {
    console.error('Could not update the avatar library after a Cloudinary delete', error);
  }
}

/** Follows a rename done in the Cloudinary explorer. Never throws. */
export async function renameAvatarAsset(
  from: string,
  to: string,
  secureUrl?: string
): Promise<void> {
  if (!from.startsWith(`${AVATAR_FOLDER}/`)) return;
  try {
    const collection = await avatarsCollection();
    const doc = (await collection.findOne({ public_id: from })) as AvatarDoc | null;
    if (!doc) return;
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          public_id: to,
          ...(secureUrl ? { secure_url: secureUrl } : {}),
          updatedAt: new Date(),
        },
      }
    );
    if (doc.isActive) avatarChanged();
  } catch (error) {
    console.error('Could not update the avatar library after a Cloudinary rename', error);
  }
}
