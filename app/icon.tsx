import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';

// Image metadata
export const size = {
  width: 64,
  height: 64,
};
export const contentType = 'image/png';

/**
 * ImageResponse needs an absolute URL or inline bytes. The active avatar is a
 * Cloudinary URL, but the fallback is a local file under /public, so that one is
 * inlined as a data URL straight from disk.
 */
async function resolveIconSource(avatarUrl: string): Promise<string> {
  if (!avatarUrl.startsWith('/')) return avatarUrl;
  const file = path.join(process.cwd(), 'public', avatarUrl.replace(/^\//, ''));
  const bytes = await readFile(file);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

// Image generation
export default async function Icon() {
  const avatarDataUrl = await resolveIconSource(await getActiveAvatarUrl());

  return new ImageResponse(
    <img
      src={avatarDataUrl}
      width="64"
      height="64"
      alt="Favicon"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        objectFit: 'cover',
        margin: 0,
        padding: 0,
      }}
    />,
    {
      ...size,
    }
  );
}
