// Prints the first-run setup code needed at /administrator/setup.
//
//   node scripts/setup-code.mjs
//
// The code is derived from JWT_SECRET (read from the environment, .env.local or
// .env), so it matches what the server prints in its log. Keep the label in sync
// with lib/setup-code.ts.

import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LABEL = 'my-portfolio-op1/setup-code/v1';

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

// Real environment wins, then .env.local, then .env (Next.js precedence).
const secret =
  process.env.JWT_SECRET || loadEnv('.env.local').JWT_SECRET || loadEnv('.env').JWT_SECRET;

if (!secret || secret.length < 32) {
  console.error('JWT_SECRET is missing or shorter than 32 characters.');
  console.error('Set it in .env.local (generate one with: openssl rand -base64 32).');
  process.exit(1);
}

const digest = createHmac('sha256', secret).update(LABEL).digest();
let code = '';
for (let i = 0; i < 10; i++) code += ALPHABET[digest[i] % ALPHABET.length];

console.log(`\nSetup code: ${code.slice(0, 5)}-${code.slice(5)}\n`);
console.log('Enter it at /administrator/setup. It stops mattering once the admin account exists.');
