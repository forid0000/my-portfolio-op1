'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Cpu, Plus, Trash2, X, Info } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { extractApiErrorMessage } from '@/lib/utils';

interface ExpertiseItem {
  _dndId?: string;
  title: string;
  description: string;
  icon: string;
  skills: string[];
}

const newDndId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2);

export default function ExpertisesPage() {
  const [data, setData] = useState<ExpertiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isDirty, markClean } = useUnsavedWarning(data, loading);
  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/expertises')
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((d) => {
        const content = Array.isArray(d) ? d : d?.content;
        const loaded = (Array.isArray(content) ? content : []).map((item: ExpertiseItem) => ({
          ...item,
          _dndId: newDndId(),
        }));
        setData(loaded);
      })
      .catch(() => toast.error('Failed to load expertises'))
      .finally(() => setLoading(false));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex((it) => it._dndId === active.id);
        const newIndex = prev.findIndex((it) => it._dndId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    for (const item of data) {
      if (!item.title.trim()) {
        toast.error('Validation Error: every expertise card needs a title.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = data.map(({ _dndId, ...rest }) => rest);
      const res = await fetch('/api/admin/content/expertises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      markClean(data);
      toast.success('Expertises saved successfully!', {
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

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  const updateItem = (index: number, key: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [key]: value };
    setData(newData);
  };

  const addItem = () => {
    setData([
      ...data,
      { _dndId: newDndId(), title: 'New_Expertise', description: '', icon: 'Code', skills: [] },
    ]);
  };

  const removeItem = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  const addSkills = (index: number, raw: string) => {
    const incoming = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const current: string[] = data[index].skills || [];
    updateItem(index, 'skills', [...current, ...incoming.filter((s) => !current.includes(s))]);
  };

  const removeSkill = (index: number, skillIndex: number) => {
    const current = [...(data[index].skills || [])];
    current.splice(skillIndex, 1);
    updateItem(index, 'skills', current);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" /> Industry Expertises
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage your professional expertise cards.</p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs font-medium text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{' '}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 leading-relaxed">
            <strong className="text-blue-300">Admin Hint:</strong> Each card needs a Title
            (shown as-is, so use underscores like <code>Frontend_Architecture</code> for the
            terminal look) and an Icon — pick one from the picker or type any exact name from{' '}
            <code>lucide.dev/icons</code>. An unrecognized icon name silently falls back to a
            generic code-brackets glyph on the live site rather than breaking the page, but the
            picker will warn you first. Drag the grip to reorder cards; order is saved exactly as
            arranged here.
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.map((it) => it._dndId!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {data.map((item, index) => (
                <SortableItem
                  key={item._dndId}
                  id={item._dndId!}
                  className="relative group"
                  dragHandleClassName="top-4 left-4 z-10 w-8 h-8 flex items-center justify-center p-0"
                >
                  <div className="p-5 pl-14 bg-gray-900 border border-gray-800 rounded-xl relative">
                    <button
                      onClick={() => removeItem(index)}
                      className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors z-10"
                      title="Remove this expertise card"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Title
                        </label>
                        <input
                          value={item.title}
                          onChange={(e) => updateItem(index, 'title', e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Icon
                        </label>
                        <IconPicker
                          value={item.icon}
                          onChange={(name) => updateItem(index, 'icon', name)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Description
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 h-20"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Skills
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(item.skills || []).map((skill: string, sIdx: number) => (
                            <span
                              key={`${skill}-${sIdx}`}
                              className="px-2 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                            >
                              {skill}
                              <button
                                onClick={() => removeSkill(index, sIdx)}
                                className="hover:text-red-400 ml-1"
                                title="Remove skill"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a skill and press Enter — paste comma-separated lists too"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkills(index, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          onBlur={(e) => {
                            addSkills(index, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }}
                          className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={addItem}
          className="flex items-center gap-2 px-4 py-3 border border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-emerald-400 hover:border-emerald-500 w-full justify-center transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Expertise
        </button>
      </div>
    </div>
  );
}
