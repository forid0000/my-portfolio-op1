'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileUp,
  Globe,
  KeyRound,
  Save,
  ShieldCheck,
  Loader2,
  Timer,
  List,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { NOTE_TEXT_DEFAULTS } from '@/lib/notes-model';

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
const FILE_SIZE_OPTIONS = [2, 4, 10, 25, 50, 100];

const inputClass =
  'w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors';

/** One settings card with its own save button. */
function Card({
  icon: Icon,
  title,
  help,
  saving,
  saveLabel = 'Save',
  disabled,
  onSave,
  children,
}: {
  icon: typeof Timer;
  title: string;
  help?: React.ReactNode;
  saving: boolean;
  saveLabel?: string;
  disabled?: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      </div>
      {help && <p className="text-xs text-gray-500">{help}</p>}
      {children}
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  );
}

export default function NotesConfigPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [hasQuickUnlock, setHasQuickUnlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [autosaveInterval, setAutosaveInterval] = useState(30);
  const [notesPerPage, setNotesPerPage] = useState(20);
  const [vaultTitle, setVaultTitle] = useState<string>(NOTE_TEXT_DEFAULTS.vaultTitle);
  const [lockTitle, setLockTitle] = useState<string>(NOTE_TEXT_DEFAULTS.lockTitle);
  const [publicTitle, setPublicTitle] = useState<string>(NOTE_TEXT_DEFAULTS.publicTitle);
  const [publicIntro, setPublicIntro] = useState<string>(NOTE_TEXT_DEFAULTS.publicIntro);
  const [vaultButton, setVaultButton] = useState<string>(NOTE_TEXT_DEFAULTS.vaultButton);
  const [maxFileMb, setMaxFileMb] = useState(10);
  const [maxFileMbAllowed, setMaxFileMbAllowed] = useState(100);

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
        if (typeof d.publicTitle === 'string' && d.publicTitle) setPublicTitle(d.publicTitle);
        if (typeof d.publicIntro === 'string') setPublicIntro(d.publicIntro);
        if (typeof d.vaultButton === 'string' && d.vaultButton) setVaultButton(d.vaultButton);
        if (typeof d.maxFileMb === 'number') setMaxFileMb(d.maxFileMb);
        if (typeof d.maxFileMbAllowed === 'number') setMaxFileMbAllowed(d.maxFileMbAllowed);
      })
      .catch(() => toast.error('Failed to load notes config'))
      .finally(() => setLoading(false));
  }, []);

  /** Saves one card: the server checks the values and a wrong field is outlined where it is. */
  const save = async (name: string, body: Record<string, unknown>, done: string) => {
    setSaving(name);
    try {
      const res = await fetch('/api/admin/notes-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(done);
      } else {
        // A wrong field is outlined by the admin's error handler; the toast names the problem.
        const d = await res.json().catch(() => ({}));
        toast.error(d.details?.[0]?.message || d.error || 'Failed to save');
      }
    } catch {
      toast.error('Request failed');
    } finally {
      setSaving(null);
    }
  };

  const accessOk = hasPassword || hasQuickUnlock;
  const bigFile = (mb: number) => (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Notes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Public notes at <span className="font-mono text-emerald-400">/notes</span> and your
          private notes at <span className="font-mono text-emerald-400">/notes/vault</span>.
        </p>
      </div>

      {/* Access status: credentials are managed in Admin -> Security */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
          loading
            ? 'bg-gray-800/50 border-gray-700 text-gray-400'
            : accessOk
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
              : 'bg-yellow-950/40 border-yellow-800/50 text-yellow-400'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mt-0.5" />
        ) : accessOk ? (
          <ShieldCheck className="w-4 h-4 mt-0.5" />
        ) : (
          <KeyRound className="w-4 h-4 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-medium">
            {loading
              ? 'Checking...'
              : accessOk
                ? [
                    hasPassword ? 'Password set' : null,
                    hasQuickUnlock ? 'Authenticator quick unlock on' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'No password or authenticator set - the private notes are locked for everyone'}
          </p>
          <p className="text-xs opacity-80">
            Passwords and authenticator codes for the private notes are managed in{' '}
            <Link href="/administrator/security" className="underline hover:text-white">
              Security
            </Link>
            , where changes need a fresh authenticator code.
          </p>
        </div>
      </div>

      {/* Plain-language walkthrough: public page, unlock, write, publish */}
      <div className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            How notes work
          </h2>
        </div>
        <ol className="space-y-3 text-sm text-gray-400 list-decimal list-inside marker:text-emerald-500 marker:font-bold">
          <li>
            <strong className="text-gray-200">Visitors</strong> who open{' '}
            <a
              href="/notes"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 underline hover:text-emerald-300"
            >
              /notes
            </a>{' '}
            see only the notes you published. A quiet button there leads to your private notes.
          </li>
          <li>
            <strong className="text-gray-200">Lock the private notes.</strong> Set a password and/or
            authenticator quick-unlock in{' '}
            <Link
              href="/administrator/security#notes-vault"
              className="text-emerald-400 underline hover:text-emerald-300"
            >
              Security &amp; Keys
            </Link>
            . Until you do, they stay locked for everyone, including you.
          </li>
          <li>
            <strong className="text-gray-200">Open them</strong> at{' '}
            <a
              href="/notes/vault"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-emerald-400 underline hover:text-emerald-300"
            >
              /notes/vault
            </a>{' '}
            with your password or a code from your authenticator.
          </li>
          <li>
            <strong className="text-gray-200">Write.</strong> Format with the bar or Markdown, see
            the result next to the text, add tags, and attach pictures, files or whole folders from
            your computer. Notes save automatically (interval below).
          </li>
          <li>
            <strong className="text-gray-200">Publish (optional).</strong> The Publish button gives
            a note a public page at{' '}
            <span className="font-mono text-gray-300">/notes/your-note</span>. Its pictures and
            files become public with it, and you can make it private again at any time.
          </li>
        </ol>
      </div>

      {/* The public page */}
      <Card
        icon={Globe}
        title="Public Notes Page"
        help="The wording on /notes, the page visitors see."
        saving={saving === 'public'}
        disabled={!publicTitle.trim() || !vaultButton.trim()}
        saveLabel="Save Wording"
        onSave={() =>
          save(
            'public',
            {
              publicTitle: publicTitle.trim(),
              publicIntro: publicIntro.trim(),
              vaultButton: vaultButton.trim(),
            },
            'Public notes page saved'
          )
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="notes-public-title" className="text-xs text-gray-400 font-medium">
              Page title
            </label>
            <input
              id="notes-public-title"
              data-field="publicTitle"
              type="text"
              value={publicTitle}
              onChange={(e) => setPublicTitle(e.target.value.slice(0, 60))}
              placeholder={NOTE_TEXT_DEFAULTS.publicTitle}
              maxLength={60}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notes-public-intro" className="text-xs text-gray-400 font-medium">
              Short introduction
              <span className="ml-2 text-gray-600">optional, shown under the title</span>
            </label>
            <textarea
              id="notes-public-intro"
              data-field="publicIntro"
              value={publicIntro}
              onChange={(e) => setPublicIntro(e.target.value.slice(0, 300))}
              placeholder={NOTE_TEXT_DEFAULTS.publicIntro}
              rows={2}
              maxLength={300}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notes-vault-button" className="text-xs text-gray-400 font-medium">
              Button to the private notes
              <span className="ml-2 text-gray-600">shown top right on the public page</span>
            </label>
            <input
              id="notes-vault-button"
              data-field="vaultButton"
              type="text"
              value={vaultButton}
              onChange={(e) => setVaultButton(e.target.value.slice(0, 40))}
              placeholder={NOTE_TEXT_DEFAULTS.vaultButton}
              maxLength={40}
              className={inputClass}
            />
          </div>
        </div>
      </Card>

      {/* Files */}
      <Card
        icon={FileUp}
        title="Attached Files"
        help={
          <>
            Files and pictures you attach to a note are stored in your database, privately. Pick the
            largest file one upload may be
            {maxFileMbAllowed < 100 && (
              <> (this host allows up to {bigFile(maxFileMbAllowed)} per upload)</>
            )}
            . Current:{' '}
            <span className="text-emerald-400 font-mono">
              {bigFile(Math.min(maxFileMb, maxFileMbAllowed))}
            </span>
          </>
        }
        saving={saving === 'files'}
        onSave={() => save('files', { maxFileMb }, `Largest file set to ${bigFile(maxFileMb)}`)}
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" data-field="maxFileMb">
          {FILE_SIZE_OPTIONS.filter((n) => n <= Math.max(maxFileMbAllowed, 2)).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxFileMb(n)}
              className={`py-2.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                maxFileMb === n
                  ? 'bg-emerald-600/20 border-emerald-500/60 text-emerald-400'
                  : 'bg-gray-950 border-gray-700 text-gray-400 hover:border-emerald-700/50 hover:text-gray-200'
              }`}
            >
              {n} MB
            </button>
          ))}
        </div>
      </Card>

      {/* Auto-save interval */}
      <Card
        icon={Timer}
        title="Auto-Save Interval"
        help="Notes are saved silently while you write, and also before you switch to another note or leave the page. Pick how often the periodic save fires."
        saving={saving === 'interval'}
        saveLabel="Save Interval"
        onSave={() =>
          save(
            'interval',
            { autosaveInterval },
            `Auto-save set to ${autosaveInterval < 60 ? `${autosaveInterval}s` : `${autosaveInterval / 60} min`}`
          )
        }
      >
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
      </Card>

      {/* Notes per page */}
      <Card
        icon={List}
        title="Notes Per Page"
        help={
          <>
            How many notes show per page in the private notes list. Current:{' '}
            <span className="text-emerald-400 font-mono">{notesPerPage}</span>
          </>
        }
        saving={saving === 'perPage'}
        onSave={() => save('perPage', { notesPerPage }, `Notes per page set to ${notesPerPage}`)}
      >
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
      </Card>

      {/* Private notes wording */}
      <Card
        icon={Type}
        title="Private Notes Wording"
        help="The text labels shown inside the private notes."
        saving={saving === 'branding'}
        disabled={!vaultTitle.trim() || !lockTitle.trim()}
        saveLabel="Save Wording"
        onSave={() =>
          save(
            'branding',
            { vaultTitle: vaultTitle.trim(), lockTitle: lockTitle.trim() },
            'Private notes wording saved'
          )
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="notes-vault-title" className="text-xs text-gray-400 font-medium">
              List header title
              <span className="ml-2 text-gray-600">shown above the list of notes</span>
            </label>
            <input
              id="notes-vault-title"
              data-field="vaultTitle"
              type="text"
              value={vaultTitle}
              onChange={(e) => setVaultTitle(e.target.value.slice(0, 60))}
              placeholder={NOTE_TEXT_DEFAULTS.vaultTitle}
              maxLength={60}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notes-lock-title" className="text-xs text-gray-400 font-medium">
              Lock screen title
              <span className="ml-2 text-gray-600">shown when the notes are locked</span>
            </label>
            <input
              id="notes-lock-title"
              data-field="lockTitle"
              type="text"
              value={lockTitle}
              onChange={(e) => setLockTitle(e.target.value.slice(0, 60))}
              placeholder={NOTE_TEXT_DEFAULTS.lockTitle}
              maxLength={60}
              className={inputClass}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
