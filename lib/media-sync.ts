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
import { revalidateArticleIndex, revalidatePublicContent } from '@/lib/revalidate';

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
      db
        .collection('articles')
        .updateMany({ 'cover.public_id': { $in: ids } }, { $unset: { cover: '' } }),
      db.collection('articles').updateMany({ 'media.public_id': { $in: ids } }, {
        $pull: { media: { public_id: { $in: ids } } },
      } as any),
    ]);
    revalidatePublicContent();
    revalidateArticleIndex();
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
    await repointArticleBodies(db, from, secureUrl);
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
      db
        .collection('articles')
        .updateMany({ 'cover.public_id': from }, { $set: set('cover') } as any),
      db
        .collection('articles')
        .updateMany({ 'media.public_id': from }, { $set: set('media.$[m]') } as any, {
          arrayFilters: [{ 'm.public_id': from }],
        }),
    ]);
    revalidatePublicContent();
    revalidateArticleIndex();
  } catch (error) {
    console.error('Could not update media references after a Cloudinary rename', error);
  }
}

/**
 * Article text refers to pictures by address, so before a rename is applied the old address
 * inside the body is replaced too. (Delete leaves the text alone: the writer sees the gap.)
 */
async function repointArticleBodies(
  db: Awaited<ReturnType<typeof cms>>,
  from: string,
  secureUrl: string
) {
  const docs = await db
    .collection('articles')
    .find({ 'media.public_id': from }, { projection: { body: 1, media: 1 } })
    .toArray();
  for (const doc of docs) {
    const oldSrc = (doc.media as { public_id: string; src: string }[]).find(
      (m) => m.public_id === from
    )?.src;
    if (!oldSrc || oldSrc === secureUrl) continue;
    const body = String(doc.body ?? '')
      .split(oldSrc)
      .join(secureUrl);
    if (body !== doc.body)
      await db.collection('articles').updateOne({ _id: doc._id }, { $set: { body } });
  }
}
