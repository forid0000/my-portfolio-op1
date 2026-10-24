'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { MediaUploader } from '@/components/admin/media-uploader';
import { LinkIconField } from '@/components/admin/link-icon-field';
import { autoLinkIcon } from '@/lib/link-icon';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { isSafeHref, normalizeLink } from '@/lib/safe-href';
import type { MediaItem } from '@/lib/media-types';
import { cn, extractApiErrorMessage } from '@/lib/utils';
import { reportFieldIssues, type FieldIssue } from '@/lib/field-errors';

interface ProjectLink {
  label: string;
  url: string;
  /** The owner's icon; empty = automatic. */
  icon?: string;
}

interface Project {
  _dndId?: string;
  title: string;
  description: string;
  tags: string[];
  links: ProjectLink[];
  media: MediaItem[];
  // Legacy single links from before `links` existed; converted on load, mirrored on save.
  github?: string;
  demo?: string;
  featured?: boolean;
}

interface ProjectsState {
  projects: Project[];
  ctaLabel: string;
  ctaUrl: string;
}

// Ideas for any kind of work; the icon follows the words (or pick your own icon for each link).
const LINK_SUGGESTIONS = [
  'Live site',
  'Case study',
  'Research paper',
  'Video',
  'Gallery',
  'Download',
  'Book now',
  'Source code',
  'Behance',
];
const MAX_LINKS = 6;

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2);
}

/** Old documents only had `github` and `demo`; show them as ordinary links. */
function withLinks(p: Partial<Project>): Project {
  const links: ProjectLink[] = Array.isArray(p.links)
    ? p.links
    : [
        ...(p.github?.trim() ? [{ label: 'Source code', url: p.github.trim() }] : []),
        ...(p.demo?.trim() ? [{ label: 'Live site', url: p.demo.trim() }] : []),
      ];
  return {
    _dndId: newId(),
    title: p.title ?? '',
    description: p.description ?? '',
    tags: p.tags ?? [],
    links,
    media: Array.isArray(p.media) ? p.media : [],
    featured: !!p.featured,
  };
}

/** Keeps the old github/demo fields filled for anything outside this app that still reads them. */
function legacyFields(links: ProjectLink[]) {
  const code = links.find((l) => /code|github|source|repo/i.test(l.label));
  const live = links.find((l) => l !== code && /demo|live|site|visit|view/i.test(l.label));
  return { github: code?.url ?? '', demo: live?.url ?? '' };
}

