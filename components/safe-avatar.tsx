'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { AVATAR_PLACEHOLDER_URL } from '@/lib/content-defaults';

/**
 * The owner's picture, with a built-in safety net: if the address cannot be loaded (a deleted
 * Cloudinary file, a mistyped GitHub name) the neutral placeholder is shown instead of a broken
 * image icon.
 */
export default function SafeAvatar({
  src,
  alt,
  ...rest
}: Omit<ImageProps, 'src' | 'alt'> & { src: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <Image
      {...rest}
      alt={alt}
      src={failedSrc === src ? AVATAR_PLACEHOLDER_URL : src}
      onError={() => setFailedSrc(src)}
    />
  );
}
