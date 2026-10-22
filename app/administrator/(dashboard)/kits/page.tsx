'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Wrench, Info } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { extractApiErrorMessage } from '@/lib/utils';
import {
  KITS_DEFAULTS,
  KITS_COLOR_MAP,
  mergeKitsContent,
  type KitsContent,
  type KitTool,
} from '@/lib/kits-registry';

export default function KitsCMS() {
  const [content, setContent] = useState<KitsContent>(KITS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isDirty, markClean } = useUnsavedWarning(content, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/kits')
      .then((r) => r.json())
      .then((d) => setContent(mergeKitsContent(Object.keys(d).length ? d : null)))
      .catch(() => toast.error('Failed to load Kits content'))
      .finally(() => setLoading(false));
  }, []);

  const handlePageField = (key: keyof Omit<KitsContent, 'tools'>, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const handleToolChange = (toolKey: string, field: keyof KitTool, value: string) => {
    setContent((prev) => ({
      ...prev,
      tools: prev.tools.map((t) => (t.key === toolKey ? { ...t, [field]: value } : t)),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setContent((prev) => {
        const oldIndex = prev.tools.findIndex((t) => t.key === active.id);
        const newIndex = prev.tools.findIndex((t) => t.key === over.id);
        return { ...prev, tools: arrayMove(prev.tools, oldIndex, newIndex) };
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      markClean(content);
      toast.success('Kits content saved successfully!', {
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
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" /> Kits
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage each tool's name, description, icon, and accent color, and drag to reorder the
            nav.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/80 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> The route path for each tool is
              fixed (tied to the actual page it links to) so it isn't editable here. Icon is any
              lucide icon - search or pick from the grid. Accent color stays a fixed palette so
              every combination guaranteed looks right. Reordering the list also reorders the tab
              bar and the &ldquo;Explore All Utilities&rdquo; grid on the live site.
            </div>
          </div>

          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Page Text
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={content.pageHeading}
                  onChange={(e) => handlePageField('pageHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Highlight (Colored)
                </label>
                <input
                  type="text"
                  value={content.pageHighlight}
                  onChange={(e) => handlePageField('pageHighlight', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Subtext
                </label>
                <input
                  type="text"
                  value={content.pageSubtext}
                  onChange={(e) => handlePageField('pageSubtext', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  "Explore All Utilities" Section Heading
                </label>
                <input
                  type="text"
                  value={content.exploreHeading}
                  onChange={(e) => handlePageField('exploreHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Tools</h3>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={content.tools.map((t) => t.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {content.tools.map((tool, idx) => {
                  const colorSwatch = KITS_COLOR_MAP[tool.accentColor] || KITS_COLOR_MAP.primary;
                  return (
                    <SortableItem
                      key={tool.key}
                      id={tool.key}
                      className="relative group"
                      dragHandleClassName="left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center p-0"
                    >
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl pl-12">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                          <h4 className="text-emerald-500 font-mono text-sm">
                            {tool.name || `Tool ${idx + 1}`}
                          </h4>
                          <code className="text-[10px] text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                            /kits/{tool.key}
                          </code>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={tool.name}
                              onChange={(e) => handleToolChange(tool.key, 'name', e.target.value)}
                              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Icon
                            </label>
                            <IconPicker
                              value={tool.icon}
                              onChange={(name) => handleToolChange(tool.key, 'icon', name)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Accent Color
                            </label>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-full border shrink-0 ${colorSwatch.bg} ${colorSwatch.border}`}
                              />
                              <select
                                value={tool.accentColor}
                                onChange={(e) =>
                                  handleToolChange(tool.key, 'accentColor', e.target.value)
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
                              >
                                {Object.keys(KITS_COLOR_MAP).map((colorName) => (
                                  <option key={colorName} value={colorName}>
                                    {colorName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Description (also used as SEO description)
                          </label>
                          <textarea
                            value={tool.description}
                            onChange={(e) =>
                              handleToolChange(tool.key, 'description', e.target.value)
                            }
                            rows={2}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed text-sm"
                          />
                        </div>
                      </div>
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
