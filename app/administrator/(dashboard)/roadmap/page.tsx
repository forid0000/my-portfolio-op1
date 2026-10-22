'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { extractApiErrorMessage } from '@/lib/utils';

interface RoadmapItem {
  _dndId?: string;
  year: string;
  title: string;
  description: string;
  tech: string[];
  icon: string;
}

export default function RoadmapCMS() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(items, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/roadmap')
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data.roadmapItems || []).map((item: RoadmapItem) => ({
          ...item,
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
        }));
        setItems(loaded);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((i) => i._dndId === active.id);
        const newIndex = currentItems.findIndex((i) => i._dndId === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  const handleItemChange = (index: number, field: keyof RoadmapItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _dndId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2),
        year: '2026',
        title: 'New_Goal',
        description: '',
        tech: [],
        icon: 'Zap',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleTechAdd = (itemIndex: number, tech: string) => {
    if (!tech.trim()) return;
    const newItems = [...items];
    const currentItem = { ...newItems[itemIndex] };
    const currentTech = currentItem.tech ? [...currentItem.tech] : [];

    if (!currentTech.includes(tech.trim())) {
      currentTech.push(tech.trim());
      currentItem.tech = currentTech;
      newItems[itemIndex] = currentItem;
      setItems(newItems);
    }
  };

  const removeTech = (itemIndex: number, techIndex: number) => {
    const newItems = [...items];
    const currentItem = { ...newItems[itemIndex] };
    const currentTech = currentItem.tech ? [...currentItem.tech] : [];

    currentTech.splice(techIndex, 1);
    currentItem.tech = currentTech;
    newItems[itemIndex] = currentItem;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const item of items) {
      if (!item.year.trim() || !item.title.trim() || !item.description.trim()) {
        toast.error(
          'Validation Error: Timeframe, Node Title, and Description are required for all nodes.'
        );
        return;
      }
    }

    setSaving(true);

    const payload = items.map(({ _dndId, ...rest }) => rest);

    try {
      const res = await fetch('/api/admin/content/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapItems: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Roadmap updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(items);
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
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Roadmap Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your System Evolution Path and future goals.
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed space-y-2">
              <p>
                <strong className="text-blue-300">Admin Hint:</strong> Use clear, descriptive
                Timeframes (e.g., <code>Q4 2026</code> or <code>Early 2027</code>). Ensure every
                node has at least one tech stack tag for visual completeness. Drag items to reorder
                the timeline.
              </p>
              <p>
                <strong className="text-blue-300">Icons:</strong> Pick from the icon picker's
                curated grid, or search/type any exact name from{' '}
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  lucide.dev/icons
                </a>{' '}
                — no developer needed, any valid lucide icon works.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Evolution Nodes</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Timeline Node
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i._dndId!)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <SortableItem
                    key={item._dndId}
                    id={item._dndId!}
                    className="relative group"
                    dragHandleClassName="top-3 left-3 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative group">
                      <button
                        onClick={() => removeItem(idx)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove this timeline node"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <h4 className="text-emerald-500 font-mono text-sm mb-4 border-b border-gray-800 pb-2">
                        Timeline Node {idx + 1}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Timeframe
                          </label>
                          <input
                            type="text"
                            value={item.year || ''}
                            onChange={(e) => handleItemChange(idx, 'year', e.target.value)}
                            placeholder="e.g. Q4 2026"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 font-mono focus:outline-none focus:border-emerald-500 transition-all text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Node Title
                          </label>
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                            placeholder="e.g. AWS_Mastery"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 font-bold focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Icon
                          </label>
                          <IconPicker
                            value={item.icon || 'Zap'}
                            onChange={(name) => handleItemChange(idx, 'icon', name)}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Description
                        </label>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          rows={3}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Tech Stack Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(item.tech || []).map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                            >
                              {tech}
                              <button
                                onClick={() => removeTech(idx, tIdx)}
                                className="hover:text-red-400 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a technology and press Enter to add..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTechAdd(idx, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}

                {items.length === 0 && (
                  <div className="text-center p-12 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                    <p className="text-gray-500 mb-4">No roadmap nodes added yet.</p>
                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add First Node
                    </button>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
