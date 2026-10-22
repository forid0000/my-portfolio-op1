// Browser-side Sentry setup, loaded on every page view.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Sentry is optional. The SDK is only imported when NEXT_PUBLIC_SENTRY_DSN is
// set at build time, so a default deployment ships none of it to visitors (it is
// otherwise a large chunk that every page would download for nothing).

type SentryModule = typeof import('@sentry/nextjs');
let sentry: SentryModule | null = null;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('@sentry/nextjs').then((mod) => {
    mod.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Lightweight: error reporting only. Session Replay was removed because it
      // continuously records DOM mutations on every visitor (heavy CPU/jank on mobile).
      tracesSampleRate: 0.1,
    });
    sentry = mod;
  });
}

export const onRouterTransitionStart: SentryModule['captureRouterTransitionStart'] = (...args) =>
  sentry?.captureRouterTransitionStart(...args);
