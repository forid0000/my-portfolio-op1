// Recovery: removes the admin credentials so first-run setup can be run again.
//
//   node scripts/reset-admin-auth.mjs --yes
//
// Use this if you lost your authenticator. It needs the same MONGODB_URI as the
// app (so it can only be run by someone who controls the deployment), and it
// does NOT touch any content, notes, or integration keys. Afterwards, open
// /administrator/setup; the setup code is printed by `node scripts/setup-code.mjs`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const uri =
  process.env.MONGODB_URI || loadEnv('.env.local').MONGODB_URI || loadEnv('.env').MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in the environment, .env.local or .env');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes the admin password and authenticator so you can set them up again.');
  console.error('Re-run with --yes to confirm:  node scripts/reset-admin-auth.mjs --yes');
  process.exit(1);
}

const mongoose = (await import('mongoose')).default;
await mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 15000 });
const result = await mongoose.connection.client
  .db('portfolio_cms')
  .collection('settings')
  .deleteOne({ key: 'admin_auth' });
await mongoose.disconnect();

console.log(
  result.deletedCount
    ? 'Admin credentials removed. Open /administrator/setup to create new ones.'
    : 'No admin credentials were stored (nothing to remove).'
);
