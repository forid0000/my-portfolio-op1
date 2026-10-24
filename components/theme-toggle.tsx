'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY } from '@/lib/theme-modes';

/** Follows the <html> element's "dark" class, which the inline script in <head> and this button set. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

/**
 * The visitor's light / dark button (shown in the header when Admin -> Appearance allows it).
 *
 * Both icons are in the server HTML and CSS shows the right one (`dark:` follows the <html> class
 * that the head script has already set), so a returning visitor never sees the wrong icon. A click
 * flips the look: it sets `data-mode="alt"` when the new tone differs from the owner's theme, flips
 * the `dark` class and remembers the choice in this browser only.
 */
export default function ThemeToggle({
  mainDark,
  className = '',
}: {
  /** Whether the owner's own theme is a dark one (the look when no choice has been made). */
  mainDark: boolean;
  className?: string;
}) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => mainDark
  );

  const toggle = () => {
    const root = document.documentElement;
    const wantDark = !root.classList.contains('dark');
    if (wantDark === mainDark) root.removeAttribute('data-mode');
    else root.setAttribute('data-mode', 'alt');
    root.classList.toggle('dark', wantDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, wantDark ? 'dark' : 'light');
    } catch {
      // storage blocked: the look still changes for this visit
    }
  };

  const label = dark ? 'Switch to the light theme' : 'Switch to the dark theme';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`relative flex rounded-lg border border-border/40 p-2 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95 ${className}`}
    >
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden="true" />
      <Moon className="block h-5 w-5 dark:hidden" aria-hidden="true" />
    </button>
  );
}
