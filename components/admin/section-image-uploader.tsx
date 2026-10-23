'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePasteTarget } from '@/hooks/use-paste-target';
import { withTransformation } from '@/lib/cloudinary-url';
import { formatBytes } from '@/lib/media-types';
import { isAbortError, uploadMedia } from '@/lib/media-upload';

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

/**
 * Single-picture field (badge, banner, testimonial photo). Same pipeline as every other
 * upload: smart compression in the browser, then straight to Cloudinary. Removing the
 * picture drops it from the form, and the file is deleted from Cloudinary when the item
 * is saved (see `mediaFields` in lib/api/collection-crud.ts); a picture that was uploaded
 * here and removed again before saving is deleted right away.
 */
export function SectionImageUploader({
  folder,
  label,
  value,
  onChange,
}: SectionImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const session = useRef(new Set<string>());

  const handleFile = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const { item, optimized } = await uploadMedia(file, {
        scope: folder,
        onStage: (s) => setStage(s === 'optimizing' ? 'Optimizing…' : 'Uploading…'),
      });
      session.current.add(item.public_id);
      onChange({ src: item.src, public_id: item.public_id });
      toast.success('Image uploaded', {
        description: optimized
          ? `Optimized ${formatBytes(optimized.from)} → ${formatBytes(optimized.to)}`
          : undefined,
      });
    } catch (err) {
      if (!isAbortError(err)) {
        toast.error('Upload failed', {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  const remove = () => {
    if (value && session.current.has(value.public_id)) {
      session.current.delete(value.public_id);
      void fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: value.public_id, kind: 'image' }),
      }).catch(() => undefined);
    }
    onChange(undefined);
  };

  const pasteProps = usePasteTarget((files) => {
    const image = files.find((f) => f.type.startsWith('image/'));
    if (image) void handleFile(image);
  });

  return (
    <div {...pasteProps}>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {value?.src ? (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-800 shrink-0 bg-gray-950">
            <Image
              src={withTransformation(value.src, 'c_fill,w_128,h_128,q_auto,f_auto')}
              alt={label}
              fill
              sizes="64px"
              unoptimized
              className="object-cover"
            />
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
            {uploading ? stage || 'Working…' : value?.src ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </label>
          {value?.src && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 w-fit"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
          <span className="text-[10px] text-gray-600">You can also paste an image here.</span>
        </div>
      </div>
    </div>
  );
}
