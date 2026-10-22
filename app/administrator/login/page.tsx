'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, KeyRound, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

const isDev = process.env.NODE_ENV === 'development';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
function buildClock(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${DAYS[d.getDay()]} · ${dd} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}:${ss}`;
}

export default function AdminLogin() {
  const [countdown, setCountdown] = useState(5);
  const [step, setStep] = useState<1 | 2>(1);
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clockStr, setClockStr] = useState('');
  const router = useRouter();

  useEffect(() => {
    setClockStr(buildClock(new Date()));
    const id = setInterval(() => setClockStr(buildClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // DEV: single-step password only
  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/administrator');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // PROD step 1: collect TOTP, no API call yet
  const handleTotpNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      setError('Enter a 6-digit code');
      return;
    }
    setError('');
    setStep(2);
  };

  // PROD step 2: submit TOTP + password together
  const handleFinalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, totpCode }),
      });
      if (res.ok) {
        router.push('/administrator');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
        // If TOTP was wrong, go back to step 1
        if (data.error?.toLowerCase().includes('totp')) {
          setStep(1);
          setTotpCode('');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      {countdown > 0 ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 space-y-12 animate-in fade-in duration-500">
          <div className="w-32 h-32 bg-red-950/30 rounded-full flex items-center justify-center animate-pulse border border-red-900/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-red-500 uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              System Alert
            </h2>
            <p className="text-xl md:text-2xl font-mono text-red-400/80 uppercase tracking-widest">
              Portal is opening...
            </p>
          </div>
          <div className="text-[12rem] md:text-[20rem] leading-none font-mono font-black text-red-500 tracking-tighter tabular-nums drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">
            0{countdown}
          </div>
        </div>
      ) : (
        <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-800 overflow-hidden relative min-h-[400px] flex flex-col justify-center animate-in fade-in zoom-in-95 duration-700">
          {/* Live clock */}
          <p className="text-[11px] font-mono text-gray-500 tracking-[0.15em] text-center mb-6">
            {clockStr}
          </p>

          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-950/50 rounded-full flex items-center justify-center mb-4">
              {isDev || step === 2 ? (
                <KeyRound className="w-6 h-6 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-emerald-500 animate-pulse" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-100">Admin Access</h2>
            <p className="text-sm text-gray-400 mt-2 text-center h-5">
              {isDev
                ? 'Enter your master password.'
                : step === 1
                  ? 'Enter your authenticator code.'
                  : 'Enter your master password.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* DEV: password only */}
          {isDev && (
            <form onSubmit={handleDevLogin} className="space-y-5 animate-in fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PROD step 1: TOTP */}
          {!isDev && step === 1 && (
            <form
              onSubmit={handleTotpNext}
              className="space-y-5 animate-in fade-in slide-in-from-left-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Authenticator Code (TOTP)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors tracking-widest font-mono text-center text-lg"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={totpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* PROD step 2: password */}
          {!isDev && step === 2 && (
            <form
              onSubmit={handleFinalLogin}
              className="space-y-5 animate-in fade-in slide-in-from-right-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setPassword('');
                  }}
                  className="px-4 py-2.5 border border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
