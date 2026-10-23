// One command that proves the app works end to end:
//   pnpm test:smoke
//
// It starts a fake Cloudinary, starts the production server (`pnpm build` first), runs
// tests/smoke/e2e.mjs against them, and always shuts everything down again.
//
//   MONGODB_URI   required. Use a throwaway database (the test writes content to it).
//   JWT_SECRET    optional; a random one is generated.
//   BASE_URL      optional; set it to test an app that is already running (it must have been
//                 started with CLOUDINARY_* pointing at the fake, see below).
//   PORT          optional; default 3300.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const FAKE_PORT = Number(process.env.FAKE_PORT || 4010);
const APP_PORT = Number(process.env.PORT || 3300);

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required, for example mongodb://127.0.0.1:27017/portfolio_cms');
  process.exit(2);
}
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const children = [];
const stop = () => {
  for (const c of children) if (!c.killed) c.kill('SIGTERM');
};
process.on('exit', stop);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

async function waitFor(url, label, ms = 180_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} did not become ready within ${ms / 1000}s`);
}

const fake = spawn(process.execPath, [path.join(here, 'fake-cloudinary.mjs'), String(FAKE_PORT)], {
  stdio: ['ignore', 'inherit', 'inherit'],
});
children.push(fake);
await waitFor(`http://127.0.0.1:${FAKE_PORT}/__state`, 'fake Cloudinary', 15_000);

let baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  baseUrl = `http://127.0.0.1:${APP_PORT}`;
  const app = spawn(path.join(root, 'node_modules/.bin/next'), ['start', '-p', String(APP_PORT)], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      JWT_SECRET,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SITE_URL: baseUrl,
      // Point the Cloudinary SDK at the fake instead of the real service.
      CLOUDINARY_CLOUD_NAME: 'testcloud',
      CLOUDINARY_API_KEY: 'testkey',
      CLOUDINARY_API_SECRET: 'testsecret',
      CLOUDINARY_URL: `cloudinary://testkey:testsecret@testcloud?upload_prefix=http://127.0.0.1:${FAKE_PORT}`,
    },
  });
  children.push(app);
  app.on('exit', (code) => {
    if (code) console.error(`The app exited early with code ${code}`);
  });
  await waitFor(`${baseUrl}/api/avatar`, 'the app');
}

const test = spawn(process.execPath, [path.join(here, 'e2e.mjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    JWT_SECRET,
    BASE_URL: baseUrl,
    FAKE_URL: `http://127.0.0.1:${FAKE_PORT}`,
  },
});
const code = await new Promise((resolve) => test.on('exit', resolve));
stop();
process.exit(code ?? 1);
