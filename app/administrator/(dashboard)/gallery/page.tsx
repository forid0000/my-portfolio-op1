'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Save,
  FolderInput,
  Pencil,
  Tag,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { toast } from 'sonner';
import { extractApiErrorMessage } from '@/lib/utils';

interface GalleryItem {
  _id?: string;
  _dndId?: string;
  public_id: string;
  src: string;
  alt: string;
  date: string;
  width: number;
  height: number;
  category: string;
  tags?: string[];
  order: number;
  _dirty?: boolean;
}

interface UploadStatus {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  error?: string;
  tags?: string[];
  category?: string;
}

const NEW_CATEGORY = '__new__';

// Cloudinary delivery optimization (auto format + quality, capped width for thumbs)
function thumb(url: string, w = 400) {
  return url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`) : url;
}

export default function GalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const { markClean } = useUnsavedWarning(items, loading);

  // upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadStatus[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming: File[]) => {
    const imgs = incoming.filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) {
      if (incoming.length > 0) toast.error('Only image files are supported.');
      return;
    }
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.name + p.size));
      return [...prev, ...imgs.filter((f) => !seen.has(f.name + f.size))];
    });
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const sensors = useSafeDndSensors();

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const it of items) if (it.category && !seen.includes(it.category)) seen.push(it.category);
    return seen.sort();
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.category] = (c[it.category] || 0) + 1;
    return c;
  }, [items]);

  const visible = useMemo(
    () => (activeFilter === 'all' ? items : items.filter((i) => i.category === activeFilter)),
    [items, activeFilter]
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content/gallery');
      const data = await res.json();
      if (data.items) {
        setItems(
          data.items
            .map((d: any) => ({
              ...d,
              _id: d._id?.toString?.() ?? d._id,
              _dndId:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : Math.random().toString(36).substring(2),
            }))
            .sort((a: GalleryItem, b: GalleryItem) => a.order - b.order)
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = visible.findIndex((i) => i._dndId === active.id);
        const newIndex = visible.findIndex((i) => i._dndId === over.id);

        if (oldIndex === -1 || newIndex === -1) return prev;

        const newVisible = arrayMove(visible, oldIndex, newIndex);
        const originalOrders = visible.map((i) => i.order).sort((a, b) => a - b);

        const movedMap = new Map(
          newVisible.map((it, idx) => [
            it._dndId,
            { ...it, order: originalOrders[idx], _dirty: true },
          ])
        );

        return prev
          .map((it) => (movedMap.has(it._dndId) ? movedMap.get(it._dndId)! : it))
          .sort((a, b) => a.order - b.order);
      });
    }
  };

  // ---- Upload (server-side, runs Cloudinary AI auto-tagging) ----
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    const cat = useNewCategory ? newCategory.trim() : uploadCategory;

    setUploading(true);
    setShowProgress(true);
    setProgress(files.map((f) => ({ fileName: f.name, status: 'pending' as const })));

    const update = (name: string, patch: Partial<UploadStatus>) =>
      setProgress((prev) => prev.map((p) => (p.fileName === name ? { ...p, ...patch } : p)));

    let succeeded = 0;
    let failed = 0;
    for (const file of files) {
      update(file.name, { status: 'uploading' });
      try {
        const fd = new FormData();
        fd.append('file', file);
        if (cat) fd.append('category', cat);
        const res = await fetch('/api/admin/content/gallery/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          succeeded++;
          update(file.name, {
            status: 'success',
            category: data.item?.category,
            tags: (data.suggestedTags || []).map((t: any) => t.tag).slice(0, 6),
          });
        } else {
          failed++;
          update(file.name, { status: 'failed', error: data.error || 'Upload failed' });
        }
      } catch (err: any) {
        failed++;
        update(file.name, { status: 'failed', error: err.message || 'Network error' });
      }
    }

    setFiles([]);
    setUploading(false);
    fetchItems();

    if (succeeded > 0) toast.success(`Uploaded ${succeeded} image${succeeded > 1 ? 's' : ''}`);
    if (failed > 0) toast.error(`${failed} upload${failed > 1 ? 's' : ''} failed`);
  };

  // ---- Per-item edits ----
  const patchItem = (public_id: string, patch: Partial<GalleryItem>) =>
    setItems((prev) =>
      prev.map((it) => (it.public_id === public_id ? { ...it, _dirty: true, ...patch } : it))
    );

  const saveItem = async (item: GalleryItem): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/content/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: item.public_id,
          src: item.src,
          alt: item.alt,
          date: item.date,
          width: item.width,
          height: item.height,
          category: item.category,
          tags: item.tags || [],
          order: item.order,
        }),
      });
      if (res.ok) {
        patchItem(item.public_id, { _dirty: false });
        toast.success('Image updated');
        return true;
      }
      const errorData = await res.json().catch(() => ({}));
      toast.error(`Failed to save image: ${extractApiErrorMessage(errorData, 'Unknown error')}`);
      return false;
    } catch (e: any) {
      console.error(e);
      toast.error(`Error saving image: ${e.message || 'Network error'}`);
      return false;
    }
  };

  const deleteItem = async (public_id: string) => {
    if (!confirm('Delete this image from the gallery and Cloudinary?')) return;
    try {
      const res = await fetch('/api/admin/content/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.public_id !== public_id));
        toast.success('Image deleted');
      } else {
        toast.error('Failed to delete image');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error deleting image');
    }
  };

  const renameCategory = async (from: string) => {
    const to = prompt(`Rename category "${from}" to:`, from);
    if (!to || to === from) return;
    try {
      const res = await fetch('/api/admin/content/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', from, to }),
      });
      if (res.ok) {
        if (activeFilter === from) setActiveFilter(to);
        fetchItems();
        toast.success(`Renamed category to "${to}"`);
      } else {
        toast.error('Failed to rename category');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error renaming category');
    }
  };

  const dirtyCount = items.filter((i) => i._dirty).length;
  // Mirrors the pattern every other sortable admin page uses: once nothing is
  // dirty, clear the unsaved-changes flag so the beforeunload guard drops.
  useEffect(() => {
    if (dirtyCount === 0) markClean();
  }, [dirtyCount, markClean]);
  const saveAllDirty = async () => {
    const dirty = items.filter((i) => i._dirty);
    if (dirty.length === 0) return;
    try {
      const res = await fetch('/api/admin/content/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkPatch: dirty.map((it) => ({
            public_id: it.public_id,
            src: it.src,
            alt: it.alt,
            date: it.date,
            width: it.width,
            height: it.height,
            category: it.category,
            tags: it.tags || [],
            order: it.order,
          })),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      const dirtyIds = new Set(dirty.map((it) => it.public_id));
      setItems((prev) =>
        prev.map((it) => (dirtyIds.has(it.public_id) ? { ...it, _dirty: false } : it))
      );
      toast.success(`Saved ${dirty.length} image${dirty.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Failed to save changes', {
        description:
          err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
    }
  };

  return (
    <div className="space-y-6 text-gray-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Gallery CMS</h2>
          <span className="text-xs text-gray-500">
            {items.length} images · {categories.length} categories
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              onClick={saveAllDirty}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" /> Save {dirtyCount} change{dirtyCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={fetchItems}
            className="text-gray-400 hover:text-emerald-400 transition-colors p-1.5"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Hint */}
      <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200/80 leading-relaxed">
            <strong className="text-blue-300">Admin Hint:</strong> High-resolution images are
            recommended. For the best visual masonry grid effect, mix different aspect ratios (e.g.,
            16:9, 4:3, and portrait). Keep captions under 50 characters to prevent UI overlap on
            mobile devices.
          </div>
        </div>
      </div>

      {/* Upload panel */}
      <form
        onSubmit={handleUpload}
        className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <UploadCloud className="w-4 h-4 text-emerald-500" /> Add images
          <span className="flex items-center gap-1 text-[11px] text-emerald-400/80 font-normal">
            <Tag className="w-3 h-3" /> auto-tagged on upload
          </span>
        </div>
        {/* Drag & drop zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(Array.from(e.dataTransfer.files || []));
          }}
          className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors ${
            dragOver
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-gray-700 hover:border-gray-600 bg-gray-900/40'
          }`}
        >
          <UploadCloud className={`w-6 h-6 ${dragOver ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className="text-sm text-gray-400">
            Drag &amp; drop images here, or{' '}
            <span className="text-emerald-400 font-medium">browse</span>
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
        </label>

        {/* Selected files (before upload) */}
        {files.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {files.map((f, i) => (
              <span
                key={f.name + f.size + i}
                className="flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg"
              >
                <span className="max-w-[160px] truncate" title={f.name}>
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-500 hover:text-red-400"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-gray-500 hover:text-red-400 underline-offset-2 hover:underline"
            >
              clear all
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Category chooser */}
          {!useNewCategory ? (
            <div className="flex items-center gap-2">
              <FolderInput className="w-4 h-4 text-gray-500" />
              <select
                value={uploadCategory}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setUseNewCategory(true);
                  } else setUploadCategory(e.target.value);
                }}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              >
                <option value="">Auto (AI decides)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ New category…</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="new category name"
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
              />
              <button
                type="button"
                onClick={() => {
                  setUseNewCategory(false);
                  setNewCategory('');
                }}
                className="p-2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={files.length === 0 || uploading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            Upload {files.length > 0 && `(${files.length})`}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          Leave category on <span className="text-gray-400">Auto</span> to let Cloudinary AI
          (Imagga) pick a tag, or choose / create one to force it. Drag items to reorder them within
          their category.
        </p>
      </form>

      {/* Category filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeFilter === 'all' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-emerald-500/50'}`}
        >
          All ({items.length})
        </button>
        {categories.map((c) => (
          <div key={c} className="group flex items-center">
            <button
              onClick={() => setActiveFilter(c)}
              className={`px-3 py-1.5 rounded-l-full text-xs font-semibold border transition-colors ${activeFilter === c ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-emerald-500/50'}`}
            >
              {c} ({counts[c]})
            </button>
            <button
              onClick={() => renameCategory(c)}
              title="Rename category"
              className={`px-2 py-1.5 rounded-r-full text-xs border border-l-0 transition-colors ${activeFilter === c ? 'bg-emerald-600 border-emerald-600 text-white/80 hover:text-white' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-emerald-400'}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <ImageIcon className="w-12 h-12 mb-3 text-gray-800" />
          <p>No images here yet. Upload some above.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((i) => i._dndId!)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map((item) => (
                <SortableItem
                  key={item._dndId}
                  id={item._dndId!}
                  className="relative h-full"
                  dragHandleClassName="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center p-0 bg-gray-950/80 rounded-lg hover:bg-gray-800 text-gray-300 border border-gray-700"
                >
                  <div
                    className={`bg-gray-950 border rounded-xl overflow-hidden flex flex-col h-full ${item._dirty ? 'border-amber-600/60' : 'border-gray-800'}`}
                  >
                    <div className="relative aspect-video bg-gray-900">
                      <Image
                        src={thumb(item.src)}
                        alt={item.alt}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <a
                          href={item.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Image"
                          className="p-1.5 bg-gray-950/80 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteItem(item.public_id)}
                          title="Delete"
                          className="p-1.5 bg-gray-950/80 text-red-400 rounded-lg hover:bg-red-950/70 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 space-y-2 flex-1">
                      <input
                        value={item.alt || ''}
                        onChange={(e) => patchItem(item.public_id, { alt: e.target.value })}
                        placeholder="caption / alt text"
                        className="w-full bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-xs text-gray-100 focus:border-emerald-600 outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-1">
                          <Tag className="w-3 h-3 text-gray-500 shrink-0" />
                          <input
                            value={item.category || ''}
                            onChange={(e) =>
                              patchItem(item.public_id, { category: e.target.value })
                            }
                            list="cat-list"
                            placeholder="Category"
                            className="w-full bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-xs text-gray-100 focus:border-emerald-600 outline-none"
                          />
                        </div>
                        <input
                          type="date"
                          value={(item.date || '').slice(0, 10)}
                          onChange={(e) => patchItem(item.public_id, { date: e.target.value })}
                          className="bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-xs text-gray-100 focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gray-500 shrink-0" />
                        <input
                          value={(item.tags || []).join(', ')}
                          onChange={(e) =>
                            patchItem(item.public_id, {
                              tags: e.target.value
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Tags (comma-separated, max 5)"
                          className="w-full bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-xs text-gray-100 focus:border-emerald-600 outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-[10px] text-gray-600">
                          {item.width}×{item.height}
                        </span>
                        <button
                          onClick={() => saveItem(item)}
                          disabled={!item._dirty}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${item._dirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-800 text-gray-600 cursor-default'}`}
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* category autocomplete source */}
      <datalist id="cat-list">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Upload progress dock */}
      {showProgress && (
        <div className="fixed bottom-6 right-6 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-96">
          <div className="p-3 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              Upload progress
            </h4>
            {!uploading && (
              <button
                onClick={() => setShowProgress(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {progress.map((p, i) => (
              <div key={i} className="p-2 rounded-lg bg-gray-950 border border-gray-800/50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 truncate pr-2 max-w-[180px]" title={p.fileName}>
                    {p.fileName}
                  </span>
                  {p.status === 'pending' && <Clock className="w-4 h-4 text-gray-500" />}
                  {p.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  )}
                  {p.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {p.status === 'failed' && (
                    <span title={p.error}>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </span>
                  )}
                </div>
                {p.status === 'success' && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 flex items-center gap-1">
                      <FolderInput className="w-2.5 h-2.5" /> {p.category}
                    </span>
                    {p.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
