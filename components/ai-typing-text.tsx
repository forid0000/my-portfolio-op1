'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Terminal } from 'lucide-react';
import { HERO_DEFAULTS } from '@/lib/content-defaults';

const DEFAULT_PHRASES = HERO_DEFAULTS.aiPhrases.split(',').map((s) => s.trim());

/**
 * Types each status phrase once, then settles on the final greeting and stops.
 * (It used to loop forever, keeping timers and re-renders running for as long as
 * the page was open.) Reduced-motion users see the greeting immediately.
 */
export default function AiTypingText({
  finalGreeting = HERO_DEFAULTS.greeting,
  aiPhrases,
}: {
  finalGreeting?: string;
  aiPhrases?: string;
}) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  const phrases = useMemo(() => {
    const list = aiPhrases
      ? aiPhrases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_PHRASES;
    return [...list, finalGreeting];
  }, [aiPhrases, finalGreeting]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(finalGreeting);
      setDone(true);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;
    let length = 0;
    let deleting = false;

    const tick = () => {
      if (cancelled) return;
      const phrase = phrases[index];
      const isLast = index === phrases.length - 1;

      if (!deleting) {
        length += 1;
        setText(phrase.slice(0, length));
        if (length >= phrase.length) {
          if (isLast) {
            setDone(true); // settle on the greeting; no more timers
            return;
          }
          deleting = true;
          timer = setTimeout(tick, 900);
          return;
        }
        timer = setTimeout(tick, 40 + Math.random() * 35);
      } else {
        length -= 1;
        setText(phrase.slice(0, length));
        if (length <= 0) {
          deleting = false;
          index += 1;
          timer = setTimeout(tick, 250);
          return;
        }
        timer = setTimeout(tick, 18);
      }
    };

    timer = setTimeout(tick, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phrases, finalGreeting]);

  return (
    <div className="flex items-center justify-center md:justify-start gap-2 text-primary/90 font-mono text-sm tracking-widest uppercase h-6">
      <Terminal className="w-4 h-4 text-primary" />
      <span className="relative inline-flex items-center">
        <span className="bg-primary/10 px-1 font-semibold">{text}</span>
        <span className={`ml-1 w-2 h-4 bg-primary/80 ${done ? '' : 'animate-pulse'}`}></span>
      </span>
    </div>
  );
}
