'use client';

import React, { useState, useEffect } from 'react';
import HackerText from './HackerText';
import AiTypingText from './ai-typing-text';
// import SpiderCanvas from "./spider-canvas";
import { X, Download } from 'lucide-react';
import Image from 'next/image';
import { SocialIcon } from '@/lib/social-icon';
import {
  AVATAR_PLACEHOLDER_URL,
  GLOBAL_CONTENT_DEFAULTS,
  HERO_DEFAULTS,
} from '@/lib/content-defaults';

interface HeroProps {
  content?: {
    greeting: string;
    aiPhrases?: string;
    firstName: string;
    lastName: string;
    subtitle: string;
    description: string;
  };
  global?: {
    socials: { href: string; label: string; icon: string }[];
    avatarUrl?: string;
  };
}

export default function Hero({ content, global }: HeroProps) {
  const avatarUrl = global?.avatarUrl || AVATAR_PLACEHOLDER_URL;
  const firstName = content?.firstName || HERO_DEFAULTS.firstName;
  const lastName = content?.lastName || HERO_DEFAULTS.lastName;
  const fullName = `${firstName} ${lastName}`;
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  return (
    <section className="section-spacing min-h-[calc(100dvh-80px)] flex items-center justify-center overflow-hidden relative py-12 md:py-0">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-20 items-center max-w-6xl w-full relative z-10 px-4 md:px-0">
        {/* Left: Interactive Image/Avatar */}
        {/* No entrance fade on this wrapper: the avatar is the LCP element, so it
            must paint at full opacity immediately rather than animating in. */}
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] aspect-square mx-auto group">
          <div className="relative w-full h-full">
            {/* Rotating Tech Rings - Softened for modern feel */}
            <div className="absolute inset-[-15px] md:inset-[-20px] animate-morphing-blob border border-primary/20 border-dashed pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
            <div className="absolute inset-[-8px] md:inset-[-10px] animate-morphing-blob-reverse border border-primary/10 pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-700" />

            {/* Background Glow - More elegant and diffuse */}
            <div className="absolute inset-0 bg-primary/10 animate-morphing-blob blur-2xl md:blur-3xl md:animate-pulse-slow group-hover:bg-primary/20 transition-all duration-700" />

            {/* Image Container with Mask - Premium Glass/Modern feel */}
            <div
              className="relative w-full h-full animate-morphing-blob overflow-hidden border border-primary/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_60px_rgba(16,185,129,0.25)] group-hover:border-primary/50 group-hover:scale-[1.02] transition-all duration-700 bg-background/40 cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              <Image
                src={avatarUrl}
                alt={fullName}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                fill
                sizes="(max-width: 768px) 50vw, 30vw"
                priority
              />
            </div>

            {/* Tech Brackets Removed */}
          </div>
        </div>

        {/* Right: Content */}
        {/* Rendered at full opacity with no delay — the name is a primary LCP
            candidate and shouldn't wait on an entrance animation. */}
        <div className="space-y-6 md:space-y-8 order-last md:order-first text-center md:text-left">
          <div className="space-y-4">
            <AiTypingText
              finalGreeting={content?.greeting || HERO_DEFAULTS.greeting}
              aiPhrases={content?.aiPhrases}
            />

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {firstName}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-blue-500 animate-gradient-x">
                {lastName}
              </span>
            </h1>

            <div className="flex justify-center md:justify-start">
              <HackerText
                text={content?.subtitle || HERO_DEFAULTS.subtitle}
                className="text-base sm:text-xl font-medium text-muted-foreground font-mono block min-h-[50px] md:min-h-[60px]"
              />
            </div>
          </div>

          <p className="section-subtitle text-sm sm:text-lg max-w-lg leading-relaxed text-muted-foreground/60 mx-auto md:mx-0">
            {content?.description || HERO_DEFAULTS.description}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2 md:pt-4">
            <a href="#projects" className="fire-button group">
              <span className="relative z-10">View Projects</span>
            </a>

            <div className="relative group w-full sm:w-auto">
              {/* Decorative Tech logic: outer brackets */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />

              <a
                href="/api/resume"
                target="_blank"
                rel="noopener noreferrer"
                className="liquid-button relative px-8 py-4 flex items-center justify-center gap-3 group bg-transparent border border-primary/20 hover:border-primary transition-all duration-500 rounded-lg overflow-hidden"
              >
                {/* Magical Liquid Waves */}
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>

                <span className="relative z-10 text-xs font-black tracking-[0.3em] uppercase text-primary group-hover:text-primary-foreground transition-colors duration-500">
                  Download_CV
                </span>
                <div className="relative z-10 w-8 h-px bg-primary/30 group-hover:bg-primary-foreground/30 group-hover:w-12 transition-all duration-500" />
                <Download className="relative z-10 w-5 h-5 text-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:animate-bounce" />
              </a>
            </div>
          </div>

          <div className="socialLinks bg-transparent mt-2 md:mt-4">
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              {(global?.socials || GLOBAL_CONTENT_DEFAULTS.socials).map((link) => {
                const IconComponent = (
                  <SocialIcon
                    name={link.icon}
                    className="w-5 h-5 text-muted-foreground transition-colors duration-300 group-hover:text-primary"
                  />
                );

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border/20 bg-card/20
                               overflow-hidden transition-all duration-500 ease-out
                               hover:w-auto hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  >
                    <div className="relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      {IconComponent}
                    </div>

                    <div className="flex items-center max-w-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:max-w-[200px] group-hover:ml-1">
                      <span className="text-sm font-medium text-foreground whitespace-nowrap opacity-0 transition-opacity duration-300 delay-75 group-hover:opacity-100 group-hover:text-primary font-bold font-mono">
                        {link.label}
                      </span>
                    </div>

                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/0 transition-all duration-300 group-hover:border-primary/50" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/0 transition-all duration-300 group-hover:border-primary/50" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-primary/40 rounded-full text-white transition-colors border border-white/20 z-[110]"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(false);
            }}
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          <div
            className="relative w-full h-[60vh] sm:h-[75vh] md:h-[90vh] max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={avatarUrl}
              alt={`${fullName} Full Size`}
              className="object-contain"
              fill
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </section>
  );
}
