'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Loader2,
  LogOut,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Keyboard,
} from 'lucide-react';
import Link from 'next/link';
import { Menu, MenuItem, MenuSeparator } from '@/components/notes/vault/menu';
import { Button } from '@/components/ui/button';
import { timeAgo, type NoteListItem } from '@/lib/notes-model';

interface NoteListProps {
  title: string;
  notes: NoteListItem[];
  loading: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  search: string;
  onSearch: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (item: NoteListItem) => void;
  onNew: () => void;
  timeLeft: string;
  lowTime: boolean;
  onLock: () => void;
  onShortcuts: () => void;
}

export default function NoteList(props: NoteListProps) {
  const {
    title,
    notes,
    loading,
    totalCount,
    page,
    totalPages,
    onPage,
    search,
    onSearch,
    searchRef,
    allTags,
    activeTags,
    onToggleTag,
    onClearTags,
    selectedId,
    onOpen,
    onEdit,
    onDelete,
    onNew,
    timeLeft,
    lowTime,
    onLock,
    onShortcuts,
  } = props;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1
          className="min-w-0 truncate text-sm font-semibold text-foreground"
          dir="auto"
          title={title}
        >
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs tabular-nums ${
              lowTime
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-muted text-muted-foreground'
            }`}
            title="Time until the vault locks again"
          >
            <Clock className={`h-3 w-3 ${lowTime ? 'animate-pulse' : ''}`} />
            {timeLeft}
          </span>
          <button
            type="button"
            onClick={onShortcuts}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onLock}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
            title="Lock the vault (L)"
            aria-label="Lock the vault"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <Button onClick={onNew} className="w-full">
          <Plus /> New note
        </Button>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search notes  ( / )"
            aria-label="Search notes"
            className="w-full rounded-lg border border-input bg-background py-2 ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        {allTags.length > 0 && (
          <div
            className="flex max-h-20 flex-wrap gap-1 overflow-y-auto"
            role="group"
            aria-label="Filter by tag"
          >
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                aria-pressed={activeTags.includes(tag)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  activeTags.includes(tag)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                #{tag}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button
                type="button"
                onClick={onClearTags}
                className="inline-flex items-center gap-0.5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              {search || activeTags.length ? 'No notes match' : 'No notes yet'}
            </p>
            <p className="text-xs text-muted-foreground">
              {search || activeTags.length
                ? 'Try a different word or clear the filters.'
                : 'Create your first note with the button above.'}
            </p>
          </div>
        ) : (
          <ul>
            {notes.map((note) => {
              const active = selectedId === note._id;
              return (
                <li
                  key={note._id}
                  className={`group relative border-b border-border/60 ${
                    active ? 'bg-primary/10' : 'hover:bg-accent/60'
                  }`}
                >
                  {active && <span className="absolute inset-y-0 start-0 w-0.5 bg-primary" />}
                  <button
                    type="button"
                    onClick={() => onOpen(note._id)}
                    aria-current={active ? 'true' : undefined}
                    className="block w-full px-4 py-3 pe-11 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}
                        dir="auto"
                      >
                        {note.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {timeAgo(note.updatedAt)}
                      </span>
                    </span>
                    {note.excerpt && (
                      <span
                        className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                        dir="auto"
                      >
                        {note.excerpt}
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {note.published && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success"
                          title="Published on the public notes page"
                        >
                          <Globe className="h-3 w-3" /> Public
                        </span>
                      )}
                      {note.attachmentCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Paperclip className="h-3 w-3" /> {note.attachmentCount}
                        </span>
                      )}
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[11px] text-primary">
                          #{tag}
                        </span>
                      ))}
                    </span>
                  </button>
                  <div className="absolute end-1.5 top-2 opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <Menu
                      label={`Actions for ${note.title}`}
                      align="end"
                      className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      trigger={<MoreHorizontal className="h-4 w-4" />}
                    >
                      <MenuItem icon={<Pencil />} onSelect={() => onEdit(note._id)}>
                        Edit
                      </MenuItem>
                      {note.published && note.slug && (
                        <MenuItem
                          icon={<Globe />}
                          onSelect={() => window.open(`/notes/${note.slug}`, '_blank', 'noopener')}
                        >
                          View public page
                        </MenuItem>
                      )}
                      <MenuSeparator />
                      <MenuItem icon={<Trash2 />} danger onSelect={() => onDelete(note)}>
                        Delete…
                      </MenuItem>
                    </Menu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {totalPages > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded p-1 hover:bg-accent disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">
              Page {page} of {totalPages} · {totalCount} notes
            </span>
            <button
              type="button"
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded p-1 hover:bg-accent disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span>
              {totalCount} {totalCount === 1 ? 'note' : 'notes'}
            </span>
            <Link href="/notes" className="hover:text-primary">
              Public notes
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
