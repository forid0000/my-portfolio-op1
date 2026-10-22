import { v2 as cloudinary } from 'cloudinary';
import { getIntegrations } from '@/lib/integrations';

/**
 * Points the Cloudinary SDK at the account configured in Admin -> Security ->
 * Integrations (environment variables are only a fallback). The SDK keeps its
 * configuration globally, so call this at the start of any code path that talks
 * to Cloudinary. There are no hardcoded defaults on purpose: a missing value
 * must fail visibly instead of silently using somebody else's account.
 */
export async function configureCloudinary() {
  const v = await getIntegrations([
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ] as const);
  cloudinary.config({
    cloud_name: v.CLOUDINARY_CLOUD_NAME,
    api_key: v.CLOUDINARY_API_KEY,
    api_secret: v.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export default cloudinary;
