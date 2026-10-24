'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Lock, Search, StickyNote, X } from 'lucide-react';
import type { PublicNoteCard } from '@/lib/notes-model';

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  notes: PublicNoteCard[];
  title: string;
  intro: string;
  vaultLabel: string;
}

/**
 * The public notes page: only published notes, with a search box and tag filter, and a quiet
 * entry to the private vault for the owner. The cards are in the server HTML; filtering is a
 * client-side convenience on top.
 */
export default function PublicNotesIndex({ notes, title, intro, vaultLabel }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  // Old bookmarks of a private note (/notes?id=...) continue to the vault, which asks to unlock.
  useEffect(() => {
    const search = window.location.search;
    if (new URLSearchParams(search).has('id')) router.replace(`/notes/vault${search}`);
  }, [router]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) for (const t of note.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [notes]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (!tag || n.tags.includes(tag)) &&
        (!q || `${n.title} ${n.excerpt} ${n.tags.join(' ')}`.toLowerCase().includes(q))
    );
  }, [notes, query, tag]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl" dir="auto">
            {title}
          </h1>
          {intro && (
            <p className="mt-2 max-w-2xl text-base text-muted-foreground" dir="auto">
              {intro}
            </p>
          )}
        </div>
        <Link
          href="/notes/vault"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Lock className="h-4 w-4" /> {vaultLabel}
        </Link>
      </header>

      {notes.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
              className="w-full rounded-lg border border-input bg-background py-2 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
              {tags.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTag(tag === name ? null : name)}
                  aria-pressed={tag === name}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    tag === name
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  #{name} <span className="opacity-60">{count}</span>
                </button>
              ))}
              {tag && (
                <button
                  type="button"
                  onClick={() => setTag(null)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <StickyNote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-medium text-foreground">Nothing has been published yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Notes the owner chooses to share appear here. Private notes stay private.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          No notes match that search.
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {shown.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/notes/${note.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40"
              >
                <h2
                  className="text-lg font-semibold leading-snug text-foreground group-hover:text-primary"
                  dir="auto"
                >
                  {note.title}
                </h2>
                {note.excerpt && (
                  <p
                    className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
                    dir="auto"
                  >
                    {note.excerpt}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-muted-foreground">
                  <time dateTime={note.publishedAt ?? note.createdAt}>
                    {formatDate(note.publishedAt ?? note.createdAt)}
                  </time>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {note.readingMinutes} min read
                  </span>
                  {note.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
