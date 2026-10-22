import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

export default async function middleware(request: NextRequest) {
  // 1. Guard against stale Server Actions
  if (request.method === 'POST' && request.headers.has('next-action')) {
    return NextResponse.json(
      { error: 'No server actions are registered on this site.' },
      { status: 400 }
    );
  }

  // 2. Protect /administrator and /api/admin routes and handle logged-in redirection
  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/administrator') ||
    request.nextUrl.pathname.startsWith('/api/admin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/admin');

  if (isProtectedPath) {
    // 2a. CSRF: reject cross-site mutating requests to the admin API. The
    // admin_session/notes_session cookies are already SameSite=Strict, but
    // Sec-Fetch-Site/Origin verification is defense-in-depth against the edge
    // cases that cookie policy alone doesn't cover (e.g. browser bugs, relaxed
    // cookie policy on a future subdomain).
    const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    if (isApiRoute && MUTATING_METHODS.has(request.method)) {
      const secFetchSite = request.headers.get('sec-fetch-site');
      const origin = request.headers.get('origin');
      let crossSite = false;
      if (secFetchSite) {
        crossSite = secFetchSite !== 'same-origin' && secFetchSite !== 'none';
      } else if (origin) {
        try {
          crossSite = new URL(origin).host !== request.headers.get('host');
        } catch {
          crossSite = true;
        }
      }
      if (crossSite) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Endpoints that must be reachable WITHOUT a session so the user can log in.
    const { pathname } = request.nextUrl;
    // (Login and first-run setup; setup closes itself once the admin exists.)
    const isLoginPage =
      pathname.startsWith('/administrator/login') ||
      pathname.startsWith('/administrator/setup') ||
      pathname.startsWith('/api/admin/login') ||
      pathname.startsWith('/api/admin/setup');
    const token = request.cookies.get('admin_session')?.value;

    let isValidSession = false;

    if (token) {
      try {
        await jwtVerify(token, getJwtSecret());
        isValidSession = true;
      } catch (error) {
        // Token invalid/expired, or secret misconfigured -> fail closed.
      }
    }

    // If user has a valid session and tries to access the login page, redirect to dashboard
    if (isValidSession && isLoginPage && !isApiRoute) {
      return NextResponse.redirect(new URL('/administrator', request.url));
    }

    // If user does NOT have a valid session and tries to access a protected page
    if (!isValidSession && !isLoginPage) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/administrator/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - /monitoring   (Sentry tunnel route)
     */
    '/((?!_next/static|_next/image|favicon.ico|monitoring).*)',
  ],
};