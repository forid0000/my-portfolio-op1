/**
 * Navigation and "what is shown" settings for the shared page chrome (header, footer, hero
 * buttons, floating contact button). Pure data and functions with no server imports, so the
 * admin editor, the header and the unit tests all use the same rules.
 *
 * Stored as the `chrome_content` document in portfolio_cms.homepage. Anything missing falls back
 * to CHROME_DEFAULTS, which reproduces the layout the site always had, so a site that never
 * opens the editor looks exactly as before.
 */
import { isSafeHref } from '@/lib/safe-href';

export type NavPlacement = 'main' | 'utility';

interface NavBuiltin {
  id: string;
  label: string;
  href: string;
  /** Section (or route-level toggle) that must be on for the link to appear. null = always. */
  section: string | null;
  /** 'utility' links sit on the right of the header as an icon button. */
  placement: NavPlacement;
  enabled: boolean;
  icon?: 'newspaper' | 'wrench' | 'notebook';
}

/** Every built-in link, in default order. The label is only a default: owners can rename it. */
export const NAV_BUILTINS: NavBuiltin[] = [
  { id: 'home', label: 'Home', href: '/#', section: null, placement: 'main', enabled: true },
  {
    id: 'about',
    label: 'About',
    href: '/#about',
    section: 'about',
    placement: 'main',
    enabled: true,
  },
  {
    id: 'skills',
    label: 'Skills',
    href: '/#skills',
    section: 'skills',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'experience',
    label: 'Experience',
    href: '/#experience',
    section: 'experience',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'education',
    label: 'Education',
    href: '/#education',
    section: 'education',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'services',
    label: 'Services',
    href: '/#services',
    section: 'services',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/#projects',
    section: 'projects',
    placement: 'main',
    enabled: true,
  },
  {
    id: 'gallery',
    label: 'Gallery',
    href: '/#gallery',
    section: 'gallery',
    placement: 'main',
    enabled: true,
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    href: '/#testimonials',
    section: 'testimonials',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'contact',
    label: 'Contact',
    href: '/#contact',
    section: 'contact',
    placement: 'main',
    enabled: false,
  },
  {
    id: 'articles',
    label: 'Articles',
    href: '/articles',
    section: 'articles',
    placement: 'main',
    enabled: true,
    icon: 'newspaper',
  },
  {
    id: 'kits',
    label: 'Tools',
    href: '/kits',
    section: 'kits',
    placement: 'main',
    enabled: true,
    icon: 'wrench',
  },
  {
    id: 'notes',
    label: 'Notes',
    href: '/notes',
    section: null,
    placement: 'utility',
    enabled: true,
    icon: 'notebook',
  },
];

export interface NavEntry {
  id: string;
  label: string;
  enabled: boolean;
  /** Custom links only. */
  href?: string;
  newTab?: boolean;
}

export interface ChromeContent {
  /** Display order = array order. Built-in entries are matched by id, custom ones start with `custom-`. */
  nav: NavEntry[];
  /** The round "Let's Connect" button in the corner. */
  floatingContact: boolean;
  hero: {
    /** The "Download CV" button (it also needs an uploaded resume to appear). */
    resume: boolean;
    socials: boolean;
  };
  footer: {
    brand: boolean;
    explore: boolean;
    connect: boolean;
    copyright: boolean;
    location: boolean;
    adminLink: boolean;
  };
}

export const CHROME_DEFAULTS: ChromeContent = {
  nav: NAV_BUILTINS.map((b) => ({ id: b.id, label: b.label, enabled: b.enabled })),
  floatingContact: true,
  hero: { resume: true, socials: true },
  footer: {
    brand: true,
    explore: true,
    connect: true,
    copyright: true,
    location: true,
    adminLink: true,
  },
};

export const CUSTOM_NAV_PREFIX = 'custom-';
export const NAV_LABEL_MAX = 40;
export const NAV_MAX_ENTRIES = 30;

