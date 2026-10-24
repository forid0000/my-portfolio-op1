'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  Loader2,
  NotebookPen,
  Plug,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { TotpEnroll } from '@/components/admin/totp-enroll';
import { FieldHelpText, KeyGuide, SetupChecklist } from '@/components/admin/key-guide';
import { FIELD_HELP, GROUP_GUIDE, GUIDES, setupProgress } from '@/lib/admin-guides';

const ADMIN_PASSWORD_MIN = 12;
const NOTES_PASSWORD_MIN = 8;

interface IntegrationField {
  key: string;
  label: string;
  group: string;
  secret: boolean;
  placeholder?: string;
  hint?: string;
  state: 'admin' | 'env' | 'unset';
  value?: string;
}

interface Overview {
  admin: { hasPassword: boolean };
  notes: { hasPassword: boolean; quickUnlock: boolean };
  integrations: IntegrationField[];
  groups: Record<string, { label: string; description: string }>;
}

interface Enrollment {
  purpose: 'admin' | 'notes';
  secret: string;
  uri: string;
  code: string;
}

const inputClass =
  'w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors';
const primaryButton =
  'inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors';
const ghostButton =
  'inline-flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-500 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition-colors';
const dangerButton =
  'inline-flex items-center gap-2 px-4 py-2 border border-red-900/60 hover:bg-red-950/40 disabled:opacity-50 text-red-400 text-sm font-medium rounded-lg transition-colors';

function Card({
  id,
  highlighted,
  icon: Icon,
  title,
  description,
  children,
}: {
  /** Anchor target (/administrator/security#id); the getting-started checklist links here. */
  id?: string;
  highlighted?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 space-y-5 bg-gray-900 border rounded-xl p-6 transition-shadow duration-500 ${
        highlighted
          ? 'border-emerald-500/70 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
          : 'border-gray-800'
      }`}
    >
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400">
          <Icon className="w-4 h-4 text-emerald-400" />
          {title}
        </h2>
        {description && <p className="text-xs text-gray-500 mt-2 max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'muted'; children: React.ReactNode }) {
  const tones = {
    ok: 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400',
    warn: 'bg-yellow-950/40 border-yellow-800/50 text-yellow-400',
    muted: 'bg-gray-800/60 border-gray-700 text-gray-400',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function PasswordForm({
  min,
  hasPassword,
  busy,
  onSubmit,
  onRemove,
}: {
  min: number;
  hasPassword: boolean;
  busy: boolean;
  onSubmit: (password: string) => Promise<boolean>;
  onRemove?: () => void;
}) {
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && value !== confirm;
  const valid = value.length >= min && value === confirm;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSubmit(value)) {
          setValue('');
          setConfirm('');
        }
      }}
      className="space-y-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${hasPassword ? 'New' : 'Password'} (min. ${min} characters)`}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the password"
          className={inputClass}
        />
      </div>
      {mismatch && <p className="text-xs text-red-400">The passwords do not match.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !valid} className={primaryButton}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {hasPassword ? 'Change password' : 'Set password'}
        </button>
        {hasPassword && onRemove && (
          <button type="button" disabled={busy} onClick={onRemove} className={dangerButton}>
            <Trash2 className="w-4 h-4" /> Remove password
          </button>
        )}
      </div>
    </form>
  );
}

