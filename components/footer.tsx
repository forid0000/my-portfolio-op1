'use client';

import Link from 'next/link';
import { Terminal, GitBranch, Clock, Globe } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SocialIcon } from '@/lib/social-icon';
import type { IconMap } from '@/lib/icons/icon-data';
import { utcOffsetLabel } from '@/lib/utils';
import { GLOBAL_CONTENT_DEFAULTS } from '@/lib/content-defaults';

interface FooterProps {
  /** Server-resolved SVG data for the social icons (see lib/icons). */
  icons?: IconMap;
  content?: {
    brandName: string;
    footerText: string;
    copyrightName?: string;
    locationLabel?: string;
    timeZone?: string;
    footerSocials: { href: string; label: string; icon: string }[];
  };
}

export default function Footer({ content, icons }: FooterProps) {
  const footerData = content || GLOBAL_CONTENT_DEFAULTS;

  const timeZone = footerData.timeZone || GLOBAL_CONTENT_DEFAULTS.timeZone;
  const locationLabel = footerData.locationLabel || GLOBAL_CONTENT_DEFAULTS.locationLabel;
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone,
        })
      );
    };

    // The clock shows HH:MM, so wake once per minute (aligned to the minute
    // boundary) instead of re-rendering the footer every second.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      updateTime();
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, [timeZone]);

  return (
    <footer className="relative border-t border-border/50 bg-transparent overflow-hidden mt-16">
      <div className="relative z-10 py-16 sm:py-20 px-4 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {/* 1. Brand / Identity */}
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 group">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 group-hover:bg-primary/20 transition-colors duration-300">
                  <Terminal className="w-6 h-6 text-primary" />
                </div>
                <div className="">
                  <h3 className="text-lg font-bold tracking-tighter font-mono">
                    {footerData.brandName}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {footerData.footerText}
              </p>
            </div>

            {/* 2. Directory Links */}
            <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h4 className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
                [ DIR : LINKS ]
              </h4>
              {(() => {
                const dirLinks = ['About', 'Skills', 'Projects', 'Gallery', 'Articles', 'Contact'];
                const isOdd = dirLinks.length % 2 !== 0;
                return (
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-sm">
                    {dirLinks.map((link, index) => (
                      <li
                        key={link}
                        className={isOdd && index === dirLinks.length - 1 ? 'col-span-2' : ''}
                      >
                        <a
                          href={link === 'Articles' ? '/articles' : `/#${link.toLowerCase()}`}
                          className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <span className="group-hover:translate-x-1 transition-transform duration-300">
                            ~/ {link.toLowerCase()}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* 3. Connect (UPDATED: Grid Layout + Always Visible) */}
            <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h4 className="font-mono text-xs font-bold text-primary tracking-widest uppercase">
                [ NET : CONNECT ]
              </h4>

              {/* Grid Logic: 3 columns; any remainder row is pulled out and centered */}
              {(() => {
                const socials = footerData.footerSocials;
                const remainder = socials.length % 3;
                const gridItems =
                  remainder === 0 ? socials : socials.slice(0, socials.length - remainder);
                const leftoverItems =
                  remainder === 0 ? [] : socials.slice(socials.length - remainder);

                const renderLink = (link: { href: string; label: string; icon: string }) => {
                  const IconComponent = (
                    <SocialIcon
                      name={link.icon}
                      icons={icons}
                      className="w-4 h-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary"
                    />
                  );

                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-card/50
                                 transition-all duration-300 ease-out
                                 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    >
                      {IconComponent}
                      <span className="text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-primary font-mono">
                        {link.label}
                      </span>
                    </a>
                  );
                };

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {gridItems.map((link) => renderLink(link))}
                    </div>
                    {leftoverItems.length > 0 && (
                      <div className="flex justify-center gap-3 mt-3">
                        {leftoverItems.map((link) => renderLink(link))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Tech Divider */}
          <div className="relative h-px w-full bg-border/40 mb-8 overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-20 bg-linear-to-r from-transparent via-primary/50 to-transparent animate-[shimmer_2s_infinite]" />
          </div>

          {/* Bottom Status Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground/60">
            {/* Left: Copyright */}
            <div className="flex items-center gap-4">
              <p>
                © {new Date().getFullYear()}{' '}
                {footerData.copyrightName || GLOBAL_CONTENT_DEFAULTS.copyrightName}
              </p>
            </div>

            {/* Right: System Stats */}
            <div className="flex items-center gap-6 border border-border/20 px-4 py-1 rounded-full bg-background/50">
              <Link
                href="/administrator"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <GitBranch className="w-3 h-3" />
                <span>sys-core</span>
              </Link>
              <div className="w-px h-3 bg-border/40" />
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span>{locationLabel}</span>
              </div>
              <div className="w-px h-3 bg-border/40" />
              <div className="flex items-center gap-4 text-xs">
                <Clock className="w-3 h-3" />
                <span>
                  {time} {utcOffsetLabel(timeZone)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
