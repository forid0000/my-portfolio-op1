'use client';

import React, { useEffect, useState } from 'react';
import { Save, Loader2, Info, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { Switch } from '@/components/ui/switch';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';

/**
 * Mirrors PortfolioSectionConfig from lib/sections-registry.ts, redefined
 * locally rather than imported - that registry file also imports every
 * public section component (and next/dynamic), which must never end up in
 * this 'use client' page's bundle.
 */
interface SectionRow {
  id: string;
  label: string;
  isEnabled: boolean;
  order: number;
}

/**
 * Section visibility + order live in their own `layout_content` document
 * (via the dedicated /api/admin/content/layout endpoint) - fully decoupled
 * from `global_content`/Global Settings, so saving one can never race with
 * or accidentally clobber the other.
 */
export default function SectionsLayoutBoard() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(sections, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/layout')
      .then((res) => res.json())
      .then((data) => {
        const fetched: SectionRow[] = Array.isArray(data.sections) ? data.sections : [];
        setSections([...fetched].sort((a, b) => a.order - b.order));
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((s, idx) => ({ ...s, order: idx }));
      });
    }
  };

  const toggleSection = (id: string, isEnabled: boolean) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isEnabled } : s)));
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      toast.success('Layout updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(sections);
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

  const liveCount = sections.filter((s) => s.isEnabled).length;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Sections &amp; Layout</h1>
          <p className="text-gray-400 text-sm mt-1">
            Turn sections on or off and drag to reorder the homepage stack.
          </p>
        </div>
        <button
          onClick={handleSaveLayout}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Layout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed space-y-1">
              <p>
                Drag the handle to reorder sections - the homepage renders top to bottom in this
                exact order. Hidden sections are skipped entirely: no placeholder, no gap, no nav
                link.
              </p>
              <p>
                <strong className="text-blue-300">Kits</strong> is route-level: its toggle controls
                the nav link and the entire <code>/kits</code> tool suite, not a position in the
                page stack.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Render Stack</h3>
            <span className="text-xs font-mono text-gray-500">
              {liveCount} / {sections.length} live
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <SortableItem
                    key={section.id}
                    id={section.id}
                    className="relative"
                    dragHandleClassName="left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-mono text-gray-600 w-6 shrink-0 text-center tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {section.isEnabled ? (
                          <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-600 shrink-0" />
                        )}
                        <p className="text-sm font-medium text-gray-200 truncate min-w-0">
                          {section.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                            section.isEnabled
                              ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30'
                              : 'text-gray-500 border-gray-800 bg-gray-900'
                          }`}
                        >
                          {section.isEnabled ? 'Live' : 'Hidden'}
                        </span>
                        <Switch
                          checked={section.isEnabled}
                          onCheckedChange={(checked) => toggleSection(section.id, checked)}
                          aria-label={`Toggle ${section.label} section visibility`}
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
