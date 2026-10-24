import Image from 'next/image';
import { Play } from 'lucide-react';
import { videoPosterUrl } from '@/lib/cloudinary-url';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/lib/media-types';

/** The picture to draw for an item: the picture itself, or the first frame of a video. */
export function pictureSrc(item: Pick<MediaItem, 'kind' | 'src'>, width = 1280): string {
  return item.kind === 'video' ? videoPosterUrl(item.src, width) : item.src;
}

interface MediaPreviewProps {
  item: MediaItem;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Smaller play mark, for thumbnails. */
  small?: boolean;
  /** Size comes from the parent (an `aspect-*` class or a fixed height). */
  className?: string;
}

/**
 * A picture shown whole inside whatever frame the layout gives it: nothing is cut off, whether
 * the picture is tall, wide or square. The space beside it is filled with a soft, blurred copy of
 * the same picture, so the frame still looks full and every card in a row keeps the same shape.
 * Videos show their first frame with a play mark.
 */
export default function MediaPreview({
  item,
  alt,
  sizes,
  priority,
  small,
  className = '',
}: MediaPreviewProps) {
  const src = pictureSrc(item);
  const video = item.kind === 'video';
  return (
    <div className={cn('relative isolate overflow-hidden bg-muted/30', className)}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes="48px"
        className="scale-125 object-cover opacity-60 blur-2xl"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />
      {video && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={`flex items-center justify-center rounded-full bg-scrim/60 text-on-scrim ${
              small ? 'h-7 w-7' : 'h-14 w-14'
            }`}
          >
            <Play className={small ? 'h-3 w-3' : 'h-6 w-6'} />
          </span>
        </span>
      )}
    </div>
  );
}
