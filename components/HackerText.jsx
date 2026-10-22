'use client';

import React, { useState, useEffect } from 'react';
import { getSecureRandom } from '@/lib/crypto-utils';

const LETTERS = "!@#$%^&*()-=_+[]{}|;:'<>,.?/~";

/** Decodes the text from random symbols in ~1 s, then stops. Instant for reduced-motion users. */
const HackerText = ({ text, className }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedText(text);
      return;
    }

    let iteration = 0;
    const steps = 30; // number of frames
    const intervalTime = 33; // ms per frame (~30 fps)

    const interval = setInterval(() => {
      setDisplayedText(
        text
          .split('')
          .map((char, index) => {
            if (index < Math.floor(iteration)) return char;
            return LETTERS[Math.floor(getSecureRandom() * LETTERS.length)];
          })
          .join('')
      );

      iteration += text.length / steps;

      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayedText(text); // always end on the exact text
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text]);

  return <p className={className}>{displayedText}</p>;
};

export default HackerText;
