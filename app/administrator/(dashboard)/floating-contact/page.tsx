'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Info, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/sortable-item';
import { useSafeDndSensors } from '@/hooks/use-safe-dnd-sensors';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { IconPicker } from '@/components/admin/icon-picker';
import { ALL_LUCIDE_ICON_NAMES } from '@/lib/lucide-icon';
import { resolveSocialIcon, SOCIAL_BRAND_ICON_NAMES } from '@/lib/social-icon';
import { extractApiErrorMessage } from '@/lib/utils';

/** Full lucide catalog plus the hand-drawn brand marks (DevToIcon, MediumIcon, etc.). */
const SOCIAL_ICON_NAMES = [...SOCIAL_BRAND_ICON_NAMES, ...ALL_LUCIDE_ICON_NAMES];

interface Item {
  _dndId?: string;
  label: string;
  value: string;
  copyValue: string;
  href: string;
  icon: string;
}

interface Data {
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonSubLabel: string;
  footerText: string;
  items: Item[];
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function FloatingContactCMS() {
  const [data, setData] = useState<Data>({
    heading: '',
    subtext: '',
    buttonLabel: '',
    buttonSubLabel: '',
    footerText: '',
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(data, loading);

  const sensors = useSafeDndSensors();

  useEffect(() => {
    fetch('/api/admin/content/floating')
      .then((r) => r.json())
      .then((d) => {
        setData({
          heading: d.heading || '',
          subtext: d.subtext || '',
          buttonLabel: d.buttonLabel || '',
          buttonSubLabel: d.buttonSubLabel || '',
          footerText: d.footerText || '',
          items: (d.items || []).map((it: Item) => ({ ...it, _dndId: uid() })),
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load floating contact');
        setLoading(false);
      });
  }, []);

  const setField = (k: keyof Data, v: string) => setData((p) => ({ ...p, [k]: v }));

  const setItem = (idx: number, k: keyof Item, v: string) => {
    setData((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [k]: v };
      return { ...p, items };
    });
  };

  const addItem = () =>
    setData((p) => ({
      ...p,
      items: [
        ...p.items,
        { _dndId: uid(), label: '', value: '', copyValue: '', href: '', icon: 'Mail' },
      ],
    }));
  const removeItem = (idx: number) =>
    setData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setData((p) => {
        const oldIndex = p.items.findIndex((i) => i._dndId === active.id);
        const newIndex = p.items.findIndex((i) => i._dndId === over.id);
        return { ...p, items: arrayMove(p.items, oldIndex, newIndex) };
      });
    }
  };

  const handleSubmit = async () => {
    for (const it of data.items) {
      if (!it.label.trim() || !it.href.trim()) {
        toast.error('Each item needs at least a Label and a Link (href).');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...data, items: data.items.map(({ _dndId, ...rest }) => rest) };
      const res = await fetch('/api/admin/content/floating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(e));
      }
      markClean(data);
      toast.success('Floating contact updated!', {
        description: 'Changes are live on your portfolio.',
      });
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" /> Floating Contact
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            The "Let&apos;s Connect" popup button in the bottom-right corner.
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> Drag items to reorder. "Link"
              is opened on click; "Copy Value" is what the copy button copies (e.g. raw email or
              phone).
            </div>
          </div>

          {/* Text fields */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Button Label</label>
              <input
                value={data.buttonLabel}
                onChange={(e) => setField('buttonLabel', e.target.value)}
                placeholder="Let's Connect"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Button Sub-label
              </label>
              <input
                value={data.buttonSubLabel}
                onChange={(e) => setField('buttonSubLabel', e.target.value)}
                placeholder="Let's talk"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Popup Heading</label>
              <input
                value={data.heading}
                onChange={(e) => setField('heading', e.target.value)}
                placeholder="Let's Connect"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Popup Subtext</label>
              <input
                value={data.subtext}
                onChange={(e) => setField('subtext', e.target.value)}
                placeholder="Reach out anywhere"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Footer Text</label>
              <input
                value={data.footerText}
                onChange={(e) => setField('footerText', e.target.value)}
                placeholder="Available for new opportunities"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-6">
              <h3 className="text-lg font-semibold text-gray-200">Contact Items</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-medium bg-emerald-950 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-900 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={data.items.map((i) => i._dndId!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {data.items.map((item, idx) => (
                    <SortableItem
                      key={item._dndId}
                      id={item._dndId!}
                      className="relative group"
                      dragHandleClassName="top-3 left-2 z-10 w-8 h-8 flex items-center justify-center p-0"
                    >
                      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 pl-12 relative">
                        <button
                          onClick={() => removeItem(idx)}
                          className="absolute top-3 right-3 p-2 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            value={item.label}
                            onChange={(e) => setItem(idx, 'label', e.target.value)}
                            placeholder="Label (e.g. Email)"
                            className="bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <IconPicker
                            value={item.icon}
                            onChange={(name) => setItem(idx, 'icon', name)}
                            icons={SOCIAL_ICON_NAMES}
                            resolve={resolveSocialIcon}
                            allowCustom={false}
                          />
                          <input
                            value={item.value}
                            onChange={(e) => setItem(idx, 'value', e.target.value)}
                            placeholder="Display value (e.g. you@example.com)"
                            className="bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-gray-300 text-sm font-mono focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            value={item.copyValue}
                            onChange={(e) => setItem(idx, 'copyValue', e.target.value)}
                            placeholder="Copy value (e.g. raw email/phone)"
                            className="bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-gray-300 text-sm font-mono focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            value={item.href}
                            onChange={(e) => setItem(idx, 'href', e.target.value)}
                            placeholder="Link (https://... or mailto:)"
                            className="sm:col-span-2 bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-gray-300 text-sm font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </SortableItem>
                  ))}
                  {data.items.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">
                      No items yet. Add one above.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
