'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  FileUp,
  Globe,
  HelpCircle,
  KeyRound,
  Save,
  ShieldCheck,
  Loader2,
  Timer,
  List,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { KeyGuide } from '@/components/admin/key-guide';
import { GUIDES } from '@/lib/admin-guides';
import { NOTE_TEXT_DEFAULTS } from '@/lib/notes-model';
import {
  ADMIN_SESSION_EXTEND_SECONDS,
  ADMIN_SESSION_MAX_SECONDS,
  ADMIN_SESSION_SECONDS,
  NOTES_PASSWORD_SESSION_SECONDS,
} from '@/lib/session-timing';

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
  const [noteCount, setNoteCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);

  useEffect(() => {
    fetch('/api/admin/notes-config')
      .then((r) => r.json())
      .then((d) => {
        setHasPassword(d.hasPassword ?? false);
        setHasQuickUnlock(d.hasQuickUnlock ?? false);
        if (typeof d.noteCount === 'number') setNoteCount(d.noteCount);
        if (typeof d.publishedCount === 'number') setPublishedCount(d.publishedCount);
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
    <div className="max-w-3xl space-y-8">
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

      {/* Where you are: three steps with their state */}
      <section
        aria-label="Notes checklist"
        className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Your notes checklist
        </h2>
        <ul className="space-y-2">
          {[
            {
              done: accessOk,
              label: 'Choose how to unlock your private notes',
              detail: accessOk
                ? 'Done. You can open the vault.'
                : 'Set a vault password and/or authenticator quick unlock. Until then the notes are locked for everyone.',
              href: '/administrator/security#notes-vault',
              action: 'Open Security & Keys',
              optional: false,
            },
            {
              done: noteCount > 0,
              label: 'Open the vault and write your first note',
              detail:
                noteCount > 0
                  ? `You have ${noteCount} note${noteCount === 1 ? '' : 's'}.`
                  : 'Open /notes/vault, unlock it, and press New note.',
              href: '/notes/vault',
              action: 'Open the vault',
              optional: false,
              external: true,
            },
            {
              done: publishedCount > 0,
              label: 'Publish a note so visitors can read it (optional)',
              detail:
                publishedCount > 0
                  ? `${publishedCount} note${publishedCount === 1 ? ' is' : 's are'} public at /notes.`
                  : 'In a note, press Publish. Only published notes appear on /notes; everything else stays private.',
              href: '/notes',
              action: 'See the public page',
              optional: true,
              external: true,
            },
          ].map((item) => (
            <li
              key={item.label}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/50 p-3"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200">
                  {item.label}
                  {item.optional && (
                    <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-gray-400">
                      optional
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{loading ? 'Checking...' : item.detail}</p>
              </div>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-emerald-400 underline hover:text-emerald-300"
                >
                  {item.action}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="shrink-0 text-xs text-emerald-400 underline hover:text-emerald-300"
                >
                  {item.action}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <KeyGuide guide={GUIDES['notes-vault']} defaultOpen={!loading && !accessOk} />

      {/* How long an unlock lasts: the same rules as the admin panel */}
      <section className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            How long you stay signed in
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-gray-500">
          The private notes lock themselves after a while, so a forgotten browser tab is never an
          open door. The countdown is at the top of the notes list.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-gray-500">
                {['Where', 'Starts at', 'Extend', 'Longest'].map((h) => (
                  <th key={h} className="border-b border-gray-800 px-2 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr>
                <td className="border-b border-gray-800/70 px-2 py-2 font-medium text-gray-100">
                  Private notes, authenticator code
                </td>
                <td className="border-b border-gray-800/70 px-2 py-2">
                  {ADMIN_SESSION_SECONDS / 60} minutes
                </td>
                <td className="border-b border-gray-800/70 px-2 py-2">
                  <span className="rounded border border-gray-700 px-1.5 py-0.5 font-mono">
                    +{ADMIN_SESSION_EXTEND_SECONDS / 60}
                  </span>{' '}
                  button, any time
                </td>
                <td className="border-b border-gray-800/70 px-2 py-2">
                  {ADMIN_SESSION_MAX_SECONDS / 3600} hours from unlocking
                </td>
              </tr>
              <tr>
                <td className="border-b border-gray-800/70 px-2 py-2 font-medium text-gray-100">
                  Private notes, vault password
                </td>
                <td className="border-b border-gray-800/70 px-2 py-2">
                  {NOTES_PASSWORD_SESSION_SECONDS / 86400} days
                </td>
                <td className="border-b border-gray-800/70 px-2 py-2">not needed</td>
                <td className="border-b border-gray-800/70 px-2 py-2">
                  {NOTES_PASSWORD_SESSION_SECONDS / 86400} days
                </td>
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium text-gray-100">This admin panel</td>
                <td className="px-2 py-2">{ADMIN_SESSION_SECONDS / 60} minutes</td>
                <td className="px-2 py-2">
                  <span className="rounded border border-gray-700 px-1.5 py-0.5 font-mono">
                    +{ADMIN_SESSION_EXTEND_SECONDS / 60} Min
                  </span>{' '}
                  button
                </td>
                <td className="px-2 py-2">
                  {ADMIN_SESSION_MAX_SECONDS / 3600} hours from signing in
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-gray-500 marker:text-emerald-600">
          <li>
            Pressing <span className="font-mono text-gray-300">+15</span> next to the countdown adds
            15 minutes to what is left. Do it whenever the timer turns red.
          </li>
          <li>
            At 3 hours the button says <span className="font-mono text-gray-300">Max</span>: lock
            the notes and unlock them again for a fresh 45 minutes.
          </li>
          <li>
            If the time runs out while you are writing, your text stays on the screen and the last
            auto-save is kept. Unlock again and press Save.
          </li>
        </ul>
      </section>

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
        help={
          <>
            While you write, the vault looks at your note every few seconds you pick below. It
            compares the title, text, tags and files with the last saved copy: if nothing changed,
            nothing is sent; if something changed, it is saved. It also saves when you switch to
            another note, press Save, hide the tab or close it. 30 seconds is a good choice; shorter
            means fewer lost words if your connection drops.
          </>
        }
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

      {/* When something does not work */}
      <section
        aria-label="Troubleshooting"
        className="space-y-3 bg-gray-900 border border-gray-800 rounded-xl p-6"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            If something does not work
          </h2>
        </div>
        {[
          {
            q: 'The notes say they are locked or not set up.',
            a: (
              <>
                Set a vault password and/or authenticator quick unlock in{' '}
                <Link
                  href="/administrator/security#notes-vault"
                  className="text-emerald-400 underline"
                >
                  Security &amp; Keys
                </Link>
                . Until you do, nobody can open them.
              </>
            ),
          },
          {
            q: 'I forgot the vault password.',
            a: 'Set a new one in Security & Keys (it asks for a fresh code from your admin authenticator). Your notes are not touched: only the key to them changes.',
          },
          {
            q: 'The code from my authenticator is refused.',
            a: 'Codes change every 30 seconds: wait for the next one. Check that your phone’s clock is set to automatic. Quick unlock uses its own entry in the app, not the one for the admin panel.',
          },
          {
            q: 'It locked while I was writing.',
            a: 'Your text stays on the screen and the last auto-save is kept. Unlock again, press Save, and use the +15 button next time the countdown turns red.',
          },
          {
            q: 'A big file will not upload.',
            a: 'Pick a smaller "largest file" above: some hosts limit one upload to a few megabytes, and this page only offers sizes the host allows.',
          },
          {
            q: 'A visitor can see a note I wanted private.',
            a: 'Open it in the vault, press the Public button at the top of the note and choose Make private again. Its pictures and files become private at the same time.',
          },
        ].map((item) => (
          <details
            key={item.q}
            className="group rounded-lg border border-gray-800 bg-gray-950/50 px-4 py-3 open:border-emerald-900/60"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-gray-200 [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
