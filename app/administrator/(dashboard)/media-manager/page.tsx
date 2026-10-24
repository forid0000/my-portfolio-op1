'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Trash2,
  Check,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { AvatarUploader } from '@/components/admin/avatar-uploader';
import { extractApiErrorMessage } from '@/lib/utils';
import { formatBytes } from '@/lib/media-types';

interface DocumentItem {
  _id: string;
  name: string;
  mimeType: string;
  isActive: boolean;
  uploadedAt: string;
  secure_url?: string;
}

interface AvatarItem extends DocumentItem {
  width?: number;
  height?: number;
  bytes?: number;
}

interface SyncStatus {
  missing: string[];
  stale: string[];
  untracked: unknown[];
}

// Resumes still travel as base64 inside a JSON body, which grows the file by about a third and
// is cut off at 10 MiB by Next's middleware buffer. 7 MB of file stays safely under that.
const RESUME_MAX_BYTES = 7 * 1024 * 1024;

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

export default function MediaManager() {
  const [resumes, setResumes] = useState<DocumentItem[]>([]);
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const checkSync = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/avatars/sync');
      const data = await readJson(res);
      if (res.ok && data && Array.isArray(data.missing)) setSync(data);
      else setSync(null);
    } catch {
      setSync(null); // The badges are a nicety; a failed check just hides them.
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [resumesRes, avatarsRes] = await Promise.all([
        fetch('/api/admin/resumes'),
        fetch('/api/admin/avatars'),
      ]);
      const resumesData = await readJson(resumesRes);
      const avatarsData = await readJson(avatarsRes);
      if (!resumesRes.ok || !Array.isArray(resumesData)) {
        throw new Error(extractApiErrorMessage(resumesData, 'Could not load résumés.'));
      }
      if (!avatarsRes.ok || !avatarsData || !Array.isArray(avatarsData.avatars)) {
        throw new Error(extractApiErrorMessage(avatarsData, 'Could not load profile pictures.'));
      }
      setResumes(resumesData);
      setAvatars(avatarsData.avatars);
      setConnected(avatarsData.cloudinaryConfigured !== false);
      if (avatarsData.cloudinaryConfigured !== false) void checkSync();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [checkSync]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const uploadResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > RESUME_MAX_BYTES) {
      toast.error('File is too large (max 7 MB)');
      return;
    }
    setUploadingResume(true);
    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('Could not read that file');
      setUploadingResume(false);
    };
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            base64: reader.result,
            isActive: false, // set active explicitly afterwards
          }),
        });
        if (res.ok) {
          toast.success('Uploaded successfully');
          void fetchData();
        } else {
          const errorData = await readJson(res);
          toast.error('Upload failed', {
            description: extractApiErrorMessage(errorData ?? {}, 'Upload failed'),
          });
        }
      } catch {
        toast.error('Network error');
      } finally {
        setUploadingResume(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const setActive = async (id: string, type: 'resumes' | 'avatars') => {
    try {
      const res = await fetch(`/api/admin/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', id }),
      });
      if (res.ok) {
        toast.success(type === 'avatars' ? 'Profile picture updated' : 'Active item updated');
        void fetchData();
      } else {
        const errorData = await readJson(res);
        toast.error('Failed to update active status', {
          description: extractApiErrorMessage(errorData ?? {}, ''),
        });
      }
    } catch {
      toast.error('Network error');
    }
  };

  const deleteItem = async (id: string, type: 'resumes' | 'avatars') => {
    if (!confirm('Delete this file? It is also removed from Cloudinary and cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/${type}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Deleted successfully');
        void fetchData();
      } else {
        const errorData = await readJson(res);
        toast.error('Failed to delete', {
          description: extractApiErrorMessage(errorData ?? {}, ''),
        });
      }
    } catch {
      toast.error('Network error');
    }
  };

  const repairSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/avatars/sync', { method: 'POST' });
      const data = await readJson(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(data ?? {}, 'Re-sync failed'));
      const parts = [
        data.removed ? `${data.removed} removed` : '',
        data.refreshed ? `${data.refreshed} refreshed` : '',
        data.imported ? `${data.imported} added` : '',
      ].filter(Boolean);
      toast.success('Library is in sync with Cloudinary', {
        description:
          [
            parts.join(', '),
            data.deactivated ? 'The live picture was gone, so the placeholder is showing.' : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
      });
      await fetchData();
    } catch (e) {
      toast.error('Re-sync failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSyncing(false);
    }
  };

  const missing = new Set(sync?.missing ?? []);
  const drift = sync ? sync.missing.length + sync.stale.length + sync.untracked.length : 0;

  return (
    <div className="space-y-10 text-gray-100">
      <div className="flex items-center gap-2">
        <FileText className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-bold">Media & Document Manager</h2>
      </div>

      {!loading && !connected && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Cloudinary is not connected, so pictures cannot be uploaded yet. It is free to start and
          takes about 5 minutes:{' '}
          <Link href="/administrator/security#cloudinary" className="underline">
            open the step-by-step guide in Security & Keys
          </Link>
          .
        </p>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {loadError}{' '}
          <button onClick={() => void fetchData()} className="underline hover:text-white">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Profile pictures */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" /> Profile Pictures
              </h3>
              {connected && (
                <div className="flex items-center gap-3 text-xs">
                  {sync && (
                    <span className={drift ? 'text-amber-400' : 'text-gray-500'}>
                      {drift
                        ? [
                            sync.missing.length
                              ? `${sync.missing.length} missing in Cloudinary`
                              : '',
                            sync.stale.length ? `${sync.stale.length} out of date` : '',
                            sync.untracked.length ? `${sync.untracked.length} not in library` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'In sync with Cloudinary'}
                    </span>
                  )}
                  <button
                    onClick={() => void (drift ? repairSync() : checkSync())}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-gray-300 hover:border-purple-500 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {drift ? 'Re-sync now' : 'Check sync'}
                  </button>
                </div>
              )}
            </div>

            <AvatarUploader
              disabled={!connected}
              disabledReason="Connect Cloudinary in Security & Keys to upload pictures."
              onUploaded={() => void fetchData()}
            />

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
                        className={`object-cover ${missing.has(doc._id) ? 'opacity-30' : ''}`}
                        unoptimized
                      />
                      {missing.has(doc._id) && (
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-950/80 py-1 text-center text-[10px] font-semibold text-red-300">
                          Missing in Cloudinary
                        </span>
                      )}
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
                  <div className="p-2 space-y-1.5 flex-1 flex flex-col">
                    <p className="truncate text-[10px] text-gray-500" title={doc.name}>
                      {doc.name}
                      {doc.bytes ? ` · ${formatBytes(doc.bytes)}` : ''}
                      {doc.width && doc.height ? ` · ${doc.width}×${doc.height}` : ''}
                    </p>
                    <div className="flex items-center justify-between">
                      {doc.isActive ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Live
                        </span>
                      ) : (
                        <button
                          onClick={() => void setActive(doc._id, 'avatars')}
                          className="text-[10px] bg-gray-800 hover:bg-emerald-900/60 text-gray-300 hover:text-emerald-400 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Use this
                        </button>
                      )}
                      <button
                        onClick={() => void deleteItem(doc._id, 'avatars')}
                        disabled={doc.isActive}
                        title={
                          doc.isActive
                            ? 'Make another picture live before deleting this one'
                            : 'Delete'
                        }
                        aria-label="Delete picture"
                        className="text-red-400 hover:bg-red-950/50 p-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {avatars.length === 0 && (
                <div className="text-sm text-gray-500 italic col-span-2">
                  No pictures yet. Upload one above and it goes live straight away.
                </div>
              )}
            </div>
          </section>

          {/* Resumes */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Resume Library
              </h3>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {uploadingResume ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Upload Resume
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={uploadResume}
                  disabled={uploadingResume}
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
                        onClick={() => void setActive(doc._id, 'resumes')}
                        className="flex-1 bg-gray-900 hover:bg-emerald-900/40 hover:text-emerald-400 text-gray-300 text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Set Active
                      </button>
                    )}
                    <button
                      onClick={() => void deleteItem(doc._id, 'resumes')}
                      disabled={doc.isActive}
                      aria-label="Delete résumé"
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
        </>
      )}
    </div>
  );
}
