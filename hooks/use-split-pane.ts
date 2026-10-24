'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SPLIT_DEFAULT,
  SPLIT_STORAGE_KEY,
  dragIntent,
  dragPreview,
  nudgeSplit,
  parseSplitState,
  pointerToRatio,
  resetSplit,
  settleDrag,
  type PaneMode,
  type PaneOrientation,
  type SplitState,
} from '@/lib/split-pane';

/**
 * State of the editor's two panes: how they share the space, which one is shown, and whether
 * they sit side by side or one above the other. Remembered in this browser (localStorage); the
 * caller attaches `containerRef` to the element that holds both panes.
 */
export function useSplitPane() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<SplitState>(SPLIT_DEFAULT);
  const [dragging, setDragging] = useState(false);
  /** What letting go would do right now (so the UI can say "release to hide the preview"). */
  const [intent, setIntent] = useState<PaneMode>('split');
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      setState(parseSplitState(window.localStorage.getItem(SPLIT_STORAGE_KEY)));
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  const save = useCallback((next: SplitState) => {
    stateRef.current = next;
    setState(next);
    try {
      window.localStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* not remembered, still works */
    }
  }, []);

  const setMode = useCallback((mode: PaneMode) => save({ ...stateRef.current, mode }), [save]);
  const setOrientation = useCallback(
    (orientation: PaneOrientation) => save({ ...stateRef.current, orientation }),
    [save]
  );
  const reset = useCallback(() => save(resetSplit(stateRef.current)), [save]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      event.preventDefault();
      const handle = event.currentTarget;
      // preventDefault stops the browser from focusing it, but the arrow keys should work next.
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      setDragging(true);
      const horizontal = stateRef.current.orientation === 'columns';
      const start = horizontal ? box.left : box.top;
      const size = horizontal ? box.width : box.height;
      let ratio = pointerToRatio(horizontal ? event.clientX : event.clientY, start, size);

      const move = (e: PointerEvent) => {
        ratio = pointerToRatio(horizontal ? e.clientX : e.clientY, start, size);
        setIntent(dragIntent(ratio));
        const preview = dragPreview(ratio, stateRef.current);
        stateRef.current = preview;
        setState(preview);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        setDragging(false);
        setIntent('split');
        save(settleDrag(ratio, stateRef.current));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    },
    [save]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        save(resetSplit(stateRef.current));
        return;
      }
      const next = nudgeSplit(stateRef.current, event.key);
      if (next) {
        event.preventDefault();
        save(next);
      }
    },
    [save]
  );

  return {
    containerRef,
    state,
    dragging,
    intent,
    setMode,
    setOrientation,
    reset,
    onPointerDown,
    onKeyDown,
  };
}
