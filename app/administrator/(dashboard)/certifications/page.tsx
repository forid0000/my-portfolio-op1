'use client';

import React from 'react';
import { CollectionEditor, type CollectionItem } from '@/components/admin/collection-editor';
import { SectionImageUploader, type SectionMedia } from '@/components/admin/section-image-uploader';
import { MediaUploader } from '@/components/admin/media-uploader';
import type { MediaItem } from '@/lib/media-types';

interface CertificationItem extends CollectionItem {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
  credentialUrl: string;
  badge?: SectionMedia;
  media?: MediaItem[];
}

export default function CertificationsCMS() {
  return (
    <CollectionEditor<CertificationItem>
      endpoint="/api/admin/content/certifications"
      title="Certifications"
      description="Professional credentials, issuing bodies, and verification links."
      itemNoun="Certification"
      emptyItem={() => ({
        name: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        credentialUrl: '',
        media: [],
      })}
      getItemLabel={(item) => [item.name, item.issuer].filter(Boolean).join(' - ')}
      requiredFields={['name', 'issuer']}
      renderFields={(item, onChange) => (
        <div className="space-y-4">
          <SectionImageUploader
            folder="certifications"
            label="Badge / logo (optional)"
            value={item.badge}
            onChange={(v) => onChange('badge', v)}
          />
          <MediaUploader
            scope="certifications"
            label="Certificate pictures and videos (optional)"
            value={item.media ?? []}
            onChange={(v) => onChange('media', v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Certification Name
              </label>
              <input
                type="text"
                value={item.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="e.g. Certified Professional in Your Field"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Issuing Body</label>
              <input
                type="text"
                value={item.issuer || ''}
                onChange={(e) => onChange('issuer', e.target.value)}
                placeholder="e.g. Issuing organization"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Issue Date</label>
              <input
                type="text"
                value={item.issueDate || ''}
                onChange={(e) => onChange('issueDate', e.target.value)}
                placeholder="Jan 2025"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Expiry Date (optional)
              </label>
              <input
                type="text"
                value={item.expiryDate || ''}
                onChange={(e) => onChange('expiryDate', e.target.value)}
                placeholder="Jan 2028"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Credential ID (optional)
              </label>
              <input
                type="text"
                value={item.credentialId || ''}
                onChange={(e) => onChange('credentialId', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Verification URL (optional)
              </label>
              <input
                type="text"
                value={item.credentialUrl || ''}
                onChange={(e) => onChange('credentialUrl', e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    />
  );
}
