// Creates every index this app's access patterns rely on. Idempotent -
// createIndex() is a no-op if an equivalent index already exists, so this is
// safe to re-run any time (after a fresh DB restore, on a new environment, etc).
//
//   node scripts/create-indexes.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnv(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return {};
  const env = {};
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*['"]?([^'"#]*)['"]?/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

// .env.local (if present) wins over .env, mirroring Next.js's own precedence.
const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
if (!env.MONGODB_URI) {
  console.error('MONGODB_URI not found in .env or .env.local');
  process.exit(1);
}

const mongoose = (await import('mongoose')).default;
await mongoose.connect(env.MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.client.db('portfolio_cms');

// homepage: one document per `type` (hero_content, about_content, ...), always
// looked up by exact type match (either a full-collection scan+JS-filter on
// the public page, or a direct findOne({ type }) from every admin content
// route's GET handler). Unique also enforces the "exactly one doc per type"
// invariant at the DB layer, so a buggy insert (vs. upsert) can never create
// a duplicate that silently shadows the real one.
await db.collection('homepage').createIndex({ type: 1 }, { unique: true });
console.log('homepage: unique index on { type: 1 }');

// settings: key/value store for admin-panel credentials, integration keys and
// notes options. `key` is unique so first-run setup can claim the admin record
// atomically (two racing setup requests can never both succeed).
await db.collection('settings').createIndex({ key: 1 }, { unique: true });
console.log('settings: unique index on { key: 1 }');

// gallery: re-affirmed here (already created by seed-gallery-mongo.mjs) so
// this script is a complete, single source of truth for index setup.
// public_id is unique per Cloudinary asset; order backs the sort every public
// page load and the admin upload route's "max order" lookup rely on.
await db.collection('gallery').createIndex({ public_id: 1 }, { unique: true });
await db.collection('gallery').createIndex({ order: 1 });
console.log('gallery: unique index on { public_id: 1 }, index on { order: 1 }');

// avatars / resumes: looked up by isActive at read time (/api/avatar,
// /api/resume). The partial unique index is the important part - it makes
// "at most one active document" a hard DB-level invariant instead of
// something only the application's updateMany-then-set dance guarantees,
// so a race between two concurrent "set active" calls can never leave two
// documents both isActive: true.
for (const name of ['avatars', 'resumes']) {
  await db
    .collection(name)
    .createIndex({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
  console.log(`${name}: partial unique index on { isActive: true }`);
}

// Independent-collection sections (education, certifications, testimonials,
// services, publications): every public read is find({}).sort({ order: 1 }),
// via lib/api/collection-crud.ts's getPublicItems()/GET handler.
for (const name of ['education', 'certifications', 'testimonials', 'services', 'publications']) {
  await db.collection(name).createIndex({ order: 1 });
  console.log(`${name}: index on { order: 1 }`);
}

await mongoose.disconnect();
console.log('Done.');
