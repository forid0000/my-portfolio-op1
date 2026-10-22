'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';

interface Experience {
  _dndId?: string;
  role: string;
  displayRole: string;
  company: string;
  type: string;
  period: string;
  location: string;
  description: string;
  skills: string[];
}

export default function ExperienceCMS() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(experiences, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/experience')
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data.experiences || []).map((e: Experience) => ({
          ...e,
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
        }));
        setExperiences(loaded);
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
      setExperiences((items) => {
        const oldIndex = items.findIndex((i) => i._dndId === active.id);
        const newIndex = items.findIndex((i) => i._dndId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleExpChange = (index: number, field: keyof Experience, value: string) => {
    const newExps = [...experiences];
    newExps[index] = { ...newExps[index], [field]: value };
    setExperiences(newExps);
  };

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        _dndId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2),
        role: 'New_Role',
        displayRole: '',
        company: '',
        type: 'FULL_TIME',
        period: '',
        location: '',
        description: '',
        skills: [],
      },
    ]);
  };

  const removeExperience = (index: number) => {
    const newExps = [...experiences];
    newExps.splice(index, 1);
    setExperiences(newExps);
  };

  const handleSkillAdd = (expIndex: number, skill: string) => {
    if (!skill.trim()) return;
    const newExps = [...experiences];
    const currentExp = { ...newExps[expIndex] };
    const currentSkills = currentExp.skills ? [...currentExp.skills] : [];

    if (!currentSkills.includes(skill.trim())) {
      currentSkills.push(skill.trim());
      currentExp.skills = currentSkills;
      newExps[expIndex] = currentExp;
      setExperiences(newExps);
    }
  };

  const removeSkill = (expIndex: number, skillIndex: number) => {
    const newExps = [...experiences];
    const currentExp = { ...newExps[expIndex] };
    const currentSkills = currentExp.skills ? [...currentExp.skills] : [];

    currentSkills.splice(skillIndex, 1);
    currentExp.skills = currentSkills;
    newExps[expIndex] = currentExp;
    setExperiences(newExps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const exp of experiences) {
      if (!exp.displayRole.trim() || !exp.company.trim() || !exp.period.trim()) {
        toast.error(
          'Validation Error: Role, Company, and Period are required for all experience nodes.'
        );
        return;
      }
    }

    setSaving(true);

    const payload = experiences.map(({ _dndId, ...rest }) => rest);

    try {
      const res = await fetch('/api/admin/content/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiences: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Experience timeline updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(experiences);
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Experience Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your work history, roles, and skills timeline.
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
            <div className="text-sm text-blue-200 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> Ensure dates are consistently
              formatted (e.g., <code>Aug 2023 - Present</code>). Keep descriptions concise but
              impactful. Drag items to reorder the timeline.
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Timeline Nodes</h3>
            <button
              onClick={addExperience}
              className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Experience Block
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={experiences.map((e) => e._dndId!)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {experiences.map((exp, idx) => (
                  <SortableItem
                    key={exp._dndId}
                    id={exp._dndId!}
                    className="relative group"
                    dragHandleClassName="top-3 left-3 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative group">
                      <button
                        onClick={() => removeExperience(idx)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove this experience block"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <h4 className="text-emerald-500 font-mono text-sm mb-4 border-b border-gray-800 pb-2">
                        Node {idx + 1}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Display Role (Header)
                          </label>
                          <input
                            type="text"
                            value={exp.displayRole || ''}
                            onChange={(e) => handleExpChange(idx, 'displayRole', e.target.value)}
                            placeholder="e.g. Senior Developer"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 font-bold focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Company
                          </label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleExpChange(idx, 'company', e.target.value)}
                            placeholder="e.g. Tech Corp"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Time Period
                          </label>
                          <input
                            type="text"
                            value={exp.period || ''}
                            onChange={(e) => handleExpChange(idx, 'period', e.target.value)}
                            placeholder="e.g. Aug 2023 - Present"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={exp.location || ''}
                            onChange={(e) => handleExpChange(idx, 'location', e.target.value)}
                            placeholder="e.g. Remote"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Job Type
                          </label>
                          <input
                            type="text"
                            value={exp.type || ''}
                            onChange={(e) => handleExpChange(idx, 'type', e.target.value)}
                            placeholder="e.g. FULL_TIME"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-primary focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm uppercase"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Description (Log)
                        </label>
                        <textarea
                          value={exp.description || ''}
                          onChange={(e) => handleExpChange(idx, 'description', e.target.value)}
                          rows={3}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Skill Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(exp.skills || []).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                            >
                              [{skill}]
                              <button
                                onClick={() => removeSkill(idx, sIdx)}
                                className="hover:text-red-400 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a skill and press Enter to add..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSkillAdd(idx, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}

                {experiences.length === 0 && (
                  <div className="text-center p-12 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                    <p className="text-gray-500 mb-4">No experience blocks added yet.</p>
                    <button
                      onClick={addExperience}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add First Job
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
