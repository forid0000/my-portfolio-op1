/**
 * Small, runtime-agnostic helpers for text in any language (Bangla, Arabic, Hindi, CJK, emoji...).
 */

// Scripts whose letters join or stack (Hebrew, Arabic, Syriac, Thaana, the Indic scripts,
// Thai, Lao, Tibetan, Myanmar, Khmer, Arabic presentation forms). Letter-spacing and
// per-character effects visibly break them.
const COMPLEX_SCRIPT = /[֐-ࣿऀ-෿฀-࿿က-႟ក-៿יִ-﷿ﹰ-﻿]/;

/** True when the text contains letters that must not be letter-spaced or split apart. */
export function hasComplexScript(text: string | null | undefined): boolean {
  return !!text && COMPLEX_SCRIPT.test(text);
}

/**
 * Splits text into user-perceived characters, so an effect never cuts a Bengali conjunct,
 * a Devanagari syllable or an emoji in half. Falls back to code points where
 * Intl.Segmenter is unavailable.
 */
export function graphemes(text: string): string[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        l?: string,
        o?: object
      ) => {
        segment(input: string): Iterable<{ segment: string }>;
      };
    }
  ).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      (s) => s.segment
    );
  }
  return Array.from(text);
}
