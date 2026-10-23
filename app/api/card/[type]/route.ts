import connectToDatabase from '@/lib/db';

/**
 * Live SVG cards for the GitHub profile README.
 *
 * GitHub never executes JavaScript in a README, so the only content that can
 * update without a commit is an image. These endpoints render CMS content as SVG
 * so the profile reflects an edit here without waiting for the sync workflow.
 *
 * Caching is done with plain response headers rather than `export const
 * revalidate`. That is deliberate: a route-level `revalidate` would make these
 * ISR routes and bill every regeneration against the Vercel free-tier ISR-Write
 * budget - the exact cost `lib/revalidate.ts` documents having burned before.
 * Header-based CDN caching costs zero ISR writes and still collapses traffic to
 * roughly one origin hit per hour, which matters because GitHub proxies every
 * image request through Camo.
 *
 * The README embeds these with a `?v=` stamp derived from the content's
 * updatedAt, so a real edit produces a new URL and Camo fetches it immediately
 * instead of serving a stale copy for the life of the TTL.
 */

const CARD_TYPES = ['stats', 'experience', 'skills'] as const;
type CardType = (typeof CARD_TYPES)[number];

const THEMES = {
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    title: '#4d4dff',
    text: '#c9d1d9',
    muted: '#8b949e',
  },
  light: {
    bg: '#ffffff',
    border: '#d0d7de',
    title: '#4d4dff',
    text: '#1f2328',
    muted: '#636c76',
  },
} as const;

const WIDTH = 480;
const PAD = 22;
const ROW_H = 26;
const HEAD_H = 54;

/** SVG is XML: unescaped CMS text would break the document or inject markup. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(text: string, max: number): string {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

async function getDoc(type: string) {
  const db = await connectToDatabase();
  return db.connection.client.db('portfolio_cms').collection('homepage').findOne({ type });
}

type Row = { left: string; right: string };

async function buildCard(type: CardType): Promise<{ title: string; rows: Row[] }> {
  if (type === 'stats') {
    const doc = await getDoc('about_content');
    const stats = (doc?.stats as { label: string; value: string }[]) || [];
    const rows = stats.map((s) => ({
      left: clamp(String(s.label).replace(/_/g, ' '), 34),
      right: clamp(s.value, 12),
    }));
    if (doc?.uptimeValue) rows.push({ left: 'UPTIME', right: clamp(doc.uptimeValue, 16) });
    return { title: 'System Stats', rows };
  }

  if (type === 'experience') {
    const doc = await getDoc('experience_content');
    const list = (doc?.experiences as Record<string, string>[]) || [];
    return {
      title: 'Where I Work',
      rows: list.slice(0, 4).map((e) => ({
        left: clamp(e.displayRole || e.role, 34),
        right: clamp(e.company, 18),
      })),
    };
  }

  const doc = await getDoc('skills_content');
  const categories = (doc?.categories as { name: string; skills?: unknown[] }[]) || [];
  return {
    title: 'Core Stack',
    rows: categories.slice(0, 6).map((c) => ({
      left: clamp(String(c.name).replace(/_/g, ' '), 34),
      right: `${(c.skills || []).length} skills`,
    })),
  };
}

function renderSvg(title: string, rows: Row[], theme: keyof typeof THEMES): string {
  const c = THEMES[theme];
  const height = HEAD_H + rows.length * ROW_H + PAD;

  const body = rows
    .map((r, i) => {
      const y = HEAD_H + i * ROW_H;
      return (
        `<text x="${PAD}" y="${y}" fill="${c.text}" font-size="13">${esc(r.left)}</text>` +
        `<text x="${WIDTH - PAD}" y="${y}" fill="${c.muted}" font-size="13" text-anchor="end">${esc(r.right)}</text>`
      );
    })
    .join('');

  // No external fonts or images: Camo serves the bytes as-is and will not fetch
  // subresources, so anything not inline simply would not render.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(title)}">
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
<g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
<text x="${PAD}" y="30" fill="${c.title}" font-size="15" font-weight="600">${esc(title)}</text>
${body}
</g>
</svg>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!CARD_TYPES.includes(type as CardType)) {
    return new Response('Unknown card type', { status: 404 });
  }

  const theme = new URL(request.url).searchParams.get('theme') === 'dark' ? 'dark' : 'light';

  let svg: string;
  try {
    const { title, rows } = await buildCard(type as CardType);
    svg = renderSvg(title, rows, theme);
  } catch (error) {
    console.error('[card] render failed:', error);
    // Still return a valid image: a broken <img> on the profile looks worse than
    // a quiet placeholder, and the README has the same content as text anyway.
    svg = renderSvg('Temporarily unavailable', [], theme);
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
