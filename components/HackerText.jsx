'use client';

import React, { useState, useEffect } from 'react';
import { getSecureRandom } from '@/lib/crypto-utils';
import { graphemes } from '@/lib/text-script';

const LETTERS = "!@#$%^&*()-=_+[]{}|;:'<>,.?/~";

/** Decodes the text from random symbols in ~1 s, then stops. Instant for reduced-motion users. */
const HackerText = ({ text, className }) => {
  // Start with the real text so the server HTML (and search engines) contain it.
  const [displayedText, setDisplayedText] = useState(text);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedText(text);
      return;
    }

    // Split by user-perceived character so Bengali/Devanagari clusters and emoji stay whole.
    const chars = graphemes(text);
    let iteration = 0;
    const steps = 30; // number of frames
    const intervalTime = 33; // ms per frame (~30 fps)

    const interval = setInterval(() => {
      setDisplayedText(
        chars
          .map((char, index) => {
            if (index < Math.floor(iteration)) return char;
            return LETTERS[Math.floor(getSecureRandom() * LETTERS.length)];
          })
          .join('')
      );

      iteration += chars.length / steps;

      if (iteration >= chars.length) {
        clearInterval(interval);
        setDisplayedText(text); // always end on the exact text
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text]);

  return <p className={className}>{displayedText}</p>;
};

export default HackerText;
