import { NextResponse } from 'next/server';
import { getGlobalContent } from '@/lib/site';
import { getChrome, navFor } from '@/lib/chrome';
import { getLayoutSections } from '@/lib/sections-registry';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';

// Public (non-admin) endpoint so client components like the Header on the
// /kits and /calendar pages can read brand/location without an admin session.
export async function GET() {
  const [g, sections, avatarUrl, chrome] = await Promise.all([
    getGlobalContent(),
    getLayoutSections(),
    getActiveAvatarUrl(),
    getChrome(),
  ]);
  return NextResponse.json({
    avatarUrl,
    headerName: g.headerName,
    headerTag: g.headerTag,
    githubProfileUrl: g.githubProfileUrl,
    locationLabel: g.locationLabel,
    timeZone: g.timeZone,
    nav: navFor(chrome, sections),
  });
}
