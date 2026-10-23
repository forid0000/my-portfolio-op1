'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Cloud,
  Database,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import { GettingStarted } from '@/components/admin/onboarding/getting-started';
import { useOnboarding } from '@/components/admin/onboarding/provider';
import { WelcomeDialog } from '@/components/admin/onboarding/welcome-dialog';

type Tone = 'ok' | 'bad' | 'neutral';

interface LiveStatus {
  mongodb: { active: boolean; message: string };
  cloudinary: { active: boolean; message: string };
}

const TONES: Record<Tone, string> = {
  ok: 'text-emerald-400 bg-emerald-950/50 border-emerald-900/50',
  bad: 'text-red-400 bg-red-950/50 border-red-900/50',
  neutral: 'text-gray-400 bg-gray-800/50 border-gray-700/50',
};

function HealthCard({
  icon: Icon,
  title,
  description,
  tone,
  label,
  detail,
  href,
  hrefLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone: Tone;
  label: string;
  /** Extra line shown when something is wrong, such as an error message. */
  detail?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}
        >
          {label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{description}</p>
      {detail && <p className="mt-2 break-words font-mono text-xs text-red-400/90">{detail}</p>}
      {href && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          {hrefLabel ?? 'Open'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

const QUICK_LINKS = [
  { href: '/administrator/homepage', label: 'Edit your content', icon: FileText },
  { href: '/administrator/media-manager', label: 'Photo and résumé', icon: ImageIcon },
  { href: '/administrator/security', label: 'Security & Keys', icon: ShieldCheck },
];

export default function AdminDashboard() {
  const { overview, refresh } = useOnboarding();
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const fetchStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/admin/status', { cache: 'no-store' });
      const data = await res.json();
      setLive(
        res.ok
          ? data
          : {
              mongodb: { active: false, message: 'Error checking status' },
              cloudinary: { active: false, message: 'Error checking status' },
            }
      );
    } catch {
      setLive({
        mongodb: { active: false, message: 'Network error' },
        cloudinary: { active: false, message: 'Network error' },
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void refresh(); // the checklist may have changed on another page
  }, [fetchStatus, refresh]);

  const item = (id: string) => overview?.items.find((i) => i.id === id);
  const cloudinaryReady = item('cloudinary')?.done === true;
  const emailReady = item('contact-email')?.done === true;

  return (
    <div className="max-w-5xl space-y-8 pb-16">
      <WelcomeDialog />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100">Dashboard</h1>
          <p className="mt-2 text-gray-400">
            Edit your site, manage security and connect services from one place.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <ExternalLink className="h-4 w-4" />
          View live site
        </a>
      </div>

      <GettingStarted />

      <section aria-labelledby="health-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="health-heading" className="text-lg font-semibold text-gray-100">
            System health
          </h2>
          <button
            type="button"
            onClick={() => void fetchStatus()}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-50"
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HealthCard
            icon={Database}
            title="Database"
            description="Where all your content, settings and notes are stored (MongoDB)."
            tone={checking && !live ? 'neutral' : live?.mongodb.active ? 'ok' : 'bad'}
            label={
              checking && !live ? 'Checking…' : live?.mongodb.active ? 'Connected' : 'Not connected'
            }
            detail={!checking && live && !live.mongodb.active ? live.mongodb.message : undefined}
          />
          <HealthCard
            icon={Cloud}
            title="Image storage"
            description="Cloudinary keeps your photo, gallery and uploaded images."
            tone={
              !cloudinaryReady
                ? 'neutral'
                : checking && !live
                  ? 'neutral'
                  : live?.cloudinary.active
                    ? 'ok'
                    : 'bad'
            }
            label={
              !cloudinaryReady
                ? 'Not connected'
                : checking && !live
                  ? 'Checking…'
                  : live?.cloudinary.active
                    ? 'Connected'
                    : 'Check keys'
            }
            href={
              cloudinaryReady && live?.cloudinary.active
                ? undefined
                : '/administrator/security#cloudinary'
            }
            hrefLabel={cloudinaryReady ? 'Review keys' : 'Connect (optional)'}
          />
          <HealthCard
            icon={Mail}
            title="Contact form"
            description="Messages from visitors are emailed to you through your email provider."
            tone={emailReady ? 'ok' : 'neutral'}
            label={emailReady ? 'Ready' : 'Not set up'}
            href={emailReady ? undefined : '/administrator/security#email'}
            hrefLabel="Set up email (optional)"
          />
          <HealthCard
            icon={ShieldCheck}
            title="Sign-in protection"
            description="An authenticator code is required for every sign-in. A password is an optional extra."
            tone="ok"
            label={item('admin-password')?.done ? 'Code + password' : 'Authenticator'}
            href="/administrator/security#admin-signin"
            hrefLabel="Manage"
          />
        </div>
      </section>

      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="mb-4 text-lg font-semibold text-gray-100">
          Jump to
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 text-sm font-medium text-gray-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-gray-500 group-hover:text-emerald-400" />
                {label}
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-600 group-hover:text-emerald-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
