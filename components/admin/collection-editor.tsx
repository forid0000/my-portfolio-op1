'use client';

import React, { useEffect, useState } from 'react';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';

export interface CollectionItem {
  _id?: string;
  order?: number;
  [key: string]: any;
}

interface CollectionEditorProps<T extends CollectionItem> {
  endpoint: string;
  title: string;
  description: string;
  itemNoun: string;
  emptyItem: () => Omit<T, '_id' | 'order'>;
  getItemLabel: (item: T, index: number) => string;
  renderFields: (item: T, onChange: (field: string, value: any) => void) => React.ReactNode;
  validateItem?: (item: T) => string | null;
}

/**
 * Shared list-editor shell for the independent-collection sections (education,
 * certifications, testimonials, services, publications). Each module's admin
 * page is just this component + a field renderer - the drag-reorder, add/remove,
 * unsaved-warning, and save/delete wiring live here once instead of five times.
 *
 * Unlike the single-doc-with-array pages (Projects, Experience), these collections
 * hold one Mongo document per item, so removing an item fires an immediate DELETE
 * rather than waiting for "Save Changes" - there's no array-replace to fall back on.
 */
export function CollectionEditor<T extends CollectionItem>({
  endpoint,
  title,
  description,
  itemNoun,
  emptyItem,
  getItemLabel,
  renderFields,
  validateItem,
}: CollectionEditorProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(items, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, [endpoint]);

  const dndId = (item: T, idx: number) => item._id || `_new_${idx}`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((it, i) => dndId(it, i) === active.id);
        const newIndex = prev.findIndex((it, i) => dndId(it, i) === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((it, idx) => ({ ...it, order: idx }));
      });
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...(emptyItem() as T), order: prev.length }]);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (!item._id) return;
    try {
      const res = await fetch(`${endpoint}?id=${item._id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(await res.json().catch(() => ({}))));
      }
      toast.success(`${itemNoun} removed`);
    } catch (err) {
      toast.error('Failed to delete', {
        description: err instanceof Error ? err.message : 'Please check your connection.',
      });
    }
  };

  const handleSubmit = async () => {
    if (validateItem) {
      for (const item of items) {
        const error = validateItem(item);
        if (error) {
          toast.error('Validation Error', { description: error });
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(await res.json().catch(() => ({}))));
      }

      toast.success('Saved successfully!', {
        description: 'Changes are now live on your portfolio.',
      });

      // Re-fetch so newly-added items pick up their server-generated _id -
      // without this, a second save would insert duplicates instead of updating.
      // Baseline the refreshed data (not the pre-refetch state), otherwise the
      // incoming _ids would immediately re-flag the page as dirty.
      const refreshed = await fetch(endpoint).then((r) => r.json());
      const next = Array.isArray(refreshed) ? refreshed : [];
      setItems(next);
      markClean(next);
    } catch (err) {
      toast.error('Failed to save', {
        description:
          err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">{title}</h1>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">
              {items.length} {itemNoun}
              {items.length === 1 ? '' : 's'}
            </h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm font-medium bg-emerald-950 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add {itemNoun}
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(dndId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {items.map((item, idx) => (
                  <SortableItem
                    key={dndId(item, idx)}
                    id={dndId(item, idx)}
                    className="relative group"
                    dragHandleClassName="top-3 left-3 z-10 w-8 h-8 flex items-center justify-center p-0"
                  >
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative group">
                      <button
                        onClick={() => removeItem(idx)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title={`Remove this ${itemNoun.toLowerCase()}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <h4 className="text-emerald-500 font-mono text-sm mb-4 border-b border-gray-800 pb-2 pr-10 truncate">
                        {getItemLabel(item, idx) || `${itemNoun} ${idx + 1}`}
                      </h4>

                      {renderFields(item, (field, value) => handleFieldChange(idx, field, value))}
                    </div>
                  </SortableItem>
                ))}

                {items.length === 0 && (
                  <div className="text-center p-12 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                    <p className="text-gray-500 mb-4">No {itemNoun.toLowerCase()}s added yet.</p>
                    <button
                      onClick={addItem}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add First {itemNoun}
                    </button>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
