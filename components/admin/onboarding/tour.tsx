'use client';

/**
 * Guided tour: dims the page, highlights one element at a time and explains it in
 * a card beside it. No dependency; steps are data (tour-steps.ts).
 *
 * Behaviour worth knowing:
 *  - Targets are `[data-tour="name"]` elements; the first *visible* match is used,
 *    and a step whose target is missing is shown centred instead of failing.
 *  - On phones the sidebar is off-canvas, so the tour opens it for targets inside
 *    `[data-tour-sidebar]` and closes it for the others.
 *  - Keyboard: Esc ends the tour, ← / → move between steps, Tab stays in the card.
 *  - The page behind cannot be clicked while the tour runs (a transparent layer
 *    catches clicks), so nobody navigates away by accident mid-explanation.
 *  - Motion is a short one-shot slide of the highlight; `prefers-reduced-motion`
 *    removes it through the global rule in app/globals.css.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { TOUR_STEPS, type TourPlacement } from './tour-steps';

const PAD = 6; // breathing room around the highlighted element
const GAP = 14; // distance between the highlight and the card
const MARGIN = 12; // minimum distance from the viewport edge
const MOBILE_QUERY = '(max-width: 767px)';
const SIDEBAR_TRANSITION_MS = 340; // the sidebar slides for 300 ms

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** First visible element carrying `data-tour` = one of `names` (tried in order). */
function findTarget(...names: (string | undefined)[]): HTMLElement | null {
  for (const name of names) {
    if (!name) continue;
    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
    for (let i = 0; i < nodes.length; i++) {
      const r = nodes[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return nodes[i];
    }
  }
  return null;
}

const OPPOSITE: Record<TourPlacement, TourPlacement> = {
  right: 'left',
  left: 'right',
  top: 'bottom',
  bottom: 'top',
};

/** Where the card goes: the preferred side if it fits, else another, else pinned to an edge. */
function place(
  target: Box | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  prefer: TourPlacement,
  mobile: boolean
): { top: number; left: number } {
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), viewport.width - card.width - MARGIN);
  const clampY = (y: number) =>
    Math.min(Math.max(y, MARGIN), viewport.height - card.height - MARGIN);

  if (!target) {
    return {
      top: clampY((viewport.height - card.height) / 2),
      left: clampX((viewport.width - card.width) / 2),
    };
  }

  const midX = target.left + target.width / 2;
  const midY = target.top + target.height / 2;
  const spots: Record<TourPlacement, { top: number; left: number; fits: boolean }> = {
    right: {
      left: target.left + target.width + PAD + GAP,
      top: clampY(midY - card.height / 2),
      fits: target.left + target.width + PAD + GAP + card.width <= viewport.width - MARGIN,
    },
    left: {
      left: target.left - PAD - GAP - card.width,
      top: clampY(midY - card.height / 2),
      fits: target.left - PAD - GAP - card.width >= MARGIN,
    },
    bottom: {
      top: target.top + target.height + PAD + GAP,
      left: clampX(midX - card.width / 2),
      fits: target.top + target.height + PAD + GAP + card.height <= viewport.height - MARGIN,
    },
    top: {
      top: target.top - PAD - GAP - card.height,
      left: clampX(midX - card.width / 2),
      fits: target.top - PAD - GAP - card.height >= MARGIN,
    },
  };

  const order: TourPlacement[] = mobile
    ? ['bottom', 'top']
    : [prefer, OPPOSITE[prefer], 'bottom', 'top', 'right', 'left'];
  for (const side of order) {
    if (spots[side].fits) return { top: spots[side].top, left: spots[side].left };
  }

  // Nothing fits (small screen, big target): sit on the roomier edge.
  const roomBelow = viewport.height - (target.top + target.height);
  return {
    top: roomBelow >= target.top ? viewport.height - card.height - MARGIN : MARGIN,
    left: clampX((viewport.width - card.width) / 2),
  };
}

export default function Tour({
  onClose,
  setMenuOpen,
}: {
  onClose: () => void;
  setMenuOpen: (open: boolean) => void;
}) {
  const steps = TOUR_STEPS;
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const menuOpen = useRef(false); // the provider closes the menu before starting the tour
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const next = useCallback(() => {
    if (index === steps.length - 1) onClose();
    else setIndex(index + 1);
  }, [index, steps.length, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Resolve the step's target (opening or closing the phone menu first when needed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let el = findTarget(step.target, step.fallbackTarget);
      if (window.matchMedia(MOBILE_QUERY).matches) {
        const wantMenu = Boolean(el?.closest('[data-tour-sidebar]'));
        if (wantMenu !== menuOpen.current) {
          menuOpen.current = wantMenu;
          setMenuOpen(wantMenu);
          await sleep(SIDEBAR_TRANSITION_MS);
          if (cancelled) return;
          el = findTarget(step.target, step.fallbackTarget);
        }
      }
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (!cancelled) setTarget(el);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, setMenuOpen]);

  // Track the target's rectangle (it moves on scroll and resize).
  useEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = target.getBoundingClientRect();
      setBox((prev) =>
        prev &&
        prev.top === r.top &&
        prev.left === r.left &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height }
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [target]);

  // Position the card once its content (and therefore its height) is in the DOM.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const spot = place(
      box,
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
      step.placement ?? 'right',
      window.matchMedia(MOBILE_QUERY).matches
    );
    setPos((prev) => (prev.top === spot.top && prev.left === spot.left ? prev : spot));
  }, [box, step]);

  // Keep keyboard focus in the card, and give it back to whatever launched the tour.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      // Back to whatever started the tour; if that is gone (the welcome dialog), the sidebar's
      // "Take the tour" button, so keyboard users are never dropped onto <body>.
      const target =
        opener && opener !== document.body && document.contains(opener)
          ? opener
          : document.querySelector<HTMLElement>('[data-tour="tour-launcher"]');
      target?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); // do not open the command palette behind the tour
        e.stopPropagation();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      } else if (e.key === 'Tab') {
        const card = cardRef.current;
        if (!card) return;
        const focusable = Array.from(
          card.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
        );
        if (!focusable.length) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!card.contains(active) || (e.shiftKey && (active === first || active === card))) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [next, back, onClose]);

  const mod = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';
  const text = (value: string) => value.replace('{mod}', mod);

  return createPortal(
    <>
      {/* Catches clicks so the page behind cannot be used mid-tour; dims it when nothing is highlighted. */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[200] ${box ? '' : 'bg-gray-950/75'}`}
        onClick={(e) => e.stopPropagation()}
      />
      {box && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[201] rounded-xl transition-[transform,width,height] duration-200 ease-out"
          style={{
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            transform: `translate(${box.left - PAD}px, ${box.top - PAD}px)`,
            boxShadow: '0 0 0 2px rgba(52,211,153,0.9), 0 0 0 100vmax rgba(2,6,23,0.72)',
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="fixed z-[202] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-2xl outline-none"
        style={{ top: pos.top, left: pos.left }}
      >
        <div key={step.id} className="animate-in fade-in duration-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Step {index + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Skip the tour"
              className="-mr-1 rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 id="tour-title" className="text-base font-bold text-gray-100">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-2 text-sm leading-relaxed text-gray-400">
            {text(step.body)}
          </p>
          {step.bullets && (
            <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
              {step.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  <span>{text(b)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 h-0.5 overflow-hidden rounded bg-gray-800" aria-hidden>
          <div
            className="h-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {isLast ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              Skip tour
            </button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
