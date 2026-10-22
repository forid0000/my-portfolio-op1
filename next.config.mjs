import { withSentryConfig } from '@sentry/nextjs';

// --- Sentry (optional) ---
// Error reporting is enabled only when NEXT_PUBLIC_SENTRY_DSN is set. The DSN's
// ingest host is derived here so the CSP allows exactly that host and nothing else.
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || '';
let sentryIngestOrigin = '';
if (sentryDsn) {
  try {
    sentryIngestOrigin = `https://${new URL(sentryDsn).host}`;
  } catch {
    sentryIngestOrigin = '';
  }
}

// --- Optional short links (/github, /linkedin, /facebook, /whatsapp) ---
// Each redirect is registered only when its environment variable is set, so a
// fresh deployment exposes none of them. See .env.example.
const shortLinks = [
  ['/github', process.env.SOCIAL_GITHUB_URL],
  ['/linkedin', process.env.SOCIAL_LINKEDIN_URL],
  ['/facebook', process.env.SOCIAL_FACEBOOK_URL],
  [
    '/whatsapp',
    process.env.WHATSAPP_NUMBER?.replace(/\D/g, '')
      ? `https://wa.me/${process.env.WHATSAPP_NUMBER.replace(/\D/g, '')}`
      : undefined,
  ],
]
  .filter(([, destination]) => typeof destination === 'string' && /^https:\/\//.test(destination))
  // Temporary (307) on purpose: browsers cache permanent redirects indefinitely, and
  // these destinations are operator-configurable.
  .map(([source, destination]) => ({ source, destination, permanent: false }));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "export",
  productionBrowserSourceMaps: false,
  // --- Image settings ---
  images: {
    contentDispositionType: 'inline',
    // Serve AVIF first (smaller than WebP) so LCP images ship fewer bytes; Next
    // falls back to WebP/original for browsers that don't support it.
    formats: ['image/avif', 'image/webp'],
    // Avatars and article covers change rarely and their URLs are versioned, so
    // cache each optimized variant for 31 days. This cuts LCP latency on repeat
    // views and sharply reduces re-optimization work against the free-tier
    // "Image Optimization - Transformations" budget.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'media.dev.to',
      },
      {
        protocol: 'https',
        hostname: 'media2.dev.to',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'dev-to-uploads.s3.amazonaws.com',
      },
    ],
  },

  // --- ESLint/TypeScript settings ---
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  typescript: {
    ignoreBuildErrors: false,
  },

  // --- Security headers ---
  async headers() {
    // Content-Security-Policy kept compatible with Next's injected inline
    // bootstrap, Vercel Analytics/Speed-Insights, the Sentry ingest host (the
    // browser SDK posts directly since the /monitoring tunnel was removed) and
    // Cloudinary/next-image. 'unsafe-inline' is required until
    // a nonce-based CSP is wired through middleware.ts (future hardening).
    // React/Turbopack use eval() in dev for debugging; production never does, so
    // 'unsafe-eval' is only added in development.
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc =
      "script-src 'self' 'unsafe-inline'" +
      (isDev ? " 'unsafe-eval'" : '') +
      ' https://va.vercel-scripts.com https://*.vercel-scripts.com';

    // Explicit host allowlists (rather than wildcard https:) for img-src/
    // connect-src, derived from every external host actually fetched by the
    // browser. R2_PUBLIC_URL is read at build/config time since Notes Vault
    // images are rendered via a raw <img> (not next/image), so remotePatterns
    // above doesn't cover it.
    let r2Host = '';
    if (process.env.R2_PUBLIC_URL) {
      try {
        r2Host = new URL(process.env.R2_PUBLIC_URL).origin;
      } catch {
        r2Host = '';
      }
    }
    const imgSrc =
      "img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.com https://media.dev.to https://media2.dev.to https://res.cloudinary.com https://dev-to-uploads.s3.amazonaws.com" +
      (r2Host ? ` ${r2Host}` : '');
    const connectSrc =
      "connect-src 'self' https://api.ipapi.is https://ipwho.is https://open.er-api.com https://api.aladhan.com https://api.open-meteo.com" +
      // Sentry browser SDK posts errors/traces directly to its ingest host (no
      // same-origin tunnel, which would run telemetry through our own
      // functions). Without this, CSP silently drops every report. Derived from
      // NEXT_PUBLIC_SENTRY_DSN; absent when Sentry is not configured.
      (sentryIngestOrigin ? ` ${sentryIngestOrigin}` : '');

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera: QR scanner kit. geolocation: optional "use my location" in the prayer kit.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // --- Redirects ---
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/administrator',
        permanent: false,
      },
      {
        source: '/dev',
        destination: '/administrator',
        permanent: false,
      },
      {
        source: '/blog',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/blog/:slug*',
        destination: '/articles/:slug*',
        permanent: true,
      },
      ...shortLinks,
    ];
  },
};

const sentryOptions = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  // Used for source-map upload together with SENTRY_AUTH_TOKEN.
  org: process.env.SENTRY_ORG,

  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Keep source-map upload minimal to cut build time and payload.
  widenClientFileUpload: false,

  // tunnelRoute intentionally disabled: routing browser telemetry through a
  // Next.js rewrite runs it on our own Vercel functions, adding invocations +
  // Fluid Active CPU + data transfer against the free-tier budget. The browser
  // SDK posts directly to Sentry instead (a fraction may be ad-blocked — an
  // acceptable trade for a personal site).

  webpack: {
    // No Vercel Cron Monitors exist to instrument, so keep this off to avoid
    // any extra monitoring overhead.
    automaticVercelMonitors: false,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
};

// Without a DSN there is nothing to report to, so skip the Sentry build plugin entirely.
export default sentryDsn ? withSentryConfig(nextConfig, sentryOptions) : nextConfig;
