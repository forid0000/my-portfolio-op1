import type { ReactNode } from 'react';

/**
 * Two wordings for the same spot: a plain one for the clean style and the developer-prompt
 * one for the terminal style (Admin -> Appearance). Both are in the server HTML and CSS shows
 * one, so there is no flash and no client JavaScript.
 */
export function ByStyle({ clean, terminal }: { clean: ReactNode; terminal: ReactNode }) {
  return (
    <>
      <span className="terminal:hidden">{clean}</span>
      <span className="hidden terminal:inline">{terminal}</span>
    </>
  );
}
