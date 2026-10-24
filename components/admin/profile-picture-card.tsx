'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Info, UserRound } from 'lucide-react';
import { AvatarUploader } from '@/components/admin/avatar-uploader';

interface AvatarSummary {
  _id: string;
  name: string;
  secure_url?: string;
  isActive: boolean;
}

/** What visitors see right now (an upload, the GitHub picture, or the placeholder). */
interface EffectiveAvatar {
  url: string;
  source: 'upload' | 'github' | 'placeholder';
  githubUsername?: string;
}

/**
 * Profile picture control for the Hero Section editor. Uploads apply immediately (they
 * do not wait for the page's Save button), because the picture is shared chrome: the
 * hero, the header, the browser-tab icon and the social-share image all use it.
 */
export function ProfilePictureCard() {
  const [active, setActive] = useState<AvatarSummary | null>(null);
  const [effective, setEffective] = useState<EffectiveAvatar | null>(null);
  const [connected, setConnected] = useState(true);
  const [loaded, setLoaded] = useState(false);
  // The live picture's file can be gone from Cloudinary; show the empty state instead of a broken image.
  const [imageFailed, setImageFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/avatars');
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !Array.isArray(data.avatars)) return;
      setConnected(data.cloudinaryConfigured !== false);
      setActive((data.avatars as AvatarSummary[]).find((a) => a.isActive) ?? null);
      setEffective(data.effective ?? null);
      setImageFailed(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // An upload wins; otherwise show the GitHub picture that visitors are seeing instead.
  const shownUrl =
    active?.secure_url ?? (effective?.source === 'github' ? effective.url : undefined);

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          {shownUrl && !imageFailed ? (
            <Image
              src={shownUrl}
              alt="Current profile picture"
              fill
              unoptimized
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-600">
              <UserRound className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-gray-100">Profile picture</h3>
            <p className="text-sm text-gray-400">
              {loaded && !active && effective?.source === 'github'
                ? `No upload yet, so your public GitHub picture (@${effective.githubUsername}) is shown. Upload one below to replace it.`
                : loaded && !active
                  ? 'No picture yet, so a placeholder is shown. Upload yours below, or add your GitHub profile link in Global Settings to use your GitHub picture.'
                  : 'Shown in the hero, the top-left of every page, the browser tab and link previews.'}
            </p>
          </div>
          <AvatarUploader
            compact
            disabled={!connected}
            disabledReason="Connect Cloudinary in Security & Keys to upload pictures."
            onUploaded={() => void load()}
          />
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5" />
            Applies immediately, no need to press Save.{' '}
            <Link href="/administrator/media-manager" className="text-purple-400 hover:underline">
              Manage all pictures
            </Link>
          </p>
          {!connected && (
            <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              Cloudinary is not connected.{' '}
              <Link href="/administrator/security#cloudinary" className="underline">
                Open the step-by-step guide in Security & Keys
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
