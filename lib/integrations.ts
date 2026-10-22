/**
 * Third-party integration settings (email, Cloudinary, R2, GitHub sync) managed
 * from Admin -> Security -> Integrations.
 *
 * Values are stored in `settings` (key "integrations"); secret fields are
 * encrypted with lib/secret-box.ts and are never sent back to the browser. For
 * each field the admin-panel value wins; the matching environment variable is
 * only a fallback, so existing deployments keep working.
 *
 * Node runtime only.
 */
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { getSetting, settingsCollection } from '@/lib/settings-store';
import { sealSecret, tryOpenSecret } from '@/lib/secret-box';

export type IntegrationGroup = 'email' | 'cloudinary' | 'r2' | 'github';

export interface IntegrationField {
  key: string;
  label: string;
  group: IntegrationGroup;
  /** Secret values are encrypted at rest and never returned by the API. */
  secret: boolean;
  placeholder?: string;
  hint?: string;
  /** Older environment variable names still honoured as a fallback. */
  legacyEnv?: string[];
}

export const INTEGRATION_GROUPS: Record<IntegrationGroup, { label: string; description: string }> =
  {
    email: {
      label: 'Contact form email (SMTP)',
      description:
        'Where contact-form messages are sent from and delivered to. Any SMTP provider works.',
    },
    cloudinary: {
      label: 'Cloudinary',
      description: 'Media explorer, avatar and gallery uploads.',
    },
    r2: {
      label: 'Cloudflare R2',
      description:
        'Image uploads inside the Notes Vault. The public base URL of the bucket is still set with the R2_PUBLIC_URL environment variable (the Content-Security-Policy needs it at build time).',
    },
    github: {
      label: 'GitHub profile sync',
      description:
        'Optionally triggers a repository_dispatch (event "cms-updated") on your profile-README repository after CMS saves.',
    },
  };

