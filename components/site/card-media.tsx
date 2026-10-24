'use client';

import { useEffect, useRef } from 'react';
import { Images } from 'lucide-react';
import { useDetail } from '@/components/site/detail-card';
import MediaPreview from '@/components/site/media-preview';
import { videoMp4Url, videoPosterUrl } from '@/lib/cloudinary-url';
import { mediaSummary } from '@/lib/media-display';
import { playbackOptions, type MediaItem } from '@/lib/media-types';

/** A muted looping clip that plays only while it is on screen (and never for reduced motion). */
function AutoplayClip({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      poster={videoPosterUrl(item.src)}
      className="absolute inset-0 h-full w-full object-contain"
    >
      <source src={videoMp4Url(item.src)} type="video/mp4" />
    </video>
  );
}

const MAX_THUMBS = 4;

interface CardMediaProps {
  items: MediaItem[];
  title: string;
  /** Shape of the cover, as an `aspect-*` class. */
  aspect?: string;
  sizes?: string;
  /** Row of small pictures under the cover (projects); off for compact cards. */
  thumbs?: boolean;
}

/**
 * The picture part of a card: the cover shown whole (never cropped), a count badge when there
 * are several, and a row of the other pictures. Everything here opens the card's detail window,
 * on the picture that was pointed at.
 */
export default function CardMedia({
  items,
  title,
  aspect = 'aspect-[16/10]',
  sizes = '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw',
  thumbs = true,
}: CardMediaProps) {
  const detail = useDetail();
  if (!items.length) return null;
  const cover = items[0];
  const rest = items.slice(1, 1 + MAX_THUMBS);
  const hidden = items.length - 1 - rest.length;
  const autoplays = cover.kind === 'video' && playbackOptions(cover).autoplay;

  return (
    <div>
      <div className={`relative w-full ${aspect}`}>
        {autoplays ? (
          <div className="absolute inset-0 overflow-hidden bg-muted/30">
            <AutoplayClip item={cover} />
          </div>
        ) : (
          <MediaPreview
            item={cover}
            alt={cover.alt || title}
            sizes={sizes}
            className="absolute inset-0"
          />
        )}
        {items.length > 1 && (
          <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-scrim/65 px-2.5 py-1 text-xs font-medium text-on-scrim">
            <Images className="h-3.5 w-3.5" />
            {mediaSummary(items)}
          </span>
        )}
      </div>

      {thumbs && rest.length > 0 && (
        <div className="relative z-10 grid grid-cols-4 gap-1.5 p-1.5">
          {rest.map((item, i) => {
            const index = i + 1;
            const last = i === rest.length - 1 && hidden > 0;
            return (
              <button
                key={item.public_id}
                type="button"
                onClick={() => detail?.open(index)}
                aria-label={`View ${item.kind === 'video' ? 'video' : 'picture'} ${index + 1} of ${items.length}: ${title}`}
                className="relative aspect-square overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MediaPreview
                  item={item}
                  alt={item.alt || `${title}, picture ${index + 1}`}
                  sizes="120px"
                  small
                  className="absolute inset-0 transition-opacity hover:opacity-85"
                />
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-scrim/60 text-sm font-semibold text-on-scrim">
                    +{hidden + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
