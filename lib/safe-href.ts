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
  return /^(https?:|mailto:|tel:)/i.test(value);
}

/**
 * Turns whatever the owner typed into a link that is safe to render: bare domains such as
 * `behance.net/you` get `https://`, anything with a disallowed scheme becomes null.
 */
export function toHref(url: string | null | undefined): string | null {
  const value = (url ?? '').trim();
  if (!value) return null;
  if (isSafeHref(value)) return value;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return null;
}