export default function SecurityPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [stepUp, setStepUp] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  // Integration edits: typed values and fields queued for clearing.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [clears, setClears] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setOverview(data);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load security settings');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The cards render after the data arrives, so the browser's own #anchor scroll would
  // miss them. Scroll to the requested card ourselves and flash it briefly.
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!overview) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const focusHash = () => {
      const id = window.location.hash.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      setFocusId(id);
      clearTimeout(timer);
      timer = setTimeout(() => setFocusId(null), 2400);
    };
    focusHash();
    window.addEventListener('hashchange', focusHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', focusHash);
    };
  }, [overview]);

  const codeReady = stepUp.replace(/\s/g, '').length === 6;

  /** Sends a protected action with the current authenticator code. */
  const run = async (name: string, action: string, payload: Record<string, unknown> = {}) => {
    if (!codeReady) {
      toast.error('Enter your current authenticator code first (top of the page).');
      return false;
    }
    setBusy(name);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, currentTotp: stepUp, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Request failed');
        return false;
      }
      setOverview(data);
      setStepUp(''); // each code authorises one change
      toast.success('Saved');
      return true;
    } catch {
      toast.error('Request failed');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const startEnrollment = async (purpose: 'admin' | 'notes') => {
    setBusy(`generate-${purpose}`);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-secret', purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setEnrollment({ purpose, secret: data.secret, uri: data.uri, code: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Request failed');
    } finally {
      setBusy(null);
    }
  };

  const confirmEnrollment = async () => {
    if (!enrollment) return;
    const action = enrollment.purpose === 'admin' ? 'admin-rotate-totp' : 'notes-enable-totp';
    const ok = await run(action, action, {
      newSecret: enrollment.secret,
      newCode: enrollment.code,
    });
    if (ok) setEnrollment(null);
  };

  const saveGroup = async (group: string) => {
    const fields = overview!.integrations.filter((f) => f.group === group);
    const values: Record<string, string | null> = {};
    for (const f of fields) {
      if (clears.has(f.key)) values[f.key] = null;
      else if (edits[f.key]?.trim()) values[f.key] = edits[f.key].trim();
    }
    if (!Object.keys(values).length) {
      toast.message('Nothing to save in this section.');
      return;
    }
    const ok = await run(`group-${group}`, 'integrations-save', { values });
    if (ok) {
      setEdits((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[f.key];
        return next;
      });
      setClears((prev) => {
        const next = new Set(prev);
        for (const f of fields) next.delete(f.key);
        return next;
      });
    }
  };

  if (loadError) {
    return <p className="text-red-400 text-sm">{loadError}</p>;
  }
  if (!overview) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    );
  }

  const groupKeys = Object.keys(overview.groups);
  const enrolling = (purpose: 'admin' | 'notes') =>
    enrollment && enrollment.purpose === purpose ? enrollment : null;

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Security</h1>
        <p className="text-gray-400 text-sm mt-1">
          Credentials and integration keys are managed here, not in <code>.env</code>. Passwords are
          hashed, keys and authenticator secrets are encrypted before they reach the database, and
          secrets are never shown again after saving.
        </p>
      </div>

      <SetupChecklist
        items={setupProgress({
          adminHasPassword: overview.admin.hasPassword,
          notesHasPassword: overview.notes.hasPassword,
          notesQuickUnlock: overview.notes.quickUnlock,
          fieldStates: Object.fromEntries(overview.integrations.map((f) => [f.key, f.state])),
        })}
      />

      <KeyGuide guide={GUIDES.hosting} />

      {/* Step-up confirmation, shared by every change below */}
      <div className="sticky top-2 z-10 rounded-xl border border-emerald-900/60 bg-gray-900/95 backdrop-blur p-4 shadow-lg">
        <label
          htmlFor="stepup"
          className="block text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2"
        >
          Authenticator code
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="stepup"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={stepUp}
            onChange={(e) => setStepUp(e.target.value.replace(/[^\d ]/g, ''))}
            placeholder="000000"
            className="w-36 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-center text-lg font-mono tracking-[0.3em] text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
          <p className="text-xs text-gray-400 flex-1 min-w-[14rem]">
            Every change below needs a current code from your authenticator app, on top of being
            signed in. Open the app on your phone, find this site’s entry, type the 6 digits here
            (they change every 30 seconds), then press the save button of the section you are
            changing. Each code works for one change; wait for the next one for the next change.
          </p>
        </div>
      </div>

      {/* Admin sign-in */}
      <Card
        id="admin-signin"
        highlighted={focusId === 'admin-signin'}
        icon={ShieldCheck}
        title="Admin sign-in"
        description="The authenticator code is always required to sign in. A password is optional: once you set one it is required together with the code."
      >
        <div className="flex flex-wrap gap-2">
          <Pill tone="ok">Authenticator: required</Pill>
          <Pill tone={overview.admin.hasPassword ? 'ok' : 'muted'}>
            Password: {overview.admin.hasPassword ? 'set' : 'not set'}
          </Pill>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Password</h3>
          <KeyGuide guide={GUIDES['admin-password']} />
          <PasswordForm
            min={ADMIN_PASSWORD_MIN}
            hasPassword={overview.admin.hasPassword}
            busy={busy === 'admin-password'}
            onSubmit={(newPassword) => run('admin-password', 'admin-set-password', { newPassword })}
            onRemove={() => run('admin-password', 'admin-remove-password')}
          />
        </div>

        <div className="space-y-3 border-t border-gray-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Authenticator
          </h3>
          <KeyGuide guide={GUIDES.authenticator} />
          {enrolling('admin') ? (
            <div className="space-y-4">
              <TotpEnroll
                uri={enrollment!.uri}
                secret={enrollment!.secret}
                code={enrollment!.code}
                onCodeChange={(code) => setEnrollment({ ...enrollment!, code })}
              />
              <p className="text-xs text-yellow-400/90">
                Your current authenticator entry stops working as soon as you confirm. Keep it until
                the new one shows a valid code.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy !== null || enrollment!.code.replace(/\s/g, '').length !== 6}
                  onClick={confirmEnrollment}
                  className={primaryButton}
                >
                  {busy === 'admin-rotate-totp' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm and replace
                </button>
                <button type="button" onClick={() => setEnrollment(null)} className={ghostButton}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => startEnrollment('admin')}
              className={ghostButton}
            >
              <RefreshCw className="w-4 h-4" /> Replace authenticator (new device or key)
            </button>
          )}
        </div>
      </Card>

      {/* Notes vault */}
      <Card
        id="notes-vault"
        highlighted={focusId === 'notes-vault'}
        icon={NotebookPen}
        title="Notes vault"
        description="The vault at /notes has its own sign-in. Both options below are optional, but the vault stays locked for everyone until at least one is set."
      >
        <div className="flex flex-wrap gap-2">
          <Pill tone={overview.notes.hasPassword ? 'ok' : 'muted'}>
            Password: {overview.notes.hasPassword ? 'set' : 'not set'}
          </Pill>
          <Pill tone={overview.notes.quickUnlock ? 'ok' : 'muted'}>
            Authenticator quick unlock: {overview.notes.quickUnlock ? 'on' : 'off'}
          </Pill>
          {!overview.notes.hasPassword && !overview.notes.quickUnlock && (
            <Pill tone="warn">Vault is locked for everyone</Pill>
          )}
        </div>

        <KeyGuide guide={GUIDES['notes-vault']} />

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Vault password (7-day session)
          </h3>
          <PasswordForm
            min={NOTES_PASSWORD_MIN}
            hasPassword={overview.notes.hasPassword}
            busy={busy === 'notes-password'}
            onSubmit={(newPassword) => run('notes-password', 'notes-set-password', { newPassword })}
            onRemove={() => run('notes-password', 'notes-remove-password')}
          />
        </div>

        <div className="space-y-3 border-t border-gray-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Authenticator quick unlock (45 minutes, +15 per click, up to 3 hours)
          </h3>
          {enrolling('notes') ? (
            <div className="space-y-4">
              <TotpEnroll
                uri={enrollment!.uri}
                secret={enrollment!.secret}
                code={enrollment!.code}
                onCodeChange={(code) => setEnrollment({ ...enrollment!, code })}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy !== null || enrollment!.code.replace(/\s/g, '').length !== 6}
                  onClick={confirmEnrollment}
                  className={primaryButton}
                >
                  {busy === 'notes-enable-totp' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {overview.notes.quickUnlock ? 'Confirm and replace' : 'Confirm and enable'}
                </button>
                <button type="button" onClick={() => setEnrollment(null)} className={ghostButton}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => startEnrollment('notes')}
                className={ghostButton}
              >
                <Smartphone className="w-4 h-4" />
                {overview.notes.quickUnlock ? 'Replace authenticator' : 'Enable quick unlock'}
              </button>
              {overview.notes.quickUnlock && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run('notes-disable-totp', 'notes-disable-totp')}
                  className={dangerButton}
                >
                  <Trash2 className="w-4 h-4" /> Turn off
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Integrations */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-100">
          <Plug className="w-5 h-5 text-emerald-400" /> Integrations
        </h2>
        <p className="text-sm text-gray-400 max-w-2xl">
          Values set here override the matching environment variables, which remain as a fallback.
          Leave a secret field blank to keep its current value.
        </p>
      </div>

      {groupKeys.map((group) => {
        const fields = overview.integrations.filter((f) => f.group === group);
        const info = overview.groups[group];
        return (
          <Card
            key={group}
            id={group}
            highlighted={focusId === group}
            icon={KeyRound}
            title={info.label}
            description={info.description}
          >
            <KeyGuide
              guide={GUIDES[GROUP_GUIDE[group] ?? 'smtp']}
              defaultOpen={fields.every((f) => f.state === 'unset')}
            />
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
              {fields.map((f) => {
                const queuedClear = clears.has(f.key);
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={f.key} className="text-xs text-gray-400 font-medium">
                        {f.label}
                      </label>
                      {f.state === 'admin' ? (
                        <Pill tone="ok">set here</Pill>
                      ) : f.state === 'env' ? (
                        <Pill tone="muted">from environment</Pill>
                      ) : (
                        <Pill tone="muted">not set</Pill>
                      )}
                    </div>
                    <input
                      id={f.key}
                      type={f.secret ? 'password' : 'text'}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={queuedClear}
                      value={edits[f.key] ?? (f.secret ? '' : (f.value ?? ''))}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={
                        f.secret && f.state !== 'unset'
                          ? '•••••••• (kept, type to replace)'
                          : (f.placeholder ?? '')
                      }
                      className={`${inputClass} ${queuedClear ? 'opacity-40' : ''}`}
                    />
                    <FieldHelpText help={FIELD_HELP[f.key]} />
                    {f.hint && <p className="text-[11px] text-gray-500">{f.hint}</p>}
                    {f.state === 'admin' && (
                      <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={queuedClear}
                          onChange={(e) =>
                            setClears((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(f.key);
                              else next.delete(f.key);
                              return next;
                            })
                          }
                          className="accent-emerald-500"
                        />
                        Remove the value set here
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => saveGroup(group)}
              className={primaryButton}
            >
              {busy === `group-${group}` && <Loader2 className="w-4 h-4 animate-spin" />}
              Save {info.label}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
