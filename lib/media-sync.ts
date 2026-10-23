/**
 * Keeps the database in step when someone deletes or renames files in the
 * Cloudinary explorer (Admin -> Cloudinary Data). Without this, removing a file
 * there would leave the hero, a project or a certificate pointing at a dead URL.
 * Every function here is best-effort and never throws: it runs after the explorer
 * action already succeeded and must not turn that into an error.
 */
import 'server-only';
import connectToDatabase from '@/lib/db';
import { forgetAvatarAssets, renameAvatarAsset } from '@/lib/avatar-store';
import { revalidatePublicContent } from '@/lib/revalidate';

async function cms() {
  return (await connectToDatabase()).connection.client.db('portfolio_cms');
}

/** Removes every saved reference to files that no longer exist in Cloudinary. */
export async function propagateCloudinaryDelete(publicIds: string[]): Promise<void> {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;
  await forgetAvatarAssets(ids);
  try {
    const db = await cms();
    await Promise.all([
      db.collection('homepage').updateOne({ type: 'projects_content' }, {
        $pull: { 'projects.$[].media': { public_id: { $in: ids } } },
      } as any),
      db.collection('certifications').updateMany({ 'media.public_id': { $in: ids } }, {
        $pull: { media: { public_id: { $in: ids } } },
      } as any),
      db
        .collection('certifications')
        .updateMany({ 'badge.public_id': { $in: ids } }, { $unset: { badge: '' } }),
      db
        .collection('testimonials')
        .updateMany({ 'avatar.public_id': { $in: ids } }, { $unset: { avatar: '' } }),
      db
        .collection('services')
        .updateMany({ 'banner.public_id': { $in: ids } }, { $unset: { banner: '' } }),
    ]);
    revalidatePublicContent();
  } catch (error) {
    console.error('Could not clean media references after a Cloudinary delete', error);
  }
}

/** Points saved references at the new public_id / URL after a rename. */
export async function propagateCloudinaryRename(
  from: string,
  to: string,
  secureUrl?: string
): Promise<void> {
  await renameAvatarAsset(from, to, secureUrl);
  if (!secureUrl) return;
  try {
    const db = await cms();
    const set = (prefix: string) => ({ [`${prefix}.public_id`]: to, [`${prefix}.src`]: secureUrl });
    await Promise.all([
      db
        .collection('homepage')
        .updateOne({ type: 'projects_content' }, { $set: set('projects.$[].media.$[m]') } as any, {
          arrayFilters: [{ 'm.public_id': from }],
        }),
      db
        .collection('certifications')
        .updateMany({ 'media.public_id': from }, { $set: set('media.$[m]') } as any, {
          arrayFilters: [{ 'm.public_id': from }],
        }),
      db
        .collection('certifications')
        .updateMany({ 'badge.public_id': from }, { $set: set('badge') } as any),
      db
        .collection('testimonials')
        .updateMany({ 'avatar.public_id': from }, { $set: set('avatar') } as any),
      db
        .collection('services')
        .updateMany({ 'banner.public_id': from }, { $set: set('banner') } as any),
    ]);
    revalidatePublicContent();
  } catch (error) {
    console.error('Could not update media references after a Cloudinary rename', error);
  }
}