function cleanLabel(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim().slice(0, NAV_LABEL_MAX) : '';
  return text || fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Merge a stored document over the defaults. Unknown or unsafe data is dropped, never trusted. */
export function mergeChrome(stored: unknown): ChromeContent {
  const doc = (stored ?? {}) as Record<string, any>;
  const builtinById = new Map(NAV_BUILTINS.map((b) => [b.id, b]));

  const nav: NavEntry[] = [];
  const seen = new Set<string>();
  if (Array.isArray(doc.nav)) {
    for (const raw of doc.nav.slice(0, NAV_MAX_ENTRIES)) {
      if (!raw || typeof raw.id !== 'string' || seen.has(raw.id)) continue;
      const builtin = builtinById.get(raw.id);
      if (builtin) {
        nav.push({
          id: builtin.id,
          label: cleanLabel(raw.label, builtin.label),
          enabled: bool(raw.enabled, builtin.enabled),
        });
        seen.add(raw.id);
      } else if (raw.id.startsWith(CUSTOM_NAV_PREFIX) && isSafeHref(raw.href)) {
        nav.push({
          id: raw.id,
          label: cleanLabel(raw.label, 'Link'),
          enabled: bool(raw.enabled, true),
          href: String(raw.href).trim().slice(0, 500),
          newTab: bool(raw.newTab, false),
        });
        seen.add(raw.id);
      }
    }
  }
  // Links added to the product after the document was saved appear, in default order, at the end.
  for (const b of NAV_BUILTINS) {
    if (!seen.has(b.id)) nav.push({ id: b.id, label: b.label, enabled: b.enabled });
  }

  const pick = <T extends Record<string, boolean>>(defaults: T, value: unknown): T => {
    const source = (value ?? {}) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [key, bool(source[key], fallback)])
    ) as T;
  };

  return {
    nav,
    floatingContact: bool(doc.floatingContact, CHROME_DEFAULTS.floatingContact),
    hero: pick(CHROME_DEFAULTS.hero, doc.hero),
    footer: pick(CHROME_DEFAULTS.footer, doc.footer),
  };
}

/** A link ready to render: serializable, safe, and already filtered by section visibility. */
export interface ResolvedNavItem {
  id: string;
  label: string;
  href: string;
  placement: NavPlacement;
  newTab: boolean;
  icon?: 'newspaper' | 'wrench' | 'notebook';
  /** The element id a `/#hash` link scrolls to, used by the header's active-link highlight. */
  anchor?: string;
}

/**
 * The links to show right now: enabled in the editor AND (for section links) the section itself
 * is switched on, so hiding a section never leaves a dead link behind.
 */
export function resolveNav(
  chrome: ChromeContent,
  isSectionOn: (sectionId: string) => boolean
): ResolvedNavItem[] {
  const builtinById = new Map(NAV_BUILTINS.map((b) => [b.id, b]));
  const items: ResolvedNavItem[] = [];
  for (const entry of chrome.nav) {
    if (!entry.enabled) continue;
    const builtin = builtinById.get(entry.id);
    if (builtin) {
      if (builtin.section && !isSectionOn(builtin.section)) continue;
      items.push({
        id: builtin.id,
        label: entry.label,
        href: builtin.href,
        placement: builtin.placement,
        newTab: false,
        icon: builtin.icon,
        anchor:
          builtin.href.startsWith('/#') && builtin.href.length > 2
            ? builtin.href.slice(2)
            : undefined,
      });
    } else if (entry.href && isSafeHref(entry.href)) {
      items.push({
        id: entry.id,
        label: entry.label,
        href: entry.href,
        placement: 'main',
        newTab: !!entry.newTab,
      });
    }
  }
  return items;
}

/** The nav shown before anything has been loaded or configured (also the fail-safe). */
export const DEFAULT_NAV: ResolvedNavItem[] = resolveNav(CHROME_DEFAULTS, () => true);
