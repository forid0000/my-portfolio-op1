import { NextResponse } from 'next/server';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';

/**
 * Plain redirect to the active avatar's Cloudinary URL - kept as a stable
 * path (rather than embedding the Cloudinary URL everywhere) so the avatar
 * can change without touching any consumer, and so old cached HTML/links
 * pointing at "/api/avatar" keep working.
 */
export async function GET(request: Request) {
  const url = await getActiveAvatarUrl();
  // The placeholder is a local path; redirects need an absolute URL.
  return NextResponse.redirect(new URL(url, request.url), {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
