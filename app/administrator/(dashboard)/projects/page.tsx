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

interface Project {
  _dndId?: string;
  title: string;
  description: string;
  tags: string[];
  github: string;
  demo?: string;
  featured?: boolean;
}

export default function ProjectsCMS() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(projects, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/projects')
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data.projects || []).map((p: Project) => ({
          ...p,
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
        }));
        setProjects(loaded);
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
      setProjects((items) => {
        const oldIndex = items.findIndex((i) => i._dndId === active.id);
        const newIndex = items.findIndex((i) => i._dndId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleProjectChange = (index: number, field: keyof Project, value: string | boolean) => {
    const newProjs = [...projects];
    newProjs[index] = { ...newProjs[index], [field]: value };
    setProjects(newProjs);
  };

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        _dndId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2),
        title: 'New_Project',
        description: '',
        tags: [],
        github: '',
        demo: '',
        featured: false,
      },
    ]);
  };

  const removeProject = (index: number) => {
    const newProjs = [...projects];
    newProjs.splice(index, 1);
    setProjects(newProjs);
  };

  const handleTagAdd = (projIndex: number, tag: string) => {
    if (!tag.trim()) return;
    const newProjs = [...projects];
    const currentProj = { ...newProjs[projIndex] };
    const currentTags = currentProj.tags ? [...currentProj.tags] : [];

    if (!currentTags.includes(tag.trim())) {
      currentTags.push(tag.trim());
      currentProj.tags = currentTags;
      newProjs[projIndex] = currentProj;
      setProjects(newProjs);
    }
  };

  const removeTag = (projIndex: number, tagIndex: number) => {
    const newProjs = [...projects];
    const currentProj = { ...newProjs[projIndex] };
    const currentTags = currentProj.tags ? [...currentProj.tags] : [];

    currentTags.splice(tagIndex, 1);
    currentProj.tags = currentTags;
    newProjs[projIndex] = currentProj;
    setProjects(newProjs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (const proj of projects) {
      if (!proj.title.trim() || !proj.description.trim() || !proj.github.trim()) {
        toast.error(
          'Validation Error: Project Title, Description, and GitHub URL are required for all projects.'
        );
        return;
      }
    }

    setSaving(true);

    // Strip out _dndId before saving
    const payload = projects.map(({ _dndId, ...rest }) => rest);

    try {
      const res = await fetch('/api/admin/content/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Projects updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      markClean(projects);
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Projects Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your portfolio projects and case studies.
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
              <strong className="text-blue-300">Admin Hint:</strong> Project Titles should ideally
              be in <code>CamelCase</code> or use underscores (<code>My_Project</code>) to fit the
              developer aesthetic. You can drag and drop to reorder the projects.
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Projects Directory</h3>
            <button
              onClick={addProject}
              className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={projects.map((p) => p._dndId!)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {projects.map((proj, idx) => (
                  <SortableItem
                    key={proj._dndId}
                    id={proj._dndId!}
                    className="relative group"
                    dragHandleClassName="top-3 left-3 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative group">
                      <button
                        onClick={() => removeProject(idx)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove this project"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <h4 className="text-emerald-500 font-mono text-sm mb-4 border-b border-gray-800 pb-2">
                        Project Node {idx + 1}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2 flex items-center justify-between bg-gray-950 px-4 py-2 border border-gray-800 rounded-lg">
                          <label className="text-sm font-medium text-gray-400">
                            Featured Project?
                          </label>
                          <input
                            type="checkbox"
                            checked={!!proj.featured}
                            onChange={(e) => handleProjectChange(idx, 'featured', e.target.checked)}
                            className="w-5 h-5 accent-emerald-500 rounded bg-gray-900 border-gray-700"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Project Title
                          </label>
                          <input
                            type="text"
                            value={proj.title || ''}
                            onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                            placeholder="e.g. Project_One"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 font-bold focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            GitHub URL
                          </label>
                          <input
                            type="text"
                            value={proj.github || ''}
                            onChange={(e) => handleProjectChange(idx, 'github', e.target.value)}
                            placeholder="https://github.com/..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Live Demo URL (Optional)
                          </label>
                          <input
                            type="text"
                            value={proj.demo || ''}
                            onChange={(e) => handleProjectChange(idx, 'demo', e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Description
                        </label>
                        <textarea
                          value={proj.description || ''}
                          onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                          rows={4}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Tech Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(proj.tags || []).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                            >
                              [{tag}]
                              <button
                                onClick={() => removeTag(idx, tIdx)}
                                className="hover:text-red-400 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a tag and press Enter to add..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleTagAdd(idx, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}

                {projects.length === 0 && (
                  <div className="text-center p-12 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                    <p className="text-gray-500 mb-4">No projects added yet.</p>
                    <button
                      onClick={addProject}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add First Project
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
