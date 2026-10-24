'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EDITOR_PREFS_DEFAULT,
  EDITOR_PREFS_KEY,
  parseEditorPrefs,
  type EditorPrefs,
} from '@/lib/split-pane';

/** Font, text size and scroll-sync of the note editor, remembered in this browser. */
export function useEditorPrefs() {
  const [prefs, setPrefs] = useState<EditorPrefs>(EDITOR_PREFS_DEFAULT);

  useEffect(() => {
    try {
      setPrefs(parseEditorPrefs(window.localStorage.getItem(EDITOR_PREFS_KEY)));
    } catch {
      /* storage unavailable: keep the defaults */
    }
  }, []);

  const change = useCallback((changes: Partial<EditorPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...changes };
      try {
        window.localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify(next));
      } catch {
        /* not remembered, still works */
      }
      return next;
    });
  }, []);

  return [prefs, change] as const;
}
