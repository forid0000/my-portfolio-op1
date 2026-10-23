'use client';

import React from 'react';
import { CollectionEditor, type CollectionItem } from '@/components/admin/collection-editor';
import { SectionImageUploader, type SectionMedia } from '@/components/admin/section-image-uploader';

interface TestimonialItem extends CollectionItem {
  name: string;
  title: string;
  company: string;
  quote: string;
  avatar?: SectionMedia;
}

export default function TestimonialsCMS() {
  return (
    <CollectionEditor<TestimonialItem>
      endpoint="/api/admin/content/testimonials"
      title="Testimonials"
      description="Client and colleague feedback, names, titles, and avatars."
      itemNoun="Testimonial"
      emptyItem={() => ({ name: '', title: '', company: '', quote: '' })}
      getItemLabel={(item) => item.name}
      requiredFields={['name', 'quote']}
      renderFields={(item, onChange) => (
        <div className="space-y-4">
          <SectionImageUploader
            folder="testimonials"
            label="Avatar (optional)"
            value={item.avatar}
            onChange={(v) => onChange('avatar', v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={item.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title / Role</label>
              <input
                type="text"
                value={item.title || ''}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Engineering Manager"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Company (optional)
              </label>
              <input
                type="text"
                value={item.company || ''}
                onChange={(e) => onChange('company', e.target.value)}
                placeholder="Acme Inc."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Quote</label>
            <textarea
              value={item.quote || ''}
              onChange={(e) => onChange('quote', e.target.value)}
              rows={4}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 resize-y leading-relaxed font-mono text-sm"
            />
          </div>
        </div>
      )}
    />
  );
}
