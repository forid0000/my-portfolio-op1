'use client';

import React from 'react';
import { CollectionEditor, type CollectionItem } from '@/components/admin/collection-editor';
import { PUBLICATION_TYPE_OPTIONS } from '@/lib/validation/section-schemas';

interface PublicationItem extends CollectionItem {
  title: string;
  type: string;
  platform: string;
  url: string;
  date: string;
  description: string;
}

export default function PublicationsCMS() {
  return (
    <CollectionEditor<PublicationItem>
      endpoint="/api/admin/content/publications"
      title="Publications"
      description="Articles, tech talks, open-source features, and video content."
      itemNoun="Publication"
      emptyItem={() => ({
        title: '',
        type: PUBLICATION_TYPE_OPTIONS[0],
        platform: '',
        url: '',
        date: '',
        description: '',
      })}
      getItemLabel={(item) => item.title}
      validateItem={(item) =>
        !item.title?.trim() ? 'Title is required for every publication.' : null
      }
      renderFields={(item, onChange) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={item.title || ''}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Building a Zero-Trust Admin Panel"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
              <select
                value={item.type || PUBLICATION_TYPE_OPTIONS[0]}
                onChange={(e) => onChange('type', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm"
              >
                {PUBLICATION_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
              <input
                type="text"
                value={item.platform || ''}
                onChange={(e) => onChange('platform', e.target.value)}
                placeholder="Dev.to, YouTube, TechCrunch..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
              <input
                type="text"
                value={item.url || ''}
                onChange={(e) => onChange('url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
              <input
                type="text"
                value={item.date || ''}
                onChange={(e) => onChange('date', e.target.value)}
                placeholder="Mar 2026"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description (optional)
            </label>
            <textarea
              value={item.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              rows={2}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 resize-y leading-relaxed font-mono text-sm"
            />
          </div>
        </div>
      )}
    />
  );
}
