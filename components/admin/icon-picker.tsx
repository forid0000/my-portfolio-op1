'use client';

import { createElement, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Code, Loader2, Search, TriangleAlert } from 'lucide-react';
import { IconSvg, type IconData } from '@/lib/icons/icon-data';
import { SOCIAL_BRAND_ICON_NAMES, resolveBrandIcon } from '@/lib/social-icon';

/** Cap how many matches render as buttons - typing narrows this fast. */
const MAX_RESULTS = 150;

interface IconItem {
  name: string;
  data: IconData | null;
}

// Glyph data seen in this session, so re-opening the picker or revisiting a field is instant.
const dataCache = new Map<string, IconData | null>();

function remember(items: IconItem[]) {
  for (const item of items) dataCache.set(item.name, item.data);
}

/**
 * Loads the drawings of `names` (once per session, shared by every picker on the page) and returns
 * a lookup. Pass a stable array (useMemo or a module constant); `enabled` delays the request.
 */
export function useIconGlyphs(names: readonly string[], enabled = true) {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const missing = names.filter((n) => n && !resolveBrandIcon(n) && !dataCache.has(n));
    if (!missing.length) return;
    const ctrl = new AbortController();
    fetch(`/api/admin/icons?names=${encodeURIComponent(missing.join(','))}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        remember(d.items);
        setVersion((v) => v + 1);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [names, enabled]);
  return (name: string): IconData | null | undefined => dataCache.get(name);
}

/** One glyph: a bundled brand mark, server-resolved SVG data, or a generic fallback. */
export function Glyph({
  name,
  data,
  className,
}: {
  name: string;
  data?: IconData | null;
  className?: string;
}) {
  const Brand = resolveBrandIcon(name);
  // createElement (not a JSX tag): the brand component is a stable module-level
  // reference, which the static "no components during render" rule can't prove.
  if (Brand) return createElement(Brand, { className });
  return data ? <IconSvg data={data} className={className} /> : <Code className={className} />;
}

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  /**
   * Which names to browse. "all": every lucide + react-icons glyph. "social":
   * the bundled brand marks, lucide, and Simple Icons brand logos (used for
   * social/contact links).
   */
  scope?: 'all' | 'social';
  /**
   * Show the "or type an exact name" free-text field. Off for closed sets
   * (social links) where a typo'd entry can't resolve to anything real.
   */
  allowCustom?: boolean;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
}

/**
 * Icon field for CMS-editable content: a searchable grid plus an optional
 * free-text fallback for any exact name, with a live preview and an inline
 * warning when the current value won't resolve.
 *
 * Search runs on the server (/api/admin/icons); the browser never loads an icon
 * library or the 50,000-name catalog.
 */
export function IconPicker({
  value,
  onChange,
  scope = 'all',
  allowCustom = true,
  searchPlaceholder = 'Search 50,000+ icons…',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ total: number; items: IconItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setCacheVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setQuery('');
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Resolve the glyph of the saved value (unless it is a bundled brand mark or already cached).
  useEffect(() => {
    if (!value || resolveBrandIcon(value) || dataCache.has(value)) return;
    const ctrl = new AbortController();
    fetch(`/api/admin/icons?names=${encodeURIComponent(value)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        remember(d.items);
        setCacheVersion((v) => v + 1);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [value]);

  // Server-side search while open (debounced).
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/icons?scope=${scope}&q=${encodeURIComponent(query.trim())}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          remember(d.items);
          setResults(d);
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [open, query, scope]);

  const isBrand = !!resolveBrandIcon(value);
  const resolved = value ? dataCache.get(value) : undefined; // undefined = not looked up yet
  const isKnown = !!value && (isBrand || resolved === undefined || resolved !== null);

  // Bundled brand marks (social scope) are matched locally and listed first.
  const q = query.trim().toLowerCase();
  const brandMatches =
    scope === 'social' ? SOCIAL_BRAND_ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : [];
  const serverItems = results?.items ?? [];
  const shownCount = brandMatches.length + serverItems.length;
  const totalMatches = brandMatches.length + (results?.total ?? 0);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  const renderOption = (name: string, data: IconData | null | undefined) => {
    const active = name === value;
    return (
      <button
        key={name}
        type="button"
        title={name}
        onClick={() => pick(name)}
        className={`relative flex flex-col items-center justify-center gap-1 rounded p-2 transition-colors ${
          active
            ? 'bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-600'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`}
      >
        {active && <Check className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />}
        <Glyph name={name} data={data} className="h-4 w-4" />
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center ${isKnown ? 'text-emerald-400' : 'text-gray-600'}`}
        >
          <Glyph name={value} data={resolved} className="h-4 w-4" />
        </span>
        <span className={`flex-1 truncate text-left font-mono ${value ? '' : 'text-gray-600'}`}>
          {value || 'Pick an icon…'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      {!isKnown && value && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          {allowCustom ? (
            <>
              Unknown icon &quot;{value}&quot; — the live site will fall back to a generic glyph.
              Names are case-sensitive PascalCase (e.g.{' '}
              <code className="text-gray-300">CloudCog</code>).
            </>
          ) : (
            <>&quot;{value}&quot; isn&apos;t in this icon set — pick one from the list below.</>
          )}
        </p>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-80 rounded-lg border border-gray-800 bg-gray-900 shadow-2xl">
          <div className="border-b border-gray-800 p-2">
            <div className="flex items-center gap-2 rounded bg-gray-950 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-600"
              />
              {loading ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-500" />
              ) : (
                <span className="shrink-0 font-mono text-[10px] text-gray-600">{totalMatches}</span>
              )}
            </div>
          </div>

          <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto p-2">
            {brandMatches.map((name) => renderOption(name, null))}
            {serverItems.map((item) => renderOption(item.name, item.data))}
            {!loading && shownCount === 0 && (
              <p className="col-span-8 py-4 text-center text-xs text-gray-500">
                No icon matches &quot;{query}&quot;
                {allowCustom ? ' — type an exact name below instead.' : '.'}
              </p>
            )}
          </div>
          {totalMatches > MAX_RESULTS && (
            <p className="border-t border-gray-800 px-3 py-1.5 text-center text-[10px] text-gray-600">
              Showing the first {shownCount} of {totalMatches} matches — keep typing to narrow it
              down.
            </p>
          )}

          {allowCustom && (
            <div className="border-t border-gray-800 p-2">
              <label className="mb-1 block px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Or type an exact icon name (e.g. FaFacebook)
              </label>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. CloudCog"
                className="w-full rounded border border-gray-800 bg-gray-950 px-2 py-1.5 font-mono text-xs text-gray-200 focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
