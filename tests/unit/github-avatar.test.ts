import { describe, expect, it } from 'vitest';
import {
  githubAvatarUrl,
  githubUsername,
  githubUsernameFromGlobal,
  githubUsernameFromLinks,
} from '@/lib/github-avatar';

describe('github avatar', () => {
  it('finds the user name in profile links', () => {
    expect(githubUsername('https://github.com/octocat')).toBe('octocat');
    expect(githubUsername('http://github.com/octocat/')).toBe('octocat');
    expect(githubUsername('github.com/octocat')).toBe('octocat');
    expect(githubUsername('www.github.com/octo-cat?tab=repositories')).toBe('octo-cat');
    expect(githubUsername('https://github.com/octocat/hello-world')).toBe('octocat');
    expect(githubUsername('  @octocat ')).toBe('octocat');
  });

  it('ignores links that are not a GitHub profile', () => {
    for (const value of [
      '',
      '   ',
      null,
      undefined,
      42,
      'https://www.behance.net/someone',
      'https://gitlab.com/someone',
      'https://github.com.evil.example/octocat',
      'https://github.com/',
      'https://github.com/settings',
      'https://github.com/orgs/acme',
      'https://github.com/-bad-',
      'ftp://github.com/octocat',
      'javascript:alert(1)',
      'someone',
    ]) {
      expect(githubUsername(value), String(value)).toBeNull();
    }
  });

  it('builds a direct, non-redirecting picture address', () => {
    expect(githubAvatarUrl('octocat')).toBe('https://avatars.githubusercontent.com/octocat?s=460');
    expect(githubAvatarUrl('a b', 64)).toBe('https://avatars.githubusercontent.com/a%20b?s=64');
  });

  it('prefers the profile link, then social links', () => {
    expect(
      githubUsernameFromGlobal({
        githubProfileUrl: 'https://github.com/first',
        socials: [{ href: 'https://github.com/second' }],
      })
    ).toBe('first');
    expect(
      githubUsernameFromGlobal({
        githubProfileUrl: 'https://behance.net/x',
        socials: [{ href: 'mailto:a@b.c' }, { href: 'https://github.com/second' }],
      })
    ).toBe('second');
    expect(
      githubUsernameFromGlobal({ footerSocials: [{ href: 'https://github.com/third' }] })
    ).toBe('third');
    expect(githubUsernameFromGlobal(null)).toBeNull();
    expect(githubUsernameFromLinks('nope')).toBeNull();
  });
});
