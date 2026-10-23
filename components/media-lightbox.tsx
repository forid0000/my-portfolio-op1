'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { videoMp4Url, videoPosterUrl } from '@/lib/cloudinary-url';
import { playbackOptions, type MediaItem } from '@/lib/media-types';

interface MediaLightboxProps {
  items: MediaItem[];
  /** The shown item, or null while closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title: string;
}

const SWIPE_DISTANCE = 50;

/**
 * Full-screen viewer for a list of pictures and videos: arrow keys, swipe, prev/next
 * buttons, Esc or a click outside to close, focus kept inside while open (Radix dialog).
 * Videos use the owner's playback options; nothing autoplays unless it was turned on.
 */
export default function MediaLightbox({ items, index, onIndexChange, title }: MediaLightboxProps) {
  const open = index !== null;
  const current = index !== null ? items[index] : null;
  const touchStartX = useRef<number | null>(null);

  const step = (delta: number) => {
    if (index === null || items.length < 2) return;
    onIndexChange((index + delta + items.length) % items.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, items.length]);

  // Warm the neighbouring pictures so stepping through them is instant.
  useEffect(() => {
    if (index === null) return;
    [index - 1, index + 1].forEach((i) => {
      const neighbour = items[(i + items.length) % items.length];
      if (neighbour && neighbour.kind !== 'video') new window.Image().src = neighbour.src;
    });
  }, [index, items]);

  const isVideo = current?.kind === 'video';
  const options = current ? playbackOptions(current) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        overlayClassName="bg-black/90"
        className="z-[999] flex h-screen max-h-screen w-full max-w-full flex-col items-center justify-center gap-0 overflow-hidden rounded-none border-none bg-black/95 p-0 outline-none sm:max-w-full"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div
          className="relative flex h-full w-full items-center justify-center p-3 md:p-10"
          onClick={() => onIndexChange(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > SWIPE_DISTANCE) step(delta > 0 ? -1 : 1);
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
            <span className="pointer-events-auto rounded-full bg-white/10 px-3 py-1.5 text-xs tabular-nums text-white/80">
              {index !== null ? `${index + 1} / ${items.length}` : ''}
            </span>
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              aria-label="Close"
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous"
                className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:left-6 md:h-14 md:w-14"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next"
                className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:right-6 md:h-14 md:w-14"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {current && (
            <div className="relative h-full w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
              {isVideo && options ? (
                <video
                  key={current.public_id}
                  className="absolute inset-0 m-auto max-h-full max-w-full"
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
                <Image
                  key={current.public_id}
                  src={current.src}
                  alt={current.alt || `${title}, picture ${(index ?? 0) + 1}`}
                  fill
                  sizes="100vw"
                  priority
                  className="object-contain"
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
