/**
 * Credentials managed from the admin panel (Admin -> Security) and stored in
 * MongoDB, instead of environment variables.
 *
 * - Admin:  an authenticator (TOTP) is MANDATORY, a password is OPTIONAL and is
 *           enforced only once one has been set.
 * - Notes:  a vault password and/or an authenticator quick-unlock, both optional;
 *           the vault stays locked until at least one of them is set.
 *
 * Passwords are scrypt-hashed, TOTP seeds are encrypted (lib/secret-box.ts).
 * Node runtime only.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { deleteSetting, getSetting, setSetting, settingsCollection } from '@/lib/settings-store';
import { sealSecret, tryOpenSecret } from '@/lib/secret-box';

const scryptAsync = promisify(scrypt);

export const ADMIN_PASSWORD_MIN = 12;
export const NOTES_PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
const TOTP_ISSUER = 'Global-ID';

// ── Passwords ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts[0] !== 'scrypt' || parts.length !== 3) return false;
  const [, salt, hash] = parts;
  try {
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hash, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

// ── TOTP ─────────────────────────────────────────────────────────────────────

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(secret: string, label: string): string {
  return generateURI({ issuer: TOTP_ISSUER, label, secret });
}

/** Accepts "123 456" / "123456"; returns the 6 digits or null. */
export function normalizeTotpCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\s+/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Verifies a code, allowing one 30 s step of clock drift either way. */
export function checkTotp(secret: string, code: unknown): { valid: boolean; timeStep?: number } {
  const token = normalizeTotpCode(code);
  if (!token) return { valid: false };
  try {
    const result = verifySync({ token, secret, epochTolerance: 30 });
    return result.valid ? { valid: true, timeStep: result.timeStep } : { valid: false };
  } catch {
    return { valid: false };
  }
}

/** Base32 TOTP seed as produced by generateTotpSecret (used to validate client-echoed seeds). */
export function isValidTotpSecret(secret: unknown): secret is string {
  return typeof secret === 'string' && /^[A-Z2-7]{16,128}$/.test(secret);
}

// ── Admin credentials ────────────────────────────────────────────────────────

const ADMIN_KEY = 'admin_auth';

export interface AdminAuth {
  totpSecret: string;
  passwordHash: string | null;
}

interface AdminAuthDoc {
  totpSecret: string; // sealed
  passwordHash?: string;
  lastTotpStep?: number;
  createdAt: Date;
}

/** The admin credentials, or null until first-run setup has been completed. */
export async function getAdminAuth(): Promise<AdminAuth | null> {
  const doc = await getSetting<AdminAuthDoc>(ADMIN_KEY);
  if (!doc) return null;
  const totpSecret = tryOpenSecret(doc.totpSecret);
  // An unreadable seed (JWT_SECRET was rotated) counts as "not configured".
  if (!totpSecret) return null;
  return { totpSecret, passwordHash: doc.passwordHash ?? null };
}

export async function needsAdminSetup(): Promise<boolean> {
  return (await getAdminAuth()) === null;
}

/**
 * Creates the admin credentials. Returns false if they already exist, so two
 * racing setup requests can never both succeed. An existing but unreadable
 * record (rotated JWT_SECRET) is replaced.
 */
export async function createAdminAuth(totpSecret: string, passwordHash: string | null) {
  const col = await settingsCollection();
  const value: AdminAuthDoc = {
    totpSecret: sealSecret(totpSecret),
    ...(passwordHash ? { passwordHash } : {}),
    createdAt: new Date(),
  };
  const existing = await col.findOne({ key: ADMIN_KEY });
  if (existing) {
    if (tryOpenSecret((existing.value as AdminAuthDoc | undefined)?.totpSecret)) return false;
    const replaced = await col.updateOne(
      { _id: existing._id },
      { $set: { value, updatedAt: new Date() } }
    );
    return replaced.matchedCount === 1;
  }
  try {
    await col.insertOne({ key: ADMIN_KEY, value, updatedAt: new Date() });
    return true;
  } catch (error: any) {
    if (error?.code === 11000) return false; // lost the race to another request
    throw error;
  }
}

export async function setAdminPasswordHash(passwordHash: string | null): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne(
    { key: ADMIN_KEY },
    passwordHash
      ? { $set: { 'value.passwordHash': passwordHash, updatedAt: new Date() } }
      : { $unset: { 'value.passwordHash': '' }, $set: { updatedAt: new Date() } }
  );
}

export async function replaceAdminTotpSecret(totpSecret: string): Promise<void> {
  const col = await settingsCollection();
  await col.updateOne(
    { key: ADMIN_KEY },
    {
      $set: { 'value.totpSecret': sealSecret(totpSecret), updatedAt: new Date() },
      $unset: { 'value.lastTotpStep': '' },
    }
  );
}

/**
 * Marks a TOTP time step as used. Returns false if that step (or a later one) was
 * already consumed, so a code captured over someone's shoulder cannot be replayed.
 */
export async function consumeAdminTotpStep(timeStep: number): Promise<boolean> {
  const col = await settingsCollection();
  const result = await col.updateOne(
    {
      key: ADMIN_KEY,
      $or: [
        { 'value.lastTotpStep': { $exists: false } },
        { 'value.lastTotpStep': { $lt: timeStep } },
      ],
    },
    { $set: { 'value.lastTotpStep': timeStep } }
  );
  return result.modifiedCount === 1;
}

// ── Notes vault credentials ──────────────────────────────────────────────────

const NOTES_PASSWORD_KEY = 'notes_password';
const NOTES_TOTP_KEY = 'notes_totp';

export async function getNotesPasswordHash(): Promise<string | null> {
  const value = await getSetting<string>(NOTES_PASSWORD_KEY);
  return typeof value === 'string' && value ? value : null;
}

export async function setNotesPassword(password: string): Promise<void> {
  await setSetting(NOTES_PASSWORD_KEY, await hashPassword(password));
}

export async function removeNotesPassword(): Promise<void> {
  await deleteSetting(NOTES_PASSWORD_KEY);
}

export async function getNotesTotpSecret(): Promise<string | null> {
  return tryOpenSecret(await getSetting<string>(NOTES_TOTP_KEY));
}

export async function setNotesTotpSecret(secret: string): Promise<void> {
  await setSetting(NOTES_TOTP_KEY, sealSecret(secret));
}

export async function removeNotesTotpSecret(): Promise<void> {
  await deleteSetting(NOTES_TOTP_KEY);
}
