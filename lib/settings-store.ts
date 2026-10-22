/**
 * Tiny key/value layer over the `settings` collection (portfolio_cms.settings).
 * Every document is `{ key, value, updatedAt }`; `key` is unique.
 *
 * Holds the admin-panel-managed credentials and integration settings (see
 * lib/credentials.ts and lib/integrations.ts) as well as the older Notes Vault
 * options.
 */
import connectToDatabase from '@/lib/db';

let indexEnsured = false;

export async function settingsCollection() {
  const db = await connectToDatabase();
  const col = db.connection.client.db('portfolio_cms').collection('settings');
  if (!indexEnsured) {
    // `key` must be unique so first-run setup can claim its document atomically.
    // Idempotent; ignored if legacy duplicates exist (the app then still works).
    try {
      await col.createIndex({ key: 1 }, { unique: true });
    } catch {
      /* keep going */
    }
    indexEnsured = true;
  }
  return col;
}

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const col = await settingsCollection();
  const doc = await col.findOne({ key });
  return (doc?.value as T | undefined) ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne({ key }, { $set: { value, updatedAt: new Date() } }, { upsert: true });
}

export async function deleteSetting(key: string): Promise<void> {
  const col = await settingsCollection();
  await col.deleteOne({ key });
}
