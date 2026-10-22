'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { ALL_LUCIDE_ICON_NAMES } from '@/lib/lucide-icon';
import { resolveSocialIcon, SOCIAL_BRAND_ICON_NAMES } from '@/lib/social-icon';
import { extractApiErrorMessage, utcOffsetLabel } from '@/lib/utils';
import { GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';

/** Full lucide catalog plus the hand-drawn brand marks (DevToIcon, MediumIcon, etc.). */
const SOCIAL_ICON_NAMES = [...SOCIAL_BRAND_ICON_NAMES, ...ALL_LUCIDE_ICON_NAMES];

interface SocialLink {
  _dndId?: string;
  href: string;
  label: string;
  icon: string;
}

interface GlobalData {
  brandName: string;
  footerText: string;
  copyrightName: string;
  headerName: string;
  headerTag: string;
  githubProfileUrl: string;
  locationLabel: string;
  timeZone: string;
  socials: SocialLink[];
  footerSocials: SocialLink[];
}

// All IANA time zones (falls back to a small list if the runtime lacks the API).
const TIME_ZONES: string[] = Array.from(
  new Set([
    'UTC',
    ...(typeof (Intl as any).supportedValuesOf === 'function'
      ? ((Intl as any).supportedValuesOf('timeZone') as string[])
      : [
          'Asia/Kolkata',
          'Asia/Dubai',
          'Asia/Singapore',
          'Asia/Tokyo',
          'Europe/London',
          'Europe/Berlin',
          'America/New_York',
          'America/Los_Angeles',
        ]),
  ])
);

export default function GlobalCMS() {
  const [data, setData] = useState<GlobalData>({
    brandName: '',
    footerText: '',
    copyrightName: '',
    headerName: '',
    headerTag: '',
    githubProfileUrl: '',
    locationLabel: '',
    timeZone: GLOBAL_CONTENT_DEFAULTS.timeZone,
    socials: [],
    footerSocials: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(data, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/global')
      .then((res) => res.json())
      .then((fetched) => {
        const d = {
          ...fetched,
          socials: (fetched.socials || []).map((s: SocialLink) => ({
            ...s,
            _dndId:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2),
          })),
          footerSocials: (fetched.footerSocials || []).map((s: SocialLink) => ({
            ...s,
            _dndId:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2),
          })),
        };
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleDragEndSocials = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.socials.findIndex((i) => i._dndId === active.id);
        const newIndex = prev.socials.findIndex((i) => i._dndId === over.id);
        return {
          ...prev,
          socials: arrayMove(prev.socials, oldIndex, newIndex),
        };
      });
    }
  };

  const handleDragEndFooterSocials = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.footerSocials.findIndex((i) => i._dndId === active.id);
        const newIndex = prev.footerSocials.findIndex((i) => i._dndId === over.id);
        return {
          ...prev,
          footerSocials: arrayMove(prev.footerSocials, oldIndex, newIndex),
        };
      });
    }
  };

  const handleFieldChange = (field: keyof GlobalData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (
    arrayName: 'socials' | 'footerSocials',
    index: number,
    field: keyof SocialLink,
    value: string
  ) => {
    const newArray = [...data[arrayName]];
    newArray[index] = { ...newArray[index], [field]: value };
    setData((prev) => ({ ...prev, [arrayName]: newArray }));
  };

  const addSocial = (arrayName: 'socials' | 'footerSocials') => {
    setData((prev) => ({
      ...prev,
      [arrayName]: [
        ...prev[arrayName],
        {
          _dndId:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2),
          href: '',
          label: 'New Link',
          icon: 'Github',
        },
      ],
    }));
  };

  const removeSocial = (arrayName: 'socials' | 'footerSocials', index: number) => {
    const newArray = [...data[arrayName]];
    newArray.splice(index, 1);
    setData((prev) => ({ ...prev, [arrayName]: newArray }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!data.brandName.trim()) {
      toast.error('Validation Error: Brand Name cannot be empty.');
      return;
    }
    for (const link of data.socials) {
      if (!link.label.trim() || !link.href.trim()) {
        toast.error('Validation Error: All Global Social Links must have a Label and URL.');
        return;
      }
    }
    for (const link of data.footerSocials) {
      if (!link.label.trim() || !link.href.trim()) {
        toast.error('Validation Error: All Footer Social Links must have a Label and URL.');
        return;
      }
    }

    setSaving(true);

    const payload = {
      ...data,
      socials: data.socials.map(({ _dndId, ...rest }) => rest),
      footerSocials: data.footerSocials.map(({ _dndId, ...rest }) => rest),
    };

    try {
      const res = await fetch('/api/admin/content/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      markClean(data);
      toast.success('Global Settings updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
    } catch (err: any) {
      toast.error('An error occurred while saving', {
        description: err.message,
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

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Global Settings</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage site-wide variables, footer text, social links, and section visibility.
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
                <strong className="text-blue-300">Admin Hint:</strong> The Brand Name appears in the
                Navigation bar. Social Links update instantly across the Hero and Footer sections.
                Drag links to reorder them.
              </p>
              <p>
                <strong className="text-blue-300">Icons:</strong> Search or pick from any lucide
                icon, plus the hand-drawn Dev.to/Medium/Facebook/Discord brand marks. Browse the
                full set at{' '}
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  lucide.dev/icons
                </a>
                .
              </p>
            </div>
          </div>

          <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200 leading-relaxed">
              Looking for section visibility and ordering? That moved to{' '}
              <a
                href="/administrator/sections"
                className="text-emerald-400 hover:underline font-medium"
              >
                Sections &amp; Layout
              </a>
              .
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">Footer Configuration</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Brand Name / Identity
                </label>
                <input
                  type="text"
                  value={data.brandName || ''}
                  onChange={(e) => handleFieldChange('brandName', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Footer Brand Text
                </label>
                <textarea
                  value={data.footerText || ''}
                  onChange={(e) => handleFieldChange('footerText', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Copyright Name
                </label>
                <input
                  type="text"
                  value={data.copyrightName || ''}
                  onChange={(e) => handleFieldChange('copyrightName', e.target.value)}
                  placeholder={GLOBAL_CONTENT_DEFAULTS.copyrightName}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shown in the footer copyright line: © {new Date().getFullYear()}{' '}
                  {data.copyrightName || GLOBAL_CONTENT_DEFAULTS.copyrightName}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">
              Brand Identity &amp; Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Header Name</label>
                <input
                  type="text"
                  value={data.headerName || ''}
                  onChange={(e) => handleFieldChange('headerName', e.target.value)}
                  placeholder={GLOBAL_CONTENT_DEFAULTS.headerName}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Header Tag</label>
                <input
                  type="text"
                  value={data.headerTag || ''}
                  onChange={(e) => handleFieldChange('headerTag', e.target.value)}
                  placeholder={GLOBAL_CONTENT_DEFAULTS.headerTag}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Shown after a # in the header.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  GitHub Profile URL
                </label>
                <input
                  type="text"
                  value={data.githubProfileUrl || ''}
                  onChange={(e) => handleFieldChange('githubProfileUrl', e.target.value)}
                  placeholder={GLOBAL_CONTENT_DEFAULTS.githubProfileUrl}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used by the Projects "all_repositories" button.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Location Label
                </label>
                <input
                  type="text"
                  value={data.locationLabel || ''}
                  onChange={(e) => handleFieldChange('locationLabel', e.target.value)}
                  placeholder={GLOBAL_CONTENT_DEFAULTS.locationLabel}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Time Zone</label>
                <select
                  value={data.timeZone || GLOBAL_CONTENT_DEFAULTS.timeZone}
                  onChange={(e) => handleFieldChange('timeZone', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                >
                  {TIME_ZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Footer clock preview:{' '}
                  {new Date().toLocaleTimeString('en-US', {
                    timeZone: data.timeZone || GLOBAL_CONTENT_DEFAULTS.timeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}{' '}
                  {utcOffsetLabel(data.timeZone || GLOBAL_CONTENT_DEFAULTS.timeZone)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-200">
                Global Social Links (Hero Section)
              </h3>
              <button
                onClick={() => addSocial('socials')}
                className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndSocials}
            >
              <SortableContext
                items={data.socials.map((i) => i._dndId!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {data.socials?.map((link, idx) => (
                    <SortableItem
                      key={link._dndId}
                      id={link._dndId!}
                      className="relative group"
                      dragHandleClassName="top-3 left-2 z-10 w-8 h-8 flex items-center justify-center p-0"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-950 p-3 rounded-lg border border-gray-800 relative">
                        <button
                          onClick={() => removeSocial('socials', idx)}
                          className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto p-2 text-red-500 hover:bg-red-950 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="w-full sm:flex-1">
                          <input
                            type="text"
                            value={link.label || ''}
                            onChange={(e) =>
                              handleSocialChange('socials', idx, 'label', e.target.value)
                            }
                            placeholder="Label"
                            className="w-full bg-transparent text-gray-200 text-sm focus:outline-none"
                          />
                        </div>
                        <div className="w-full sm:flex-[2]">
                          <input
                            type="text"
                            value={link.href || ''}
                            onChange={(e) =>
                              handleSocialChange('socials', idx, 'href', e.target.value)
                            }
                            placeholder="URL (https://...)"
                            className="w-full bg-transparent text-gray-400 text-sm focus:outline-none font-mono"
                          />
                        </div>
                        <div className="w-full sm:w-40">
                          <IconPicker
                            value={link.icon || 'Github'}
                            onChange={(name) => handleSocialChange('socials', idx, 'icon', name)}
                            icons={SOCIAL_ICON_NAMES}
                            resolve={resolveSocialIcon}
                            allowCustom={false}
                          />
                        </div>
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-200">Footer Social Links</h3>
              <button
                onClick={() => addSocial('footerSocials')}
                className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndFooterSocials}
            >
              <SortableContext
                items={data.footerSocials.map((i) => i._dndId!)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.footerSocials?.map((link, idx) => (
                    <SortableItem
                      key={link._dndId}
                      id={link._dndId!}
                      className="relative group"
                      dragHandleClassName="top-2 left-2 z-10 w-8 h-8 flex items-center justify-center p-0 bg-gray-950"
                    >
                      <div className="flex flex-col gap-2 bg-gray-950 p-3 rounded-lg border border-gray-800 relative">
                        <button
                          onClick={() => removeSocial('footerSocials', idx)}
                          className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-950 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={link.label || ''}
                          onChange={(e) =>
                            handleSocialChange('footerSocials', idx, 'label', e.target.value)
                          }
                          placeholder="Label"
                          className="w-full bg-transparent text-gray-200 text-sm focus:outline-none"
                        />
                        <input
                          type="text"
                          value={link.href || ''}
                          onChange={(e) =>
                            handleSocialChange('footerSocials', idx, 'href', e.target.value)
                          }
                          placeholder="URL"
                          className="w-full bg-transparent text-gray-400 text-sm focus:outline-none font-mono"
                        />
                        <IconPicker
                          value={link.icon || 'Github'}
                          onChange={(name) =>
                            handleSocialChange('footerSocials', idx, 'icon', name)
                          }
                          icons={SOCIAL_ICON_NAMES}
                          resolve={resolveSocialIcon}
                          allowCustom={false}
                        />
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
