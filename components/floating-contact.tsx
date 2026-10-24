'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Check, ShieldCheck, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { SocialIcon } from '@/lib/social-icon';
import { FLOATING_DEFAULTS, type FloatingContent } from '@/lib/floating';
import type { IconMap } from '@/lib/icons/icon-data';
import { toHref } from '@/lib/safe-href';

export default function FloatingContact({
  content,
  icons,
}: {
  content?: FloatingContent;
  icons?: IconMap;
}) {
  const data = content || FLOATING_DEFAULTS;
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (text: string, id: number, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(`${label} copied!`, {
        description: 'Ready to share',
        duration: 2000,
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDirectClick = (rawHref: string, external: boolean = true) => {
    const href = toHref(rawHref);
    if (!href) return; // never follow a link that is not a web, mail or phone address
    // Web pages (WhatsApp, a profile) open in a new tab; mail and phone links hand over to the app.
    if (external && /^https?:/i.test(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = href;
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Connect Button */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] right-8 md:bottom-12 md:right-10 z-50 animate-fade-in-up">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            relative
            h-14 w-14 flex items-center justify-center rounded-full
            md:h-auto md:w-auto md:px-6 md:py-4 md:rounded-2xl
            terminal:font-mono text-sm font-semibold
            transition-colors duration-200
            shadow-lg
            border
            ${
              isOpen
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-primary hover:border-primary/50'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <span>
              {isOpen ? (
                <X className="w-6 h-6 md:w-5 md:h-5" />
              ) : (
                <MessageSquare className="w-6 h-6 md:w-5 md:h-5 animate-wiggle-x" />
              )}
            </span>

            {/* CASUAL TEXT */}
            <div className="hidden md:flex flex-col items-start leading-none font-sans">
              <span className="text-sm font-bold">{isOpen ? 'Close Menu' : data.buttonLabel}</span>
              <span className="text-xs opacity-80">
                {isOpen ? 'Hide contact' : data.buttonSubLabel}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Connect Popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-scrim/40 z-40 animate-fade-in-up"
            onClick={() => setIsOpen(false)}
          />

          {/* Connect Panel */}
          <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-72 md:w-80 md:right-10 md:bottom-28 z-50 floating-contact-enter">
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-3 md:p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground leading-tight">
                      {data.heading}
                    </h3>
                    <p className="text-xs text-muted-foreground">{data.subtext}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-foreground/10 rounded-lg transition-colors active:scale-95"
                  aria-label="Close contact menu"
                >
                  <X className="w-5 h-5 text-foreground/70" />
                </button>
              </div>

              {/* Connect List - Scrollable */}
              <div className="p-2.5 space-y-1.5 overflow-y-auto flex-1 min-h-0">
                {data.items.map((contact, idx) => {
                  return (
                    <div
                      key={`${contact.label}-${idx}`}
                      className={`
                      group relative p-2.5 rounded-lg border border-border bg-foreground/5
                      transition-colors duration-200 hover:bg-foreground/10 hover:border-primary/40
                      cursor-pointer
                    `}
                      onClick={() => handleDirectClick(contact.href)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-foreground/10 text-primary shrink-0">
                            <SocialIcon name={contact.icon} icons={icons} className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {contact.label}
                              </span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.value}
                            </p>
                          </div>
                        </div>

                        {/* Copy Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(contact.copyValue, idx, contact.label);
                          }}
                          className="
                          p-2 rounded-lg bg-foreground/10 border border-border
                          hover:bg-foreground/15 transition-colors duration-200
                          shrink-0 active:scale-95
                        "
                          title={`Copy ${contact.label}`}
                        >
                          {copiedId === idx ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4 text-foreground/80" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-border bg-foreground/5 space-y-2 shrink-0">
                <div className="flex items-center justify-center text-[11px] text-muted-foreground">
                  <span>{data.footerText}</span>
                </div>

                {/* Mobile-only secondary close button for Android accessibility */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="md:hidden w-full py-4 rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close Menu
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
