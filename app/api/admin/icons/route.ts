import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { ALL_REACT_ICON_NAMES } from '@/lib/icons/names';
import { resolveIconData } from '@/lib/icons/resolve';
import { ALL_LUCIDE_ICON_NAMES } from '@/lib/lucide-icon';
import { isSparkleIcon } from '@/lib/icons/no-sparkle';

// Backs the admin icon picker. The ~50,000-name catalog and the icon libraries
// stay on the server: the browser sends a search term and receives at most a
// screenful of results as small SVG data, instead of loading every icon pack.

const MAX_RESULTS = 150;
const MAX_NAMES = 60;

type Scope = 'all' | 'social';

let catalogs: Record<Scope, readonly string[]> | null = null;

function getCatalogs() {
  if (!catalogs) {
    // lucide first (small, general purpose), then react-icons. "social" pickers
    // favour brand logos.
    const all = Array.from(new Set([...ALL_LUCIDE_ICON_NAMES, ...ALL_REACT_ICON_NAMES])).filter(
      (n) => !isSparkleIcon(n)
    );
    const social = [
      ...ALL_LUCIDE_ICON_NAMES,
      // Brand logos: Simple Icons, Font Awesome brands, Ionicons logos. (Simple Icons has
      // dropped some brands, e.g. LinkedIn, which Font Awesome still has.)
      ...ALL_REACT_ICON_NAMES.filter(
        (n) => n.startsWith('Si') || n.startsWith('Fa') || n.startsWith('IoLogo')
      ),
    ].filter((n) => !isSparkleIcon(n));
    catalogs = { all, social };
  }
  return catalogs;
}

export async function GET(request: Request) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;

  // Exact lookup: the picker asks for the glyph of the value that is currently saved.
  const namesParam = params.get('names');
  if (namesParam) {
    const names = namesParam.split(',').slice(0, MAX_NAMES).filter(Boolean);
    const items = await Promise.all(
      names.map(async (name) => ({ name, data: await resolveIconData(name) }))
    );
    return NextResponse.json({ total: items.length, items });
  }

  const scope: Scope = params.get('scope') === 'social' ? 'social' : 'all';
  const q = (params.get('q') ?? '').trim().toLowerCase().slice(0, 60);
  const catalog = getCatalogs()[scope];
  const matches = q ? catalog.filter((name) => name.toLowerCase().includes(q)) : catalog;

  const items = await Promise.all(
    matches.slice(0, MAX_RESULTS).map(async (name) => ({ name, data: await resolveIconData(name) }))
  );
  return NextResponse.json({ total: matches.length, items });
}
