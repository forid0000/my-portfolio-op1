'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ZoomableImageProps {
  /** Address of the sized-down version shown in the text. */
  src: string;
  /** Address of the larger version shown when enlarged. */
  full: string;
  alt: string;
  width?: number;
  height?: number;
}

/** A picture inside an article: click (or press Enter) to enlarge it, Esc or a click to close. */
export default function ZoomableImage({ src, full, alt, width, height }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="article-zoom block w-full cursor-zoom-in"
        aria-label={alt ? `Enlarge picture: ${alt}` : 'Enlarge picture'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Picture'}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-scrim/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full border border-on-scrim/20 bg-on-scrim/10 p-3 text-on-scrim transition-colors hover:bg-on-scrim/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={full}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] cursor-zoom-out rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
