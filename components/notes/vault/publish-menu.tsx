'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Menu } from '@/components/notes/vault/menu';
import { Button } from '@/components/ui/button';
import { cleanSlug, suggestSlug, type Note } from '@/lib/notes-model';

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'reserved';

function PublishForm({ note, onChanged }: { note: Note; onChanged: (note: Note) => void }) {
  const [slug, setSlug] = useState(() => note.slug || suggestSlug(note.title));
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Is the address free? Asked shortly after typing stops.
  useEffect(() => {
    if (note.published) return;
    const clean = cleanSlug(slug);
    if (!clean) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSlugState('checking');
      try {
        const res = await fetch(
          `/api/notes/publish?slug=${encodeURIComponent(clean)}&excludeId=${note._id}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSlugState(data.reserved ? 'reserved' : data.available ? 'available' : 'taken');
      } catch {
        if (!controller.signal.aborted) setSlugState('idle');
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, note._id, note.published]);

  const change = async (published: boolean) => {
    setBusy(true);
    try {
      const res = await fetch('/api/notes/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          published ? { id: note._id, published, slug } : { id: note._id, published }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setSlugState('taken');
        return;
      }
      if (!res.ok || !data.note) {
        toast.error(data.details?.[0]?.message || data.error || 'Could not change the note');
        return;
      }
      onChanged(data.note);
      toast.success(published ? 'The note is public now' : 'The note is private again');
    } finally {
      setBusy(false);
    }
  };

  if (note.published) {
    const url = `${window.location.origin}/notes/${note.slug}`;
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success" /> Public
        </div>
        <p className="break-all rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground">
          {url}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/notes/${note.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Open
            </a>
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => change(false)}
          disabled={busy}
        >
          {busy && <Loader2 className="animate-spin" />} Make private again
        </Button>
      </div>
    );
  }

  const clean = cleanSlug(slug);
  const message: Partial<Record<SlugState, string>> = {
    taken: 'Another note already uses this address.',
    reserved: 'The site itself uses this address. Pick another.',
  };
  return (
    <div className="space-y-3 p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-muted-foreground" /> Share on the public page
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anyone with the link can read this note, including the pictures and files kept with it.
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Address</span>
        <span className="relative block">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            autoFocus
            placeholder="my-note"
            aria-invalid={slugState === 'taken' || slugState === 'reserved'}
            className="w-full rounded-lg border border-input bg-background py-2 ps-3 pe-8 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <span className="absolute end-2.5 top-1/2 -translate-y-1/2">
            {slugState === 'checking' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            {slugState === 'available' && <Check className="h-3.5 w-3.5 text-success" />}
            {(slugState === 'taken' || slugState === 'reserved') && (
              <X className="h-3.5 w-3.5 text-destructive" />
            )}
          </span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">/notes/{clean || '…'}</span>
        {message[slugState] && (
          <span className="mt-1 block text-xs text-destructive">{message[slugState]}</span>
        )}
      </label>
      <Button
        size="sm"
        className="w-full"
        onClick={() => change(true)}
        disabled={busy || !clean || slugState !== 'available'}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Globe />} Publish
      </Button>
    </div>
  );
}

/** The globe button of an open note: publish it at an address, or take it back to private. */
export default function PublishMenu({
  note,
  onChanged,
}: {
  note: Note;
  onChanged: (note: Note) => void;
}) {
  return (
    <Menu
      label={note.published ? 'Public · manage' : 'Publish this note'}
      align="end"
      panelClassName="w-80 max-w-[calc(100vw-2rem)]"
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors ${
        note.published
          ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      trigger={
        <>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{note.published ? 'Public' : 'Publish'}</span>
        </>
      }
    >
      <PublishForm key={note._id + String(note.published)} note={note} onChanged={onChanged} />
    </Menu>
  );
}
