'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { videoMp4Url, videoPosterUrl } from '@/lib/cloudinary-url';
import { mediaSummary } from '@/lib/media-display';
import { playbackOptions, type MediaItem } from '@/lib/media-types';
import MediaPreview from '@/components/site/media-preview';

const SWIPE_DISTANCE = 50;

interface MediaViewerProps {
  items: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Used for alt text and the names of the buttons. */
  title: string;
  className?: string;
}

/**
 * One picture or video at a time, as large as the space allows and always shown whole, with
 * arrows, swipe, the keyboard (left / right) and a strip of thumbnails underneath. Videos play
 * with the owner's playback options; nothing plays by itself unless it was turned on.
 */
export default function MediaViewer({
  items,
  index,
  onIndexChange,
  title,
  className = '',
}: MediaViewerProps) {
  const touchStart = useRef<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const count = items.length;
  const safe = Math.min(Math.max(index, 0), count - 1);
  const current = items[safe];

  const step = (delta: number) => {
    if (count < 2) return;
    onIndexChange((safe + delta + count) % count);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('video, audio, input, textarea, select')) return;
      if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Warm the neighbouring pictures so stepping through them is instant.
  useEffect(() => {
    [safe - 1, safe + 1].forEach((i) => {
      const neighbour = items[(i + count) % count];
      if (neighbour && neighbour.kind !== 'video') new window.Image().src = neighbour.src;
    });
  }, [safe, items, count]);

  // Keep the chosen thumbnail in view inside the strip (without scrolling the page).
  useEffect(() => {
    const button = strip.current?.children[safe] as HTMLElement | undefined;
    const box = strip.current;
    if (!button || !box) return;
    const left = button.offsetLeft - (box.clientWidth - button.clientWidth) / 2;
    box.scrollTo({ left, behavior: 'smooth' });
  }, [safe]);

  if (!current) return null;
  const isVideo = current.kind === 'video';
  const options = playbackOptions(current);

  return (
    <div className={`flex min-h-0 flex-col bg-scrim text-on-scrim ${className}`}>
      <div
        className="relative min-h-0 flex-1"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) > SWIPE_DISTANCE) step(delta > 0 ? -1 : 1);
        }}
      >
        {isVideo ? (
          <video
            key={current.public_id}
            className="absolute inset-0 h-full w-full object-contain"
            controls={options.controls}
            autoPlay={options.autoplay}
            muted={options.muted}
            loop={options.loop}
            playsInline
            preload="metadata"
            poster={videoPosterUrl(current.src)}
          >
            <source src={videoMp4Url(current.src)} type="video/mp4" />
          </video>
        ) : (
          // The soft backdrop (a tiny copy of the same picture) shows at once while the large
          // one loads, so stepping through never flashes an empty black box.
          <MediaPreview
            key={current.public_id}
            item={current}
            alt={current.alt || `${title}, picture ${safe + 1} of ${count}`}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
            className="absolute inset-0 bg-transparent"
          />
        )}

        {count > 1 && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-on-scrim/15 px-3 py-1 text-xs tabular-nums text-on-scrim">
              {safe + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-on-scrim/15 text-on-scrim transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-on-scrim/15 text-on-scrim transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="shrink-0 border-t border-on-scrim/10 px-3 py-2">
          <div
            ref={strip}
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label={`${title}: ${mediaSummary(items)}`}
          >
            {items.map((item, i) => (
              <button
                key={item.public_id}
                type="button"
                role="tab"
                aria-selected={i === safe}
                aria-label={`${item.kind === 'video' ? 'Video' : 'Picture'} ${i + 1} of ${count}`}
                onClick={() => onIndexChange(i)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-primary sm:h-16 sm:w-16 ${
                  i === safe ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <MediaPreview item={item} alt="" sizes="64px" small className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
