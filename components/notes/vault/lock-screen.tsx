'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Loader2, Lock, LockOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VaultSetup } from '@/hooks/use-vault-session';

/**
 * The door of the private notes. It says plainly what this place is, offers the way back to the
 * public notes, and asks for the password (or the authenticator code, if the owner set one up).
 */
export default function LockScreen({
  title,
  setup,
  checking,
  onLogin,
}: {
  title: string;
  setup: VaultSetup | null;
  checking: boolean;
  onLogin: (secret: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const notSetUp = setup !== null && !setup.passwordSet && !setup.quickUnlock;
  const both = Boolean(setup?.passwordSet && setup?.quickUnlock);
  const useCode = both ? mode === 'code' : Boolean(setup?.quickUnlock && !setup?.passwordSet);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !secret) return;
    setBusy(true);
    setError('');
    const problem = await onLogin(secret);
    if (problem) setError(problem);
    setBusy(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground" dir="auto">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            These notes are only for the owner. Visitors can read the notes that were published on
            the public page.
          </p>
        </div>

        {checking ? (
          <div className="flex justify-center py-6" role="status" aria-label="Checking">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            {both && (
              <div
                role="tablist"
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-medium"
              >
                {(
                  [
                    ['password', 'Password'],
                    ['code', 'Authenticator code'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => {
                      setMode(value);
                      setSecret('');
                      setError('');
                    }}
                    className={`rounded-md py-1.5 transition-colors ${
                      mode === value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {notSetUp && (
              <p className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                No password has been set yet. The owner can set one in the admin under Security
                &amp; Keys.
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                {useCode ? '6-digit code' : 'Password'}
              </span>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  key={useCode ? 'code' : 'password'}
                  type="password"
                  inputMode={useCode ? 'numeric' : undefined}
                  autoComplete={useCode ? 'one-time-code' : 'current-password'}
                  maxLength={useCode ? 6 : 200}
                  value={secret}
                  onChange={(e) =>
                    setSecret(
                      useCode ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value
                    )
                  }
                  disabled={notSetUp}
                  autoFocus
                  aria-invalid={Boolean(error)}
                  className={`w-full rounded-lg border bg-background py-2.5 ps-9 pe-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    error ? 'border-destructive' : 'border-input focus:border-ring'
                  } ${useCode ? 'text-center font-mono text-lg tracking-[0.4em]' : ''}`}
                />
              </div>
            </label>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !secret || notSetUp || (useCode && secret.length < 6)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <LockOpen />} Unlock
            </Button>
          </form>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Public notes
          </Link>
          <Link href="/" className="text-muted-foreground transition-colors hover:text-primary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
