'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Layers } from 'lucide-react';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';

export default function TechStacksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isDirty, markClean } = useUnsavedWarning(data, loading);

  useEffect(() => {
    fetch('/api/admin/content/tech-stacks')
      .then((r) => r.json())
      .then((d) => setData(d.content || d))
      .catch(() => toast.error('Failed to load tech stacks'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/tech-stacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      markClean(data);
      toast.success('Tech Stacks saved successfully!');
    } catch (err) {
      toast.error('Failed to save', {
        description:
          err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
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

  const handleRowChange = (row: string, val: string) => {
    setData((prev: any) => ({
      ...prev,
      [row]: val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" /> Tech Stacks
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the technologies displayed on the marquee.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs font-medium text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{' '}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="grid gap-6">
          {['row1', 'row2', 'row3'].map((row) => (
            <div key={row} className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
              <label className="block text-sm font-semibold text-gray-300 capitalize mb-2">
                {row} Technologies
              </label>
              <textarea
                value={(data?.[row] || []).join(', ')}
                onChange={(e) => handleRowChange(row, e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 h-24"
                placeholder="Comma separated values... (e.g. React, Next.js, Tailwind)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
