'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Loader2, Info, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { Switch } from '@/components/ui/switch';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';
import {
  CHROME_DEFAULTS,
  CUSTOM_NAV_PREFIX,
  NAV_BUILTINS,
  NAV_LABEL_MAX,
  mergeChrome,
  type ChromeContent,
  type NavEntry,
} from '@/lib/chrome-model';
import { isSafeHref } from '@/lib/safe-href';
import { reportFieldIssues, type FieldIssue } from '@/lib/field-errors';

const inputClass =
  'w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500 transition-all';

const BUILTIN_BY_ID = new Map(NAV_BUILTINS.map((b) => [b.id, b]));

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/**
 * Where visitors can click, and which optional pieces of the page exist. Sections themselves are
 * switched on and off under Sections & Layout; this page decides what the menu, the footer and
 * the home page buttons show.
 */
export default function NavigationPage() {
  const [chrome, setChrome] = useState<ChromeContent>(CHROME_DEFAULTS);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(chrome, loading);
  const sensors = useSafeDndSensors();

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/content/chrome').then((r) => r.json()),
      fetch('/api/admin/content/layout')
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([stored, layout]) => {
        setChrome(mergeChrome(stored));
        if (Array.isArray(layout?.sections)) {
          setHiddenSections(
            new Set(layout.sections.filter((s: any) => s.isEnabled === false).map((s: any) => s.id))
          );
        }
      })
      .catch(() => toast.error('Failed to load existing data'))
      .finally(() => setLoading(false));
  }, []);

  const patchEntry = (id: string, patch: Partial<NavEntry>) =>
    setChrome((c) => ({ ...c, nav: c.nav.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setChrome((c) => {
      const from = c.nav.findIndex((e) => e.id === active.id);
      const to = c.nav.findIndex((e) => e.id === over.id);
      return { ...c, nav: arrayMove(c.nav, from, to) };
    });
  };

  const addCustom = () =>
    setChrome((c) => ({
      ...c,
      nav: [
        ...c.nav,
        {
          id: `${CUSTOM_NAV_PREFIX}${Date.now().toString(36)}`,
          label: '',
          href: 'https://',
          enabled: true,
          newTab: true,
        },
      ],
    }));

  const removeCustom = (id: string) =>
    setChrome((c) => ({ ...c, nav: c.nav.filter((e) => e.id !== id) }));

  const handleSave = async () => {
    const required = { code: 'too_small', origin: 'string', minimum: 1, message: 'Required' };
    const issues: FieldIssue[] = [];
    chrome.nav.forEach((entry, i) => {
      if (!entry.label.trim()) issues.push({ ...required, path: ['nav', i, 'label'] });
      if (entry.id.startsWith(CUSTOM_NAV_PREFIX) && !isSafeHref(entry.href)) {
        issues.push({
          path: ['nav', i, 'href'],
          code: 'invalid_format',
          format: 'url',
          message: 'Enter a full web address',
        });
      }
    });
    if (issues.length) {
      const { summary } = reportFieldIssues(issues, chrome);
      toast.error('Please fix the highlighted fields', { description: summary });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/chrome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chrome),
      });
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(await res.json().catch(() => ({}))));
      }
      markClean(chrome);
      toast.success('Navigation updated', {
        description: 'Changes are now live on your portfolio.',
      });
    } catch (err) {
      toast.error('Failed to save', {
        description:
          err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
            Navigation &amp; Visibility
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Choose the menu links, rename them, add your own, and hide anything you do not need.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200 leading-relaxed">
              Hiding a whole section (About, Projects, ...) is done in{' '}
              <Link href="/administrator/sections" className="underline">
                Sections &amp; Layout
              </Link>
              . A link to a hidden section never shows, whatever its switch says here.
            </p>
          </div>

          {/* Menu links */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Menu links</h3>
              <button
                type="button"
                onClick={addCustom}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
              >
                <Plus className="w-4 h-4" /> Add a link
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Drag to reorder. The header menu and the footer &quot;Explore&quot; list both follow
              this order.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={chrome.nav.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {chrome.nav.map((entry, index) => {
                    const builtin = BUILTIN_BY_ID.get(entry.id);
                    const sectionHidden = !!builtin?.section && hiddenSections.has(builtin.section);
                    return (
                      <SortableItem
                        key={entry.id}
                        id={entry.id}
                        className="relative"
                        dragHandleClassName="left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center p-0"
                      >
                        <div className="rounded-lg border border-gray-800 bg-gray-900 pl-12 pr-4 py-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={entry.label}
                              maxLength={NAV_LABEL_MAX}
                              data-field={`nav.${index}.label`}
                              onChange={(e) => patchEntry(entry.id, { label: e.target.value })}
                              placeholder="Link name"
                              aria-label="Link name"
                              dir="auto"
                              className={`${inputClass} flex-1 min-w-0`}
                            />
                            <span className="hidden sm:block shrink-0 text-xs font-mono text-gray-500">
                              {builtin ? builtin.href : 'custom'}
                            </span>
                            {!builtin && (
                              <button
                                type="button"
                                onClick={() => removeCustom(entry.id)}
                                aria-label="Remove link"
                                title="Remove link"
                                className="shrink-0 rounded-lg p-2 text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <Switch
                              checked={entry.enabled}
                              onCheckedChange={(checked) =>
                                patchEntry(entry.id, { enabled: checked })
                              }
                              aria-label={`Show ${entry.label || 'link'} in the menu`}
                            />
                          </div>
                          {!builtin && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={entry.href ?? ''}
                                data-field={`nav.${index}.href`}
                                onChange={(e) => patchEntry(entry.id, { href: e.target.value })}
                                placeholder="https://example.com or /about"
                                aria-label="Link address"
                                className={`${inputClass} flex-1 font-mono`}
                              />
                              <label className="flex shrink-0 items-center gap-2 text-sm text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={!!entry.newTab}
                                  onChange={(e) =>
                                    patchEntry(entry.id, { newTab: e.target.checked })
                                  }
                                  className="accent-emerald-500"
                                />
                                <ExternalLink className="w-3.5 h-3.5" /> New tab
                              </label>
                            </div>
                          )}
                          {sectionHidden && (
                            <p className="text-xs text-amber-400">
                              This section is hidden in Sections &amp; Layout, so the link is not
                              shown.
                            </p>
                          )}
                          {entry.id === 'notes' && (
                            <p className="text-xs text-gray-500">
                              A shortcut to your private notes vault; visitors only see the lock
                              screen. Switch it off if you do not use notes.
                            </p>
                          )}
                        </div>
                      </SortableItem>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* Corner button */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-200">Floating contact button</h3>
            <ToggleRow
              label="Show the contact button in the corner"
              hint="The round button that opens your quick contact list. Edit its contents under Floating Contact."
              checked={chrome.floatingContact}
              onChange={(value) => setChrome((c) => ({ ...c, floatingContact: value }))}
            />
          </section>

          {/* Home page buttons */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-200">Top of the home page</h3>
            <ToggleRow
              label="Download CV button"
              hint="Only appears while a resume is uploaded and active in the Media Manager."
              checked={chrome.hero.resume}
              onChange={(value) => setChrome((c) => ({ ...c, hero: { ...c.hero, resume: value } }))}
            />
            <ToggleRow
              label="Social links row"
              checked={chrome.hero.socials}
              onChange={(value) =>
                setChrome((c) => ({ ...c, hero: { ...c.hero, socials: value } }))
              }
            />
          </section>

          {/* Footer */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-200">Footer</h3>
            {(
              [
                ['brand', 'Name and short text', undefined],
                ['explore', 'Explore links', 'Follows the menu links above.'],
                ['connect', 'Social links', 'Edit them under Global Settings.'],
                ['copyright', 'Copyright line', undefined],
                ['adminLink', 'Admin link', 'The small link to this control panel.'],
                ['location', 'Place and local time', undefined],
              ] as const
            ).map(([key, label, hint]) => (
              <ToggleRow
                key={key}
                label={label}
                hint={hint}
                checked={chrome.footer[key]}
                onChange={(value) =>
                  setChrome((c) => ({ ...c, footer: { ...c.footer, [key]: value } }))
                }
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
