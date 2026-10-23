'use client';

/**
 * First visit to the dashboard: a short welcome that offers the guided tour.
 * Answering it either way (tour or "explore on my own") is remembered on the
 * server, so it never comes back; the tour stays available from the sidebar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, ListChecks, ShieldCheck, Sparkles } from 'lucide-react';
import { useOnboarding } from './provider';

export function WelcomeDialog() {
  const { overview, tourOpen, act, startTour } = useOnboarding();
  const [hidden, setHidden] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const secondaryRef = useRef<HTMLButtonElement>(null);

  const open = Boolean(overview && !overview.state.welcomeSeen && !tourOpen && !hidden);

  const explore = useCallback(() => {
    setHidden(true);
    void act({ action: 'welcome-seen' });
  }, [act]);

  const takeTour = useCallback(() => {
    setHidden(true);
    void act({ action: 'welcome-seen' });
    startTour();
  }, [act, startTour]);

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        explore();
      } else if (e.key === 'Tab') {
        // Two buttons: keep focus between them.
        const order = [primaryRef.current, secondaryRef.current].filter(Boolean) as HTMLElement[];
        const index = order.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const nextIndex =
          index === -1 ? 0 : (index + (e.shiftKey ? -1 : 1) + order.length) % order.length;
        order[nextIndex].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, explore]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-body"
        className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60">
          <Sparkles className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 id="welcome-title" className="text-xl font-bold tracking-tight text-gray-100">
          Welcome to your admin panel
        </h2>
        <p id="welcome-body" className="mt-2 text-sm leading-relaxed text-gray-400">
          Your account is protected by your authenticator. Here is how to get your site ready:
        </p>

        <ul className="mt-5 space-y-3 text-sm text-gray-300">
          <li className="flex gap-3">
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Take a <strong className="text-gray-100">one-minute tour</strong> to see where
              everything is.
            </span>
          </li>
          <li className="flex gap-3">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Follow the <strong className="text-gray-100">checklist</strong> on this page: your
              name and story, your photo, the contact form.
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Passwords, your private notes vault and every key are managed{' '}
              <strong className="text-gray-100">here</strong>, in Security &amp; Keys. No files to
              edit.
            </span>
          </li>
        </ul>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            ref={primaryRef}
            type="button"
            onClick={takeTour}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
          >
            Take the 1-minute tour
          </button>
          <button
            ref={secondaryRef}
            type="button"
            onClick={explore}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500"
          >
            I&apos;ll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
