import { describe, expect, it, vi } from 'vitest';
import { INDEXES, SCHEMA_VERSION, runDatabaseBootstrap } from '@/lib/db-bootstrap';

type Doc = Record<string, any>;

/** A tiny in-memory stand-in for the parts of the Mongo driver the bootstrap uses. */
function fakeDb(seed: Record<string, Doc[]> = {}, failIndexOn?: string) {
  const data: Record<string, Doc[]> = JSON.parse(JSON.stringify(seed));
  const createIndex = vi.fn(async (collection: string, ..._rest: unknown[]) => {
    if (collection === failIndexOn) throw new Error('E11000 duplicate key');
  });
  const db = {
    collection(name: string) {
      const docs = (data[name] ??= []);
      return {
        findOne: async (q: Doc) =>
          docs.find((d) => Object.entries(q).every(([k, v]) => d[k] === v)) ?? null,
        find: (q: Doc) => {
          const hits = docs.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v));
          return {
            sort: () => ({
              toArray: async () =>
                [...hits].sort((a, b) =>
                  String(b.updatedAt ?? b.uploadedAt).localeCompare(
                    String(a.updatedAt ?? a.uploadedAt)
                  )
                ),
            }),
          };
        },
        updateMany: async (q: Doc, u: Doc) => {
          const ids: string[] = q._id.$in;
          for (const d of docs) if (ids.includes(d._id)) Object.assign(d, u.$set);
        },
        updateOne: async (q: Doc, u: Doc) => {
          const found = docs.find((d) => d.key === q.key);
          if (found) Object.assign(found, u.$set);
          else docs.push({ ...q, ...u.$set });
        },
        createIndex: (keys: Doc, options: Doc) => createIndex(name, keys, options),
      };
    },
  };
  return { db: db as never, data, createIndex };
}

describe('runDatabaseBootstrap', () => {
  it('sets up a brand-new database and records the version', async () => {
    const { db, data, createIndex } = fakeDb();
    await runDatabaseBootstrap(db);
    expect(createIndex).toHaveBeenCalledTimes(INDEXES.length);
    expect(data.settings.find((d) => d.key === 'schema_version')?.value.version).toBe(
      SCHEMA_VERSION
    );
  });

  it('does nothing on later starts', async () => {
    const { db, createIndex } = fakeDb({
      settings: [{ key: 'schema_version', value: { version: SCHEMA_VERSION } }],
    });
    await runDatabaseBootstrap(db);
    expect(createIndex).not.toHaveBeenCalled();
  });

  it('re-applies when the schema version has moved on', async () => {
    const { db, createIndex } = fakeDb({
      settings: [{ key: 'schema_version', value: { version: 0 } }],
    });
    await runDatabaseBootstrap(db);
    expect(createIndex).toHaveBeenCalled();
  });

  it('repairs several live avatars so the unique index can be built (keeps the newest)', async () => {
    const { db, data } = fakeDb({
      avatars: [
        { _id: 'old', isActive: true, uploadedAt: '2024-01-01' },
        { _id: 'new', isActive: true, uploadedAt: '2025-06-01' },
        { _id: 'spare', isActive: false, uploadedAt: '2023-01-01' },
      ],
    });
    await runDatabaseBootstrap(db);
    const live = data.avatars.filter((d) => d.isActive).map((d) => d._id);
    expect(live).toEqual(['new']);
    expect(data.avatars).toHaveLength(3); // nothing is deleted
  });

  it('a failing index does not stop the others and is retried next start', async () => {
    const { db, data, createIndex } = fakeDb({}, 'homepage');
    await runDatabaseBootstrap(db);
    expect(createIndex).toHaveBeenCalledTimes(INDEXES.length);
    expect(data.settings.find((d) => d.key === 'schema_version')).toBeUndefined();
  });
});
