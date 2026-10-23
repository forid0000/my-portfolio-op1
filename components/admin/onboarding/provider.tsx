'use client';

/**
 * Admin onboarding state, shared by the layout (tour launcher, tour overlay) and the
 * dashboard (welcome prompt, getting-started checklist).
 *
 * The overview comes from /api/admin/onboarding. Completion is detected on the
 * server from the real configuration; this provider only displays it and sends the
 * owner's choices back (skip, dismiss, tour seen). The tour itself is loaded on
 * demand, so it costs nothing until someone starts it.
 */
import dynamic from 'next/dynamic';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Compass } from 'lucide-react';
import { toast } from 'sonner';
import type { OnboardingAction, OnboardingOverview } from '@/lib/onboarding-types';

const Tour = dynamic(() => import('./tour'), { ssr: false });

interface OnboardingContextValue {
  overview: OnboardingOverview | null;
  /** True until the first response (or failure) arrives. */
  loading: boolean;
  /** Set when the checklist could not be loaded; the rest of the admin still works. */
  error: string | null;
  refresh: () => Promise<void>;
  act: (action: OnboardingAction) => Promise<boolean>;
  tourOpen: boolean;
  startTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return value;
}

/** Do not refetch on every tab focus; the checklist only needs to be roughly current. */
const REFOCUS_REFRESH_MS = 20_000;

export function OnboardingProvider({
  children,
  setMenuOpen,
}: {
  children: ReactNode;
  /** Opens or closes the phone sidebar; the tour needs it to reach sidebar items. */
  setMenuOpen: (open: boolean) => void;
}) {
  const [overview, setOverview] = useState<OnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const lastFetch = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/onboarding', { cache: 'no-store' });
      if (res.status === 401) return; // the layout handles an expired session
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not load the setup checklist.');
      setOverview(data as OnboardingOverview);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the setup checklist.');
    } finally {
      lastFetch.current = Date.now();
      setLoading(false);
    }
  }, []);

  const act = useCallback(async (action: OnboardingAction) => {
    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not save your choice.');
      setOverview(data as OnboardingOverview);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your choice.');
      return false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Coming back to the tab after configuring something elsewhere: pick up the new state.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetch.current > REFOCUS_REFRESH_MS
      ) {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const startTour = useCallback(() => {
    setMenuOpen(false); // the tour opens it itself when a step needs it
    setTourOpen(true);
  }, [setMenuOpen]);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    setMenuOpen(false);
    void act({ action: 'tour-done' });
  }, [act, setMenuOpen]);

  const value = useMemo<OnboardingContextValue>(
    () => ({ overview, loading, error, refresh, act, tourOpen, startTour }),
    [overview, loading, error, refresh, act, tourOpen, startTour]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {tourOpen && <Tour onClose={closeTour} setMenuOpen={setMenuOpen} />}
    </OnboardingContext.Provider>
  );
}

/** Sidebar button that (re)starts the tour from any admin page. */
export function TourLauncher({
  className,
  labelClassName,
}: {
  className?: string;
  /** Applied to the text, so the layout can hide it (visually) when the menu is folded. */
  labelClassName?: string;
}) {
  const { startTour, tourOpen } = useOnboarding();
  return (
    <button
      type="button"
      onClick={startTour}
      disabled={tourOpen}
      className={className}
      data-tour="tour-launcher"
      title="Take the tour"
    >
      <Compass className="w-5 h-5 shrink-0" />
      <span className={labelClassName}>Take the tour</span>
    </button>
  );
}
