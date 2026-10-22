'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, ChevronDown, TriangleAlert, Check } from 'lucide-react';
import { resolveUniversalIcon, ALL_UNIVERSAL_ICON_NAMES } from '@/lib/universal-icon';

type IconResolver = (name: string) => React.ComponentType<{ className?: string }> | null;

/** Cap how many matches actually render as buttons - typing narrows this fast,
 *  and nobody scrolls past a couple hundred results looking for an icon anyway. */
const MAX_RESULTS = 150;

/**
 * Renders an icon by name via the given resolver, falling back to `fallback`
 * when it's empty/unresolved. Uses createElement rather than a JSX tag on a
 * locally-resolved variable - the resolved component is a stable module
 * reference so identity never actually changes across renders, but the
 * static-analysis "no components created during render" lint rule can't
 * prove that from a dynamic lookup and flags the JSX-tag form as a false
 * positive. `resolve`/`fallback` are passed as props (not closed over) so
 * this stays a single stable top-level component regardless of which
 * IconPicker instance is rendering it.
 */
function IconGlyph({
  name,
  className,
  resolve,
  fallback,
}: {
  name?: string;
  className?: string;
  resolve: IconResolver;
  fallback: React.ComponentType<{ className?: string }>;
}) {
  return createElement((name && resolve(name)) || fallback, { className });
}

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  /** Names to search/browse. Defaults to every lucide-react icon (~1500). */
  icons?: readonly string[];
  /** Resolves a name to a component. Defaults to an exact lucide-react lookup. */
  resolve?: IconResolver;
  /** Shown for empty/unresolved values. Defaults to lucide's Code glyph. */
  fallback?: React.ComponentType<{ className?: string }>;
  /**
   * Show the "or type an exact name" free-text field. Off for closed sets
   * (e.g. floating-contact / global socials, which mix in non-lucide brand
   * icons) where a typo'd free-text entry can't resolve to anything real.
   */
  allowCustom?: boolean;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
}

/**
 * Icon field for CMS-editable content: a real-time searchable grid plus an
 * optional free-text fallback for any exact name, with a live preview and an
 * inline warning when the current value won't resolve (so the admin sees the
 * fallback glyph *before* saving, not after checking the live site).
 *
 * Fully reusable: defaults to searching all ~1500 lucide-react icons, but
 * `icons`/`resolve`/`fallback` can be swapped to point at a closed registry
 * (e.g. floating-contact's mix of lucide + custom brand SVGs) so every icon
 * field in the CMS - open or closed - shares one picker component and UX.
 */
export function IconPicker({
  value,
  onChange,
  icons = ALL_UNIVERSAL_ICON_NAMES,
  resolve = resolveUniversalIcon,
  fallback = LucideIcons.Code,
  allowCustom = true,
  searchPlaceholder = 'Search 50,000+ icons…',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

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

  const isKnown = !!value && resolve(value) !== null;

  const { shown, totalMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? icons.filter((name) => name.toLowerCase().includes(q)) : icons;
    return { shown: matches.slice(0, MAX_RESULTS), totalMatches: matches.length };
  }, [query, icons]);

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
          <IconGlyph name={value} className="h-4 w-4" resolve={resolve} fallback={fallback} />
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
              <span className="shrink-0 font-mono text-[10px] text-gray-600">
                {totalMatches}
              </span>
            </div>
          </div>

          <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto p-2">
            {shown.map((name) => {
              const active = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded p-2 transition-colors ${
                    active
                      ? 'bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-600'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  {active && <Check className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />}
                  <IconGlyph name={name} className="h-4 w-4" resolve={resolve} fallback={fallback} />
                </button>
              );
            })}
            {shown.length === 0 && (
              <p className="col-span-8 py-4 text-center text-xs text-gray-500">
                No icon matches &quot;{query}&quot;
                {allowCustom ? ' — type an exact name below instead.' : '.'}
              </p>
            )}
          </div>
          {totalMatches > MAX_RESULTS && (
            <p className="border-t border-gray-800 px-3 py-1.5 text-center text-[10px] text-gray-600">
              Showing first {MAX_RESULTS} of {totalMatches} matches — keep typing to narrow it down.
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
