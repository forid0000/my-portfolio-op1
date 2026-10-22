'use client';
import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

const PHRASES = [
  'checking environment...',
  'analyzing repository...',
  'hunking data...',
  'punking algorithms...',
  'compiling assets...',
  'PEACE BE UPON YOU ___ !',
];

export default function AiTypingText({
  finalGreeting = 'PEACE BE UPON YOU ___ !',
  aiPhrases,
}: {
  finalGreeting?: string;
  aiPhrases?: string;
}) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse comma-separated phrases from CMS or fallback to default
  const dynamicPhrases = aiPhrases
    ? aiPhrases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [...PHRASES];

  if (aiPhrases) {
    dynamicPhrases.push(finalGreeting);
  } else {
    dynamicPhrases[dynamicPhrases.length - 1] = finalGreeting;
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const currentPhrase = dynamicPhrases[phraseIndex];

    if (isDeleting) {
      if (text === '') {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % dynamicPhrases.length);
        timeout = setTimeout(() => {}, 400); // Wait before typing next
      } else {
        timeout = setTimeout(() => {
          setText(text.slice(0, -1));
        }, 20); // Fast delete
      }
    } else {
      if (text === currentPhrase) {
        const isLast = phraseIndex === dynamicPhrases.length - 1;
        // Pause significantly longer on the final phrase before looping
        timeout = setTimeout(
          () => {
            setIsDeleting(true);
          },
          isLast ? 6000 : 1500
        );
      } else {
        timeout = setTimeout(
          () => {
            setText(currentPhrase.slice(0, text.length + 1));
          },
          Math.random() * 40 + 40
        ); // Variable typing speed for human feel
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, dynamicPhrases]);

  return (
    <div className="flex items-center justify-center md:justify-start gap-2 text-primary/90 font-mono text-sm tracking-widest uppercase h-6">
      <Terminal className="w-4 h-4 text-primary" />
      <span className="relative inline-flex items-center">
        <span className="bg-primary/10 px-1 font-semibold">{text}</span>
        <span className="ml-1 w-2 h-4 bg-primary/80 animate-pulse"></span>
      </span>
    </div>
  );
}
