/**
 * Automatic database setup. The first time a server process connects, this makes sure the
 * database has the indexes the app relies on and repairs data problems that would stop an
 * index from being created. Nothing has to be run by hand, on a fresh database, after a
 * restore, or on a new deployment.
 *
 * Rules it follows:
 *  - Idempotent: every step is safe to repeat, and several instances starting at once cannot
 *    conflict.
 *  - Versioned: the applied version is stored in `settings` (key `schema_version`), so later
 *    starts cost one read. Bump SCHEMA_VERSION whenever INDEXES or a repair changes.
 *  - Graceful: it runs in the background, never blocks or fails a request, and a failure only
 *    logs a warning (the app works without the indexes, just with fewer safety checks).
 */
const DB_NAME = 'portfolio_cms';
const STATE_KEY = 'schema_version';

/** Bump when INDEXES or a repair step changes, so existing databases pick it up. */
export const SCHEMA_VERSION = 3;

/** The few driver methods the setup uses, so it can be tested without a database. */
interface SetupCollection {
  findOne(query: object): Promise<any>;
  find(query: object): { sort(order: object): { toArray(): Promise<any[]> } };
  updateMany(query: object, update: object): Promise<unknown>;
  updateOne(query: object, update: object, options?: object): Promise<unknown>;
  createIndex(keys: object, options?: object): Promise<unknown>;
}
export interface SetupDb {
  collection(name: string): SetupCollection;
}
type Db = SetupDb;

interface IndexSpec {
  collection: string;
  keys: Record<string, 1 | -1>;
  options?: { unique?: boolean; partialFilterExpression?: Record<string, unknown> };
}

const ORDERED_COLLECTIONS = [
  'education',
  'certifications',
  'testimonials',
  'services',
  'publications',
];

/**
 * Every index an access pattern relies on:
 *  - settings.key unique: first-run setup claims the admin record atomically.
 *  - homepage.type unique: exactly one document per section type, so a buggy insert can never
 *    create a duplicate that shadows the real one.
 *  - gallery: unique public_id per Cloudinary asset, and the order every page load sorts by.
 *  - avatars / resumes: at most ONE active document as a hard database rule (partial unique on
 *    isActive: true), so two racing "set active" calls can never leave two live pictures; avatars
 *    also keep one entry per Cloudinary file.
 *  - the list sections: the `order` sort every public read uses.
 *  - notes: a unique address per published note, the vault's list order and the lookup of
 *    which note keeps an attached file;
 *  - articles: a unique address (slug) per article and the "newest published first" listing;
 *    comments by article and moderation status; at most one reaction of each kind per visitor.
 */
export const INDEXES: IndexSpec[] = [
  { collection: 'settings', keys: { key: 1 }, options: { unique: true } },
  { collection: 'homepage', keys: { type: 1 }, options: { unique: true } },
  { collection: 'gallery', keys: { public_id: 1 }, options: { unique: true } },
  { collection: 'gallery', keys: { order: 1 } },
  ...['avatars', 'resumes'].map((collection): IndexSpec => ({
    collection,
    keys: { isActive: 1 },
    options: { unique: true, partialFilterExpression: { isActive: true } },
  })),
  {
    collection: 'avatars',
    keys: { public_id: 1 },
    options: { unique: true, partialFilterExpression: { public_id: { $type: 'string' } } },
  },
  ...ORDERED_COLLECTIONS.map((collection): IndexSpec => ({ collection, keys: { order: 1 } })),
  { collection: 'articles', keys: { slug: 1 }, options: { unique: true } },
  { collection: 'articles', keys: { status: 1, publishedAt: -1 } },
  { collection: 'article_comments', keys: { articleId: 1, status: 1, createdAt: -1 } },
  { collection: 'article_comments', keys: { status: 1, createdAt: -1 } },
  {
    collection: 'article_reactions',
    keys: { articleId: 1, visitor: 1, kind: 1 },
    options: { unique: true },
  },
  // Notes: one published note per address (the unique index only covers notes that have one),
  // the "newest published first" listing, the vault list order, and "who keeps this file".
  {
    collection: 'notes',
    keys: { slug: 1 },
    options: { unique: true, partialFilterExpression: { slug: { $type: 'string' } } },
  },
  { collection: 'notes', keys: { published: 1, publishedAt: -1 } },
  { collection: 'notes', keys: { updatedAt: -1 } },
  { collection: 'notes', keys: { 'attachments.id': 1 } },
];

/**
 * Older data could hold several "active" avatars or résumés (the unique index above would then
 * fail to build). Keep the most recently changed one live and switch the others off; nothing is
 * deleted.
 */
async function repairDuplicateActive(db: Db): Promise<void> {
  for (const name of ['avatars', 'resumes']) {
    const collection = db.collection(name);
    const active = await collection
      .find({ isActive: true })
      .sort({ updatedAt: -1, uploadedAt: -1 })
      .toArray();
    if (active.length < 2) continue;
    const [keep, ...extra] = active;
    await collection.updateMany(
      { _id: { $in: extra.map((d) => d._id) } },
      { $set: { isActive: false } }
    );
    console.warn(`[db] ${name}: kept ${keep._id} live and switched off ${extra.length} extra`);
  }
}

export async function runDatabaseBootstrap(db: Db): Promise<void> {
  const settings = db.collection('settings');
  const state = await settings.findOne({ key: STATE_KEY });
  if ((state?.value?.version ?? 0) >= SCHEMA_VERSION) return;

  await repairDuplicateActive(db);

  let failed = 0;
  for (const spec of INDEXES) {
    try {
      await db.collection(spec.collection).createIndex(spec.keys, spec.options ?? {});
    } catch (error) {
      failed++;
      console.warn(
        `[db] could not create the index on ${spec.collection}(${Object.keys(spec.keys)}):`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Only remember success, so a failed attempt is retried on the next start.
  if (failed === 0) {
    await settings.updateOne(
      { key: STATE_KEY },
      {
        $set: { value: { version: SCHEMA_VERSION, appliedAt: new Date() }, updatedAt: new Date() },
      },
      { upsert: true }
    );
  }
}

/** Starts the setup in the background, once per process. Never throws. */
export function scheduleDatabaseBootstrap(connection: {
  connection: { client: { db(name: string): SetupDb } };
}): void {
  const g = globalThis as { __dbBootstrap?: Promise<void> };
  if (g.__dbBootstrap) return;
  g.__dbBootstrap = runDatabaseBootstrap(connection.connection.client.db(DB_NAME)).catch(
    (error) => {
      console.warn('[db] automatic setup skipped:', error instanceof Error ? error.message : error);
    }
  );
}
