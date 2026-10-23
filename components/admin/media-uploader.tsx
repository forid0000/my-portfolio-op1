'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { Film, ImagePlus, Loader2, Play, RotateCw, Settings2, Star, X } from 'lucide-react';
import { SortableItem } from '@/components/sortable-item';
import { usePasteTarget } from '@/hooks/use-paste-target';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { videoPosterUrl, withTransformation } from '@/lib/cloudinary-url';
import {
  MAX_MEDIA_PER_ITEM,
  MEDIA_SCOPES,
  formatBytes,
  isVideoFile,
  type MediaItem,
  type MediaKind,
  type MediaScope,
} from '@/lib/media-types';
import { isAbortError, uploadMedia } from '@/lib/media-upload';

interface MediaUploaderProps {
  scope: MediaScope;
  value: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  label?: string;
  max?: number;
}

interface Pending {
  id: string;
  file: File;
  kind: MediaKind;
  previewUrl?: string;
  progress: number;
  stage: 'queued' | 'optimizing' | 'uploading';
  error?: string;
  controller: AbortController;
}

const CONCURRENCY = 3;

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function thumbOf(item: MediaItem): string {
  return item.kind === 'video'
    ? videoPosterUrl(item.src, 480)
    : withTransformation(item.src, 'c_fill,w_480,h_360,q_auto,f_auto');
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Upload, reorder and remove the pictures and videos of one project or certificate.
 * The first item is the main cover; the rest are extra photos. Files go straight to
 * Cloudinary after smart compression (lib/media-upload.ts), and anything removed here
 * is deleted from Cloudinary when the owner saves (or immediately, if it was uploaded
 * in this session and never saved).
 */
export function MediaUploader({
  scope,
  value,
  onChange,
  label = 'Pictures and videos',
  max = MAX_MEDIA_PER_ITEM,
}: MediaUploaderProps) {
  const allowVideo = MEDIA_SCOPES[scope].allowVideo;
  const sensors = useSafeDndSensors();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);

  // Mirrors of state for code that runs after awaits (uploads finishing out of order).
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const pendingRef = useRef<Pending[]>([]);
  const queue = useRef<Pending[]>([]);
  const running = useRef(0);
  const sessionUploads = useRef(new Set<string>());
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  const commit = (next: MediaItem[]) => {
    valueRef.current = next;
    onChangeRef.current(next);
  };

  const setPendingBoth = (updater: (list: Pending[]) => Pending[]) => {
    pendingRef.current = updater(pendingRef.current);
    setPending(pendingRef.current);
  };
  const patchPending = (id: string, patch: Partial<Pending>) =>
    setPendingBoth((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const dropPending = (id: string) => {
    const gone = pendingRef.current.find((p) => p.id === id);
    if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    setPendingBoth((list) => list.filter((p) => p.id !== id));
  };

  useEffect(() => {
    const live = pendingRef;
    return () => {
      live.current.forEach((p) => {
        p.controller.abort();
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  const pump = () => {
    while (running.current < CONCURRENCY && queue.current.length) {
      void run(queue.current.shift() as Pending);
    }
  };

  const run = async (entry: Pending) => {
    running.current++;
    patchPending(entry.id, { error: undefined, progress: 0, stage: 'optimizing' });
    try {
      const { item, optimized } = await uploadMedia(entry.file, {
        scope,
        signal: entry.controller.signal,
        onProgress: (progress) => patchPending(entry.id, { progress }),
        onStage: (stage) => patchPending(entry.id, { stage }),
      });
      sessionUploads.current.add(item.public_id);
      commit([...valueRef.current, item]);
      dropPending(entry.id);
      if (optimized && optimized.to < optimized.from * 0.7) {
        toast.success(`Optimized ${entry.file.name}`, {
          description: `${formatBytes(optimized.from)} → ${formatBytes(optimized.to)}`,
        });
      }
    } catch (error) {
      if (isAbortError(error)) dropPending(entry.id);
      else {
        patchPending(entry.id, {
          error: error instanceof Error ? error.message : 'Upload failed',
          stage: 'queued',
        });
      }
    } finally {
      running.current--;
      pump();
    }
  };

  const addFiles = (files: File[]) => {
    const usable = files.filter(
      (f) => f.type.startsWith('image/') || (allowVideo && isVideoFile(f))
    );
    if (usable.length < files.length) {
      toast.error(
        allowVideo ? 'Only pictures and videos can be added.' : 'Only pictures can be added.'
      );
    }
    const slots = max - valueRef.current.length - pendingRef.current.length;
    if (!usable.length) return;
    if (slots <= 0) {
      toast.error(`You can add up to ${max} items here.`);
      return;
    }
    if (usable.length > slots) toast.message(`Only ${slots} more can be added (limit ${max}).`);

    const entries: Pending[] = usable.slice(0, slots).map((file) => {
      const kind: MediaKind = isVideoFile(file) ? 'video' : 'image';
      return {
        id: newId(),
        file,
        kind,
        previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
        progress: 0,
        stage: 'queued',
        controller: new AbortController(),
      };
    });
    setPendingBoth((list) => [...list, ...entries]);
    queue.current.push(...entries);
    pump();
  };

  const retry = (entry: Pending) => {
    const fresh = { ...entry, controller: new AbortController(), error: undefined };
    setPendingBoth((list) => list.map((p) => (p.id === entry.id ? fresh : p)));
    queue.current.push(fresh);
    pump();
  };

  const cancel = (entry: Pending) => {
    queue.current = queue.current.filter((p) => p.id !== entry.id);
    entry.controller.abort();
    dropPending(entry.id);
  };

  const removeAt = (index: number) => {
    const item = valueRef.current[index];
    if (!item) return;
    commit(valueRef.current.filter((_, i) => i !== index));
    if (optionsFor === item.public_id) setOptionsFor(null);
    // A file uploaded in this session and never saved is deleted now. The server refuses if
    // saved content still uses it; saved files are deleted when the owner saves the removal.
    if (sessionUploads.current.has(item.public_id)) {
      sessionUploads.current.delete(item.public_id);
      void fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: item.public_id, kind: item.kind ?? 'image' }),
      }).catch(() => undefined);
    }
  };

  const makeCover = (index: number) => {
    const next = [...valueRef.current];
    const [picked] = next.splice(index, 1);
    commit([picked, ...next]);
  };

  const patchItem = (publicId: string, patch: Partial<MediaItem>) =>
    commit(valueRef.current.map((m) => (m.public_id === publicId ? { ...m, ...patch } : m)));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = valueRef.current.findIndex((m) => m.public_id === active.id);
    const to = valueRef.current.findIndex((m) => m.public_id === over.id);
    if (from >= 0 && to >= 0) commit(arrayMove(valueRef.current, from, to));
  };

  // Ctrl/Cmd+V while this uploader is hovered or focused adds the pasted image(s).
  const pasteProps = usePasteTarget(addFiles);

  const total = value.length + pending.length;
  const optionsItem = value.find((m) => m.public_id === optionsFor && m.kind === 'video');

  return (
    <div
      {...pasteProps}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragOver(false);
        addFiles(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-xl border border-dashed p-3 transition-colors ${
        dragOver ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-800 bg-gray-950/40'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-xs text-gray-500">
          {total}/{max} · first is the main cover · drag to reorder
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((m) => m.public_id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {value.map((item, index) => {
              const isVideo = item.kind === 'video';
              return (
                <SortableItem
                  key={item.public_id}
                  id={item.public_id}
                  className="rounded-lg"
                  dragHandleClassName="top-1.5 left-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white"
                >
                  <div
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        e.target === e.currentTarget &&
                        (e.key === 'Delete' || e.key === 'Backspace')
                      ) {
                        e.preventDefault();
                        removeAt(index);
                      }
                    }}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-800 bg-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Image
                      src={thumbOf(item)}
                      alt={item.alt || (isVideo ? 'Video' : `Picture ${index + 1}`)}
                      fill
                      unoptimized
                      sizes="200px"
                      className="object-cover"
                    />
                    {isVideo && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
                          <Play className="h-4 w-4 translate-x-px" />
                        </span>
                      </div>
                    )}
                    <span
                      className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        index === 0 ? 'bg-emerald-600 text-white' : 'bg-black/60 text-gray-200'
                      }`}
                    >
                      {index === 0
                        ? 'Main cover'
                        : isVideo
                          ? `Video ${formatDuration(item.duration)}`.trim()
                          : `Photo ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      aria-label={`Remove ${isVideo ? 'video' : 'picture'} ${index + 1}`}
                      title="Remove"
                      className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-red-600/90 text-white shadow hover:bg-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1.5 right-1.5 z-20 flex gap-1">
                      {isVideo && (
                        <button
                          type="button"
                          onClick={() =>
                            setOptionsFor(optionsFor === item.public_id ? null : item.public_id)
                          }
                          aria-label="Video settings"
                          title="Video settings"
                          className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${
                            optionsFor === item.public_id
                              ? 'bg-emerald-600'
                              : 'bg-black/60 hover:bg-black/80'
                          }`}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => makeCover(index)}
                          aria-label="Make this the main cover"
                          title="Make main cover"
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-emerald-600"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </SortableItem>
              );
            })}

            {pending.map((entry) => (
              <div
                key={entry.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-800 bg-gray-900"
              >
                {entry.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.previewUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-50"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <Film className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 p-2 text-center">
                  {entry.error ? (
                    <>
                      <p className="line-clamp-3 text-[11px] leading-tight text-red-300">
                        {entry.error}
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => retry(entry)}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                        >
                          <RotateCw className="h-3 w-3" /> Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => dropPending(entry.id)}
                          className="rounded bg-gray-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-600"
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      <p className="text-[11px] text-gray-200" role="status">
                        {entry.stage === 'optimizing'
                          ? 'Optimizing…'
                          : entry.stage === 'uploading'
                            ? `Uploading ${Math.round(entry.progress * 100)}%`
                            : 'Waiting…'}
                      </p>
                      <div className="h-1 w-3/4 overflow-hidden rounded bg-gray-700">
                        <div
                          className="h-full bg-emerald-500 transition-[width]"
                          style={{ width: `${Math.round(entry.progress * 100)}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => cancel(entry)}
                        aria-label={`Cancel upload of ${entry.file.name}`}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {total < max && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-700 bg-gray-900/60 px-2 text-center text-gray-400 transition-colors hover:border-emerald-500 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">
                  {allowVideo ? 'Add pictures or videos' : 'Add pictures'}
                </span>
                <span className="text-[10px] text-gray-500">click, drop or paste</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={allowVideo ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*'}
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      {optionsItem && (
        <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-300">Video settings</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['autoplay', 'Autoplay', 'Starts muted when it scrolls into view. Off by default.'],
                ['loop', 'Loop', 'Replays from the start when it ends.'],
                ['muted', 'Muted', 'Starts without sound. Always on with autoplay.'],
                ['controls', 'Show player controls', 'Play, pause, seek and volume.'],
              ] as const
            ).map(([key, title, help]) => {
              const checked =
                key === 'controls'
                  ? optionsItem.controls !== false
                  : key === 'muted'
                    ? !!optionsItem.autoplay || !!optionsItem.muted
                    : !!optionsItem[key];
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 text-sm text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={key === 'muted' && !!optionsItem.autoplay}
                    onChange={(e) => {
                      const patch: Partial<MediaItem> = {};
                      patch[key] = e.target.checked;
                      patchItem(optionsItem.public_id, patch);
                    }}
                    className="mt-1 h-4 w-4 accent-emerald-500"
                  />
                  <span>
                    {title}
                    <span className="block text-xs text-gray-500">{help}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
