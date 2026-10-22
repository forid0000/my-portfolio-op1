import { S3Client } from '@aws-sdk/client-s3';
import { getIntegrations } from '@/lib/integrations';

/**
 * Public base URL of the R2 bucket. Environment-only on purpose: the
 * Content-Security-Policy (next.config.mjs) needs it at build time to allow the
 * images. Everything secret is managed in Admin -> Security -> Integrations.
 */
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

let cached: { signature: string; client: S3Client } | null = null;

export interface R2Context {
  client: S3Client;
  bucket: string;
  publicUrl: string;
}

/** The R2 client configured in the admin panel (env fallback), or null if incomplete. */
export async function getR2(): Promise<R2Context | null> {
  const v = await getIntegrations([
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ] as const);
  if (!v.R2_ACCOUNT_ID || !v.R2_ACCESS_KEY_ID || !v.R2_SECRET_ACCESS_KEY || !v.R2_BUCKET_NAME) {
    return null;
  }

  const signature = `${v.R2_ACCOUNT_ID}|${v.R2_ACCESS_KEY_ID}|${v.R2_SECRET_ACCESS_KEY}`;
  if (!cached || cached.signature !== signature) {
    cached = {
      signature,
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${v.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: v.R2_ACCESS_KEY_ID,
          secretAccessKey: v.R2_SECRET_ACCESS_KEY,
        },
      }),
    };
  }
  return { client: cached.client, bucket: v.R2_BUCKET_NAME, publicUrl: R2_PUBLIC_URL };
}
