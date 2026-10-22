// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Reporting is off unless NEXT_PUBLIC_SENTRY_DSN is set (see .env.example).
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Lightweight: error reporting only. Session Replay was removed because it
  // continuously records DOM mutations on every visitor (heavy CPU/jank on mobile).
  // Trace sampling lowered from 100% -> 10% and PII disabled.
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
