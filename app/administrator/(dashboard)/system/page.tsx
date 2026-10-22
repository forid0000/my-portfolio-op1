'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';
import { SYSTEM_DEFAULTS } from '@/lib/content-defaults';

interface SystemData {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;

  notFoundTitle: string;
  notFoundHeading: string;
  notFoundSubtext: string;
  notFoundButton: string;

  errorHeading: string;
  errorTitle: string;
  errorSubtext: string;
  errorButton: string;
  errorEmail: string;
}

export default function SystemCMS() {
  const [data, setData] = useState<SystemData>({ ...SYSTEM_DEFAULTS });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { markClean } = useUnsavedWarning(data, loading);

  useEffect(() => {
    fetch('/api/admin/content/system')
      .then((res) => res.json())
      .then((fetched) => {
        if (Object.keys(fetched).length > 0) {
          setData((prev) => ({ ...prev, ...fetched }));
        }
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleFieldChange = (field: keyof SystemData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/content/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      markClean(data);
      toast.success('System Settings updated successfully!');
    } catch (err: any) {
      toast.error('An error occurred while saving', {
        description: err.message,
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

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">System &amp; SEO</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage global metadata, 404, and 500 error messages.
          </p>
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
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed space-y-2">
              <p>
                <strong className="text-blue-300">Important:</strong> The 500 Error boundary is a
                critical fallback. If the database itself is down, it will use built-in safe
                defaults instead of these values.
              </p>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200/80 leading-relaxed">
                <strong className="text-blue-300">Admin Hint:</strong> For optimal SEO, keep your{' '}
                <strong>Site Title</strong> under 60 characters and your{' '}
                <strong>Meta Description</strong> between 150-160 characters. Keywords should be
                separated by commas.
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">Global SEO Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Site Title</label>
                <input
                  type="text"
                  value={data.seoTitle}
                  onChange={(e) => handleFieldChange('seoTitle', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={data.seoDescription}
                  onChange={(e) => handleFieldChange('seoDescription', e.target.value)}
                  rows={3}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Keywords (Comma Separated)
                </label>
                <textarea
                  value={data.seoKeywords}
                  onChange={(e) => handleFieldChange('seoKeywords', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">404 Not Found Page</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Big Title (e.g. 404)
                </label>
                <input
                  type="text"
                  value={data.notFoundTitle}
                  onChange={(e) => handleFieldChange('notFoundTitle', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Glitch Heading
                </label>
                <input
                  type="text"
                  value={data.notFoundHeading}
                  onChange={(e) => handleFieldChange('notFoundHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Subtext (use \n for new lines)
                </label>
                <textarea
                  value={data.notFoundSubtext}
                  onChange={(e) => handleFieldChange('notFoundSubtext', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Return Button Text
                </label>
                <input
                  type="text"
                  value={data.notFoundButton}
                  onChange={(e) => handleFieldChange('notFoundButton', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">500 Server Error Boundary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Terminal Heading
                </label>
                <input
                  type="text"
                  value={data.errorHeading}
                  onChange={(e) => handleFieldChange('errorHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Main Title</label>
                <input
                  type="text"
                  value={data.errorTitle}
                  onChange={(e) => handleFieldChange('errorTitle', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Subtext</label>
                <textarea
                  value={data.errorSubtext}
                  onChange={(e) => handleFieldChange('errorSubtext', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Try Again Button
                </label>
                <input
                  type="text"
                  value={data.errorButton}
                  onChange={(e) => handleFieldChange('errorButton', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Contact Email
                </label>
                <input
                  type="text"
                  value={data.errorEmail}
                  onChange={(e) => handleFieldChange('errorEmail', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
