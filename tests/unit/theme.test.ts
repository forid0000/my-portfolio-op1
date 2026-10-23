import { describe, expect, it } from 'vitest';
import { THEME_DEFAULTS, sanitizeTheme, themeToCssVars } from '@/lib/theme';

describe('theme', () => {
  it('defaults to the clean style and the default admin colour', () => {
    expect(THEME_DEFAULTS.uiStyle).toBe('clean');
    expect(sanitizeTheme(null).adminAccentMode).toBe('default');
    expect(themeToCssVars(THEME_DEFAULTS)).not.toContain('admin-accent');
  });

  it('accepts only the known styles and modes', () => {
    expect(sanitizeTheme({ uiStyle: 'terminal' }).uiStyle).toBe('terminal');
    expect(sanitizeTheme({ uiStyle: 'matrix' as never }).uiStyle).toBe('clean');
    expect(sanitizeTheme({ adminAccentMode: 'hax' as never }).adminAccentMode).toBe('default');
  });

  it('cannot be used to inject CSS', () => {
    const evil = sanitizeTheme({
      primary: 'red;}body{display:none',
      adminAccent: '</style><script>',
      radius: '0;}a{color:red',
      adminAccentMode: 'custom',
    });
    const css = themeToCssVars(evil);
    expect(css).not.toContain('display:none');
    expect(css).not.toContain('<script>');
    expect(css).not.toContain('color:red');
  });

  it('re-tints the admin panel only when asked', () => {
    const site = themeToCssVars(sanitizeTheme({ primary: '#ff0055', adminAccentMode: 'site' }));
    expect(site).toMatch(/\.admin-accent\{--color-emerald-50:#[0-9a-f]{6};/);
    const custom = themeToCssVars(
      sanitizeTheme({ adminAccent: '#3366ff', adminAccentMode: 'custom' })
    );
    expect(custom).toContain('.admin-accent{');
  });
});
