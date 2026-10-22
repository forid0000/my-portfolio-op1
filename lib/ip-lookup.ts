/**
 * Server-side IP geolocation with a fallback provider chain, mirroring the
 * client-side lookup in app/kits/system/page.tsx (ipapi.is -> ipwho.is) but
 * queried for an arbitrary IP from the server rather than "my own IP" from
 * the browser. Bounded by a short per-provider timeout so a slow/blocked
 * provider never stalls a caller (e.g. the contact form) for long.
 */
export interface IpLookupResult {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  timezone: string | null;
  isp: string | null;
  vpn: boolean | null;
  proxy: boolean | null;
  tor: boolean | null;
  failed: boolean;
}

function emptyResult(ip: string): IpLookupResult {
  return {
    ip,
    city: null,
    region: null,
    country: null,
    countryCode: null,
    timezone: null,
    isp: null,
    vpn: null,
    proxy: null,
    tor: null,
    failed: true,
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDER_TIMEOUT_MS = 2500;

export async function lookupIp(ip: string): Promise<IpLookupResult> {
  if (
    !ip ||
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.')
  ) {
    return emptyResult(ip);
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.ipapi.is/?q=${encodeURIComponent(ip)}`,
      PROVIDER_TIMEOUT_MS
    );
    const data = await res.json();
    if (data?.ip) {
      return {
        ip: data.ip,
        city: data.location?.city ?? null,
        region: data.location?.state ?? null,
        country: data.location?.country ?? null,
        countryCode: data.location?.country_code ?? null,
        timezone: data.location?.timezone ?? null,
        isp: data.company?.name ?? data.asn?.org ?? null,
        vpn: data.is_vpn ?? false,
        proxy: data.is_proxy ?? false,
        tor: data.is_tor ?? false,
        failed: false,
      };
    }
  } catch {
    // fall through to backup provider
  }

  try {
    const res = await fetchWithTimeout(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
      PROVIDER_TIMEOUT_MS
    );
    const data = await res.json();
    if (data?.success !== false) {
      return {
        ip: data.ip ?? ip,
        city: data.city ?? null,
        region: data.region ?? null,
        country: data.country ?? null,
        countryCode: data.country_code ?? null,
        timezone: data.timezone?.id ?? null,
        isp: data.connection?.isp ?? null,
        // Security flags aren't available on this free-tier fallback.
        vpn: null,
        proxy: null,
        tor: null,
        failed: false,
      };
    }
  } catch {
    // both providers failed
  }

  return emptyResult(ip);
}
