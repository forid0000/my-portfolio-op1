'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CollectionEditor, type CollectionItem } from '@/components/admin/collection-editor';
import { SectionImageUploader, type SectionMedia } from '@/components/admin/section-image-uploader';
import { IconPicker } from '@/components/admin/icon-picker';

interface ServiceItem extends CollectionItem {
  title: string;
  description: string;
  category: string;
  pricing: string;
  icon: string;
  banner?: SectionMedia;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
}

export default function ServicesCMS() {
  return (
    <CollectionEditor<ServiceItem>
      endpoint="/api/admin/content/services"
      title="Services"
      description="Freelance engineering, tutoring, audits, or consulting offerings."
      itemNoun="Service"
      emptyItem={() => ({
        title: '',
        description: '',
        category: '',
        pricing: '',
        icon: 'Code2',
        features: [],
        ctaLabel: '',
        ctaLink: '',
      })}
      getItemLabel={(item) => item.title}
      requiredFields={['title']}
      renderFields={(item, onChange) => (
        <div className="space-y-4">
          <SectionImageUploader
            folder="services"
            label="Banner Image (optional)"
            value={item.banner}
            onChange={(v) => onChange('banner', v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={item.title || ''}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Full-Stack Architecture Audit"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Icon</label>
              <IconPicker
                value={item.icon || 'Code2'}
                onChange={(name) => onChange('icon', name)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Category (optional)
              </label>
              <input
                type="text"
                value={item.category || ''}
                onChange={(e) => onChange('category', e.target.value)}
                placeholder="Consulting, Development, Audit..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Pricing (optional)
              </label>
              <input
                type="text"
                value={item.pricing || ''}
                onChange={(e) => onChange('pricing', e.target.value)}
                placeholder="$150/hr, Custom Quote, $2,000+..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                CTA Label (optional)
              </label>
              <input
                type="text"
                value={item.ctaLabel || ''}
                onChange={(e) => onChange('ctaLabel', e.target.value)}
                placeholder="Book a call"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                CTA Link (optional)
              </label>
              <input
                type="text"
                value={item.ctaLink || ''}
                onChange={(e) => onChange('ctaLink', e.target.value)}
                placeholder="/#contact"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={item.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 resize-y leading-relaxed font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Features / Inclusions
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(item.features || []).map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-1"
                >
                  {f}
                  <button
                    onClick={() =>
                      onChange(
                        'features',
                        (item.features || []).filter((_, idx) => idx !== i)
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
              placeholder="Type a feature and press Enter to add..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  onChange('features', [...(item.features || []), e.currentTarget.value.trim()]);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            />
          </div>
        </div>
      )}
    />
  );
}
