'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTE_TEXT_DEFAULTS } from '@/lib/notes-model';

export interface VaultSettings {
  autosaveInterval: number;
  notesPerPage: number;
  vaultTitle: string;
  lockTitle: string;
  maxFileBytes: number;
}

const DEFAULT_SETTINGS: VaultSettings = {
  autosaveInterval: 30,
  notesPerPage: 20,
  vaultTitle: NOTE_TEXT_DEFAULTS.vaultTitle,
  lockTitle: NOTE_TEXT_DEFAULTS.lockTitle,
  maxFileBytes: 4 * 1024 * 1024,
};

export interface VaultSetup {
  passwordSet: boolean;
  quickUnlock: boolean;
}

function readSettings(data: Partial<VaultSettings> | null | undefined): VaultSettings {
  const d = DEFAULT_SETTINGS;
  return {
    autosaveInterval:
      typeof data?.autosaveInterval === 'number' ? data.autosaveInterval : d.autosaveInterval,
    notesPerPage: typeof data?.notesPerPage === 'number' ? data.notesPerPage : d.notesPerPage,
    vaultTitle: data?.vaultTitle || d.vaultTitle,
    lockTitle: data?.lockTitle || d.lockTitle,
    maxFileBytes: typeof data?.maxFileBytes === 'number' ? data.maxFileBytes : d.maxFileBytes,
  };
}

function formatLeft(diff: number): string {
  if (diff <= 0) return '00:00';
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** The vault's lock: whether this browser is unlocked, the options, and how long it stays so. */
export function useVaultSession() {
  const [status, setStatus] = useState<'checking' | 'locked' | 'open'>('checking');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  // 'quick' (authenticator) sessions can be extended up to `limitAt`; password sessions cannot.
  const [kind, setKind] = useState<'quick' | 'password'>('password');
  const [limitAt, setLimitAt] = useState<number | null>(null);
  const [extending, setExtending] = useState(false);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [setup, setSetup] = useState<VaultSetup | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);

  const lock = useCallback(() => {
    setStatus('locked');
    setExpiresAt(null);
    setLimitAt(null);
  }, []);

  const adopt = useCallback((d: { kind?: string; limitAt?: number }) => {
    setKind(d.kind === 'quick' ? 'quick' : 'password');
    setLimitAt(typeof d.limitAt === 'number' ? d.limitAt : null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    fetch('/api/notes/auth', { signal: controller.signal })
      .then((r) => r.json())
      .then(
        (d) =>
          mounted.current &&
          setSetup({ passwordSet: !!d.passwordSet, quickUnlock: !!d.quickUnlock })
      )
      .catch(() => {});
    fetch('/api/notes/session', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted.current) return;
        if (d.active && d.expiresAt > Date.now()) {
          setSettings(readSettings(d));
          setExpiresAt(d.expiresAt);
          adopt(d);
          setStatus('open');
        } else {
          setStatus('locked');
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError' && mounted.current) setStatus('locked');
      });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);

  // Counts down while open and locks again the moment the session ends.
  useEffect(() => {
    if (status !== 'open' || !expiresAt) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= expiresAt) lock();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, expiresAt, lock]);

  /** Returns an error message, or null when the vault opened. */
  const login = useCallback(
    async (secret: string): Promise<string | null> => {
      try {
        const res = await fetch('/api/notes/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: secret }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setSettings(readSettings(data));
          setExpiresAt(data.expiresAt);
          adopt(data);
          setStatus('open');
          return null;
        }
        return data.error || 'That did not work. Check it and try again.';
      } catch {
        return 'Could not reach the server. Check your connection.';
      }
    },
    [adopt]
  );

  /** "+15 min": adds time to an authenticator-unlocked session, up to the 3-hour limit. */
  const extend = useCallback(async (): Promise<string | null> => {
    setExtending(true);
    try {
      const res = await fetch('/api/notes/session/refresh', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setExpiresAt(data.expiresAt);
        adopt(data);
        return null;
      }
      if (res.status === 401) {
        lock();
        return data.error || 'The vault is locked again. Unlock it to continue.';
      }
      if (typeof data.limitAt === 'number') setLimitAt(data.limitAt);
      return data.error || 'The time could not be extended.';
    } catch {
      return 'Could not reach the server. Check your connection.';
    } finally {
      setExtending(false);
    }
  }, [adopt, lock]);

  const logout = useCallback(async () => {
    await fetch('/api/notes/logout', { method: 'POST' }).catch(() => {});
    lock();
  }, [lock]);

  const left = expiresAt ? expiresAt - now : 0;
  const canExtend = status === 'open' && kind === 'quick';
  return {
    status,
    settings,
    setup,
    login,
    logout,
    lock,
    timeLeft: status === 'open' ? formatLeft(left) : '--:--',
    lowTime: status === 'open' && left < 10 * 60 * 1000,
    /** Authenticator sessions only; a password session lasts 7 days. */
    canExtend,
    /** Already as long as this session may ever be. */
    atLimit: canExtend && limitAt !== null && (expiresAt ?? 0) >= limitAt,
    extending,
    extend,
  };
}
