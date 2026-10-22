'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Type, AlertCircle } from 'lucide-react';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import { extractApiErrorMessage } from '@/lib/utils';
import { DEFAULT_DEVTO_USERNAME } from '@/lib/content-defaults';

const DEFAULTS = {
  galleryHeading: 'Captured',
  galleryHighlight: 'Moments',
  gallerySubtext: 'A randomized visual timeline of technical growth and personal milestones.',
  roadmapHeading: 'System',
  roadmapHighlight: 'Evolution_Path',
  projectsHeading: 'My Projects',
  skillsHeading: 'My technical arsenal...',
  experienceHeading: 'Experience',
  aboutHeading: 'About Me',
  contactHeading: 'Initiate Connection',
  contactHighlight: '',
  contactSubtext: 'Send a message and I will get back to you as soon as I can.',
  articlesBadge: 'Fetching Articles From Online...',
  articlesHeading: 'articles',
  articlesSubtext: 'Documenting my journey through code, infrastructure, and bugs.',
  articlesRecentUploads: 'Recent Uploads',
  articlesEmptyAPI: 'No packets received. API might be down.',
  articlesGoBack: 'cd .. || go back',
  articlesAuthor: 'AUTHOR',
  articlesReadTime: 'min read',
  articlesEnjoyed: 'Enjoyed this article?',
  articlesDiscuss: 'Join the discussion on Dev.to or share it with others.',
  articlesDiscussBtn: 'Discuss',
  articlesEndOfFile: '// END_OF_FILE',
  devToUsername: DEFAULT_DEVTO_USERNAME,
  articlesCanonicalTarget: 'devto',
};

export default function HeadingsPage() {
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isDirty, markClean } = useUnsavedWarning(data, loading);

  useEffect(() => {
    fetch('/api/admin/content/headings')
      .then((r) => r.json())
      .then((d) => {
        if (d && Object.keys(d).length > 0) {
          setData({ ...DEFAULTS, ...d });
        }
      })
      .catch(() => toast.error('Failed to load section texts'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof typeof DEFAULTS, val: string) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/content/headings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }
      markClean(data);
      toast.success('Section texts saved successfully!');
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
      <div className="p-6 border-b border-gray-800 bg-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Type className="w-6 h-6 text-emerald-400" /> Section Texts
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the main headings, highlights, and descriptions for all public sections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Texts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto mb-6">
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200/80 leading-relaxed">
                <strong className="text-blue-300">Admin Hint:</strong> Section headings are heavily
                stylized with the hacker font. Keep them short (max 25 characters) so they don't
                break the responsive grid on mobile devices. Use underscores instead of spaces for
                the "Highlight" words (e.g.,{' '}
                <code className="bg-blue-900/40 px-1 rounded">Evolution_Path</code>) to match the
                terminal aesthetic.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Gallery Section
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={data.galleryHeading}
                  onChange={(e) => handleChange('galleryHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Highlight (Colored)
                </label>
                <input
                  type="text"
                  value={data.galleryHighlight}
                  onChange={(e) => handleChange('galleryHighlight', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Subtext / Description
              </label>
              <textarea
                value={data.gallerySubtext}
                onChange={(e) => handleChange('gallerySubtext', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none h-20"
              />
            </div>
          </div>

          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Roadmap Section
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={data.roadmapHeading}
                  onChange={(e) => handleChange('roadmapHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Highlight
                </label>
                <input
                  type="text"
                  value={data.roadmapHighlight}
                  onChange={(e) => handleChange('roadmapHighlight', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Contact Section
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Heading
                </label>
                <input
                  type="text"
                  value={data.contactHeading}
                  onChange={(e) => handleChange('contactHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Highlight
                </label>
                <input
                  type="text"
                  value={data.contactHighlight}
                  onChange={(e) => handleChange('contactHighlight', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Subtext / Description
              </label>
              <textarea
                value={data.contactSubtext}
                onChange={(e) => handleChange('contactSubtext', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none h-20"
              />
            </div>
          </div>

          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Other Sections (Headings Only)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Projects Section
              </label>
              <input
                type="text"
                value={data.projectsHeading}
                onChange={(e) => handleChange('projectsHeading', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Skills Section
              </label>
              <input
                type="text"
                value={data.skillsHeading}
                onChange={(e) => handleChange('skillsHeading', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Experience Section
              </label>
              <input
                type="text"
                value={data.experienceHeading}
                onChange={(e) => handleChange('experienceHeading', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                About Section
              </label>
              <input
                type="text"
                value={data.aboutHeading}
                onChange={(e) => handleChange('aboutHeading', e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Articles Section (Blog)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  Dev.to API Username
                </label>
                <input
                  type="text"
                  value={data.devToUsername}
                  onChange={(e) => handleChange('devToUsername', e.target.value)}
                  className="w-full bg-gray-950 border border-emerald-900/50 rounded px-3 py-2 text-sm text-emerald-400 focus:border-emerald-500 outline-none font-mono"
                  placeholder="e.g. your-devto-username (leave empty to disable)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  SEO Canonical Target
                </label>
                <select
                  value={data.articlesCanonicalTarget}
                  onChange={(e) => handleChange('articlesCanonicalTarget', e.target.value)}
                  className="w-full bg-gray-950 border border-emerald-900/50 rounded px-3 py-2 text-sm text-emerald-400 focus:border-emerald-500 outline-none font-mono"
                >
                  <option value="devto">Dev.to (source of truth - zero maintenance)</option>
                  <option value="self">My Site (your own domain gets SEO credit)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={data.articlesBadge}
                  onChange={(e) => handleChange('articlesBadge', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Heading (without ~/, e.g., articles)
                </label>
                <input
                  type="text"
                  value={data.articlesHeading}
                  onChange={(e) => handleChange('articlesHeading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Subtext / Description
                </label>
                <input
                  type="text"
                  value={data.articlesSubtext}
                  onChange={(e) => handleChange('articlesSubtext', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Recent Uploads Text
                </label>
                <input
                  type="text"
                  value={data.articlesRecentUploads}
                  onChange={(e) => handleChange('articlesRecentUploads', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Empty API State Text
                </label>
                <input
                  type="text"
                  value={data.articlesEmptyAPI}
                  onChange={(e) => handleChange('articlesEmptyAPI', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <h4 className="text-md font-semibold text-gray-300 mt-6 border-b border-gray-800 pb-2">
              Individual Article Page
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Go Back Button
                </label>
                <input
                  type="text"
                  value={data.articlesGoBack}
                  onChange={(e) => handleChange('articlesGoBack', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Author Label
                </label>
                <input
                  type="text"
                  value={data.articlesAuthor}
                  onChange={(e) => handleChange('articlesAuthor', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Read Time Suffix
                </label>
                <input
                  type="text"
                  value={data.articlesReadTime}
                  onChange={(e) => handleChange('articlesReadTime', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Enjoyed Article Title
                </label>
                <input
                  type="text"
                  value={data.articlesEnjoyed}
                  onChange={(e) => handleChange('articlesEnjoyed', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Enjoyed Subtext
                </label>
                <input
                  type="text"
                  value={data.articlesDiscuss}
                  onChange={(e) => handleChange('articlesDiscuss', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Discuss Button
                </label>
                <input
                  type="text"
                  value={data.articlesDiscussBtn}
                  onChange={(e) => handleChange('articlesDiscussBtn', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  End of File text
                </label>
                <input
                  type="text"
                  value={data.articlesEndOfFile}
                  onChange={(e) => handleChange('articlesEndOfFile', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