export const INTEGRATION_FIELDS: IntegrationField[] = [
  {
    key: 'SMTP_HOST',
    label: 'SMTP host',
    group: 'email',
    secret: false,
    placeholder: 'smtp-relay.brevo.com',
  },
  { key: 'SMTP_PORT', label: 'SMTP port', group: 'email', secret: false, placeholder: '587' },
  {
    key: 'SMTP_USER',
    label: 'SMTP username',
    group: 'email',
    secret: false,
    legacyEnv: ['BREVO_SMTP_USER'],
  },
  {
    key: 'SMTP_PASS',
    label: 'SMTP password',
    group: 'email',
    secret: true,
    legacyEnv: ['BREVO_SMTP_PASS'],
  },
  {
    key: 'CONTACT_TO_EMAIL',
    label: 'Deliver messages to',
    group: 'email',
    secret: false,
    placeholder: 'you@example.com',
  },
  {
    key: 'CONTACT_FROM_EMAIL',
    label: 'Send messages from',
    group: 'email',
    secret: false,
    placeholder: 'noreply@your-domain.com',
    hint: 'Defaults to the SMTP username.',
  },
  { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloud name', group: 'cloudinary', secret: false },
  { key: 'CLOUDINARY_API_KEY', label: 'API key', group: 'cloudinary', secret: true },
  { key: 'CLOUDINARY_API_SECRET', label: 'API secret', group: 'cloudinary', secret: true },
  { key: 'R2_ACCOUNT_ID', label: 'Account ID', group: 'r2', secret: false },
  { key: 'R2_ACCESS_KEY_ID', label: 'Access key ID', group: 'r2', secret: true },
  { key: 'R2_SECRET_ACCESS_KEY', label: 'Secret access key', group: 'r2', secret: true },
  { key: 'R2_BUCKET_NAME', label: 'Bucket name', group: 'r2', secret: false },
  {
    key: 'GITHUB_PROFILE_REPO',
    label: 'Profile repository',
    group: 'github',
    secret: false,
    placeholder: 'your-username/your-username',
  },
  {
    key: 'GITHUB_DISPATCH_TOKEN',
    label: 'Access token',
    group: 'github',
    secret: true,
    hint: 'Fine-grained token with "Contents: write" on that repository only.',
  },
];

const FIELD_BY_KEY = new Map(INTEGRATION_FIELDS.map((f) => [f.key, f]));
const STORE_KEY = 'integrations';
const MAX_VALUE_LENGTH = 500;

type Stored = Record<string, string>;

let cache: { values: Record<string, string>; at: number } | null = null;

export function invalidateIntegrationsCache() {
  cache = null;
}

/** Decrypted admin-panel values (secrets opened), cached briefly. */
async function loadStored(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const values: Record<string, string> = {};
  try {
    const stored = (await getSetting<Stored>(STORE_KEY)) ?? {};
    for (const [key, raw] of Object.entries(stored)) {
      const field = FIELD_BY_KEY.get(key);
      if (!field || typeof raw !== 'string' || !raw) continue;
      const value = field.secret ? tryOpenSecret(raw) : raw;
      if (value) values[key] = value;
    }
  } catch {
    // Database unavailable: callers fall back to environment variables.
  }
  cache = { values, at: Date.now() };
  return values;
}

function fromEnv(field: IntegrationField): string | undefined {
  for (const name of [field.key, ...(field.legacyEnv ?? [])]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export async function getIntegration(key: string): Promise<string | undefined> {
  const field = FIELD_BY_KEY.get(key);
  if (!field) return undefined;
  return (await loadStored())[key] ?? fromEnv(field);
}

export async function getIntegrations<K extends string>(
  keys: readonly K[]
): Promise<Record<K, string | undefined>> {
  const stored = await loadStored();
  const out = {} as Record<K, string | undefined>;
  for (const key of keys) {
    const field = FIELD_BY_KEY.get(key);
    out[key] = field ? (stored[key] ?? fromEnv(field)) : undefined;
  }
  return out;
}

export interface IntegrationStatus extends IntegrationField {
  /** Where the effective value comes from. */
  state: 'admin' | 'env' | 'unset';
  /** Present only for non-secret fields that are set in the admin panel. */
  value?: string;
}

/** Field catalog with the current state of each field. Never includes secret values. */
export async function describeIntegrations(): Promise<IntegrationStatus[]> {
  const stored = await loadStored();
  return INTEGRATION_FIELDS.map((field) => {
    const adminValue = stored[field.key];
    const state: IntegrationStatus['state'] = adminValue
      ? 'admin'
      : fromEnv(field)
        ? 'env'
        : 'unset';
    return {
      ...field,
      state,
      ...(adminValue && !field.secret ? { value: adminValue } : {}),
    };
  });
}

/** Returns an error message, or null if the value is acceptable. */
export function validateIntegrationValue(field: IntegrationField, value: string): string | null {
  if (value.length > MAX_VALUE_LENGTH) return `${field.label} is too long.`;
  switch (field.key) {
    case 'SMTP_PORT': {
      const port = Number(value);
      return Number.isInteger(port) && port > 0 && port < 65536
        ? null
        : 'SMTP port must be 1-65535.';
    }
    case 'CONTACT_TO_EMAIL':
    case 'CONTACT_FROM_EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : `${field.label} must be an email address.`;
    case 'GITHUB_PROFILE_REPO':
      return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)
        ? null
        : 'Use the form "owner/repository".';
    default:
      return null;
  }
}

/**
 * Applies changes: a string sets the field, null removes the admin-panel value
 * (the environment fallback applies again). Unknown keys are rejected.
 */
export async function saveIntegrations(patch: Record<string, string | null>): Promise<void> {
  const $set: Record<string, string> = {};
  const $unset: Record<string, ''> = {};

  for (const [key, raw] of Object.entries(patch)) {
    const field = FIELD_BY_KEY.get(key);
    if (!field) throw new Error(`Unknown setting: ${key}`);
    if (raw === null) {
      $unset[`value.${key}`] = '';
      continue;
    }
    const value = raw.trim();
    if (!value) continue; // blank input means "leave unchanged"
    const problem = validateIntegrationValue(field, value);
    if (problem) throw new Error(problem);
    $set[`value.${key}`] = field.secret ? sealSecret(value) : value;
  }

  if (!Object.keys($set).length && !Object.keys($unset).length) return;

  const col = await settingsCollection();
  await col.updateOne(
    { key: STORE_KEY },
    {
      ...(Object.keys($set).length ? { $set: { ...$set, updatedAt: new Date() } } : {}),
      ...(Object.keys($unset).length ? { $unset } : {}),
      ...(!Object.keys($set).length ? { $currentDate: { updatedAt: true } } : {}),
    },
    { upsert: true }
  );
  invalidateIntegrationsCache();
}
