/**
 * Server-side icon resolution: icon name -> IconData (see icon-data.ts).
 *
 * Icons are stored in the CMS by name ("Github", "FaAws", "TbBrandDocker"...).
 * A name's prefix identifies its react-icons pack ("Fa" -> react-icons/fa), so
 * only that one pack is loaded (lazily, on the server) - never all 33 packs, and
 * never in the browser. Names without a pack prefix are lucide icons.
 */
import 'server-only';
import type { IconData, IconMap, IconNode } from '@/lib/icons/icon-data';

type Pack = Record<string, unknown>;

const PACK_LOADERS: Record<string, () => Promise<Pack>> = {
  ai: () => import('react-icons/ai'),
  bi: () => import('react-icons/bi'),
  bs: () => import('react-icons/bs'),
  cg: () => import('react-icons/cg'),
  ci: () => import('react-icons/ci'),
  di: () => import('react-icons/di'),
  fa: () => import('react-icons/fa'),
  fa6: () => import('react-icons/fa6'),
  fc: () => import('react-icons/fc'),
  fi: () => import('react-icons/fi'),
  gi: () => import('react-icons/gi'),
  go: () => import('react-icons/go'),
  gr: () => import('react-icons/gr'),
  hi: () => import('react-icons/hi'),
  hi2: () => import('react-icons/hi2'),
  im: () => import('react-icons/im'),
  io: () => import('react-icons/io'),
  io5: () => import('react-icons/io5'),
  lia: () => import('react-icons/lia'),
  lu: () => import('react-icons/lu'),
  md: () => import('react-icons/md'),
  pi: () => import('react-icons/pi'),
  ri: () => import('react-icons/ri'),
  rx: () => import('react-icons/rx'),
  si: () => import('react-icons/si'),
  sl: () => import('react-icons/sl'),
  tb: () => import('react-icons/tb'),
  tfi: () => import('react-icons/tfi'),
  ti: () => import('react-icons/ti'),
  vsc: () => import('react-icons/vsc'),
  wi: () => import('react-icons/wi'),
};

/** Name prefix -> candidate packs, in lookup order (fa before fa6, hi before hi2...). */
const PREFIX_TO_PACKS: Record<string, string[]> = {
  Ai: ['ai'],
  Bi: ['bi'],
  Bs: ['bs'],
  Cg: ['cg'],
  Ci: ['ci'],
  Di: ['di'],
  Fa: ['fa', 'fa6'],
  Fc: ['fc'],
  Fi: ['fi'],
  Gi: ['gi'],
  Go: ['go'],
  Gr: ['gr'],
  Hi: ['hi', 'hi2'],
  Im: ['im'],
  Io: ['io', 'io5'],
  Lia: ['lia'],
  Lu: ['lu'],
  Md: ['md'],
  Pi: ['pi'],
  Ri: ['ri'],
  Rx: ['rx'],
  Si: ['si'],
  Sl: ['sl'],
  Tb: ['tb'],
  Tfi: ['tfi'],
  Ti: ['ti'],
  Vsc: ['vsc'],
  Wi: ['wi'],
};

/**
 * lucide 1.x dropped every brand logo, so names saved in the CMS back when they
 * existed (and the defaults) would silently fall back to a generic glyph. They
 * are mapped to the matching Font Awesome brand icon instead.
 */
const BRAND_ALIASES: Record<string, string> = {
  Chrome: 'FaChrome',
  Codepen: 'FaCodepen',
  Dribbble: 'FaDribbble',
  Facebook: 'FaFacebook',
  Figma: 'FaFigma',
  Github: 'FaGithub',
  Gitlab: 'FaGitlab',
  Instagram: 'FaInstagram',
  Linkedin: 'FaLinkedin',
  Slack: 'FaSlack',
  Trello: 'FaTrello',
  Twitch: 'FaTwitch',
  Twitter: 'FaTwitter',
  Youtube: 'FaYoutube',
};

const NON_ICON_EXPORTS = new Set([
  'createLucideIcon',
  'Icon',
  'icons',
  'default',
  'dynamicIconImports',
]);

