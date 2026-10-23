'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { videoMp4Url, videoPosterUrl } from '@/lib/cloudinary-url';
import { playbackOptions, type MediaItem } from '@/lib/media-types';

// The lightbox (dialog, swipe, video player) is only fetched the first time someone clicks
// a picture, so visitors who never open one pay nothing for it.
const MediaLightbox = dynamic(() => import('@/components/media-lightbox'), { ssr: false });

interface MediaGalleryProps {
  items: MediaItem[];
  /** Used for alt text and the accessible names of the buttons. */
  title: string;
  /** Sizes hint for the cover, matching the grid the card sits in. */
  sizes?: string;
  className?: string;
}

const MAX_THUMBS = 4;

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
      loop={playbackOptions(item).loop || true}
      playsInline
      preload="metadata"
      poster={videoPosterUrl(item.src)}
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src={videoMp4Url(item.src)} type="video/mp4" />
    </video>
  );
}

function PlayBadge({ small }: { small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        className={`flex items-center justify-center rounded-full bg-black/60 text-white ${small ? 'h-7 w-7' : 'h-14 w-14'}`}
      >
        <Play className={small ? 'h-3 w-3' : 'h-6 w-6'} />
      </span>
    </span>
  );
}

/**
 * The cover picture (or video) of a card plus a strip of the other media. Clicking any of
 * them opens it larger in a lightbox. The pictures are in the server HTML; only the
 * lightbox is loaded on demand.
 */
export default function MediaGallery({
  items,
  title,
  sizes = '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw',
  className = '',
}: MediaGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [everOpened, setEverOpened] = useState(false);
  if (!items.length) return null;

  const cover = items[0];
  const rest = items.slice(1, 1 + MAX_THUMBS);
  const hidden = items.length - 1 - rest.length;
  const open = (index: number) => {
    setEverOpened(true);
    setOpenIndex(index);
  };

  const coverIsVideo = cover.kind === 'video';
  const coverAutoplays = coverIsVideo && playbackOptions(cover).autoplay;

  return (
    <div className={className}>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/20">
        <button
          type="button"
          onClick={() => open(0)}
          aria-label={`View ${title} larger${coverIsVideo ? ' (video)' : ''}`}
          className="group/cover absolute inset-0 block cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {coverAutoplays ? (
            <AutoplayClip item={cover} />
          ) : (
            <Image
              src={coverIsVideo ? videoPosterUrl(cover.src) : cover.src}
              alt={cover.alt || title}
              fill
              sizes={sizes}
              className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.03]"
            />
          )}
          {coverIsVideo && !coverAutoplays && <PlayBadge />}
        </button>
      </div>

      {rest.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 p-1.5">
          {rest.map((item, i) => {
            const index = i + 1;
            const isVideo = item.kind === 'video';
            const last = i === rest.length - 1 && hidden > 0;
            return (
              <button
                key={item.public_id}
                type="button"
                onClick={() => open(index)}
                aria-label={`View picture ${index + 1} of ${items.length} of ${title} larger`}
                className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Image
                  src={isVideo ? videoPosterUrl(item.src, 320) : item.src}
                  alt={item.alt || `${title}, picture ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover transition-opacity hover:opacity-80"
                />
                {isVideo && <PlayBadge small />}
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                    +{hidden + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {everOpened && (
        <MediaLightbox items={items} index={openIndex} onIndexChange={setOpenIndex} title={title} />
      )}
    </div>
  );
}