export default function ProjectsCMS() {
  const [state, setState] = useState<ProjectsState>({ projects: [], ctaLabel: '', ctaUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(state, loading);
  const { projects } = state;

  const sensors = useSafeDndSensors();

  const setProjects = (updater: (items: Project[]) => Project[]) =>
    setState((s) => ({ ...s, projects: updater(s.projects) }));

  useEffect(() => {
    fetch('/api/admin/content/projects')
      .then((res) => res.json())
      .then((data) => {
        setState({
          projects: (data.projects || []).map((p: Partial<Project>) => withLinks(p)),
          ctaLabel: data.ctaLabel || '',
          ctaUrl: data.ctaUrl || '',
        });
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
      setProjects((items) => {
        const oldIndex = items.findIndex((i) => i._dndId === active.id);
        const newIndex = items.findIndex((i) => i._dndId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const patchProject = (index: number, patch: Partial<Project>) =>
    setProjects((items) => items.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const addProject = () =>
    setProjects((items) => [
      ...items,
      withLinks({ title: 'New project', description: '', tags: [], links: [], media: [] }),
    ]);

  const removeProject = (index: number) => {
    const project = projects[index];
    const files = project?.media?.length ?? 0;
    if (
      files &&
      !confirm(
        `Remove "${project.title || 'this project'}"? Its ${files} picture${files === 1 ? '' : 's'}/video${files === 1 ? '' : 's'} will be deleted from Cloudinary when you save.`
      )
    ) {
      return;
    }
    setProjects((items) => items.filter((_, i) => i !== index));
  };

  const handleTagAdd = (projIndex: number, tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    setProjects((items) =>
      items.map((p, i) =>
        i === projIndex && !p.tags.includes(clean) ? { ...p, tags: [...p.tags, clean] } : p
      )
    );
  };

  const removeTag = (projIndex: number, tagIndex: number) =>
    setProjects((items) =>
      items.map((p, i) =>
        i === projIndex ? { ...p, tags: p.tags.filter((_, t) => t !== tagIndex) } : p
      )
    );

  const patchLink = (projIndex: number, linkIndex: number, patch: Partial<ProjectLink>) =>
    setProjects((items) =>
      items.map((p, i) =>
        i === projIndex
          ? { ...p, links: p.links.map((l, j) => (j === linkIndex ? { ...l, ...patch } : l)) }
          : p
      )
    );

  const addLink = (projIndex: number, label = '') =>
    setProjects((items) =>
      items.map((p, i) =>
        i === projIndex && p.links.length < MAX_LINKS
          ? { ...p, links: [...p.links, { label, url: '', icon: '' }] }
          : p
      )
    );

  const removeLink = (projIndex: number, linkIndex: number) =>
    setProjects((items) =>
      items.map((p, i) =>
        i === projIndex ? { ...p, links: p.links.filter((_, j) => j !== linkIndex) } : p
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A bare domain such as "behance.net/you" is completed to a full address before it is checked.
    const cleaned = projects.map((proj) => ({
      ...proj,
      links: proj.links.map((l) => ({
        label: l.label.trim(),
        url: normalizeLink(l.url),
        icon: l.icon ?? '',
      })),
    }));
    const ctaUrl = normalizeLink(state.ctaUrl);

    // Check before sending, and show exactly which field needs attention.
    const required = { code: 'too_small', origin: 'string', minimum: 1, message: 'Required' };
    const badAddress = {
      code: 'invalid_format',
      format: 'url',
      message: 'Enter a full web address, like https://example.com',
    };
    const issues: FieldIssue[] = [];
    cleaned.forEach((proj, i) => {
      if (!proj.title.trim()) issues.push({ ...required, path: ['projects', i, 'title'] });
      proj.links.forEach((link, j) => {
        if (!link.label) issues.push({ ...required, path: ['projects', i, 'links', j, 'label'] });
        if (!link.url) issues.push({ ...required, path: ['projects', i, 'links', j, 'url'] });
        else if (!isSafeHref(link.url))
          issues.push({ ...badAddress, path: ['projects', i, 'links', j, 'url'] });
      });
    });
    if (ctaUrl && !isSafeHref(ctaUrl)) {
      issues.push({ ...badAddress, path: ['ctaUrl'] });
    }
    if (issues.length) {
      const { summary } = reportFieldIssues(issues, {
        projects: cleaned,
        ctaUrl,
      });
      toast.error('Please fix the highlighted fields', { description: summary });
      return;
    }

    setSaving(true);
    const payload = cleaned.map(({ _dndId, ...rest }) => ({
      ...rest,
      ...legacyFields(rest.links),
    }));

    try {
      const res = await fetch('/api/admin/content/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: payload,
          ctaLabel: state.ctaLabel.trim(),
          ctaUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Projects updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
      // Show what was stored (a bare domain now carries https://) and count it as saved.
      const saved = { ...state, projects: cleaned, ctaUrl };
      setState(saved);
      markClean(saved);
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

  const inputClass =
    'w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all text-sm';

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Projects Content</h1>
          <p className="text-gray-400 text-sm mt-1">
            Show your work: case studies, designs, products, films, anything you want to be seen.
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
              <strong className="text-blue-300">Tip:</strong> add pictures or videos to each
              project. The first one is the main cover; visitors can click any of them to see it
              larger. Large photos are compressed automatically. Links are optional and can point
              anywhere. Drag the handle to reorder projects.
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-200">&ldquo;See more&rdquo; button</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Optional button under the project grid, for example a link to your full portfolio.
                Leave the address empty to hide it.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Button text</label>
              <input
                type="text"
                value={state.ctaLabel}
                data-field="ctaLabel"
                onChange={(e) => setState((s) => ({ ...s, ctaLabel: e.target.value }))}
                placeholder="View all work"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
              <input
                type="text"
                value={state.ctaUrl}
                data-field="ctaUrl"
                onChange={(e) => setState((s) => ({ ...s, ctaUrl: e.target.value }))}
                onBlur={() => setState((s) => ({ ...s, ctaUrl: normalizeLink(s.ctaUrl) }))}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Projects</h3>
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
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                        title="Remove this project"
                        aria-label="Remove this project"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <h4 className="text-emerald-500 text-sm font-medium mb-4 border-b border-gray-800 pb-2 pl-8">
                        Project {idx + 1}
                        {proj.title ? ` · ${proj.title}` : ''}
                      </h4>

                      <div className="mb-5">
                        <MediaUploader
                          scope="projects"
                          label="Pictures and videos"
                          value={proj.media}
                          onChange={(media) => patchProject(idx, { media })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="md:col-span-2 flex items-center justify-between bg-gray-950 px-4 py-2 border border-gray-800 rounded-lg">
                          <label className="text-sm font-medium text-gray-400">
                            Featured project?
                          </label>
                          <input
                            type="checkbox"
                            checked={!!proj.featured}
                            onChange={(e) => patchProject(idx, { featured: e.target.checked })}
                            className="w-5 h-5 accent-emerald-500 rounded bg-gray-900 border-gray-700"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Project title
                          </label>
                          <input
                            type="text"
                            value={proj.title}
                            data-field={`projects.${idx}.title`}
                            onChange={(e) => patchProject(idx, { title: e.target.value })}
                            placeholder="e.g. Brand identity for a coffee roaster"
                            className={`${inputClass} font-semibold`}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Description
                        </label>
                        <textarea
                          value={proj.description}
                          data-field={`projects.${idx}.description`}
                          onChange={(e) => patchProject(idx, { description: e.target.value })}
                          rows={4}
                          className={`${inputClass} px-4 py-3 resize-y leading-relaxed`}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Links (optional)
                        </label>
                        <p className="mb-2 text-xs text-gray-500">
                          Anything worth opening: a website, a research paper, a video, a booking
                          page, a gallery, a download. The icon in front of each link is chosen for
                          you from its words and address; click it to pick another.
                        </p>
                        <div className="space-y-2">
                          {proj.links.map((link, lIdx) => (
                            <div key={lIdx} className="flex flex-wrap items-center gap-2">
                              <LinkIconField
                                value={link.icon ?? ''}
                                auto={autoLinkIcon(link.label, link.url)}
                                onChange={(icon) => patchLink(idx, lIdx, { icon })}
                                label="Link icon"
                              />
                              <input
                                type="text"
                                value={link.label}
                                data-field={`projects.${idx}.links.${lIdx}.label`}
                                onChange={(e) => patchLink(idx, lIdx, { label: e.target.value })}
                                placeholder="Label, e.g. Live site"
                                aria-label="Link label"
                                className={cn(inputClass, 'lg:w-40 lg:shrink-0')}
                              />
                              <input
                                type="text"
                                value={link.url}
                                data-field={`projects.${idx}.links.${lIdx}.url`}
                                onChange={(e) => patchLink(idx, lIdx, { url: e.target.value })}
                                onBlur={() =>
                                  patchLink(idx, lIdx, { url: normalizeLink(link.url) })
                                }
                                placeholder="Address, e.g. https://example.com"
                                aria-label="Link address"
                                className={cn(inputClass, 'min-w-0 grow basis-40')}
                              />
                              <button
                                onClick={() => removeLink(idx, lIdx)}
                                aria-label="Remove link"
                                title="Remove link"
                                className="px-2 text-gray-500 hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {proj.links.length < MAX_LINKS && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {LINK_SUGGESTIONS.map((label) => (
                              <button
                                key={label}
                                onClick={() => addLink(idx, label)}
                                className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-400 hover:border-emerald-600 hover:text-emerald-400"
                              >
                                + {label}
                              </button>
                            ))}
                            <button
                              onClick={() => addLink(idx)}
                              className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-400 hover:border-emerald-600 hover:text-emerald-400"
                            >
                              + Other
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Tags (skills, tools, categories)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {proj.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-1 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(idx, tIdx)}
                                className="hover:text-red-400 ml-1"
                                aria-label={`Remove tag ${tag}`}
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
                          className={inputClass}
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
