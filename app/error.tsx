'use client';

import { useEffect, useState } from 'react';
import { Terminal, ShieldAlert, RefreshCcw, Mail } from 'lucide-react';
import { SYSTEM_DEFAULTS } from '@/lib/content-defaults';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [config, setConfig] = useState({
    errorHeading: SYSTEM_DEFAULTS.errorHeading,
    errorTitle: SYSTEM_DEFAULTS.errorTitle,
    errorSubtext: SYSTEM_DEFAULTS.errorSubtext,
    errorButton: SYSTEM_DEFAULTS.errorButton,
    errorEmail: SYSTEM_DEFAULTS.errorEmail,
  });

  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error(error);

    // Attempt to fetch dynamic error text, but fail gracefully
    fetch('/api/system-texts')
      .then((res) => res.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setConfig((prev) => ({
            ...prev,
            errorHeading: data.errorHeading || prev.errorHeading,
            errorTitle: data.errorTitle || prev.errorTitle,
            errorSubtext: data.errorSubtext || prev.errorSubtext,
            errorButton: data.errorButton || prev.errorButton,
            errorEmail: data.errorEmail || prev.errorEmail,
          }));
        }
      })
      .catch(() => {
        // Silently fail - use hardcoded fallbacks if API/DB is down
      });
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive via-warning to-destructive" />

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-destructive uppercase bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20 mb-2">
            <Terminal className="w-3 h-3" /> {config.errorHeading}
          </div>

          <h1 className="text-2xl font-bold text-foreground tracking-tight">{config.errorTitle}</h1>

          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
            {config.errorSubtext}
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> {config.errorButton}
          </button>

          {config.errorEmail && (
            <a
              href={`mailto:${config.errorEmail}`}
              className="flex-1 flex items-center justify-center gap-2 bg-foreground/10 hover:bg-foreground/15 text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border"
            >
              <Mail className="w-4 h-4" /> Contact Me
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
