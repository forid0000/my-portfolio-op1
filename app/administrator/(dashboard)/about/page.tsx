'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { extractApiErrorMessage } from '@/lib/utils';

export default function AboutCMS() {
  const [formData, setFormData] = useState({
    bioText: '',
    quote: '',
    statusTitle: '',
    statusLabel: '',
    kernelValue: '',
    uptimeValue: '',
    whatIDo: [] as { _dndId?: string; title: string; desc: string }[],
    stats: [] as { _dndId?: string; value: string; label: string; icon: string }[],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(formData, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/about')
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          bioText: data.bioText || '',
          quote: data.quote || '',
          statusTitle: data.statusTitle || '',
          statusLabel: data.statusLabel || '',
          kernelValue: data.kernelValue || '',
          uptimeValue: data.uptimeValue || '',
          whatIDo: (data.whatIDo || []).map((item: any) => ({
            ...item,
            _dndId:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2),
          })),
          stats: (data.stats || []).map((stat: any) => ({
            ...stat,
            _dndId:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2),
          })),
        });
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleDragEndWhatIDo = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.whatIDo.findIndex((i) => i._dndId === active.id);
        const newIndex = prev.whatIDo.findIndex((i) => i._dndId === over.id);
        return {
          ...prev,
          whatIDo: arrayMove(prev.whatIDo, oldIndex, newIndex),
        };
      });
    }
  };

  const handleDragEndStats = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.stats.findIndex((i) => i._dndId === active.id);
        const newIndex = prev.stats.findIndex((i) => i._dndId === over.id);
        return {
          ...prev,
          stats: arrayMove(prev.stats, oldIndex, newIndex),
        };
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleWhatIDoChange = (index: number, field: string, value: string) => {
    const newWhatIDo = [...formData.whatIDo];
    newWhatIDo[index] = { ...newWhatIDo[index], [field]: value };
    setFormData((prev) => ({ ...prev, whatIDo: newWhatIDo }));
  };

  const addWhatIDo = () => {
    setFormData((prev) => ({
      ...prev,
      whatIDo: [
        ...prev.whatIDo,
        {
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
          title: '',
          desc: '',
        },
      ],
    }));
  };

  const removeWhatIDo = (index: number) => {
    const newWhatIDo = [...formData.whatIDo];
    newWhatIDo.splice(index, 1);
    setFormData((prev) => ({ ...prev, whatIDo: newWhatIDo }));
  };

  const handleStatChange = (index: number, field: string, value: string) => {
    const newStats = [...formData.stats];
    newStats[index] = { ...newStats[index], [field]: value };
    setFormData((prev) => ({ ...prev, stats: newStats }));
  };

  const addStat = () => {
    setFormData((prev) => ({
      ...prev,
      stats: [
        ...prev.stats,
        {
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
          value: '',
          label: '',
          icon: 'Code2',
        },
      ],
    }));
  };

  const removeStat = (index: number) => {
    const newStats = [...formData.stats];
    newStats.splice(index, 1);
    setFormData((prev) => ({ ...prev, stats: newStats }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.bioText.trim()) {
      toast.error('Validation Error: Bio text cannot be empty.');
      return;
    }
    for (const item of formData.whatIDo) {
      if (!item.title.trim() || !item.desc.trim()) {
        toast.error('Validation Error: Active Process title and description are required.');
        return;
      }
    }
    for (const stat of formData.stats) {
      if (!stat.label.trim() || !stat.value.trim()) {
        toast.error('Validation Error: Stat label and value are required.');
        return;
      }
    }

    setSaving(true);

    const payload = {
      ...formData,
      whatIDo: formData.whatIDo.map(({ _dndId, ...rest }) => rest),
      stats: formData.stats.map(({ _dndId, ...rest }) => rest),
    };

    try {
      const res = await fetch('/api/admin/content/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('About content updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(formData);
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">About Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the bio, skills, and diagnostic stats on your About section.
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
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> Ensure your Terminal Bio is
              concise. Long paragraphs may overflow on smaller screens. Use underscores in "Active
              Process" titles (e.g., <code>Web_Development</code>) to maintain the hacker-style
              aesthetic. Drag items to reorder them.
            </div>
          </div>

          {/* Text Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Main Content
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Terminal Bio (Supports Markdown)
                </label>
                <textarea
                  name="bioText"
                  value={formData.bioText || ''}
                  onChange={handleChange}
                  rows={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Footer Quote</label>
                <input
                  type="text"
                  name="quote"
                  value={formData.quote || ''}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Status & System Badges */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Status &amp; System Badges
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status Title</label>
                <input
                  type="text"
                  value={formData.statusTitle || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, statusTitle: e.target.value }))}
                  placeholder="Open to Collaboration"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status Label</label>
                <input
                  type="text"
                  value={formData.statusLabel || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, statusLabel: e.target.value }))}
                  placeholder="AVAILABLE"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Kernel Value</label>
                <input
                  type="text"
                  value={formData.kernelValue || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, kernelValue: e.target.value }))}
                  placeholder="Linux MOD-custom-y"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 font-mono focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Uptime Value</label>
                <input
                  type="text"
                  value={formData.uptimeValue || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, uptimeValue: e.target.value }))}
                  placeholder="97.99%"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-300 font-mono focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Active Processes Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-6">
              <h3 className="text-lg font-semibold text-gray-200">Active Processes (What I Do)</h3>
              <button
                onClick={addWhatIDo}
                className="flex items-center gap-1 text-xs font-medium bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Process
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndWhatIDo}
            >
              <SortableContext
                items={formData.whatIDo.map((i) => i._dndId!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {formData.whatIDo.map((item, index) => (
                    <SortableItem
                      key={item._dndId}
                      id={item._dndId!}
                      className="relative group"
                      dragHandleClassName="top-4 left-4 z-10 w-8 h-8 flex items-center justify-center p-0"
                    >
                      <div className="flex gap-4 items-start p-4 pl-12 bg-gray-950 border border-gray-800 rounded-lg relative group">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            placeholder="Title (e.g. Web_Development)"
                            value={item.title || ''}
                            onChange={(e) => handleWhatIDoChange(index, 'title', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.desc || ''}
                            onChange={(e) => handleWhatIDoChange(index, 'desc', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <button
                          onClick={() => removeWhatIDo(index)}
                          className="p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </SortableItem>
                  ))}
                  {formData.whatIDo.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">
                      No active processes configured.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* System Diagnostics Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-6">
              <h3 className="text-lg font-semibold text-gray-200">System Diagnostics (Stats)</h3>
              <button
                onClick={addStat}
                className="flex items-center gap-1 text-xs font-medium bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Stat
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndStats}
            >
              <SortableContext
                items={formData.stats.map((i) => i._dndId!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {formData.stats.map((stat, index) => (
                    <SortableItem
                      key={stat._dndId}
                      id={stat._dndId!}
                      className="relative group"
                      dragHandleClassName="top-4 left-4 z-10 w-8 h-8 flex items-center justify-center p-0"
                    >
                      <div className="flex gap-4 items-start p-4 pl-12 bg-gray-950 border border-gray-800 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                          <input
                            type="text"
                            placeholder="Label (e.g. YEARS_UPTIME)"
                            value={stat.label || ''}
                            onChange={(e) => handleStatChange(index, 'label', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. 03+)"
                            value={stat.value || ''}
                            onChange={(e) => handleStatChange(index, 'value', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <IconPicker
                            value={stat.icon}
                            onChange={(name) => handleStatChange(index, 'icon', name)}
                          />
                        </div>
                        <button
                          onClick={() => removeStat(index)}
                          className="p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </SortableItem>
                  ))}
                  {formData.stats.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">No stats configured.</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
