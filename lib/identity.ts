/**
 * Who the site is about, derived from CMS content, for SEO surfaces (metadata,
 * JSON-LD, llms.txt, per-page authorship).
 *
 * Nothing here is hardcoded: the brand and social links come from the
 * `global_content` document, the person's name and tagline from `hero_content`,
 * and every field falls back to the neutral placeholders in
 * lib/content-defaults.ts if the database is empty or unreachable.
 */
import { sharedState } from '@/lib/shared-state';
import connectToDatabase from '@/lib/db';
import { getGlobalContent } from '@/lib/site';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';
import { HERO_DEFAULTS } from '@/lib/content-defaults';
import { SITE_URL } from '@/lib/site-config';

export interface SiteIdentity {
  /** Short brand shown in <title> suffixes and as the WebSite name. */
  siteName: string;
  /** Full name of the person the site is about (hero first + last name). */
  personName: string;
  /** Job title taken from the hero tagline (text before any "||" decoration). */
  jobTitle: string;
  /** Human readable location, e.g. "Berlin, DE". */
  locationLabel: string;
  /** Absolute http(s) profile URLs, used for schema.org `sameAs`. */
  sameAs: string[];
}

const store = sharedState<{ cache: { value: SiteIdentity; at: number } | null }>(
  'identity',
  () => ({ cache: null })
);
let inflight: Promise<SiteIdentity> | null = null;

export function invalidateIdentityCache() {
  store.cache = null;
}

function cleanTitle(subtitle: string): string {
  return (
    subtitle
      .split('||')[0]
      .replace(/[-\s]+$/g, '')
      .trim() || 'Full-Stack Developer'
  );
}

async function loadIdentity(): Promise<SiteIdentity> {
  const global = await getGlobalContent();

  let first: string = HERO_DEFAULTS.firstName;
  let last: string = HERO_DEFAULTS.lastName;
  let subtitle: string = HERO_DEFAULTS.subtitle;

  try {
    const db = await connectToDatabase();
    const hero = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'hero_content' });
    if (hero) {
      first = hero.firstName || first;
      last = hero.lastName || last;
      subtitle = hero.subtitle || subtitle;
    }
  } catch {
    // Database unavailable - the placeholders above are used.
  }

  const sameAs = Array.from(
    new Set(
      [...global.socials, ...global.footerSocials]
        .map((s) => s.href)
        .filter((href) => /^https?:\/\//i.test(href))
    )
  );
  if (!sameAs.includes(SITE_URL)) sameAs.push(SITE_URL);

  return {
    siteName: global.brandName,
    personName: `${first} ${last}`.replace(/\s+/g, ' ').trim(),
    jobTitle: cleanTitle(subtitle),
    locationLabel: global.locationLabel,
    sameAs,
  };
}

/** TTL-cached identity lookup. Never throws. */
export async function getSiteIdentity(): Promise<SiteIdentity> {
  if (store.cache && Date.now() - store.cache.at < CACHE_TTL_MS) return store.cache.value;
  if (inflight) return inflight;

  inflight = loadIdentity()
    .then((value) => {
      store.cache = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
