'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Terminal } from 'lucide-react';
import HackerText from '@/components/HackerText';
import { ByStyle } from '@/components/by-style';
import { SYSTEM_DEFAULTS } from '@/lib/content-defaults';

/** The developer-prompt wording older versions saved as the default; it stays for the terminal style. */
const TERMINAL = {
  heading: '>_ RESOURCE_NOT_FOUND _<',
  subtext:
    "The entity you're tracking has vanished.\nThe matrix has been altered, or the path is corrupted.",
  button: 'RETURN TO BASE',
};

/** What the clean style shows: the owner's own wording, or plain words when it is the old prompt text. */
function plain(value: string | undefined, legacy: string, fallback: string): string {
  const text = (value ?? '').replace(/\\n/g, '\n');
  return text && text !== legacy ? text : fallback;
}

/**
 * The 404 page. In the default (clean) style it is a plain, friendly card; the terminal style
 * (Admin -> Appearance) keeps the command-prompt window and the decoding text. The owner's own
 * wording (Admin -> System) is used in both. A short countdown leads back to the home page.
 */
export default function NotFoundClient({ config }: { config: Record<string, string> }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(9);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCount) => prevCount - 1);
    }, 1000);

    if (countdown <= 0) {
      clearInterval(timer);
      router.push('/');
    }

    return () => clearInterval(timer);
  }, [countdown, router]);

  const terminalHeading = config.notFoundHeading || TERMINAL.heading;
  const terminalSubtext = (config.notFoundSubtext || TERMINAL.subtext).replace(/\\n/g, '\n');
  const terminalButton = config.notFoundButton || TERMINAL.button;
  const heading = plain(config.notFoundHeading, TERMINAL.heading, SYSTEM_DEFAULTS.notFoundHeading);
  const subtext = plain(config.notFoundSubtext, TERMINAL.subtext, SYSTEM_DEFAULTS.notFoundSubtext);
  const button = plain(config.notFoundButton, TERMINAL.button, SYSTEM_DEFAULTS.notFoundButton);

  return (
    <>
      <style jsx global>{`
        @keyframes fade-in-up-delay {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up-notfound {
          animation: fade-in-up-delay 0.6s ease-out forwards;
        }
      `}</style>

      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground terminal:font-mono">
        <div
          className="w-full max-w-2xl animate-fade-in-up-notfound overflow-hidden rounded-2xl border border-border bg-card shadow-2xl terminal:rounded-lg"
          style={{
            boxShadow: '0 0 25px color-mix(in srgb, var(--primary) 15%, transparent)',
            animationDelay: '0.1s',
          }}
        >
          {/* Command-prompt title bar: terminal style only */}
          <div className="hidden items-center justify-between border-b border-border bg-border/20 p-3 terminal:flex">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive"></span>
              <span className="h-3 w-3 rounded-full bg-warning"></span>
              <span className="h-3 w-3 rounded-full bg-success"></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Terminal className="h-4 w-4" />
              <span>/bin/bash -- 404</span>
            </div>
            <div className="w-16"></div>
          </div>

          <div className="space-y-8 p-8 text-center sm:p-12">
            <h1 className="text-8xl font-bold text-primary sm:text-9xl">
              {config.notFoundTitle || '404'}
            </h1>

            <div className="text-2xl font-semibold text-primary sm:text-3xl">
              <span className="terminal:hidden">{heading}</span>
              <span className="hidden terminal:inline">
                <HackerText text={terminalHeading} className="" />
              </span>
            </div>

            <p className="whitespace-pre-line text-lg text-muted-foreground">
              <ByStyle clean={subtext} terminal={terminalSubtext} />
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
            >
              <Home className="h-5 w-5" />
              <span>
                <ByStyle clean={button} terminal={terminalButton} />
              </span>
            </Link>

            <div className="mt-6 text-sm text-muted-foreground">
              <ByStyle
                clean={`Taking you to the home page in ${countdown}s…`}
                terminal={`Redirecting to base in ${countdown}s...`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
