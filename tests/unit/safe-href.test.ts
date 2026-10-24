import { describe, expect, it } from 'vitest';
import { isSafeHref, normalizeLink, toHref } from '@/lib/safe-href';

describe('safe-href', () => {
  it('allows the schemes a portfolio link needs', () => {
    for (const ok of [
      'https://example.com',
      'http://example.com/a?b=1',
      'mailto:a@b.co',
      'tel:+123',
      '/contact',
      '#about',
    ]) {
      expect(isSafeHref(ok), ok).toBe(true);
    }
  });

  it('blocks script and protocol-relative links', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>',
      '//evil.com',
      'vbscript:x',
      '',
      '   ',
    ]) {
      expect(isSafeHref(bad), bad).toBe(false);
    }
  });

  it('adds https:// to a bare domain and rejects everything unsafe', () => {
    expect(toHref('behance.net/someone')).toBe('https://behance.net/someone');
    expect(toHref(' https://example.com ')).toBe('https://example.com');
    expect(toHref('javascript:alert(1)')).toBeNull();
    expect(toHref('not a link')).toBeNull();
    expect(toHref(undefined)).toBeNull();
  });

  it('does not accept a web address without a host', () => {
    for (const bad of ['https://', 'http://', 'https:// ', 'https:///path', 'https://?x=1']) {
      expect(isSafeHref(bad), bad).toBe(false);
    }
  });

  it('completes the domains people actually type', () => {
    expect(toHref('www.example.com')).toBe('https://www.example.com');
    expect(toHref('example.com?ref=cv')).toBe('https://example.com?ref=cv');
    expect(toHref('example.com#work')).toBe('https://example.com#work');
    expect(toHref('example.com:8080/app')).toBe('https://example.com:8080/app');
    expect(toHref('youtu.be/abc123')).toBe('https://youtu.be/abc123');
    expect(toHref('wa.me/15551234567')).toBe('https://wa.me/15551234567');
  });

  it('normalizeLink completes a bare domain and leaves everything else as typed', () => {
    expect(normalizeLink('  behance.net/you ')).toBe('https://behance.net/you');
    expect(normalizeLink('https://example.com')).toBe('https://example.com');
    expect(normalizeLink('mailto:me@example.com')).toBe('mailto:me@example.com');
    expect(normalizeLink('/about')).toBe('/about');
    expect(normalizeLink('')).toBe('');
    expect(normalizeLink(undefined)).toBe('');
    // not a link: kept (trimmed) so validation can name the problem
    expect(normalizeLink(' javascript:alert(1) ')).toBe('javascript:alert(1)');
    expect(isSafeHref(normalizeLink('javascript:alert(1)'))).toBe(false);
    expect(normalizeLink('not a link')).toBe('not a link');
  });
});
