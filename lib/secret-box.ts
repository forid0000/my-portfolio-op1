/**
 * Authenticated encryption for secrets that the admin panel stores in MongoDB
 * (TOTP seeds, SMTP password, Cloudinary / R2 / GitHub credentials).
 *
 * AES-256-GCM with a random 96-bit nonce per value. The key is derived (HKDF-
 * SHA256) from JWT_SECRET, which lives only in the server environment, so a
 * leaked database dump or backup on its own does not reveal the secrets.
 *
 * Rotating JWT_SECRET makes previously stored values undecryptable: they have to
 * be entered again in Admin -> Security. Node runtime only (uses node:crypto).
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
let cachedKey: { secret: string; key: Buffer } | null = null;

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not configured. Set a strong (>= 32 char) value in the environment.'
    );
  }
  if (cachedKey?.secret === secret) return cachedKey.key;
  const key = Buffer.from(
    hkdfSync('sha256', secret, 'global-id/secret-box/salt', 'global-id/secret-box/v1', 32)
  );
  cachedKey = { secret, key };
  return key;
}

export function isSealed(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Encrypts `plain` into a self-describing string safe to store in the database. */
export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ciphertext].map((b) => b.toString('base64url')).join('.');
}

/** Decrypts a value produced by sealSecret. Throws if it was tampered with or the key changed. */
export function openSecret(sealed: string): string {
  if (!isSealed(sealed)) throw new Error('Value is not a sealed secret.');
  const [ivB64, tagB64, dataB64] = sealed.slice(PREFIX.length).split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed sealed secret.');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Like openSecret, but returns null instead of throwing (e.g. after JWT_SECRET rotation). */
export function tryOpenSecret(sealed: unknown): string | null {
  if (!isSealed(sealed)) return null;
  try {
    return openSecret(sealed);
  } catch {
    return null;
  }
}
