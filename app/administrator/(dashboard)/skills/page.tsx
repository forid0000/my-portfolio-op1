'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { extractApiErrorMessage } from '@/lib/utils';

interface Skill {
  _dndId?: string;
  name: string;
  progress: number;
}

interface Category {
  _dndId?: string;
  name: string;
  icon: string;
  skills: Skill[];
}

export default function SkillsCMS() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(categories, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/skills')
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data.categories || []).map((cat: any) => ({
          ...cat,
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
          skills: (cat.skills || []).map((skill: any) => ({
            ...skill,
            _dndId:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2),
          })),
        }));
        setCategories(loaded);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleDragEndCategory = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((prev) => {
        const oldIndex = prev.findIndex((i) => i._dndId === active.id);
        const newIndex = prev.findIndex((i) => i._dndId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndSkill = (cIdx: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((prev) => {
        const newCats = [...prev];
        const cat = newCats[cIdx];
        const oldIndex = cat.skills.findIndex((i) => i._dndId === active.id);
        const newIndex = cat.skills.findIndex((i) => i._dndId === over.id);
        cat.skills = arrayMove(cat.skills, oldIndex, newIndex);
        return newCats;
      });
    }
  };

  const handleCategoryChange = (index: number, field: keyof Category, value: string) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [field]: value };
    setCategories(newCats);
  };

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        _dndId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2),
        name: 'New_Category',
        icon: 'Layout',
        skills: [],
      },
    ]);
  };

  const removeCategory = (index: number) => {
    const newCats = [...categories];
    newCats.splice(index, 1);
    setCategories(newCats);
  };

  const handleSkillChange = (
    catIndex: number,
    skillIndex: number,
    field: keyof Skill,
    value: string | number
  ) => {
    const newCats = [...categories];
    newCats[catIndex].skills[skillIndex] = {
      ...newCats[catIndex].skills[skillIndex],
      [field]: value,
    };
    setCategories(newCats);
  };

  const addSkill = (catIndex: number) => {
    const newCats = [...categories];
    const currentCat = { ...newCats[catIndex] };
    const currentSkills = currentCat.skills ? [...currentCat.skills] : [];

    currentSkills.push({
      _dndId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2),
      name: '',
      progress: 50,
    });
    currentCat.skills = currentSkills;
    newCats[catIndex] = currentCat;
    setCategories(newCats);
  };

  const removeSkill = (catIndex: number, skillIndex: number) => {
    const newCats = [...categories];
    const currentCat = { ...newCats[catIndex] };
    const currentSkills = currentCat.skills ? [...currentCat.skills] : [];

    currentSkills.splice(skillIndex, 1);
    currentCat.skills = currentSkills;
    newCats[catIndex] = currentCat;
    setCategories(newCats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const cat of categories) {
      if (!cat.name.trim()) {
        toast.error('Validation Error: Category names cannot be empty.');
        return;
      }
      for (const skill of cat.skills) {
        if (!skill.name.trim()) {
          toast.error('Validation Error: Skill names cannot be empty.');
          return;
        }
        if (skill.progress < 0 || skill.progress > 100) {
          toast.error('Validation Error: Skill progress must be between 0 and 100.');
          return;
        }
      }
    }

    setSaving(true);

    const payload = categories.map(({ _dndId, skills, ...rest }) => ({
      ...rest,
      skills: skills.map(({ _dndId, ...sRest }) => sRest),
    }));

    try {
      const res = await fetch('/api/admin/content/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Skills content updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(categories);
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Skills Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your technical skills and proficiency levels.
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
                <strong className="text-blue-300">Admin Hint:</strong> Use Category Names that fit
                the terminal aesthetic (e.g., <code>Frontend_Stack</code> instead of{' '}
                <code>Frontend Stack</code>). Keep skill progress between 0 and 100. Drag categories
                and skills to reorder them.
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
            <h3 className="text-lg font-semibold text-gray-200">Skill Categories</h3>
            <button
              onClick={addCategory}
              className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndCategory}
          >
            <SortableContext
              items={categories.map((c) => c._dndId!)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((cat, cIdx) => (
                  <SortableItem
                    key={cat._dndId}
                    id={cat._dndId!}
                    className="relative group"
                    dragHandleClassName="top-4 left-4 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative group">
                      <button
                        onClick={() => removeCategory(cIdx)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove category"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="space-y-4 mb-6 px-8">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={cat.name || ''}
                            onChange={(e) => handleCategoryChange(cIdx, 'name', e.target.value)}
                            placeholder="e.g. Frontend_Stack"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 font-bold focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Icon
                          </label>
                          <IconPicker
                            value={cat.icon || 'Layout'}
                            onChange={(name) => handleCategoryChange(cIdx, 'icon', name)}
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-emerald-500">
                            Skills ({cat.skills.length})
                          </label>
                          <button
                            onClick={() => addSkill(cIdx)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Skill
                          </button>
                        </div>

                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEndSkill(cIdx, e)}
                        >
                          <SortableContext
                            items={cat.skills.map((s) => s._dndId!)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {(cat.skills || []).map((skill, sIdx) => (
                                <SortableItem
                                  key={skill._dndId}
                                  id={skill._dndId!}
                                  className="relative group"
                                  dragHandleClassName="left-0 z-10 w-6 h-6 flex items-center justify-center p-0 mt-1"
                                >
                                  <div className="flex gap-3 items-center group/skill pl-8">
                                    <input
                                      type="text"
                                      value={skill.name || ''}
                                      onChange={(e) =>
                                        handleSkillChange(cIdx, sIdx, 'name', e.target.value)
                                      }
                                      placeholder="Skill Name"
                                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-gray-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                    <div className="relative flex items-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={skill.progress ?? 50}
                                        onChange={(e) =>
                                          handleSkillChange(
                                            cIdx,
                                            sIdx,
                                            'progress',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-16 bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-5 py-1.5 text-emerald-400 font-bold text-xs focus:outline-none focus:border-emerald-500"
                                      />
                                      <span className="absolute right-2 text-xs text-gray-500">
                                        %
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => removeSkill(cIdx, sIdx)}
                                      className="text-red-500 hover:text-red-400 opacity-0 group-hover/skill:opacity-100 transition-opacity p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </SortableItem>
                              ))}
                              {cat.skills.length === 0 && (
                                <p className="text-gray-500 text-xs italic text-center py-2">
                                  No skills in this category
                                </p>
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  </SortableItem>
                ))}

                {categories.length === 0 && (
                  <div className="col-span-full text-center p-12 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                    <p className="text-gray-500 mb-4">No skill categories added yet.</p>
                    <button
                      onClick={addCategory}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add First Category
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
