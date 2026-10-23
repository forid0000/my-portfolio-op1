import { v2 as cloudinary } from 'cloudinary';
import { getIntegrations } from '@/lib/integrations';

const CLOUDINARY_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

/** Shown wherever an upload or sync needs Cloudinary but no keys are saved yet. */
export const CLOUDINARY_NOT_CONNECTED_MESSAGE =
  'Cloudinary is not connected. Add your keys in Security & Keys.';

/**
 * Points the Cloudinary SDK at the account configured in Admin -> Security ->
 * Integrations (environment variables are only a fallback). The SDK keeps its
 * configuration globally, so call this at the start of any code path that talks
 * to Cloudinary. There are no hardcoded defaults on purpose: a missing value
 * must fail visibly instead of silently using somebody else's account.
 */
export async function configureCloudinary() {
  const v = await getIntegrations(CLOUDINARY_KEYS);
  cloudinary.config({
    cloud_name: v.CLOUDINARY_CLOUD_NAME,
    api_key: v.CLOUDINARY_API_KEY,
    api_secret: v.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/**
 * True when the cloud name, API key and API secret all resolve (admin panel
 * first, environment fallback). Lets a route answer "connect Cloudinary first"
 * up front instead of surfacing the SDK's raw "Must supply api_key".
 */
export async function isCloudinaryConfigured(): Promise<boolean> {
  const v = await getIntegrations(CLOUDINARY_KEYS);
  return Boolean(v.CLOUDINARY_CLOUD_NAME && v.CLOUDINARY_API_KEY && v.CLOUDINARY_API_SECRET);
}

/** HTTP status Cloudinary reported for a failed call, when the error carries one. */
export function cloudinaryHttpCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { http_code?: unknown; error?: { http_code?: unknown } };
  const code = e.http_code ?? e.error?.http_code;
  return typeof code === 'number' ? code : undefined;
}

/**
 * Turns whatever the Cloudinary SDK threw into text an owner can act on. The SDK
 * rejects with plain objects (`{ message, http_code }`) as often as with Error
 * instances, so `error.message` alone is not enough. Auth failures get a fixed
 * sentence on purpose: Cloudinary's own text for them can echo the API key,
 * which is a stored secret and must not reach the browser.
 */
export function cloudinaryErrorMessage(
  error: unknown,
  fallback = 'Cloudinary did not accept the request.'
): string {
  const code = cloudinaryHttpCode(error);
  if (code === 420 || code === 429) {
    return 'Cloudinary is limiting requests right now. Wait a few minutes and try again.';
  }
  if (code === 401 || code === 403) {
    return 'Cloudinary rejected the keys. Check the cloud name, API key and API secret in Security & Keys.';
  }
  if (code === 499) {
    return 'Cloudinary took too long to respond. Try again in a moment.';
  }

  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (error && typeof error === 'object') {
    const e = error as { message?: unknown; error?: { message?: unknown } };
    if (typeof e.message === 'string') raw = e.message;
    else if (typeof e.error?.message === 'string') raw = e.error.message;
  }

  // The SDK throws these synchronously when a key is empty.
  if (/^Must supply (api_key|api_secret|cloud_name)/i.test(raw)) {
    return CLOUDINARY_NOT_CONNECTED_MESSAGE;
  }

  const clean = raw.replace(/\s+/g, ' ').trim();
  return clean ? `Cloudinary says: ${clean.slice(0, 300)}` : fallback;
}

export default cloudinary;
