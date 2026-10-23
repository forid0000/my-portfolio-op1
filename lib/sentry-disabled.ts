/**
 * Stand-in for `@sentry/nextjs` when no Sentry DSN is configured.
 *
 * next.config.mjs aliases the real package to this file unless
 * NEXT_PUBLIC_SENTRY_DSN is set, so a default install never bundles (or compiles,
 * in `next dev`) the Sentry SDK: it is ~1,000 modules and several hundred MB of
 * dev-server memory for a feature that is switched off. Every export Sentry's own
 * integration files use is a harmless no-op here.
 */
export const init = (): void => {};
export const captureException = (): string => '';
export const captureRouterTransitionStart = (): void => {};
export const captureRequestError = (): void => {};
