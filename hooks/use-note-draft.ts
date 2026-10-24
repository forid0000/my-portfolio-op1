'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_DRAFT,
  draftFromNote,
  needsSave,
  sameDraft,
  toPayload,
  withoutUploadPlaceholders,
  type Draft,
} from '@/lib/note-draft';
import type { Note } from '@/lib/notes-model';

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type SaveResult = { ok: true; note: Note | null } | { ok: false; error: string };

/**
 * The note being edited: its text, tags and files, and how it gets to the server. Saves never
 * overlap (each one waits for the one before it), so a slow connection can never create the same
 * note twice, and typing during a save is never overwritten by the answer.
 */
export function useNoteDraft(options: {
  onSaved: (note: Note, created: boolean) => void;
  onUnauthorized: () => void;
}) {
  const [draft, setDraftState] = useState<Draft>(EMPTY_DRAFT);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const draftRef = useRef(draft);
  const savedRef = useRef<Draft>(EMPTY_DRAFT);
  const idRef = useRef<string | null>(null);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  /** Starts editing `note` (or a new empty note when null). */
  const open = useCallback((note: Note | null) => {
    const next = draftFromNote(note);
    draftRef.current = next;
    savedRef.current = next;
    idRef.current = note?._id ?? null;
    setDraftState(next);
    setNoteId(idRef.current);
    setStatus('clean');
    setError(null);
    setSavedAt(null);
  }, []);

  const update = useCallback((changes: Partial<Draft> | ((d: Draft) => Draft)) => {
    const next =
      typeof changes === 'function'
        ? changes(draftRef.current)
        : { ...draftRef.current, ...changes };
    draftRef.current = next;
    setDraftState(next);
    setStatus(sameDraft(next, savedRef.current) ? 'clean' : 'dirty');
  }, []);

  const persist = useCallback(async (): Promise<SaveResult> => {
    const sent = draftRef.current;
    if (!needsSave(sent, savedRef.current)) return { ok: true, note: null };
    setStatus('saving');
    const id = idRef.current;
    try {
      const payload = toPayload(sent);
      const res = await fetch('/api/notes', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id, ...payload } : payload),
      });
      if (res.status === 401) {
        optionsRef.current.onUnauthorized();
        throw new Error('Your session ended. Unlock the vault again.');
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.note) {
        const detail = data?.details?.[0]?.message as string | undefined;
        throw new Error(detail || data?.error || 'The note could not be saved.');
      }
      const note = data.note as Note;
      const created = !id;
      idRef.current = note._id;
      setNoteId(note._id);
      savedRef.current = sent;
      // Take over the server's cleaned-up version only if nothing was typed while saving (and no
      // picture is still uploading: its placeholder line must stay where it is).
      if (sameDraft(draftRef.current, sent)) {
        if (sent.content === withoutUploadPlaceholders(sent.content)) {
          const adopted = draftFromNote(note);
          draftRef.current = adopted;
          savedRef.current = adopted;
          setDraftState(adopted);
        }
        setStatus('saved');
      } else {
        setStatus('dirty');
      }
      setError(null);
      setSavedAt(new Date());
      optionsRef.current.onSaved(note, created);
      return { ok: true, note };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The note could not be saved.';
      setStatus('error');
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  /** Writes the draft if it changed. Calls queue up, so two never run at once. */
  const save = useCallback((): Promise<SaveResult> => {
    const run = chainRef.current.then(persist, persist) as Promise<SaveResult>;
    chainRef.current = run.catch(() => undefined);
    return run;
  }, [persist]);

  /** True while there is something the server does not have yet. */
  const isDirty = useCallback(() => needsSave(draftRef.current, savedRef.current), []);

  /**
   * Last-chance save for a closing tab: the browser lets a small `keepalive` request finish after
   * the page is gone. Returns false when it did not fit (the caller then warns instead).
   */
  const sendOnClose = useCallback((): boolean => {
    if (!needsSave(draftRef.current, savedRef.current)) return true;
    const id = idRef.current;
    const payload = toPayload(draftRef.current);
    const body = JSON.stringify(id ? { id, ...payload } : payload);
    if (body.length > 60_000) return false;
    fetch('/api/notes', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
    return true;
  }, []);

  return { draft, noteId, status, error, savedAt, open, update, save, isDirty, sendOnClose, idRef };
}
