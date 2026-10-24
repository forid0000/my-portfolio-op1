'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDelete from '@/components/notes/vault/confirm-delete';
import LockScreen from '@/components/notes/vault/lock-screen';
import NoteEditor from '@/components/notes/vault/note-editor';
import NoteList from '@/components/notes/vault/note-list';
import NoteViewer from '@/components/notes/vault/note-viewer';
import ShortcutsDialog from '@/components/notes/vault/shortcuts-dialog';
import { Button } from '@/components/ui/button';
import { useNoteDraft } from '@/hooks/use-note-draft';
import { useVaultSession } from '@/hooks/use-vault-session';
import type { Note, NoteListItem } from '@/lib/notes-model';

type Mode = 'view' | 'edit';

interface Doomed {
  _id: string;
  title: string;
  attachmentCount: number;
  published: boolean;
}

/** Keeps `?id=` in the address bar in step with the open note, without adding history entries. */
function setUrlId(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
  window.history.replaceState(window.history.state, '', url);
}

/**
 * The private notes: unlock, find a note, read it, write it. State is kept here and handed down;
 * each screen (list, viewer, editor) is its own component.
 */
export default function VaultApp() {
  const session = useVaultSession();
  const { settings, lock } = session;
  const open = session.status === 'open';

  // list
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // the open note
  const [selected, setSelected] = useState<Note | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [doomed, setDoomed] = useState<Doomed | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listAbort = useRef<AbortController | null>(null);
  const fetchRef = useRef<() => Promise<void>>(async () => {});
  const deepLink = useRef<string | null>(null);

  const perPage = settings.notesPerPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  /* --------------------------------- the list --------------------------------- */

  const fetchNotes = useCallback(async () => {
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(perPage), search });
      if (activeTags.length) params.set('tags', activeTags.join(','));
      const res = await fetch(`/api/notes?${params}`, { signal: controller.signal });
      if (res.status === 401) return lock();
      const data = await res.json();
      if (!res.ok || controller.signal.aborted) return;
      setNotes(data.notes ?? []);
      setTotalCount(data.totalCount ?? 0);
      setAllTags(data.allTags ?? []);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') toast.error('Could not load the notes.');
    } finally {
      if (!controller.signal.aborted) setLoadingList(false);
    }
  }, [page, perPage, search, activeTags, lock]);

  useEffect(() => {
    fetchRef.current = fetchNotes;
  }, [fetchNotes]);

  useEffect(() => {
    if (open) void fetchNotes();
    return () => listAbort.current?.abort();
  }, [open, fetchNotes]);

  // A page that no longer exists (after deleting the last note on it) falls back to the last one.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ------------------------------- the open note ------------------------------ */

  const draftState = useNoteDraft({
    onSaved: (note, created) => {
      setSelected(note);
      if (created) setUrlId(note._id);
      void fetchRef.current();
    },
    onUnauthorized: lock,
  });
  // The functions are stable between renders (safe in effect dependencies); the values are not.
  const {
    save: saveDraft,
    open: openDraft,
    isDirty: draftIsDirty,
    sendOnClose,
    idRef: draftId,
  } = draftState;

  // Locking (or the session ending) clears everything that was on screen.
  useEffect(() => {
    if (open) return;
    setNotes([]);
    setSelected(null);
    setMode('view');
    setMobileDetail(false);
    openDraft(null);
  }, [open, openDraft]);

  /** Saves the note being written (if it changed). False means it could not be saved. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (mode !== 'edit') return true;
    const result = await saveDraft();
    if (!result.ok) {
      toast.error(result.error, { description: 'Your text is still here. Try saving again.' });
      return false;
    }
    return true;
  }, [mode, saveDraft]);

  const openNote = useCallback(
    async (id: string, edit = false) => {
      if (selected?._id === id && mode === (edit ? 'edit' : 'view')) {
        setMobileDetail(true);
        return;
      }
      if (!(await flush())) return;
      try {
        const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`);
        if (res.status === 401) return lock();
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.note) {
          toast.error('That note could not be opened. It may have been deleted.');
          setUrlId(null);
          return;
        }
        const note = data.note as Note;
        setSelected(note);
        if (edit) openDraft(note);
        setMode(edit ? 'edit' : 'view');
        setMobileDetail(true);
        setUrlId(note._id);
      } catch {
        toast.error('Could not reach the server.');
      }
    },
    [selected, mode, flush, openDraft, lock]
  );

  const startCreate = useCallback(async () => {
    if (!(await flush())) return;
    setSelected(null);
    openDraft(null);
    setMode('edit');
    setMobileDetail(true);
    setUrlId(null);
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [flush, openDraft]);

  const startEdit = useCallback(() => {
    if (!selected) return;
    openDraft(selected);
    setMode('edit');
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [selected, openDraft]);

  const finishEdit = useCallback(async () => {
    const result = await saveDraft();
    if (!result.ok) {
      toast.error(result.error, { description: 'Your text is still here. Try saving again.' });
      return;
    }
    if (!draftId.current) {
      // A new note with nothing in it: back to the empty screen.
      setSelected(null);
      setMobileDetail(false);
      setUrlId(null);
    }
    setMode('view');
  }, [saveDraft, draftId]);

  const closeNote = useCallback(() => {
    setSelected(null);
    setMobileDetail(false);
    setUrlId(null);
  }, []);

  const goBack = useCallback(async () => {
    if (!(await flush())) return;
    setMode('view');
    setMobileDetail(false);
    if (!draftId.current) setSelected(null);
  }, [flush, draftId]);

  const step = useCallback(
    (direction: 1 | -1) => {
      if (!notes.length) return;
      const index = selected ? notes.findIndex((n) => n._id === selected._id) : -1;
      const next = notes[(index + direction + notes.length) % notes.length];
      if (next) void openNote(next._id);
    },
    [notes, selected, openNote]
  );

  const confirmDelete = async () => {
    if (!doomed) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doomed._id }),
      });
      if (res.status === 401) return lock();
      if (!res.ok) {
        toast.error('The note could not be deleted.');
        return;
      }
      if (selected?._id === doomed._id) {
        setSelected(null);
        setMode('view');
        openDraft(null);
        setMobileDetail(false);
        setUrlId(null);
      }
      setDoomed(null);
      toast.success('Note deleted');
      void fetchNotes();
    } catch {
      toast.error('Could not reach the server.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setActiveTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));
    setPage(1);
  };

  // Open the note named in the address (`?id=`) once, right after unlocking.
  useEffect(() => {
    if (!open) return;
    if (deepLink.current === null)
      deepLink.current = new URLSearchParams(window.location.search).get('id') ?? '';
    const id = deepLink.current;
    if (id) {
      deepLink.current = '';
      void openNote(id);
    }
  }, [open]);

  /* ------------------------- automatic and last-chance saves ------------------------- */

  useEffect(() => {
    if (!open || mode !== 'edit' || settings.autosaveInterval <= 0) return;
    const timer = setInterval(() => void saveDraft(), settings.autosaveInterval * 1000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void saveDraft();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [open, mode, settings.autosaveInterval, saveDraft]);

  useEffect(() => {
    if (!open || mode !== 'edit') return;
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!draftIsDirty()) return;
      if (!sendOnClose()) {
        // Too big to send while closing: let the browser ask before throwing the text away.
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [open, mode, draftIsDirty, sendOnClose]);

  /* ---------------------------------- shortcuts ---------------------------------- */

  const keys = useRef({
    mode,
    selected,
    step,
    startCreate,
    startEdit,
    closeNote,
    logout: session.logout,
  });
  useEffect(() => {
    keys.current = {
      mode,
      selected,
      step,
      startCreate,
      startEdit,
      closeNote,
      logout: session.logout,
    };
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // A control that used the key itself (the divider's arrows, a menu) keeps it.
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = document.activeElement as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      const k = keys.current;
      if (e.key === 'Escape') {
        if (
          k.mode === 'view' &&
          k.selected &&
          !document.querySelector('[role="dialog"], [role="menu"]')
        ) {
          k.closeNote();
        }
        return;
      }
      if (typing || document.querySelector('[role="dialog"]')) return;
      // While writing, only the shortcuts that cannot move you away from the text work.
      if (k.mode === 'edit' && !['/', '?', 'l'].includes(e.key)) return;
      switch (e.key) {
        case 'j':
        case 'ArrowRight':
          e.preventDefault();
          return k.step(1);
        case 'k':
        case 'ArrowLeft':
          e.preventDefault();
          return k.step(-1);
        case 'e':
          if (k.selected && k.mode === 'view') {
            e.preventDefault();
            k.startEdit();
          }
          return;
        case 'n':
          e.preventDefault();
          return void k.startCreate();
        case 'l':
          e.preventDefault();
          return void k.logout();
        case '/':
          e.preventDefault();
          return searchRef.current?.focus();
        case '?':
          e.preventDefault();
          return setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* ----------------------------------- screens ----------------------------------- */

  if (!open) {
    return (
      <LockScreen
        title={settings.lockTitle}
        setup={session.setup}
        checking={session.status === 'checking'}
        onLogin={session.login}
      />
    );
  }

  const currentId =
    mode === 'edit' ? (draftState.noteId ?? selected?._id ?? null) : (selected?._id ?? null);
  const position = selected
    ? {
        index: Math.max(
          0,
          notes.findIndex((n) => n._id === selected._id)
        ),
        total: notes.length,
      }
    : null;
  const knownTags = allTags.filter((t) => !activeTags.includes(t));

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      <aside
        className={`${mobileDetail ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-e border-border bg-card md:w-72 lg:w-80`}
      >
        <NoteList
          title={settings.vaultTitle}
          notes={notes}
          loading={loadingList}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={searchInput}
          onSearch={setSearchInput}
          searchRef={searchRef}
          allTags={allTags}
          activeTags={activeTags}
          onToggleTag={toggleTag}
          onClearTags={() => {
            setActiveTags([]);
            setPage(1);
          }}
          selectedId={currentId}
          onOpen={(id) => void openNote(id)}
          onEdit={(id) => void openNote(id, true)}
          onDelete={(item) =>
            setDoomed({
              _id: item._id,
              title: item.title,
              attachmentCount: item.attachmentCount,
              published: item.published,
            })
          }
          onNew={() => void startCreate()}
          timeLeft={session.timeLeft}
          lowTime={session.lowTime}
          canExtend={session.canExtend}
          atLimit={session.atLimit}
          extending={session.extending}
          onExtend={() =>
            void session.extend().then((error) => {
              if (error) toast.error(error);
            })
          }
          onLock={() => void session.logout()}
          onShortcuts={() => setShowShortcuts(true)}
        />
      </aside>

      <main className={`${mobileDetail ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {mode === 'edit' ? (
          <NoteEditor
            draft={draftState.draft}
            update={draftState.update}
            status={draftState.status}
            error={draftState.error}
            savedAt={draftState.savedAt}
            maxFileBytes={settings.maxFileBytes}
            knownTags={knownTags}
            titleRef={titleRef}
            onSave={saveDraft}
            onDone={() => void finishEdit()}
            onBack={() => void goBack()}
            onUnauthorized={lock}
            onShortcuts={() => setShowShortcuts(true)}
          />
        ) : selected ? (
          <NoteViewer
            note={selected}
            position={position}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onBack={() => {
              setMobileDetail(false);
            }}
            onEdit={startEdit}
            onDelete={() =>
              setDoomed({
                _id: selected._id,
                title: selected.title,
                attachmentCount: selected.attachments.length,
                published: Boolean(selected.published),
              })
            }
            onChanged={(note) => {
              setSelected(note);
              void fetchNotes();
            }}
            onTagClick={(tag) => {
              if (!activeTags.includes(tag)) toggleTag(tag);
              setMobileDetail(false);
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No note open</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a note from the list, or start a new one.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">N</kbd>{' '}
                for a new note,{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">?</kbd> for
                shortcuts
              </p>
            </div>
            <Button onClick={() => void startCreate()}>
              <Plus /> New note
            </Button>
          </div>
        )}
      </main>

      <ConfirmDelete
        title={doomed?.title ?? null}
        fileCount={doomed?.attachmentCount ?? 0}
        published={doomed?.published ?? false}
        busy={deleting}
        onCancel={() => setDoomed(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
