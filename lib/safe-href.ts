/**
 * Links in editable content (project links, buttons) end up in `href` attributes, so only
 * a short allow-list of schemes is ever rendered: a stored `javascript:` link must not run.
 * Safe in server and client code.
 */

/** Only http(s), mailto, tel, in-page and site-relative links are allowed. */
export function isSafeHref(url: string | null | undefined): url is string {
  if (!url) return false;
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith('/') || value.startsWith('#')) return !value.startsWith('//');
  // A web address needs a host: a bare "https://" is not a link.
  if (/^https?:/i.test(value)) return /^https?:\/\/[^\s/?#]/i.test(value);
  return /^(mailto:|tel:)/i.test(value);
}

/** `behance.net/you`, `www.site.com`, `site.com:8080/x?a=1#top`: a domain without its scheme. */
const BARE_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?([/?#]\S*)?$/i;

/**
 * Turns whatever the owner typed into a link that is safe to render: bare domains such as
 * `behance.net/you` get `https://`, anything with a disallowed scheme becomes null.
 */
export function toHref(url: string | null | undefined): string | null {
  const value = (url ?? '').trim();
  if (!value) return null;
  if (isSafeHref(value)) return value;
  if (BARE_DOMAIN.test(value)) return `https://${value}`;
  return null;
}

/**
 * What to store for a link the owner typed: a bare domain gets `https://`, a complete link is
 * kept as typed, and anything else is returned trimmed so validation can say what is wrong.
 * An empty box stays empty.
 */
export function normalizeLink(url: string | null | undefined): string {
  const value = (url ?? '').trim();
  return toHref(value) ?? value;
}
