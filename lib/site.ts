/**
 * Site-wide global content (brand identity, footer, socials, location/timezone).
 *
 * Stored as the `global_content` document in portfolio_cms.homepage and edited
 * from Admin -> Global Settings. GLOBAL_DEFAULTS is the single source of default
 * truth (placeholder values from lib/content-defaults.ts), shared by the homepage,
 * the Header (on every page), and the API route.
 */
import { sharedState } from '@/lib/shared-state';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import { isSectionEnabled, type PortfolioSectionConfig } from '@/lib/sections-registry';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';

export interface SocialLink {
  href: string;
  label: string;
  icon: string;
}

export interface GlobalContent {
  brandName: string;
  footerText: string;
  copyrightName: string;
  avatarUrl: string;
  headerName: string;
  headerTag: string;
  githubProfileUrl: string;
  locationLabel: string;
  timeZone: string;
  socials: SocialLink[];
  footerSocials: SocialLink[];
}

export const GLOBAL_DEFAULTS: GlobalContent = GLOBAL_CONTENT_DEFAULTS;

// Short in-process cache so the Header (rendered on every page) doesn't hit
// MongoDB on every request. Admin saves invalidate it.
const store = sharedState<{
  cache: { value: GlobalContent; at: number } | null;
  fetchPromise: Promise<GlobalContent> | null;
}>('global', () => ({
  cache: null,
  fetchPromise: null,
}));

export function invalidateGlobalCache() {
  store.cache = null;
}

/** Merge a stored doc over the defaults (so new fields always have a value). */
export function mergeGlobal(doc: any): GlobalContent {
  if (!doc) return GLOBAL_DEFAULTS;

  const { _id, type, updatedAt, ...rest } = doc;

  return {
    ...GLOBAL_DEFAULTS,
    ...rest,
    avatarUrl: '/api/avatar',
    socials: rest.socials?.length ? rest.socials : GLOBAL_DEFAULTS.socials,
    footerSocials: rest.footerSocials?.length ? rest.footerSocials : GLOBAL_DEFAULTS.footerSocials,
  };
}

/** Server-side, TTL-cached read of the global content for Header-bearing pages. */
export async function getGlobalContent(): Promise<GlobalContent> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.value;
  if (store.fetchPromise) return store.fetchPromise;

  store.fetchPromise = (async () => {
    let value = GLOBAL_DEFAULTS;
    let ok = false;
    try {
      const db = await connectToDatabase();
      const doc = await db.connection.client
        .db('portfolio_cms')
        .collection('homepage')
        .findOne({ type: 'global_content' });
      value = mergeGlobal(doc as Partial<GlobalContent> | null);
      ok = true;
    } catch {
      value = GLOBAL_DEFAULTS;
    } finally {
      // A failed read falls back to the defaults for this request only; it must not be remembered.
      if (ok) store.cache = { value, at: Date.now() };
      store.fetchPromise = null;
    }
    return value;
  })();

  return store.fetchPromise;
}

/** Brand subset the Header needs (serializable props for the client component). */
export type HeaderBrand = Pick<
  GlobalContent,
  'avatarUrl' | 'headerName' | 'headerTag' | 'locationLabel' | 'timeZone'
>;

/**
 * `avatarUrl` should be the resolved active avatar (getActiveAvatarUrl()): the constant
 * '/api/avatar' stored in GlobalContent is a redirect, which next/image cannot render.
 */
export function toHeaderBrand(g: GlobalContent, avatarUrl?: string): HeaderBrand {
  return {
    avatarUrl: avatarUrl ?? g.avatarUrl,
    headerName: g.headerName,
    headerTag: g.headerTag,
    locationLabel: g.locationLabel,
    timeZone: g.timeZone,
  };
}

/** Nav-relevant toggle subset the Header needs, to hide links for sections that are off. */
export interface NavToggles {
  about: boolean;
  skills: boolean;
  projects: boolean;
  gallery: boolean;
  kits: boolean;
}

export function toNavToggles(sections: PortfolioSectionConfig[]): NavToggles {
  return {
    about: isSectionEnabled(sections, 'about'),
    skills: isSectionEnabled(sections, 'skills'),
    projects: isSectionEnabled(sections, 'projects'),
    gallery: isSectionEnabled(sections, 'gallery'),
    kits: isSectionEnabled(sections, 'kits'),
  };
}

/**
 * Social link icon is any lucide-react name plus a handful of hand-drawn
 * brand marks lucide doesn't cover (DevToIcon, MediumIcon, FacebookIcon,
 * DiscordIcon) - see lib/social-icon.tsx, which resolves it with a Mail
 * fallback so an unrecognized name degrades gracefully instead of needing a
 * schema change.
 */
const socialLinkSchema = z.object({
  href: z.string(),
  label: z.string(),
  icon: z.string(),
});

/**
 * Validation schema for POST /api/admin/content/global, mirroring GlobalContent
 * exactly. `avatarUrl` is intentionally excluded - it's a computed constant
 * always overwritten by mergeGlobal(), so zod silently strips it if a client
 * sends it (default "strip" mode, no `.strict()`).
 */
export const globalContentSchema = z.object({
  brandName: z.string(),
  footerText: z.string(),
  copyrightName: z.string(),
  headerName: z.string(),
  headerTag: z.string(),
  githubProfileUrl: z.string(),
  locationLabel: z.string(),
  timeZone: z.string(),
  socials: z.array(socialLinkSchema),
  footerSocials: z.array(socialLinkSchema),
});
