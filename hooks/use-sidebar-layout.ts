'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SIDEBAR_DEFAULT,
  SIDEBAR_STORAGE_KEY,
  nudge,
  parseSidebarState,
  resolveDrag,
  toggleCollapsed,
  type SidebarState,
} from '@/lib/sidebar-layout';

/**
 * Width and folded state of the admin menu, remembered in this browser's localStorage so the
 * menu comes back the way the person left it. The caller owns the ref of the menu element
 * (it is used to measure where the menu starts while dragging). Everything is wrapped in try/catch: private
 * windows or blocked storage just mean the size is not remembered.
 */
export function useSidebarLayout(asideRef: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<SidebarState>(SIDEBAR_DEFAULT);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Restore after hydration (the server cannot know this browser's saved size).
  useEffect(() => {
    try {
      setState(parseSidebarState(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)));
    } catch {
      /* storage unavailable: keep the default */
    }
    setReady(true);
  }, []);

  const save = useCallback((next: SidebarState) => {
    stateRef.current = next;
    setState(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* not remembered, still works */
    }
  }, []);

  const toggle = useCallback(() => save(toggleCollapsed(stateRef.current)), [save]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      setDragging(true);
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      let last = stateRef.current;

      const move = (e: PointerEvent) => {
        last = resolveDrag(e.clientX - left, stateRef.current);
        stateRef.current = last;
        setState(last);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        setDragging(false);
        save(last);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    },
    [save, asideRef]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
        return;
      }
      const next = nudge(stateRef.current, event.key);
      if (next) {
        event.preventDefault();
        save(next);
      }
    },
    [save, toggle]
  );

  return { state, ready, dragging, toggle, onPointerDown, onKeyDown };
}
