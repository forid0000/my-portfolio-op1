'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { extractApiErrorMessage } from '@/lib/utils';

export default function HomepageCMS() {
  const [formData, setFormData] = useState({
    greeting: '',
    aiPhrases: '',
    firstName: '',
    lastName: '',
    subtitle: '',
    description: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content/homepage')
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          greeting: data.greeting || '',
          aiPhrases:
            data.aiPhrases ||
            'checking environment..., analyzing repository..., hunking data..., punking algorithms..., compiling assets...',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          subtitle: data.subtitle || '',
          description: data.description || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.subtitle.trim() ||
      !formData.description.trim()
    ) {
      toast.error(
        'Validation Error: First Name, Last Name, Subtitle, and Description cannot be empty.'
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/content/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Homepage content updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Hero Section</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the greeting, name, and subtitle shown on your portfolio landing page.
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
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 leading-relaxed">
              <strong className="text-blue-300">Admin Hint:</strong> Keep the subtitle relatively
              short so it fits nicely in the hacker-text typing animation.
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-800 pb-2">
              Hero Text Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Greeting Text
                </label>
                <input
                  type="text"
                  name="greeting"
                  value={formData.greeting}
                  onChange={handleChange}
                  placeholder="e.g. WELCOME TO MY PORTFOLIO..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  AI Magic Phrases (Comma-separated)
                </label>
                <textarea
                  name="aiPhrases"
                  value={formData.aiPhrases}
                  onChange={handleChange}
                  rows={2}
                  placeholder="checking environment..., hunking data..., punking algorithms..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-mono text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Last Name (Gradient)
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Subtitle (Hacker Typing Text)
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Main Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
