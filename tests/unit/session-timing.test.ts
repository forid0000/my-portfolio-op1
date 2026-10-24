import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_EXTEND_SECONDS,
  ADMIN_SESSION_MAX_SECONDS,
  ADMIN_SESSION_SECONDS,
  NOTES_PASSWORD_SESSION_SECONDS,
  NOTES_QUICK_SESSION_SECONDS,
  extendSession,
  notesSessionKind,
  notesSessionLimit,
} from '@/lib/session-timing';

const MIN = 60;

describe('admin session length', () => {
  it('starts at 45 minutes, grows 15 minutes per click, and stops at 3 hours', () => {
    expect(ADMIN_SESSION_SECONDS).toBe(45 * MIN);
    expect(ADMIN_SESSION_EXTEND_SECONDS).toBe(15 * MIN);
    expect(ADMIN_SESSION_MAX_SECONDS).toBe(180 * MIN);
  });

  it('adds 15 minutes to what is left, at any time', () => {
    const iat = 1_000_000;
    // right after sign-in: 45 minutes left -> 60
    const first = extendSession({ iat, exp: iat + 45 * MIN, now: iat })!;
    expect(first.added).toBe(15 * MIN);
    expect(first.exp).toBe(iat + 60 * MIN);
    expect(first.atLimit).toBe(false);
    // a few minutes from the end: 2 minutes left -> 17
    const late = extendSession({ iat, exp: iat + 45 * MIN, now: iat + 43 * MIN })!;
    expect(late.exp).toBe(iat + 60 * MIN);
    expect(late.added).toBe(15 * MIN);
  });

  it('walks from 45 minutes to exactly 3 hours in nine clicks, then refuses', () => {
    const iat = 5_000_000;
    let exp = iat + ADMIN_SESSION_SECONDS;
    let clicks = 0;
    for (;;) {
      const next = extendSession({ iat, exp, now: iat })!;
      if (next.added === 0) break;
      exp = next.exp;
      clicks += 1;
      expect(exp - iat).toBeLessThanOrEqual(ADMIN_SESSION_MAX_SECONDS);
      if (next.atLimit) break;
    }
    expect(clicks).toBe(9);
    expect(exp - iat).toBe(ADMIN_SESSION_MAX_SECONDS);
    const again = extendSession({ iat, exp, now: iat })!;
    expect(again.added).toBe(0);
    expect(again.atLimit).toBe(true);
    expect(again.exp).toBe(exp);
  });

  it('only adds what fits under the 3-hour limit', () => {
    const iat = 9_000_000;
    // 2h50m in total so far: only 10 more minutes are possible
    const exp = iat + 170 * MIN;
    const next = extendSession({ iat, exp, now: iat + 100 * MIN })!;
    expect(next.added).toBe(10 * MIN);
    expect(next.exp).toBe(iat + ADMIN_SESSION_MAX_SECONDS);
    expect(next.atLimit).toBe(true);
    expect(next.limit).toBe(iat + ADMIN_SESSION_MAX_SECONDS);
  });

  it('counts the 3 hours from the original sign-in, not from the last click', () => {
    const iat = 2_000_000;
    // signed in 2.5 hours ago and kept extending: 5 minutes left
    const now = iat + 150 * MIN;
    const next = extendSession({ iat, exp: now + 5 * MIN, now })!;
    expect(next.exp).toBe(iat + 170 * MIN);
    expect(next.atLimit).toBe(false);
    const last = extendSession({ iat, exp: next.exp, now: now + 5 * MIN })!;
    expect(last.exp).toBe(iat + ADMIN_SESSION_MAX_SECONDS);
    expect(last.atLimit).toBe(true);
  });

  it('refuses a session that has already ended and never shortens one', () => {
    const iat = 3_000_000;
    expect(extendSession({ iat, exp: iat + 100, now: iat + 100 })).toBeNull();
    expect(extendSession({ iat, exp: iat + 100, now: iat + 500 })).toBeNull();
    // an expiry already beyond the limit (should not happen) stays as it is
    const odd = extendSession({ iat, exp: iat + 200 * MIN, now: iat })!;
    expect(odd.exp).toBe(iat + 200 * MIN);
    expect(odd.added).toBe(0);
  });
});

describe('the sign-in cookie', () => {
  it('is issued for 45 minutes, in the cookie and in the token', async () => {
    process.env.JWT_SECRET = 'x'.repeat(48);
    const { NextResponse } = await import('next/server');
    const { attachAdminSession } = await import('@/lib/admin-session');
    const { jwtVerify } = await import('jose');
    const response = await attachAdminSession(NextResponse.json({ ok: true }));
    const cookie = response.cookies.get('admin_session');
    expect(cookie?.maxAge).toBe(45 * 60);
    const { payload } = await jwtVerify(cookie!.value, new TextEncoder().encode('x'.repeat(48)));
    expect((payload.exp as number) - (payload.iat as number)).toBe(45 * 60);
  });
});

describe('notes vault sessions', () => {
  const iat = 4_000_000;

  it('an authenticator unlock is the same 45 minutes as the admin, a password lasts 7 days', () => {
    expect(NOTES_QUICK_SESSION_SECONDS).toBe(ADMIN_SESSION_SECONDS);
    expect(NOTES_PASSWORD_SESSION_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(notesSessionKind(iat, iat + NOTES_QUICK_SESSION_SECONDS)).toBe('quick');
    expect(notesSessionKind(iat, iat + NOTES_PASSWORD_SESSION_SECONDS)).toBe('password');
    // an extended authenticator session is still an authenticator session
    expect(notesSessionKind(iat, iat + ADMIN_SESSION_MAX_SECONDS)).toBe('quick');
  });

  it('an authenticator unlock can be extended up to 3 hours from unlocking', () => {
    const exp = iat + NOTES_QUICK_SESSION_SECONDS;
    expect(notesSessionLimit(iat, exp)).toBe(iat + ADMIN_SESSION_MAX_SECONDS);
    const next = extendSession({ iat, exp, now: iat + 10 })!;
    expect(next.added).toBe(ADMIN_SESSION_EXTEND_SECONDS);
  });

  it('a password session has nothing to extend', () => {
    const exp = iat + NOTES_PASSWORD_SESSION_SECONDS;
    expect(notesSessionLimit(iat, exp)).toBe(exp);
    const next = extendSession({ iat, exp, now: iat + 10 })!;
    expect(next.added).toBe(0);
    expect(next.exp).toBe(exp);
  });
});
