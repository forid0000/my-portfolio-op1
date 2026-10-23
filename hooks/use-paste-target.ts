'use client';

import { useEffect, useId, useRef } from 'react';

// Several upload areas can share a page (one per project). Ctrl/Cmd+V goes only to the one the
// pointer is over or that has focus; the most recently armed one wins.
let armedId: string | null = null;

/** Clipboard screenshots arrive as "image.png"; give them a unique, descriptive name. */
function named(file: File, index: number): File {
  if (file.name && file.name !== 'image.png') return file;
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  return new File([file], `pasted-${Date.now()}-${index}.${ext}`, { type: file.type });
}

/**
 * Lets an upload area accept pasted files. Spread the returned props on the area's root
 * element; while it is hovered or focused, pasting (outside text fields) calls `onFiles`.
 */
export function usePasteTarget(onFiles: (files: File[]) => void) {
  const id = useId();

  const latest = useRef(onFiles);
  useEffect(() => {
    latest.current = onFiles;
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (armedId !== id) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.length) return;
      event.preventDefault();
      latest.current(files.map(named));
    };
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('paste', onPaste);
      if (armedId === id) armedId = null;
    };
  }, [id]);

  const arm = () => {
    armedId = id;
  };
  const disarm = () => {
    if (armedId === id) armedId = null;
  };
  return { onMouseEnter: arm, onMouseLeave: disarm, onFocus: arm, onBlur: disarm };
}
