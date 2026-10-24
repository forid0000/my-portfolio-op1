'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MediaItem } from '@/lib/media-types';

// The window (viewer, dialog) is only fetched when it is needed. It is requested as soon as the
// visitor points at, touches or tabs to a card, so by the click it is normally already there.
const loadDialog = () => import('@/components/site/detail-dialog');
const DetailDialog = dynamic(loadDialog, { ssr: false });

interface DetailApi {
  /** Opens the window, on the given picture. */
  open: (index?: number) => void;
}
const DetailContext = createContext<DetailApi | null>(null);

/** For parts of a card (a thumbnail) that should open the window on a particular picture. */
export function useDetail(): DetailApi | null {
  return useContext(DetailContext);
}

interface DetailCardProps {
  /** Name of the project, service, ...: the window's title and the card's button name. */
  title: string;
  /** What the card button says to a screen reader, e.g. "View project details: Name". */
  label?: string;
  media: MediaItem[];
  /** Everything written about the item, shown beside the viewer (nothing for a card that is not interactive). */
  detail: React.ReactNode;
  /** The card itself (a summary). Links and buttons inside must sit above the card button: `relative z-10`. */
  children: React.ReactNode;
  className?: string;
  /** False when there is nothing more to show than the card already does: no button, no window. */
  interactive?: boolean;
}

/**
 * Makes a whole card clickable. A button covers the card (so any click or Enter opens the
 * detail window); links and thumbnails inside the card stay usable because they sit above it.
 */
export default function DetailCard({
  title,
  label,
  media,
  detail,
  children,
  className = '',
  interactive = true,
}: DetailCardProps) {
  const [index, setIndex] = useState<number | null>(null);
  const [wasOpened, setWasOpened] = useState(false);

  const open = useCallback((at = 0) => {
    setWasOpened(true);
    setIndex(at);
  }, []);
  const prepare = () => void loadDialog();

  if (!interactive) return <div className={className}>{children}</div>;

  return (
    <DetailContext.Provider value={{ open }}>
      <div
        className={`group/detail relative ${className}`}
        onPointerEnter={prepare}
        onTouchStart={prepare}
        onFocusCapture={prepare}
      >
        {children}
        <button
          type="button"
          onClick={() => open(0)}
          aria-label={label ?? `View details: ${title}`}
          aria-haspopup="dialog"
          className="absolute inset-0 z-[5] cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {wasOpened && (
        <DetailDialog
          open={index !== null}
          index={index ?? 0}
          onIndexChange={setIndex}
          onClose={() => setIndex(null)}
          title={title}
          media={media}
        >
          {detail}
        </DetailDialog>
      )}
    </DetailContext.Provider>
  );
}
