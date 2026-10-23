'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { usePasteTarget } from '@/hooks/use-paste-target';
import { formatBytes } from '@/lib/media-types';
import { isAbortError, uploadMedia } from '@/lib/media-upload';
import { extractApiErrorMessage } from '@/lib/utils';

export interface UploadedAvatar {
  _id: string;
  secure_url?: string;
  isActive: boolean;
}

interface AvatarUploaderProps {
  /** Called after the picture is in the library (and live, when "use as profile picture" is on). */
  onUploaded?: (avatar: UploadedAvatar, info: { duplicate: boolean }) => void;
  disabled?: boolean;
  disabledReason?: string;
  compact?: boolean;
}

type Stage = 'idle' | 'optimizing' | 'uploading' | 'saving';

/**
 * One step from "I picked a photo" to "it is my profile picture": the image is
 * compressed in the browser, uploaded straight to Cloudinary, and registered in the
 * avatar library (live immediately unless the checkbox is cleared). Click, drag a
 * file onto it, or paste (Ctrl/Cmd+V while the pointer is over it).
 */
export function AvatarUploader({
  onUploaded,
  disabled,
  disabledReason,
  compact,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useNow, setUseNow] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const busy = stage !== 'idle';

  const clearPreview = () =>
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });

  const start = async (file: File) => {
    if (disabled || busy) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a picture (JPG, PNG, WebP or GIF).');
      return;
    }
    setLastFile(file);
    setError(null);
    setProgress(0);
    setPreview(URL.createObjectURL(file));
    const abort = new AbortController();
    controller.current = abort;
    try {
      const { item, optimized } = await uploadMedia(file, {
        scope: 'avatars',
        signal: abort.signal,
        onProgress: setProgress,
        onStage: (s) => setStage(s),
      });
      setStage('saving');
      const res = await fetch('/api/admin/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: item.public_id, name: file.name, setActive: useNow }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(extractApiErrorMessage(data, 'Could not save the picture.'));

      if (data.duplicate) {
        toast.info('That picture is already in your library.', {
          description: useNow ? 'It is now your profile picture.' : undefined,
        });
      } else {
        toast.success(useNow ? 'Profile picture updated' : 'Picture added to your library', {
          description: optimized
            ? `Optimized ${formatBytes(optimized.from)} → ${formatBytes(optimized.to)}`
            : undefined,
        });
      }
      clearPreview();
      onUploaded?.(data.avatar, { duplicate: !!data.duplicate });
    } catch (e) {
      if (!isAbortError(e)) {
        setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
      } else {
        clearPreview();
      }
    } finally {
      setStage('idle');
      controller.current = null;
    }
  };

  const pasteProps = usePasteTarget((files) => {
    const file = files.find((f) => f.type.startsWith('image/'));
    if (file) void start(file);
  });

  useEffect(() => () => controller.current?.abort(), []);

  const label =
    stage === 'optimizing'
      ? 'Optimizing…'
      : stage === 'uploading'
        ? `Uploading ${Math.round(progress * 100)}%`
        : stage === 'saving'
          ? 'Saving…'
          : null;

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || busy}
        aria-label="Upload a profile picture. Click, drop an image, or paste one."
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled && !busy) inputRef.current?.click();
          }
        }}
        {...pasteProps}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files') && !disabled) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void start(file);
        }}
        className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-dashed text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 ${
          compact ? 'p-3' : 'p-5'
        } ${disabled ? 'cursor-not-allowed border-gray-800 opacity-60' : 'cursor-pointer'} ${
          dragOver
            ? 'border-purple-400 bg-purple-950/20'
            : 'border-gray-700 hover:border-purple-500'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-purple-400">
            <UploadCloud className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-200">{label ?? 'Upload a profile picture'}</p>
          <p className="text-xs text-gray-500">
            {disabled && disabledReason
              ? disabledReason
              : busy
                ? 'Large photos are shrunk automatically.'
                : 'Click, drop an image here, or paste with Ctrl+V.'}
          </p>
          {busy && (
            <div className="mt-2 h-1 overflow-hidden rounded bg-gray-800">
              <div
                className="h-full bg-purple-500 transition-[width]"
                style={{ width: `${Math.round((stage === 'uploading' ? progress : 0.05) * 100)}%` }}
              />
            </div>
          )}
        </div>
        {busy ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            <button
              type="button"
              aria-label="Cancel upload"
              onClick={(e) => {
                e.stopPropagation();
                controller.current?.abort();
              }}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={useNow}
          disabled={busy}
          onChange={(e) => setUseNow(e.target.checked)}
          className="h-3.5 w-3.5 accent-purple-500"
        />
        Use as my profile picture right away
      </label>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          <span>{error}</span>
          {lastFile && (
            <button
              type="button"
              onClick={() => void start(lastFile)}
              className="shrink-0 font-medium text-red-200 underline hover:text-white"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void start(file);
        }}
      />
    </div>
  );
}
