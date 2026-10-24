import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LINK_ICON,
  ICON_NAME_RE,
  LINK_ICON_CHOICES,
  autoLinkIcon,
  cleanIconName,
  linkIconName,
  linkIconNames,
} from '@/lib/link-icon';
import {
  PUBLICATION_TYPE_META,
  PUBLICATION_TYPE_OPTIONS,
  publicationIconName,
} from '@/lib/publication-types';
import { projectsContentSchema } from '@/lib/validation/content-schemas';
import { certificationItemSchema, publicationItemSchema } from '@/lib/validation/section-schemas';

describe('the icon in front of a link', () => {
  it('knows the address before the words', () => {
    expect(autoLinkIcon('Anything', 'https://github.com/you/repo')).toBe('Github');
    expect(autoLinkIcon('Anything', 'https://gitlab.com/you/repo')).toBe('Gitlab');
    expect(autoLinkIcon('Watch', 'https://www.youtube.com/watch?v=1')).toBe('Youtube');
    expect(autoLinkIcon('Profile', 'https://www.linkedin.com/in/you')).toBe('Linkedin');
    expect(autoLinkIcon('Work', 'behance.net/you')).toBe('SiBehance');
    expect(autoLinkIcon('Paper', 'https://doi.org/10.1000/182')).toBe('FileText');
    expect(autoLinkIcon('Abstract', 'https://pubmed.ncbi.nlm.nih.gov/123/')).toBe('FileText');
    expect(autoLinkIcon('Chat', 'https://wa.me/15551234567')).toBe('MessageCircle');
    expect(autoLinkIcon('Appointments', 'https://calendly.com/you')).toBe('CalendarDays');
  });

  it('is not fooled by a host that merely contains a known name', () => {
    expect(autoLinkIcon('Site', 'https://notgithub.com/x')).toBe('Globe');
    expect(autoLinkIcon('Mine', 'https://github.com.evil.example/x')).toBe(DEFAULT_LINK_ICON);
  });

  it('works for people who are not developers', () => {
    // a doctor, a plumber, a photographer, a lawyer, a restaurant, a teacher
    expect(autoLinkIcon('Research paper', 'https://example.org/p.pdf')).toBe('FileText');
    expect(autoLinkIcon('Read the study', '')).toBe('FileText');
    expect(autoLinkIcon('Book now', 'https://example.com/book')).toBe('CalendarDays');
    expect(autoLinkIcon('Book an appointment', '')).toBe('CalendarDays');
    expect(autoLinkIcon('Price list', 'https://example.com/prices.pdf')).toBe('Download');
    expect(autoLinkIcon('Gallery', 'https://example.com/g')).toBe('Images');
    expect(autoLinkIcon('Before and after', '')).toBe('Images');
    expect(autoLinkIcon('Client reviews', '')).toBe('Star');
    expect(autoLinkIcon('Bar licence', '')).toBe('BadgeCheck');
    expect(autoLinkIcon('Order online', '')).toBe('ShoppingBag');
    expect(autoLinkIcon('Find us', '')).toBe('MapPin');
    expect(autoLinkIcon('Course notes', '')).toBe('GraduationCap');
    expect(autoLinkIcon('Live demo', '')).toBe('CirclePlay');
    expect(autoLinkIcon('Live site', 'https://example.com')).toBe('Globe');
    expect(autoLinkIcon('Source code', 'https://example.com/code')).toBe('Code');
    expect(autoLinkIcon('Interview on the radio', '')).toBe('Newspaper');
  });

  it('keeps the old behaviour for a label that says GitHub', () => {
    expect(autoLinkIcon('Github', 'https://example.com')).toBe('Github');
    expect(autoLinkIcon('Cithub', 'https://example.com/x')).toBe(DEFAULT_LINK_ICON);
  });

  it('falls back to a plain link arrow, also for empty and non-Latin labels', () => {
    expect(autoLinkIcon('', '')).toBe(DEFAULT_LINK_ICON);
    expect(autoLinkIcon(undefined, undefined)).toBe(DEFAULT_LINK_ICON);
    expect(autoLinkIcon('আমার কাজ', 'https://example.com')).toBe(DEFAULT_LINK_ICON);
    expect(autoLinkIcon('Applet', 'https://example.com/x')).toBe(DEFAULT_LINK_ICON);
  });

  it('uses the owner’s own pick when there is one, and ignores anything that is not an icon name', () => {
    expect(linkIconName({ label: 'Code', url: 'https://github.com/x', icon: 'Stethoscope' })).toBe(
      'Stethoscope'
    );
    expect(linkIconName({ label: 'Code', url: 'https://github.com/x', icon: '' })).toBe('Github');
    expect(linkIconName({ label: 'Code', url: 'https://github.com/x' })).toBe('Github');
    for (const bad of ['<script>', 'a b', '1abc', 'x'.repeat(60), '"; drop']) {
      expect(cleanIconName(bad)).toBe('');
      expect(linkIconName({ label: 'Video', icon: bad })).toBe('CirclePlay');
    }
    expect(cleanIconName(' FaAws ')).toBe('FaAws');
  });

  it('lists each name once', () => {
    expect(
      linkIconNames([
        { label: 'Code', url: 'https://github.com/a' },
        { label: 'Repo', url: 'https://github.com/b' },
        { label: 'Video' },
        { label: 'x', icon: 'Heart' },
      ])
    ).toEqual(['Github', 'CirclePlay', 'Heart']);
  });

  it('offers a pick-list of valid, distinct names for every kind of work', () => {
    const names = LINK_ICON_CHOICES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(ICON_NAME_RE);
    for (const wanted of ['FileText', 'CalendarDays', 'Stethoscope', 'ShoppingBag', 'Github']) {
      expect(names).toContain(wanted);
    }
    // every automatic guess can also be picked by hand
    for (const guess of ['Globe', 'FileText', 'CirclePlay', 'Download', 'Images', 'BadgeCheck']) {
      expect(names).toContain(guess);
    }
  });
});

