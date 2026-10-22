/**
 * Lightweight returning-visitor counter backed by localStorage. Shared by
 * /kits/system (shown as a self-diagnostic) and the contact form (attached
 * to submissions so a repeat visitor reaching out reads differently than a
 * first-time one). Client-only.
 */
const STORAGE_KEY = 'my-portfolio-op1-visit-meta';

export interface VisitInfo {
  visitCount: number;
  isReturning: boolean;
  firstVisitAt: string | null;
}

// Guards against React 18 Strict Mode's double effect invocation double-counting
// a single real page load within the same tab session.
let countedThisSession = false;
let cachedInfo: VisitInfo | null = null;

export function getVisitInfo(): VisitInfo {
  if (countedThisSession && cachedInfo) return cachedInfo;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const now = new Date().toISOString();

    if (raw) {
      const parsed = JSON.parse(raw) as { count: number; firstVisitAt: string };
      const updated = { count: parsed.count + 1, firstVisitAt: parsed.firstVisitAt };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      cachedInfo = {
        visitCount: updated.count,
        isReturning: true,
        firstVisitAt: updated.firstVisitAt,
      };
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 1, firstVisitAt: now }));
      cachedInfo = { visitCount: 1, isReturning: false, firstVisitAt: now };
    }
  } catch {
    // localStorage unavailable (private mode, blocked, or SSR)
    cachedInfo = { visitCount: 1, isReturning: false, firstVisitAt: null };
  }

  countedThisSession = true;
  return cachedInfo;
}
