/**
 * First-run setup code.
 *
 * A brand-new deployment has no admin yet, so /administrator/setup would let the
 * first visitor claim it. To prevent that, setup requires a code that only
 * someone with access to the server can read: it is derived from JWT_SECRET (so
 * it is identical on every serverless instance and never stored) and printed to
 * the server log when setup is pending. It stops mattering the moment the admin
 * is created.
 *
 * Also printable with `node scripts/setup-code.mjs`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

// 32 symbols without the look-alikes 0/O and 1/I.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LABEL = 'my-portfolio-op1/setup-code/v1';

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not configured. Set a strong (>= 32 char) value in the environment.'
    );
  }
  return secret;
}

/** The setup code in its display form, e.g. "K7QWM-3XNPD". */
export function getSetupCode(): string {
  const digest = createHmac('sha256', requireSecret()).update(LABEL).digest();
  let code = '';
  for (let i = 0; i < 10; i++) code += ALPHABET[digest[i] % ALPHABET.length];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Constant-time comparison; tolerant of case, spaces and the dash. */
export function verifySetupCode(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const expected = Buffer.from(normalize(getSetupCode()));
  const given = Buffer.from(normalize(input));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Re-announce at most this often per process, so opening the setup page never floods the log. */
const ANNOUNCE_EVERY_MS = 30_000;
let lastAnnounced = 0;

/**
 * Prints the setup code to the server log whenever the setup page is opened while
 * setup is pending (throttled). Once per process would be easy to miss on a
 * serverless host, where the log is opened after the first request.
 */
export function announceSetupCode(): void {
  const now = Date.now();
  if (now - lastAnnounced < ANNOUNCE_EVERY_MS) return;
  lastAnnounced = now;
  const bar = '='.repeat(62);
  console.warn(
    [
      '',
      bar,
      '  my-portfolio-op1: first-run setup is pending (no admin account yet).',
      '  Open /administrator/setup and enter this setup code:',
      '',
      `      ${getSetupCode()}`,
      '',
      '  The code is derived from JWT_SECRET. Print it again any time with:',
      '      node scripts/setup-code.mjs',
      bar,
      '',
    ].join('\n')
  );
}