describe('icons saved with the content', () => {
  const project = { title: 'P', description: '', tags: [], featured: false };

  it('keeps a link icon, makes it empty when it is not a name, and accepts older links without one', () => {
    const parse = (links: unknown) => {
      const r = projectsContentSchema.safeParse({ projects: [{ ...project, links }] });
      expect(r.success).toBe(true);
      return r.success ? r.data.projects[0].links : null;
    };
    expect(
      parse([{ label: 'Paper', url: 'https://example.org/p', icon: 'FileText' }])?.[0].icon
    ).toBe('FileText');
    expect(parse([{ label: 'Paper', url: 'https://example.org/p', icon: '<b>' }])?.[0].icon).toBe(
      ''
    );
    expect(parse([{ label: 'Paper', url: 'https://example.org/p' }])?.[0].icon).toBe('');
  });

  it('gives a certificate an optional button text and icon', () => {
    const base = { name: 'Licence', issuer: 'Board' };
    const plain = certificationItemSchema.parse(base);
    expect(plain.credentialLabel).toBe('');
    expect(plain.credentialIcon).toBe('');
    const custom = certificationItemSchema.parse({
      ...base,
      credentialLabel: '  Check the register ',
      credentialIcon: 'BadgeCheck',
    });
    expect(custom.credentialLabel).toBe('Check the register');
    expect(custom.credentialIcon).toBe('BadgeCheck');
    expect(
      certificationItemSchema.safeParse({ ...base, credentialLabel: 'x'.repeat(41) }).success
    ).toBe(false);
  });

  it('knows more kinds of publication and still accepts the old ones', () => {
    for (const type of ['article', 'talk', 'video', 'opensource', 'press', 'podcast']) {
      expect(publicationItemSchema.safeParse({ title: 'T', type }).success).toBe(true);
    }
    for (const type of ['paper', 'book', 'course', 'other']) {
      expect(publicationItemSchema.safeParse({ title: 'T', type }).success).toBe(true);
    }
    expect(publicationItemSchema.safeParse({ title: 'T', type: 'nonsense' }).success).toBe(false);
    expect(publicationItemSchema.parse({ title: 'T', icon: 'Heart' }).icon).toBe('Heart');
    expect(publicationItemSchema.parse({ title: 'T', icon: '"><x' }).icon).toBe('');
    expect(publicationItemSchema.parse({ title: 'T' }).icon).toBe('');
  });

  it('draws a publication with its own icon, else the one of its type', () => {
    for (const type of PUBLICATION_TYPE_OPTIONS) {
      expect(PUBLICATION_TYPE_META[type].label.length).toBeGreaterThan(2);
      expect(publicationIconName(type)).toBe(PUBLICATION_TYPE_META[type].icon);
    }
    expect(publicationIconName('paper', 'Microscope')).toBe('Microscope');
    expect(publicationIconName(undefined)).toBe('Newspaper');
    expect(publicationIconName('weird')).toBe('Newspaper');
  });
});
