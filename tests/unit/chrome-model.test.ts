import { describe, expect, it } from 'vitest';
import {
  CHROME_DEFAULTS,
  DEFAULT_NAV,
  NAV_BUILTINS,
  mergeChrome,
  resolveNav,
} from '@/lib/chrome-model';
import { chromeContentSchema } from '@/lib/validation/chrome-schema';

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('navigation settings', () => {
  it('reproduces the original menu when nothing is stored', () => {
    expect(mergeChrome(null)).toEqual(CHROME_DEFAULTS);
    expect(ids(DEFAULT_NAV)).toEqual([
      'home',
      'about',
      'projects',
      'gallery',
      'articles',
      'kits',
      'notes',
    ]);
    expect(DEFAULT_NAV.find((n) => n.id === 'notes')?.placement).toBe('utility');
    expect(DEFAULT_NAV.find((n) => n.id === 'about')?.anchor).toBe('about');
  });

  it('lets a link be renamed, hidden and reordered', () => {
    const chrome = mergeChrome({
      nav: [
        { id: 'projects', label: 'My Work', enabled: true },
        { id: 'home', label: 'Home', enabled: false },
      ],
    });
    expect(ids(chrome.nav).slice(0, 2)).toEqual(['projects', 'home']);
    const shown = resolveNav(chrome, () => true);
    expect(shown[0]).toMatchObject({ id: 'projects', label: 'My Work' });
    expect(ids(shown)).not.toContain('home');
  });

  it('appends links added to the product later and drops unknown ones', () => {
    const chrome = mergeChrome({
      nav: [
        { id: 'about', label: 'About', enabled: true },
        { id: 'ghost', label: 'x', enabled: true },
      ],
    });
    expect(ids(chrome.nav)).not.toContain('ghost');
    expect(ids(chrome.nav).sort()).toEqual(NAV_BUILTINS.map((b) => b.id).sort());
  });

  it('never shows a link to a hidden section', () => {
    const chrome = mergeChrome(null);
    const shown = resolveNav(chrome, (section) => section !== 'gallery' && section !== 'articles');
    expect(ids(shown)).not.toContain('gallery');
    expect(ids(shown)).not.toContain('articles');
    expect(ids(shown)).toContain('notes');
  });

  it('keeps custom links only when their address is safe', () => {
    const chrome = mergeChrome({
      nav: [
        {
          id: 'custom-a',
          label: 'Shop',
          href: 'https://example.com/shop',
          enabled: true,
          newTab: true,
        },
        { id: 'custom-b', label: 'Evil', href: 'javascript:alert(1)', enabled: true },
        { id: 'custom-c', label: 'Local', href: '/about-me', enabled: true },
      ],
    });
    const shown = resolveNav(chrome, () => true);
    expect(ids(shown)).toContain('custom-a');
    expect(ids(shown)).toContain('custom-c');
    expect(ids(shown)).not.toContain('custom-b');
    expect(shown.find((n) => n.id === 'custom-a')?.newTab).toBe(true);
  });

  it('treats non-boolean flags as the defaults', () => {
    const chrome = mergeChrome({
      floatingContact: 'no',
      hero: { resume: 0 },
      footer: { adminLink: false },
    });
    expect(chrome.floatingContact).toBe(true);
    expect(chrome.hero.resume).toBe(true);
    expect(chrome.footer.adminLink).toBe(false);
  });

  it('validates what the admin saves, naming the wrong field', () => {
    const ok = chromeContentSchema.safeParse(CHROME_DEFAULTS);
    expect(ok.success).toBe(true);
    const bad = chromeContentSchema.safeParse({
      ...CHROME_DEFAULTS,
      nav: [
        ...CHROME_DEFAULTS.nav,
        { id: 'custom-x', label: 'Bad', href: 'javascript:alert(1)', enabled: true },
      ],
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const issue = bad.error.issues.find((i) => i.path.at(-1) === 'href');
      expect(issue?.path[0]).toBe('nav');
    }
    expect(
      chromeContentSchema.safeParse({
        ...CHROME_DEFAULTS,
        nav: [{ id: 'about', label: '  ', enabled: true }],
      }).success
    ).toBe(false);
  });
});
