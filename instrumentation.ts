// Server-side hooks. Sentry is optional: nothing is loaded unless a DSN is set,
// so a default deployment pays no cold-start cost for it.
const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);

export async function register() {
  if (!sentryEnabled) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) => {
  if (!sentryEnabled) return;
  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(...args);
};
