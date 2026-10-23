import { describe, expect, it } from 'vitest';
import { isSafeHref, toHref } from '@/lib/safe-href';

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
});
