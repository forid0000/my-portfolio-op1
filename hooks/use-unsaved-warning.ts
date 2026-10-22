'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const serialize = (value: unknown) => JSON.stringify(value) ?? '';

/**
 * Tracks unsaved changes by comparing the current state against a "clean"
 * baseline snapshot (serialized, so callers pass their raw state — no
 * pre-stringifying needed).
 *
 * The baseline is captured on the first render after `isLoading` turns false.
 * Data and the loading flag typically flip in the same batched commit, so the
 * freshly-fetched state becomes the baseline instead of being flagged as an
 * edit (the previous trailing-ref implementation raced this and showed a
 * phantom "Unsaved changes" right after load).
 *
 * After a successful save, call `markClean()` with the state that was saved.
 * Passing it explicitly keeps edits made while the request was in flight
 * flagged as dirty, and lets callers that replace state in the same tick
 * (e.g. a post-save refetch) baseline the incoming data before it renders.
 * Calling `markClean()` with no argument baselines whatever state was last
 * rendered.
 */
export function useUnsavedWarning<T>(currentState: T, isLoading: boolean = false) {
  const snapshot = serialize(currentState);
  const [baseline, setBaseline] = useState<string | null>(null);

  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  });

  useEffect(() => {
    if (isLoading) {
      setBaseline(null);
      return;
    }
    setBaseline((prev) => (prev === null ? snapshotRef.current : prev));
  }, [isLoading]);

  const isDirty = baseline !== null && snapshot !== baseline;

  const markClean = useCallback((cleanState?: T) => {
    setBaseline(cleanState === undefined ? snapshotRef.current : serialize(cleanState));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  return { isDirty, markClean };
}
