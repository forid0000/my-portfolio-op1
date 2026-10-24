'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ask the server what the form needs: first-run setup, or a password field too.
  useEffect(() => {
    let active = true;
    fetch('/api/admin/login')
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!active) return;
        if (ok && d.needsSetup) {
          router.replace('/administrator/setup');
          return;
        }
        if (!ok) setError(d.error || 'Could not reach the server.');
        setPasswordRequired(Boolean(d.passwordRequired));
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setError('Could not reach the server.');
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode, ...(passwordRequired ? { password } : {}) }),
      });
      if (res.ok) {
        router.push('/administrator');
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.needsSetup) {
        router.replace('/administrator/setup');
        return;
      }
      setError(data.error || 'Login failed');
      setTotpCode('');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = totpCode.replace(/\s/g, '').length === 6 && (!passwordRequired || !!password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-950/50 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Admin Access</h1>
          <p className="text-sm text-gray-400 mt-2 text-center">
            {passwordRequired
              ? 'Enter your password and authenticator code.'
              : 'Enter your authenticator code.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg text-center"
          >
            {error}
          </div>
        )}

        {!ready ? (
          <div className="flex justify-center py-6 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            {passwordRequired && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}
            <div>
              <label htmlFor="totp" className="block text-sm font-medium text-gray-300 mb-1">
                Authenticator code
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus={!passwordRequired}
                maxLength={7}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^\d ]/g, ''))}
                className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors tracking-widest font-mono text-center text-lg"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {ready && (
          <details className="mt-6 rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-gray-300 open:border-emerald-900/60">
            <summary className="cursor-pointer list-none font-medium text-gray-400 hover:text-gray-200 [&::-webkit-details-marker]:hidden">
              Need help signing in?
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-gray-400 marker:text-emerald-600">
              <li>
                Open the <strong className="text-gray-200">authenticator app</strong> on your phone,
                find this site’s entry and type the 6 digits it shows. The code changes every 30
                seconds: if it is refused, wait for the next one.
              </li>
              <li>
                Still refused? Check that your phone’s clock is set to{' '}
                <strong className="text-gray-200">automatic</strong>: codes depend on the exact
                time.
              </li>
              <li>
                A session lasts 45 minutes. Inside the admin, the{' '}
                <span className="font-mono text-gray-300">+15 Min</span> button adds more, up to 3
                hours in total.
              </li>
              <li>
                After 10 wrong tries you have to wait 15 minutes. This protects the site from
                guessing.
              </li>
              <li>
                Lost your phone? There is no “forgot” email, on purpose. If you saved the written
                key, add it to a new authenticator app. If not, whoever manages your database can
                reset the account: see “I lost my authenticator” in the Getting started guide.
              </li>
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
