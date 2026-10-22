'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export interface SectionMedia {
  src: string;
  public_id: string;
}

interface SectionImageUploaderProps {
  folder: 'testimonials' | 'certifications' | 'services';
  label: string;
  value?: SectionMedia;
  onChange: (value: SectionMedia | undefined) => void;
}

/** Cloudinary-backed image field shared by every module that needs a small
 * avatar/badge/banner image. Only ever stores { src, public_id } - the upload
 * itself streams straight to Cloudinary via /api/admin/content/section-media. */
export function SectionImageUploader({
  folder,
  label,
  value,
  onChange,
}: SectionImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch('/api/admin/content/section-media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange({ src: data.src, public_id: data.public_id });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {value?.src ? (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-800 shrink-0 bg-gray-950">
            <Image src={value.src} alt={label} fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-gray-800 flex items-center justify-center shrink-0 text-gray-600">
            <Upload className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 text-xs font-medium bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors w-fit">
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {value?.src ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </label>
          {value?.src && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 w-fit"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
