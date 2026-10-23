'use client';

/**
 * The dashboard's "Getting started" card: progress, then every setup task grouped
 * by purpose, each with a button that goes straight to the right page. Completion
 * is detected on the server from the real configuration, so it ticks itself off;
 * only optional tasks can be skipped.
 */
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Compass,
  Loader2,
  MinusCircle,
  PartyPopper,
  RotateCcw,
} from 'lucide-react';
import {
  ONBOARDING_GROUPS,
  type OnboardingGroupId,
  type OnboardingItem,
} from '@/lib/onboarding-types';
import { useOnboarding } from './provider';

const GROUP_ORDER: OnboardingGroupId[] = ['secure', 'content', 'services'];

function StatusIcon({ item }: { item: OnboardingItem }) {
  if (item.done) return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-label="Done" />;
  if (item.skipped) return <MinusCircle className="h-5 w-5 text-gray-600" aria-label="Skipped" />;
  return <Circle className="h-5 w-5 text-gray-600" aria-label="Not done yet" />;
}

function Row({ item, isNext }: { item: OnboardingItem; isNext: boolean }) {
  const { act } = useOnboarding();
  const settled = item.done || item.skipped;

  return (
    <li
      className={`flex gap-3 rounded-lg border px-4 py-3 transition-colors ${
        isNext ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-gray-800 bg-gray-950/40'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        <StatusIcon item={item} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${settled ? 'text-gray-400' : 'text-gray-100'}`}>
            {item.title}
          </p>
          {isNext && (
            <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Next
            </span>
          )}
          {item.optional && !item.done && !item.skipped && (
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Optional
            </span>
          )}
          {item.skipped && (
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Skipped
            </span>
          )}
        </div>
        {!settled && (
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
        )}
        {!settled && item.hint && <p className="mt-1 text-xs text-amber-400/90">{item.hint}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2 self-start">
        {item.skipped ? (
          <button
            type="button"
            onClick={() => void act({ action: 'unskip', id: item.id })}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-200"
          >
            Undo
          </button>
        ) : (
          <>
            {item.optional && !item.done && (
              <button
                type="button"
                onClick={() => void act({ action: 'skip', id: item.id })}
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-200"
              >
                Skip
              </button>
            )}
            <Link
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                item.done
                  ? 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  : isNext
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              {item.done ? 'Review' : 'Open'}
              {!item.done && <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          </>
        )}
      </div>
    </li>
  );
}

export function GettingStarted() {
  const { overview, loading, error, refresh, act, startTour } = useOnboarding();

  if (loading && !overview) {
    return (
      <section
        data-tour="checklist"
        className="rounded-xl border border-gray-800 bg-gray-900 p-6"
        aria-busy="true"
      >
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your checklist…
        </div>
      </section>
    );
  }

  if (!overview) {
    return (
      <section data-tour="checklist" className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-400">{error ?? 'The checklist is unavailable.'}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </section>
    );
  }

  const { items, completed, total, percent, nextId, state } = overview;
  const allDone = completed === total;

  if (state.checklistDismissed) {
    return (
      <section
        data-tour="checklist"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-3"
      >
        <p className="text-sm text-gray-400">
          Getting-started checklist hidden ({completed} of {total} done).
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startTour}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-100"
          >
            <Compass className="h-3.5 w-3.5" />
            Take the tour
          </button>
          <button
            type="button"
            onClick={() => void act({ action: 'show-checklist' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-gray-500"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show checklist
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-tour="checklist" className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Getting started</h2>
          <p className="mt-1 text-sm text-gray-400">
            {allDone
              ? 'Everything is set up.'
              : 'Work through these at your own pace. Each one ticks itself off when it is done.'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-gray-300">
            {completed} <span className="text-gray-600">/</span> {total}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">steps</p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {allDone && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-4 py-3">
          <PartyPopper className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="flex-1 text-sm text-emerald-100">
            You are all set. Your site is ready to share.
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            View live site
          </a>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {GROUP_ORDER.map((groupId) => {
          const groupItems = items.filter((i) => i.group === groupId);
          if (!groupItems.length) return null;
          const meta = ONBOARDING_GROUPS[groupId];
          return (
            <div key={groupId}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {meta.title}
              </h3>
              <p className="mb-3 mt-1 text-xs text-gray-600">{meta.description}</p>
              <ul className="space-y-2">
                {groupItems.map((item) => (
                  <Row key={item.id} item={item} isNext={item.id === nextId} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-4">
        <button
          type="button"
          onClick={startTour}
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 transition-colors hover:text-gray-100"
        >
          <Compass className="h-4 w-4" />
          Take the guided tour
        </button>
        <button
          type="button"
          onClick={() => void act({ action: 'dismiss-checklist' })}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-200"
        >
          Hide this checklist
        </button>
      </div>
    </section>
  );
}
