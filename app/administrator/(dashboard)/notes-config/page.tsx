'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, Save, ShieldCheck, Loader2, Timer, List, Type } from 'lucide-react';
import { toast } from 'sonner';

const INTERVAL_OPTIONS = [
  { label: '10 sec', value: 10 },
  { label: '15 sec', value: 15 },
  { label: '20 sec', value: 20 },
  { label: '30 sec', value: 30 },
  { label: '45 sec', value: 45 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
];

const PER_PAGE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

export default function NotesConfigPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [hasQuickUnlock, setHasQuickUnlock] = useState(false);
  const [loading, setLoading] = useState(true);

  const [autosaveInterval, setAutosaveInterval] = useState(30);
  const [savingInterval, setSavingInterval] = useState(false);

  const [notesPerPage, setNotesPerPage] = useState(20);
  const [savingPerPage, setSavingPerPage] = useState(false);

  const [vaultTitle, setVaultTitle] = useState('Notes Vault');
  const [lockTitle, setLockTitle] = useState('VAULT LOCKED');
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    fetch('/api/admin/notes-config')
      .then((r) => r.json())
      .then((d) => {
        setHasPassword(d.hasPassword ?? false);
        setHasQuickUnlock(d.hasQuickUnlock ?? false);
        if (typeof d.autosaveInterval === 'number') setAutosaveInterval(d.autosaveInterval);
        if (typeof d.notesPerPage === 'number') setNotesPerPage(d.notesPerPage);
        if (typeof d.vaultTitle === 'string' && d.vaultTitle) setVaultTitle(d.vaultTitle);
        if (typeof d.lockTitle === 'string' && d.lockTitle) setLockTitle(d.lockTitle);
      })
      .catch(() => toast.error('Failed to load notes config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveInterval = async () => {
    setSavingInterval(true);
    try {
      const res = await fetch('/api/admin/notes-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autosaveInterval }),
      });
      if (res.ok) {
        toast.success(
          `Auto-save set to ${autosaveInterval < 60 ? `${autosaveInterval}s` : `${autosaveInterval / 60} min`}`
        );
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to save');
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setSavingInterval(false);
    }
  };

  const handleSavePerPage = async () => {
    setSavingPerPage(true);
    try {
      const res = await fetch('/api/admin/notes-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesPerPage }),
      });
      if (res.ok) {
        toast.success(`Notes per page set to ${notesPerPage}`);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to save');
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setSavingPerPage(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!vaultTitle.trim() || !lockTitle.trim()) {
      toast.error('Titles cannot be empty');
      return;
    }
    setSavingBranding(true);
    try {
      const res = await fetch('/api/admin/notes-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultTitle: vaultTitle.trim(), lockTitle: lockTitle.trim() }),
      });
      if (res.ok) {
        toast.success('Vault branding saved');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to save');
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Notes Vault Config</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage the notes vault at <span className="font-mono text-emerald-400">/notes</span>.
        </p>
      </div>

      {/* Access status: credentials are managed in Admin -> Security */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
          loading
            ? 'bg-gray-800/50 border-gray-700 text-gray-400'
            : hasPassword || hasQuickUnlock
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
              : 'bg-yellow-950/40 border-yellow-800/50 text-yellow-400'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mt-0.5" />
        ) : hasPassword || hasQuickUnlock ? (
          <ShieldCheck className="w-4 h-4 mt-0.5" />
        ) : (
          <KeyRound className="w-4 h-4 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-mono font-medium">
            {loading
              ? 'Checking...'
              : hasPassword || hasQuickUnlock
                ? [
                    hasPassword ? 'Vault password set' : null,
                    hasQuickUnlock ? 'Authenticator quick unlock on' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'No password or authenticator set - the vault is locked for everyone'}
          </p>
          <p className="text-xs opacity-80">
            Passwords and authenticator codes for the vault are managed in{' '}
            <Link href="/administrator/security" className="underline hover:text-white">
              Security
            </Link>
            , where changes need a fresh authenticator code.
          </p>
        </div>
      </div>

      {/* Auto-save interval */}
      <div className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            Auto-Save Interval
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          Notes are auto-saved silently while editing, and also before switching to another note.
          Pick how often the periodic save fires.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAutosaveInterval(opt.value)}
              className={`py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                autosaveInterval === opt.value
                  ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-400'
                  : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-emerald-700/50 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveInterval}
          disabled={savingInterval}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {savingInterval ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingInterval ? 'Saving...' : 'Save Interval'}
        </button>
      </div>

      {/* Notes per page */}
      <div className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            Notes Per Page
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          How many notes show per page in the vault sidebar. Current:{' '}
          <span className="text-emerald-400 font-mono">{notesPerPage}</span>
        </p>

        <div className="grid grid-cols-5 gap-2">
          {PER_PAGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNotesPerPage(n)}
              className={`py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                notesPerPage === n
                  ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-400'
                  : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-emerald-700/50 hover:text-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSavePerPage}
          disabled={savingPerPage}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {savingPerPage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingPerPage ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Vault Branding */}
      <div className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            Vault Branding
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          Customize the text labels shown inside the Notes Vault UI.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">
              Sidebar Header Title
              <span className="ml-2 text-gray-600 font-mono normal-case">shown in left panel</span>
            </label>
            <input
              type="text"
              value={vaultTitle}
              onChange={(e) => setVaultTitle(e.target.value.slice(0, 60))}
              placeholder="Notes Vault"
              maxLength={60}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">
              Lock Screen Title
              <span className="ml-2 text-gray-600 font-mono normal-case">
                shown on the vault lock screen
              </span>
            </label>
            <input
              type="text"
              value={lockTitle}
              onChange={(e) => setLockTitle(e.target.value.slice(0, 60))}
              placeholder="VAULT LOCKED"
              maxLength={60}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveBranding}
          disabled={savingBranding || !vaultTitle.trim() || !lockTitle.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
        >
          {savingBranding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {savingBranding ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}
