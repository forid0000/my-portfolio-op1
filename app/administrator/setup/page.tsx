'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, KeyRound, Loader2, ShieldCheck, Terminal } from 'lucide-react';
import { TotpEnroll } from '@/components/admin/totp-enroll';

const PASSWORD_MIN = 12;

const STEP_LABELS = ['Verify access', 'Authenticator', 'Finish'];

type Step = 'loading' | 'code' | 'authenticator' | 'password';

const inputClass =
  'w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors';
const primaryButton =
  'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors';

/**
 * First-run setup: prove access to the server (setup code from the log), enrol the
 * mandatory authenticator, and optionally add a password. Closes itself for good
 * once the admin account exists.
 */
export default function AdminSetup() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [setupCode, setSetupCode] = useState('');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/setup')
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!active) return;
        if (!ok) {
          setError(d.error || 'Could not reach the server.');
          setStep('code');
        } else if (!d.needsSetup) {
          router.replace('/administrator/login');
        } else {
          setStep('code');
        }
      })
      .catch(() => {
        if (!active) return;
        setError('Could not reach the server.');
        setStep('code');
      });
    return () => {
      active = false;
    };
  }, [router]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { ok, status, data } = await post({ action: 'begin', setupCode });
      if (ok) {
        setSecret(data.secret);
        setUri(data.uri);
        setStep('authenticator');
      } else if (status === 409) {
        router.replace('/administrator/login');
      } else {
        setError(data.error || 'Setup failed.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  const handleAuthenticator = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.replace(/\s/g, '').length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (!keySaved) {
      setError('Please confirm that you saved the key.');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password) {
      if (password.length < PASSWORD_MIN) {
        setError(`The password must be at least ${PASSWORD_MIN} characters.`);
        return;
      }
      if (password !== confirm) {
        setError('The passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      const { ok, status, data } = await post({
        action: 'complete',
        setupCode,
        secret,
        totpCode,
        ...(password ? { password } : {}),
      });
      if (ok) {
        // The dashboard greets a new owner with the welcome prompt, the guided tour and the checklist.
        router.push('/administrator');
        router.refresh();
        return;
      }
      if (status === 409) {
        router.replace('/administrator/login');
        return;
      }
      setError(data.error || 'Setup failed.');
      // A wrong authenticator code is fixed on the previous step.
      if (status === 401) {
        setTotpCode('');
        setStep('authenticator');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  const stepNumber = step === 'code' ? 1 : step === 'authenticator' ? 2 : 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
      <div className="max-w-xl w-full bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-950/50 rounded-full flex items-center justify-center mb-4">
            {step === 'password' ? (
              <KeyRound className="w-6 h-6 text-emerald-500" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Set up your admin account</h1>
          {step !== 'loading' && (
            <ol className="mt-5 flex items-center justify-center gap-2" aria-label="Setup progress">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const state = n < stepNumber ? 'done' : n === stepNumber ? 'current' : 'todo';
                return (
                  <li
                    key={label}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        state === 'done'
                          ? 'bg-emerald-600 text-white'
                          : state === 'current'
                            ? 'bg-emerald-950 text-emerald-300 ring-2 ring-emerald-500'
                            : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {state === 'done' ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        state === 'todo' ? 'text-gray-600' : 'text-gray-300'
                      }`}
                    >
                      {label}
                    </span>
                    {n < STEP_LABELS.length && (
                      <span className="h-px w-6 bg-gray-700" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg text-center"
          >
            {error}
          </div>
        )}

        {step === 'loading' && (
          <div className="flex justify-center py-6 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {step === 'code' && (
          <form onSubmit={handleCode} className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
              <Terminal className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <p>
                To prove you control this server, enter the <strong>setup code</strong> printed in
                the server log when this page was opened (your terminal while developing, or the
                runtime logs of your host). You can also print it with{' '}
                <code className="font-mono text-emerald-300">node scripts/setup-code.mjs</code>.
              </p>
            </div>
            <div>
              <label htmlFor="setup-code" className="block text-sm font-medium text-gray-300 mb-1">
                Setup code
              </label>
              <input
                id="setup-code"
                type="text"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                className={`${inputClass} font-mono tracking-widest text-center text-lg`}
                placeholder="XXXXX-XXXXX"
              />
            </div>
            <button
              type="submit"
              disabled={busy || setupCode.length < 10}
              className={primaryButton}
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 'authenticator' && (
          <form onSubmit={handleAuthenticator} className="space-y-6">
            <p className="text-sm text-gray-400">
              An authenticator app is <strong>required</strong> to sign in. Add this account to your
              app, then enter the code it shows to confirm it works.
            </p>
            <TotpEnroll
              uri={uri}
              secret={secret}
              code={totpCode}
              onCodeChange={setTotpCode}
              codeLabel="Code from your authenticator app"
            />
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={keySaved}
                onChange={(e) => setKeySaved(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>
                I saved the written key (or added this account to a second device). It is my only
                way back in if I lose my phone, because there are no backup codes.
              </span>
            </label>
            <button type="submit" className={primaryButton}>
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleFinish} className="space-y-5">
            <p className="text-sm text-gray-400">
              Optionally add a password as an additional factor. If you set one, sign-in will ask
              for it together with the authenticator code. You can add, change or remove it later in
              Security. Next you will land on your dashboard, where a short guide shows you around.
            </p>
            <div>
              <label htmlFor="pw" className="block text-sm font-medium text-gray-300 mb-1">
                Password <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={`At least ${PASSWORD_MIN} characters`}
              />
            </div>
            {password && (
              <div>
                <label htmlFor="pw2" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm password
                </label>
                <input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('authenticator');
                }}
                className="px-4 py-2.5 border border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : password ? (
                  'Finish setup'
                ) : (
                  'Finish without a password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
