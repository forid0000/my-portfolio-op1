// Generates a TOTP secret for the admin login (ADMIN_TOTP_SECRET).
//
//   node scripts/generate-totp.mjs [account-label] [ENV_VAR_NAME]
//
// ENV_VAR_NAME defaults to ADMIN_TOTP_SECRET. Run it a second time with
// NOTES_TOTP_SECRET to create the optional Notes Vault quick-unlock secret.
//
// Everything happens locally: the secret is never sent to any web service.
// Add the printed secret to your authenticator app by scanning the QR code
// (if the optional `qrencode` tool is installed) or by typing it in manually.

import { spawnSync } from 'node:child_process';
import { generateSecret } from 'otplib';

const issuer = 'Global-ID';
const account = process.argv[2] || 'admin';
const envVar = process.argv[3] || 'ADMIN_TOTP_SECRET';

const secret = generateSecret();
const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

console.log('\n--- TOTP GENERATOR ---');
console.log('\n1. Add this line to your .env.local file:\n');
console.log(`${envVar}="${secret}"\n`);
if (envVar === 'ADMIN_TOTP_SECRET') {
  console.log('2. Also set ADMIN_PASSWORD (a long, unique password) and JWT_SECRET');
  console.log('   (generate one with: openssl rand -base64 32).\n');
} else {
  console.log('2. Keep it different from ADMIN_TOTP_SECRET.\n');
}
console.log(
  '3. Add the account to your authenticator app (Google Authenticator, Aegis, 1Password...):'
);

const qr = spawnSync('qrencode', ['-t', 'ansiutf8', otpauth], { encoding: 'utf8' });
if (qr.status === 0 && qr.stdout) {
  console.log('\n' + qr.stdout);
} else {
  console.log('\n   (install `qrencode` to render a scannable QR code here)');
  console.log('   Enter the secret manually, or import this URI:\n');
  console.log(`   ${otpauth}\n`);
}

console.log('Treat this secret like a password and never commit it.');
console.log('Test it by logging in at /administrator/login before closing this terminal.');
