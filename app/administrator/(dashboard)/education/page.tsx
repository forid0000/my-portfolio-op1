'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CollectionEditor, type CollectionItem } from '@/components/admin/collection-editor';
import { MediaUploader } from '@/components/admin/media-uploader';
import type { MediaItem } from '@/lib/media-types';

interface EducationItem extends CollectionItem {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  media?: MediaItem[];
}

export default function EducationCMS() {
  return (
    <CollectionEditor<EducationItem>
      endpoint="/api/admin/content/education"
      title="Education"
      description="Degrees, institutions, timelines, and core achievements."
      itemNoun="Entry"
      emptyItem={() => ({
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: [],
        media: [],
      })}
      getItemLabel={(item) => [item.degree, item.institution].filter(Boolean).join(' - ')}
      requiredFields={['institution', 'degree']}
      renderFields={(item, onChange) => (
        <>
          <div className="mb-4">
            <MediaUploader
              scope="education"
              label="Diploma, certificate or other pictures and videos (optional)"
              hint="The first one is the cover. Visitors can open the entry to see all of them, each shown whole."
              value={item.media ?? []}
              onChange={(v) => onChange('media', v)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Institution</label>
              <input
                type="text"
                value={item.institution || ''}
                onChange={(e) => onChange('institution', e.target.value)}
                placeholder="University of Example"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Degree</label>
              <input
                type="text"
                value={item.degree || ''}
                onChange={(e) => onChange('degree', e.target.value)}
                placeholder="B.Sc. in Computer Science"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Field of Study</label>
              <input
                type="text"
                value={item.field || ''}
                onChange={(e) => onChange('field', e.target.value)}
                placeholder="Software Engineering"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input
                type="text"
                value={item.startDate || ''}
                onChange={(e) => onChange('startDate', e.target.value)}
                placeholder="2021"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
              <input
                type="text"
                value={item.endDate || ''}
                onChange={(e) => onChange('endDate', e.target.value)}
                placeholder="2025"
                disabled={item.current}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm disabled:opacity-40"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between bg-gray-950 px-4 py-2 border border-gray-800 rounded-lg">
              <label className="text-sm font-medium text-gray-400">Currently studying here?</label>
              <input
                type="checkbox"
                checked={!!item.current}
                onChange={(e) => onChange('current', e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded bg-gray-900 border-gray-700"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description (optional)
            </label>
            <textarea
              value={item.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
              placeholder="Thesis topic, notable coursework, honors..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 resize-y leading-relaxed font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Core Achievements
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(item.achievements || []).map((a, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                >
                  {a}
                  <button
                    onClick={() =>
                      onChange(
                        'achievements',
                        (item.achievements || []).filter((_, idx) => idx !== i)
                      )
                    }
                    className="hover:text-red-400 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type an achievement and press Enter to add..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  onChange('achievements', [
                    ...(item.achievements || []),
                    e.currentTarget.value.trim(),
                  ]);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            />
          </div>
        </>
      )}
    />
  );
}
