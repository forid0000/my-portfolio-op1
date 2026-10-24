'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { extractApiErrorMessage } from '@/lib/utils';
import { whatsappHref } from '@/lib/contact-links';

export default function ContactCMS() {
  const [data, setData] = useState({
    heading: '',
    highlight: '',
    subtext: '',
    email: '',
    phone: '',
    whatsappLink: '',
    phoneLabel: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content/contact')
      .then((res) => res.json())
      .then((fetched) => {
        setData(fetched);
        setLoading(false);
      })
      .catch((err) => {
        toast.error('Failed to load existing data');
        setLoading(false);
      });
  }, []);

  const handleChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!data.heading.trim() || !data.highlight.trim()) {
      toast.error('Validation Error: Heading and Highlight cannot be empty.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error('Validation Error: Invalid email format.');
      return;
    }
    // Phone and WhatsApp are both optional (the phone card is hidden when neither is set), but a
    // WhatsApp value has to be something that can open WhatsApp.
    if (data.whatsappLink.trim() && !whatsappHref(data.whatsappLink)) {
      toast.error(
        'Enter your WhatsApp number with the country code (for example +1 555 123 4567), or a wa.me link.'
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/content/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(extractApiErrorMessage(errorData));
      }

      toast.success('Contact Config updated successfully!', {
        description: 'Changes are now live on your portfolio.',
      });
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
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Contact Form Config</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the text and contact info for your main contact section.
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
              <strong className="text-blue-300">Admin Hint:</strong> Visitors who click the email
              card open their mail app, and the phone card opens WhatsApp (or the dialer when there
              is no WhatsApp). Each card also has a small copy button. Type the WhatsApp number with
              the country code, for example <code>+1 555 123 4567</code>, or paste a{' '}
              <code>https://wa.me/…</code> link. Phone and WhatsApp are both optional; the phone
              card is hidden when neither is set.
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">Messaging Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Heading Prefix
                </label>
                <input
                  type="text"
                  value={data.heading || ''}
                  onChange={(e) => handleChange('heading', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Heading Highlight
                </label>
                <input
                  type="text"
                  value={data.highlight || ''}
                  onChange={(e) => handleChange('highlight', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Subtext Description
              </label>
              <textarea
                value={data.subtext || ''}
                onChange={(e) => handleChange('subtext', e.target.value)}
                rows={3}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500 transition-all resize-y leading-relaxed font-mono text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-200 mb-6">Contact Channels</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Direct Email</label>
                <input
                  type="email"
                  data-field="email"
                  value={data.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Phone Label
                  </label>
                  <input
                    type="text"
                    value={data.phoneLabel || ''}
                    onChange={(e) => handleChange('phoneLabel', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Phone Number (optional, shown on the card and used to call)
                  </label>
                  <input
                    type="text"
                    data-field="phone"
                    value={data.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    WhatsApp number or link (optional)
                  </label>
                  <input
                    type="text"
                    data-field="whatsappLink"
                    value={data.whatsappLink || ''}
                    onChange={(e) => handleChange('whatsappLink', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