/** Default attributes of lucide's base <svg> (lucide icons are data + this wrapper). */
const LUCIDE_SVG_ATTRS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** react-icons' IconBase defaults (a pack's own `attr` may override them). */
const REACT_ICONS_SVG_ATTRS = {
  stroke: 'currentColor',
  fill: 'currentColor',
  strokeWidth: '0',
} as const;

const cache = new Map<string, IconData | null>();

async function findExport(requested: string): Promise<unknown> {
  const name = BRAND_ALIASES[requested] ?? requested;
  const prefix = /^[A-Z][a-z]+/.exec(name)?.[0];
  const packs = prefix ? PREFIX_TO_PACKS[prefix] : undefined;
  if (packs) {
    for (const pack of packs) {
      const mod = await PACK_LOADERS[pack]();
      if (name in mod) return mod[name];
    }
  }
  if (NON_ICON_EXPORTS.has(name)) return undefined;
  const lucide = (await import('lucide-react')) as unknown as Pack;
  return lucide[name];
}

function cleanAttrs(raw: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'key' || key === 'ref' || key === 'children') continue;
    if (typeof value === 'string' || typeof value === 'number') out[key] = value;
  }
  return out;
}

/** Converts react-icons' element children (`<path d=.../>`) into IconNodes. */
function elementsToNodes(children: unknown): IconNode[] {
  const nodes: IconNode[] = [];
  for (const child of ([] as unknown[]).concat(children ?? [])) {
    if (Array.isArray(child)) {
      nodes.push(...elementsToNodes(child));
      continue;
    }
    const element = child as { type?: unknown; props?: Record<string, unknown> } | null;
    if (!element || typeof element !== 'object' || typeof element.type !== 'string') continue;
    const props = element.props ?? {};
    const kids = elementsToNodes(props.children);
    const attrs = cleanAttrs(props);
    nodes.push(kids.length ? [element.type, attrs, kids] : [element.type, attrs]);
  }
  return nodes;
}

/** Calls the icon component once and reads the SVG description out of the element it returns. */
function extract(component: unknown): IconData | null {
  let element: { props?: Record<string, unknown> } | null = null;
  try {
    if (typeof component === 'function') {
      element = (component as (p: object) => typeof element)({});
    } else if (component && typeof (component as { render?: unknown }).render === 'function') {
      element = (component as { render: (p: object, r: null) => typeof element }).render({}, null);
    }
  } catch {
    return null;
  }
  const props = element?.props;
  if (!props) return null;

  // lucide: <Icon iconNode={[[tag, attrs], ...]} />
  if (Array.isArray(props.iconNode)) {
    const nodes = (props.iconNode as [string, Record<string, unknown>][]).map(
      ([tag, attrs]): IconNode => [tag, cleanAttrs(attrs)]
    );
    return { attrs: { ...LUCIDE_SVG_ATTRS }, nodes };
  }

  // react-icons: <IconBase attr={{ viewBox, ... }}>{children}</IconBase>
  if (props.attr && typeof props.attr === 'object') {
    const nodes = elementsToNodes(props.children);
    if (!nodes.length) return null;
    return {
      attrs: { ...REACT_ICONS_SVG_ATTRS, ...cleanAttrs(props.attr as Record<string, unknown>) },
      nodes,
    };
  }

  return null;
}

/** Resolves one icon name, or null if it is empty or unknown. Cached per process. */
export async function resolveIconData(name: string | undefined | null): Promise<IconData | null> {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name) ?? null;
  let data: IconData | null = null;
  try {
    const found = await findExport(name);
    data = found ? extract(found) : null;
  } catch {
    data = null;
  }
  cache.set(name, data);
  return data;
}

/** Resolves several names at once into a name -> data map (unknown names are omitted). */
export async function resolveIconMap(names: Iterable<string | undefined | null>): Promise<IconMap> {
  const unique = Array.from(new Set(Array.from(names).filter((n): n is string => !!n)));
  const entries = await Promise.all(
    unique.map(async (n) => [n, await resolveIconData(n)] as const)
  );
  const map: IconMap = {};
  for (const [name, data] of entries) if (data) map[name] = data;
  return map;
}
