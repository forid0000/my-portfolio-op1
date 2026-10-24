'use client';

import { useSyncExternalStore } from 'react';
import { Toaster } from 'sonner';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

/** The toast area, in the same tone as the page (it follows the visitor's light / dark choice). */
export default function SiteToaster({ initialDark }: { initialDark: boolean }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => initialDark
  );
  return (
    <Toaster
      position="top-center"
      theme={dark ? 'dark' : 'light'}
      richColors
      closeButton
      duration={3000}
    />
  );
}
