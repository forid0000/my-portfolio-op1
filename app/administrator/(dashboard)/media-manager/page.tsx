'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Trash2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { extractApiErrorMessage } from '@/lib/utils';

interface DocumentItem {
  _id: string;
  name: string;
  mimeType: string;
  isActive: boolean;
  uploadedAt: string;
  secure_url?: string;
}

export default function MediaManager() {
  const [resumes, setResumes] = useState<DocumentItem[]>([]);
  const [avatars, setAvatars] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resumesRes, avatarsRes] = await Promise.all([
        fetch('/api/admin/resumes'),
        fetch('/api/admin/avatars'),
      ]);
      setResumes(await resumesRes.json());
      setAvatars(await avatarsRes.json());
    } catch (e) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'resumes' | 'avatars'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File is too large (max 10MB)');
      return;
    }

    setUploading({ ...uploading, [type]: true });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await fetch(`/api/admin/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            base64: reader.result,
            isActive: false, // user explicitly sets active later
          }),
        });

        if (res.ok) {
          toast.success('Uploaded successfully');
          fetchData();
        } else {
          const errorData = await res.json().catch(() => ({}));
          toast.error('Upload failed', {
            description: extractApiErrorMessage(errorData, 'Upload failed'),
          });
        }
      } catch (err) {
        toast.error('Network error');
      } finally {
        setUploading({ ...uploading, [type]: false });
      }
    };
  };

  const setActive = async (id: string, type: 'resumes' | 'avatars') => {
    try {
      const res = await fetch(`/api/admin/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', id }),
      });
      if (res.ok) {
        toast.success('Active item updated');
        fetchData();
      } else {
        toast.error('Failed to update active status');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const deleteItem = async (id: string, type: 'resumes' | 'avatars') => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`/api/admin/${type}?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-10 text-gray-100">
      <div className="flex items-center gap-2">
        <FileText className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-bold">Media & Document Manager</h2>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Resumes Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Resume Library
              </h3>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {uploading.resumes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Upload Resume
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'resumes')}
                  disabled={uploading.resumes}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {resumes.map((doc) => (
                <div
                  key={doc._id}
                  className={`bg-gray-950 border rounded-xl p-4 flex flex-col gap-3 transition-colors ${doc.isActive ? 'border-emerald-500 bg-emerald-950/10' : 'border-gray-800'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="truncate text-sm font-medium pr-2" title={doc.name}>
                      {doc.name}
                    </div>
                    {doc.isActive && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleDateString()} ·{' '}
                    {doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-800/50">
                    {!doc.isActive && (
                      <button
                        onClick={() => setActive(doc._id, 'resumes')}
                        className="flex-1 bg-gray-900 hover:bg-emerald-900/40 hover:text-emerald-400 text-gray-300 text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Set Active
                      </button>
                    )}
                    <button
                      onClick={() => deleteItem(doc._id, 'resumes')}
                      disabled={doc.isActive}
                      className="p-1.5 bg-gray-900 text-red-400 rounded hover:bg-red-950/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {resumes.length === 0 && (
                <div className="text-sm text-gray-500 italic">No resumes uploaded yet.</div>
              )}
            </div>
          </section>

          {/* Avatars Section */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" /> Avatar Library
              </h3>
              <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {uploading.avatars ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, 'avatars')}
                  disabled={uploading.avatars}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {avatars.map((doc) => (
                <div
                  key={doc._id}
                  className={`bg-gray-950 border rounded-xl overflow-hidden flex flex-col transition-colors ${doc.isActive ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-gray-800'}`}
                >
                  {doc.secure_url ? (
                    <div className="aspect-square bg-gray-900 relative">
                      <Image
                        src={doc.secure_url}
                        alt={doc.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-900 flex items-center justify-center p-4 text-center">
                      <span className="text-[10px] text-gray-500 break-all">
                        {doc.name}
                        <br />
                        (legacy - reload to migrate)
                      </span>
                    </div>
                  )}
                  <div className="p-2 space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      {doc.isActive ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => setActive(doc._id, 'avatars')}
                          className="text-[10px] bg-gray-800 hover:bg-emerald-900/60 text-gray-300 hover:text-emerald-400 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => deleteItem(doc._id, 'avatars')}
                        disabled={doc.isActive}
                        className="text-red-400 hover:bg-red-950/50 p-1 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {avatars.length === 0 && (
                <div className="text-sm text-gray-500 italic col-span-2">
                  No avatars uploaded yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
