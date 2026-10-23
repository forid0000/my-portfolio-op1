import { describe, expect, it } from 'vitest';
import { graphemes, hasComplexScript } from '@/lib/text-script';

describe('text-script', () => {
  it('flags scripts that must not be letter-spaced', () => {
    expect(hasComplexScript('আমার নাম')).toBe(true); // Bangla
    expect(hasComplexScript('مرحبا')).toBe(true); // Arabic
    expect(hasComplexScript('नमस्ते')).toBe(true); // Hindi
    expect(hasComplexScript('Your Name')).toBe(false);
    expect(hasComplexScript('日本語')).toBe(false); // CJK is fine with spacing
    expect(hasComplexScript('')).toBe(false);
    expect(hasComplexScript(undefined)).toBe(false);
  });

  it('never splits a Bangla or Hindi syllable or an emoji sequence apart', () => {
    // "ক্ষ" is one user-perceived character made of several code points.
    expect(graphemes('ক্ষ')).toHaveLength(1);
    expect(graphemes('नमस्ते')).toEqual(['न', 'म', 'स्ते']);
    expect(graphemes('👨‍👩‍👧')).toHaveLength(1);
    expect(graphemes('abc')).toEqual(['a', 'b', 'c']);
    expect(graphemes(graphemes('বাংলা ভাষা').join(''))).toEqual(graphemes('বাংলা ভাষা'));
  });
});
