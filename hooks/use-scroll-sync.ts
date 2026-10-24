'use client';

import { useEffect } from 'react';

/**
 * Keeps two scrollable boxes at the same relative position: scroll the text and the preview
 * follows, and the other way round. A flag stops the echo (the follower's own scroll event).
 */
export function useScrollSync(
  a: React.RefObject<HTMLElement | null>,
  b: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    const first = a.current;
    const second = b.current;
    if (!enabled || !first || !second) return;
    let driver: HTMLElement | null = null;
    let release = 0;

    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (driver && driver !== from) return;
      driver = from;
      window.clearTimeout(release);
      release = window.setTimeout(() => (driver = null), 120);
      const range = from.scrollHeight - from.clientHeight;
      const target = to.scrollHeight - to.clientHeight;
      to.scrollTop = range > 0 ? (from.scrollTop / range) * Math.max(0, target) : 0;
    };

    const onFirst = follow(first, second);
    const onSecond = follow(second, first);
    first.addEventListener('scroll', onFirst, { passive: true });
    second.addEventListener('scroll', onSecond, { passive: true });
    return () => {
      first.removeEventListener('scroll', onFirst);
      second.removeEventListener('scroll', onSecond);
      window.clearTimeout(release);
    };
  }, [a, b, enabled]);
}
