'use client';

import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import MediaViewer from '@/components/site/media-viewer';
import { mediaSummary } from '@/lib/media-display';
import type { MediaItem } from '@/lib/media-types';

interface DetailDialogProps {
  open: boolean;
  /** Which picture or video the viewer starts on (and follows as the visitor steps through). */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
  media: MediaItem[];
  children: React.ReactNode;
}

/**
 * The window that opens when a project, service, certificate or education entry is clicked:
 * all of its pictures and videos in a viewer, and everything written about it next to (or, on a
 * phone, under) them. Escape, the close button or a click outside closes it; focus stays inside.
 */
export default function DetailDialog({
  open,
  index,
  onIndexChange,
  onClose,
  title,
  media,
  children,
}: DetailDialogProps) {
  const hasMedia = media.length > 0;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        // Focus the window itself (not the close button, which would show a focus ring at once);
        // Tab still reaches every control inside.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
        overlayClassName="bg-scrim/80"
        className="z-[999] flex h-[calc(100dvh-1rem)] max-h-[900px] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {hasMedia ? `${title}: ${mediaSummary(media)}.` : title}
        </DialogDescription>

        <DialogClose
          aria-label="Close"
          className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </DialogClose>

        <div
          className={`min-h-0 flex-1 overflow-y-auto ${
            hasMedia ? 'lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:overflow-hidden' : ''
          }`}
        >
          {hasMedia && (
            <MediaViewer
              items={media}
              index={index}
              onIndexChange={onIndexChange}
              title={title}
              className="h-[52dvh] lg:h-full"
            />
          )}
          <div className="p-6 pt-8 sm:p-8 lg:min-h-0 lg:overflow-y-auto">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
