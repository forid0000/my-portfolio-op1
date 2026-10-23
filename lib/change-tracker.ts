/**
 * "How many unsaved changes do I have?" for the whole admin.
 *
 * Every editor already watches its own form through useUnsavedWarning. That hook reports here,
 * and the admin layout (the parent of every page) shows the total at the top of the sidebar, so
 * a person always knows whether anything is waiting to be saved and roughly how much.
 *
 * A "change" is one field that differs from the last saved version, or one list item added or
 * removed. This module is browser-only and has no dependencies besides React.
 */
import { useSyncExternalStore } from 'react';
import { describePath, type PathSegment } from '@/lib/field-errors';

export interface ChangeSummary {
  /** Number of unsaved changes across everything on screen. */
  count: number;
  /** Plain-language names of what changed, most recent editor first, capped. */
  items: string[];
  /** Set for a few seconds after a save: how many changes were just saved. */
  justSaved: number;
}

const EMPTY: ChangeSummary = { count: 0, items: [], justSaved: 0 };
const MAX_ITEMS = 14;
const SAVED_FLASH_MS = 5000;

const live = new Map<string, PathSegment[][]>();
const listeners = new Set<() => void>();
let summary: ChangeSummary = EMPTY;
let savedTimer: ReturnType<typeof setTimeout> | undefined;

/** Keys the editors use only to drive drag and drop; they are not content. */
const isInternal = (key: string) => key.startsWith('_dnd') || key === '_id';

/**
 * The places where `after` differs from `before`: changed values, plus one entry per list item
 * added or removed. Both are plain JSON values (parsed from the editors' snapshots).
 */
export function diffPaths(
  before: unknown,
  after: unknown,
  path: PathSegment[] = []
): PathSegment[][] {
  if (Object.is(before, after)) return [];
  const bothArrays = Array.isArray(before) && Array.isArray(after);
  const bothObjects =
    !bothArrays &&
    before !== null &&
    after !== null &&
    typeof before === 'object' &&
    typeof after === 'object' &&
    !Array.isArray(before) &&
    !Array.isArray(after);

  if (bothArrays) {
    const a = before as unknown[];
    const b = after as unknown[];
    const out: PathSegment[][] = [];
    for (let i = 0; i < Math.min(a.length, b.length); i++)
      out.push(...diffPaths(a[i], b[i], [...path, i]));
    // One change per item added or removed, however many fields it holds.
    for (let i = a.length; i < b.length; i++) out.push([...path, i]);
    for (let i = b.length; i < a.length; i++) out.push([...path, i]);
    return out;
  }
  if (bothObjects) {
    const a = before as Record<string, unknown>;
    const b = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const out: PathSegment[][] = [];
    for (const key of keys) {
      if (isInternal(key)) continue;
      out.push(...diffPaths(a[key], b[key], [...path, key]));
    }
    return out;
  }
  return [path.length ? path : ['page']];
}

function rebuild() {
  const all = [...live.values()].flat();
  const labels: string[] = [];
  for (const p of all) {
    const label = describePath(p);
    if (!labels.includes(label)) labels.push(label);
  }
  summary = {
    count: all.length,
    items: labels.slice(0, MAX_ITEMS),
    justSaved: summary.justSaved,
  };
  listeners.forEach((l) => l());
}

/** An editor reports its current unsaved changes (or null when it has none / goes away). */
export function reportChanges(id: string, paths: PathSegment[][] | null) {
  if (paths && paths.length) live.set(id, paths);
  else live.delete(id);
  rebuild();
}

/** An editor just saved: remember how many changes that was, to confirm it for a moment. */
export function reportSaved(id: string) {
  const saved = live.get(id)?.length ?? 0;
  live.delete(id);
  if (saved > 0) {
    summary = { ...summary, justSaved: saved };
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      summary = { ...summary, justSaved: 0 };
      listeners.forEach((l) => l());
    }, SAVED_FLASH_MS);
  }
  rebuild();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The current summary, without subscribing (tests and non-React code). */
export function getChangeSummary(): ChangeSummary {
  return summary;
}

/** The live summary, for the badge in the admin layout. */
export function useChangeSummary(): ChangeSummary {
  return useSyncExternalStore(
    subscribe,
    () => summary,
    () => EMPTY
  );
}

/** Test helper: forget everything. */
export function resetChangeTracker() {
  live.clear();
  clearTimeout(savedTimer);
  summary = EMPTY;
  listeners.forEach((l) => l());
}
