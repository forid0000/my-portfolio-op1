/**
 * Deployment-level configuration, read from environment variables.
 *
 * Everything that identifies *where* the site is hosted (canonical origin,
 * SEO geo tags) lives here instead of being scattered through the code. Who the
 * site is *about* (name, bio, links) is CMS content - see lib/content-defaults.ts
 * and lib/identity.ts.
 *
 * Server-side only: `VERCEL_PROJECT_PRODUCTION_URL` is not exposed to the
 * browser, so client components must not import SITE_URL (use
 * `window.location.origin` there).
 */

const LOCAL_FALLBACK_ORIGIN = 'http://localhost:3000';

function toOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

/**
 * Canonical origin without a trailing slash. Resolution order:
 * NEXT_PUBLIC_SITE_URL -> Vercel's production domain -> http://localhost:3000.
 */
export const SITE_URL: string =
  toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
  toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  LOCAL_FALLBACK_ORIGIN;

/** Host part of SITE_URL, e.g. "example.com" (or "localhost:3000" in dev). */
export const SITE_HOST: string = new URL(SITE_URL).host;

/** Builds an absolute URL on the canonical origin. `path` may omit the leading slash. */
export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface GeoMeta {
  region?: string;
  placename?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Optional geo-targeting meta tags (geo.region, geo.placename, geo.position,
 * ICBM). Returns null unless at least one SEO_GEO_* variable is set, so a
 * default deployment never advertises a location.
 */
export function getGeoMeta(): GeoMeta | null {
  const region = process.env.SEO_GEO_REGION?.trim() || undefined;
  const placename = process.env.SEO_GEO_PLACENAME?.trim() || undefined;
  const lat = Number.parseFloat(process.env.SEO_GEO_LAT ?? '');
  const lon = Number.parseFloat(process.env.SEO_GEO_LON ?? '');
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  if (!region && !placename && !hasCoords) return null;
  return {
    region,
    placename,
    latitude: hasCoords ? lat : undefined,
    longitude: hasCoords ? lon : undefined,
  };
}
