import { NextResponse } from 'next/server';
import { getGlobalContent, toNavToggles } from '@/lib/site';
import { getLayoutSections } from '@/lib/sections-registry';

// Public (non-admin) endpoint so client components like the Header on the
// /kits and /calendar pages can read brand/location without an admin session.
export async function GET() {
  const [g, sections] = await Promise.all([getGlobalContent(), getLayoutSections()]);
  return NextResponse.json({
    avatarUrl: g.avatarUrl,
    headerName: g.headerName,
    headerTag: g.headerTag,
    githubProfileUrl: g.githubProfileUrl,
    locationLabel: g.locationLabel,
    timeZone: g.timeZone,
    navToggles: toNavToggles(sections),
  });
}
