/**
 * GitHub profile picture as the last-resort avatar. The owner only has to keep a GitHub profile
 * link somewhere in their settings; the picture itself is GitHub's public avatar for that user.
 * Pure functions (no imports) so server code, the admin UI and unit tests can share them.
 */

/** GitHub user and organisation names: 1-39 letters, digits or single hyphens, no edge hyphens. */
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** First path segments on github.com that are pages, not people. */
const RESERVED = new Set([
  'about',
  'apps',
  'collections',
  'contact',
  'customer-stories',
  'enterprise',
  'events',
  'explore',
  'features',
  'issues',
  'login',
  'logout',
  'marketplace',
  'new',
  'notifications',
  'orgs',
  'organizations',
  'join',
  'pricing',
  'pulls',
  'search',
  'security',
  'settings',
  'signup',
  'site',
  'sponsors',
  'topics',
  'trending',
]);

/**
 * The GitHub username inside a profile link such as `https://github.com/octocat`,
 * `github.com/octocat/` or `www.github.com/octocat?tab=repositories`. A bare `@octocat` also
 * counts. Returns null for anything else (Behance, Dribbble, a personal site, an empty value),
 * so callers can chain `githubUsername(a) ?? githubUsername(b)`.
 */
export function githubUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;

  if (value.startsWith('@')) {
    const handle = value.slice(1);
    return USERNAME_RE.test(handle) ? handle : null;
  }

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') return null;

  const first = url.pathname.split('/').filter(Boolean)[0];
  if (!first || !USERNAME_RE.test(first) || RESERVED.has(first.toLowerCase())) return null;
  return first;
}

/** The first GitHub username found in a list of links (`{ href }` items such as social links). */
export function githubUsernameFromLinks(links: unknown): string | null {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    const name = githubUsername((link as { href?: unknown } | null)?.href);
    if (name) return name;
  }
  return null;
}

/**
 * Direct (non-redirecting) avatar URL. `avatars.githubusercontent.com/<name>` answers with the
 * image itself, which next/image and Open Graph crawlers can use as is.
 */
export function githubAvatarUrl(username: string, size = 460): string {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(username)}?s=${size}`;
}

/**
 * Which GitHub user to borrow a picture from, given the stored global settings document:
 * the dedicated profile link first, then the first GitHub link among the social links.
 */
export function githubUsernameFromGlobal(global: unknown): string | null {
  const g = (global ?? {}) as {
    githubProfileUrl?: unknown;
    socials?: unknown;
    footerSocials?: unknown;
  };
  return (
    githubUsername(g.githubProfileUrl) ??
    githubUsernameFromLinks(g.socials) ??
    githubUsernameFromLinks(g.footerSocials)
  );
}
