'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Lightbulb } from 'lucide-react';
import { Glyph, IconPicker, useIconGlyphs } from '@/components/admin/icon-picker';
import { LINK_ICON_CHOICES } from '@/lib/link-icon';

const CHOICE_NAMES = LINK_ICON_CHOICES.map((c) => c.name);

/**
 * "Which icon goes in front of this link?" for any kind of work: a small button showing the current
 * icon opens a panel with "Automatic" (the site guesses from the label and the address), icons for
 * everyday uses (paper, video, booking, shop, phone, certificate...), the common brand marks, and
 * a search over every icon there is. `auto` is the name the site would pick on its own.
 */
export function LinkIconField({
  value,
  auto,
  onChange,
  label = 'Icon',
}: {
  /** The owner's choice; empty = automatic. */
  value: string;
  /** What "Automatic" resolves to right now. */
  auto: string;
  onChange: (name: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => [value || auto], [value, auto]);
  const glyph = useIconGlyphs(shown);
  const glyphOfChoices = useIconGlyphs(CHOICE_NAMES, open);
  const glyphOfAuto = useIconGlyphs(
    useMemo(() => [auto], [auto]),
    open
  );

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setSearching(false);
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

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearching(false);
  };
  const current = value || auto;
  const choiceLabel = LINK_ICON_CHOICES.find((c) => c.name === current)?.label ?? current;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${label}: ${value ? choiceLabel : `automatic (${choiceLabel})`}. Change`}
        aria-expanded={open}
        title={value ? `${label}: ${choiceLabel}` : `${label}: automatic (${choiceLabel})`}
        className="relative flex h-10 w-12 items-center justify-center gap-0.5 rounded border border-gray-800 bg-gray-950 text-emerald-400 hover:border-emerald-600"
      >
        <Glyph name={current} data={glyph(current)} className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 text-gray-500" />
        {!value && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-emerald-400"
          >
            <Lightbulb className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-3rem)] space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-3 shadow-2xl">
          <button
            type="button"
            onClick={() => pick('')}
            aria-pressed={!value}
            className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
              !value
                ? 'border-emerald-600 bg-emerald-950/40'
                : 'border-gray-800 bg-gray-950 hover:border-gray-700'
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-900 text-emerald-400">
              <Glyph name={auto} data={glyphOfAuto(auto)} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-100">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-400" /> Automatic
              </span>
              <span className="block text-[11px] leading-snug text-gray-400">
                The site picks a fitting icon from the words and the address (a paper, a video, a
                booking page, GitHub...). Change the label and the icon follows.
              </span>
            </span>
            {!value && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
          </button>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Or choose one
            </p>
            <div className="grid grid-cols-6 gap-1">
              {LINK_ICON_CHOICES.map((choice) => {
                const active = value === choice.name;
                return (
                  <button
                    key={choice.name}
                    type="button"
                    onClick={() => pick(choice.name)}
                    title={choice.label}
                    aria-label={choice.label}
                    aria-pressed={active}
                    className={`relative flex h-9 items-center justify-center rounded transition-colors ${
                      active
                        ? 'bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-600'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    }`}
                  >
                    <Glyph
                      name={choice.name}
                      data={glyphOfChoices(choice.name)}
                      className="h-4 w-4"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setSearching((v) => !v)}
              aria-expanded={searching}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400"
            >
              <Search className="h-3.5 w-3.5" /> Search every icon (50,000+)
            </button>
            {searching && (
              <div className="mt-2">
                <IconPicker
                  value={value}
                  onChange={pick}
                  scope="all"
                  allowCustom={false}
                  searchPlaceholder="Try: stethoscope, hammer, camera, scale, book…"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
