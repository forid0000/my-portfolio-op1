'use client';

import { Globe, Copy, Check, X, Loader2, ExternalLink } from 'lucide-react';
import type { Note } from './types';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

interface PublishPopoverProps {
  note: Note;
  show: boolean;
  onOpen: () => void;
  onClose: () => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  slugStatus: SlugStatus;
  publishLoading: boolean;
  copied: boolean;
  onCopy: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

// Below `sm`, the panel is `fixed` and centered on the viewport instead of
// anchored to the trigger button - an `absolute` dropdown anchored to a
// button that isn't flush against the screen edge (there are more buttons
// after it) runs out of room on narrow phones, and `fixed` also escapes any
// ancestor `overflow-hidden` that would otherwise clip it. From `sm` up there
// is room, so it reverts to a normal anchored dropdown below the button.
export function PublishPopover({
  note,
  show,
  onOpen,
  onClose,
  slug,
  onSlugChange,
  slugStatus,
  publishLoading,
  copied,
  onCopy,
  onPublish,
  onUnpublish,
}: PublishPopoverProps) {
  return (
    <div>
      <button
        onClick={onOpen}
        title={note.published ? 'Published · manage' : 'Publish this note'}
        className={`p-1.5 border rounded-lg transition-all ${note.published
            ? 'border-primary/40 text-primary bg-primary/8 hover:bg-primary/15'
            : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-border'
          }`}
      >
        <Globe className="w-3.5 h-3.5" />
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 max-h-[75vh] overflow-y-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:translate-y-0 sm:mt-1.5 sm:w-80 sm:max-h-none sm:overflow-visible z-20 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
            {note.published ? (
              /* ── Already published ── */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                  <span className="text-sm font-semibold text-primary">Published</span>
                </div>

                {/* Full URL display */}
                <div className="bg-muted/30 border border-border rounded-lg px-3 py-2.5 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground/40 font-mono uppercase tracking-wider">
                    Public URL
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-foreground/70 font-mono flex-1 break-all leading-relaxed">
                      {window.location.host}/notes/{note.slug}
                    </code>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex gap-2">
                  <button
                    onClick={onCopy}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${copied
                        ? 'border-primary/40 text-primary bg-primary/8'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                      }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                  <a
                    href={`/notes/${note.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                </div>

                <div className="h-px bg-border/50" />

                <button
                  onClick={onUnpublish}
                  disabled={publishLoading}
                  className="w-full px-3 py-1.5 text-xs border border-destructive/25 text-destructive/60 rounded-lg hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {publishLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Unpublishing…
                    </>
                  ) : (
                    'Unpublish'
                  )}
                </button>
              </div>
            ) : (
              /* ── Not published ── */
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Publish note</span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  Anyone with the link can view this note.
                </p>

                <div>
                  <label className="block text-[11px] text-muted-foreground/50 font-mono uppercase tracking-wider mb-1">
                    Slug
                  </label>
                  <div className="relative">
                    <input
                      value={slug}
                      onChange={(e) =>
                        onSlugChange(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/-+/g, '-')
                        )
                      }
                      className="w-full bg-input border border-border focus:border-primary/40 rounded-lg px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none transition-colors pr-7"
                      placeholder="note-slug"
                      autoFocus
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/40" />
                      )}
                      {slugStatus === 'available' && <Check className="w-3 h-3 text-primary" />}
                      {slugStatus === 'taken' && <X className="w-3 h-3 text-destructive" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/35 font-mono mt-1">
                    /notes/<span className="text-muted-foreground/55">{slug || '…'}</span>
                  </p>
                  {slugStatus === 'taken' && (
                    <p className="text-[11px] text-destructive mt-1">
                      Slug already taken - try a different one.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onPublish}
                    disabled={slugStatus !== 'available' || publishLoading}
                    className="flex-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-35 transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                  >
                    {publishLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Globe className="w-3 h-3" />
                    )}
                    Publish
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
