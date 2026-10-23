import { NextResponse } from 'next/server';

/** The shape of one validation problem; the same fields Zod issues have, so the browser treats both alike. */
export interface FieldProblem {
  path: (string | number)[];
  message: string;
  code?: string;
}

/** 400 response the admin forms understand: the field at fault is outlined and scrolled into view. */
export function problem(path: (string | number)[], message: string, status = 400) {
  return NextResponse.json(
    {
      error: 'Invalid payload data',
      details: [{ code: 'custom', path, message }] satisfies FieldProblem[],
    },
    { status }
  );
}

/** True for requests made by this site's own pages (blocks cross-site form posts and scripts). */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients (curl, tests); still rate limited
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}
