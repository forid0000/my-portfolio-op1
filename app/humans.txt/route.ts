import { humansTxt } from '@/lib/project-credit';

// Static text: credits the software, not the site owner (see lib/project-credit.ts).
export const revalidate = 86400;

export function GET() {
  return new Response(humansTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
