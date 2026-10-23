import { describe, expect, it } from 'vitest';
import { hexToRgb, shadesFromHex } from '@/lib/color';

describe('color', () => {
  it('parses 3, 6 and 8 digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#34d399')).toEqual([52, 211, 153]);
    expect(hexToRgb('#34d39980')).toEqual([52, 211, 153]);
    expect(hexToRgb('red')).toBeNull();
  });

  it('builds an 11-step ramp that gets darker, whatever colour goes in', () => {
    for (const hex of ['#34d399', '#ff0055', '#1e3a8a', '#fde047', '#777777']) {
      const shades = shadesFromHex(hex);
      expect(Object.keys(shades)).toHaveLength(11);
      const light = Object.values(shades).map((h) => {
        const [r, g, b] = hexToRgb(h) as [number, number, number];
        return (r + g + b) / 3;
      });
      for (let i = 1; i < light.length; i++) expect(light[i]).toBeLessThan(light[i - 1]);
      for (const h of Object.values(shades)) expect(h).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps a grey input neutral', () => {
    const [r, g, b] = hexToRgb(shadesFromHex('#808080')['500']) as [number, number, number];
    expect(Math.abs(r - g)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - b)).toBeLessThanOrEqual(2);
  });

  it('falls back to the default green for invalid input', () => {
    expect(shadesFromHex('nope')['500']).toBe(shadesFromHex('#34d399')['500']);
  });
});
