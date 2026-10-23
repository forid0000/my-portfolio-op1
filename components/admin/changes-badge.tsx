'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleCheck, PencilLine } from 'lucide-react';
import { useChangeSummary } from '@/lib/change-tracker';

/**
 * Sits at the very top of the admin menu, above every page. It shows how many unsaved changes
 * the open editor holds, lists what they are on click, and confirms a save for a few seconds.
 * `compact` is the narrow version used when the menu is folded and on phones.
 */
export default function ChangesBadge({ compact = false }: { compact?: boolean }) {
  const { count, items, justSaved } = useChangeSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Nothing pending: close the list so it does not reopen by itself on the next edit.
  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  const dirty = count > 0;
  const saved = !dirty && justSaved > 0;
  const label = dirty
    ? `${count} unsaved ${count === 1 ? 'change' : 'changes'}`
    : saved
      ? `Saved ${justSaved} ${justSaved === 1 ? 'change' : 'changes'}`
      : 'No unsaved changes';

  const tone = dirty
    ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
    : saved
      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
      : 'border-gray-800 bg-gray-900 text-gray-500';

  return (
    <div ref={ref} className="relative" data-tour="changes">
      <button
        type="button"
        onClick={() => dirty && setOpen((v) => !v)}
        aria-expanded={dirty ? open : undefined}
        aria-label={label}
        title={label}
        className={`flex items-center transition-colors ${tone} ${
          compact
            ? 'h-9 min-w-9 justify-center rounded-full border px-2 text-xs font-bold tabular-nums'
            : 'w-full gap-2 rounded-lg border px-3 py-2 text-xs font-medium'
        } ${dirty ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {dirty ? (
          compact ? (
            <span>{count > 99 ? '99+' : count}</span>
          ) : (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="truncate">{label}</span>
            </>
          )
        ) : (
          <>
            <CircleCheck className="h-4 w-4 shrink-0" />
            {!compact && <span className="truncate">{label}</span>}
          </>
        )}
      </button>
      {/* Read out by screen readers whenever the number changes. */}
      <span className="sr-only" role="status" aria-live="polite">
        {label}
      </span>

      {open && dirty && (
        <div
          role="dialog"
          aria-label="Unsaved changes"
          className="absolute left-0 top-full z-[60] mt-2 w-72 max-w-[85vw] rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-2xl"
        >
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-200">
            <PencilLine className="h-3.5 w-3.5 text-amber-400" /> What changed since the last save
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-gray-300">
            {items.map((item) => (
              <li key={item} className="truncate rounded bg-gray-800/60 px-2 py-1" dir="auto">
                {item}
              </li>
            ))}
          </ul>
          {count > items.length && (
            <p className="mt-2 text-[11px] text-gray-500">and more, {count} changes in total.</p>
          )}
          <p className="mt-2 text-[11px] text-gray-500">Press Save on the page to keep them.</p>
        </div>
      )}
    </div>
  );
}
