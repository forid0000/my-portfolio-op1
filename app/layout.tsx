import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'sonner';
import { getTheme, themeToCssVars } from '@/lib/theme';
import { safeJsonLd } from '@/lib/json-ld';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';

import connectToDatabase from '@/lib/db';
import DotWeave from '@/components/dot-weave';
import { SYSTEM_DEFAULTS } from '@/lib/content-defaults';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL, getGeoMeta } from '@/lib/site-config';

// === SEO & SOCIAL CONFIGURATION ===
export async function generateMetadata(): Promise<Metadata> {
  let title: string = SYSTEM_DEFAULTS.seoTitle;
  let description: string = SYSTEM_DEFAULTS.seoDescription;
  let keywordsStr: string = SYSTEM_DEFAULTS.seoKeywords;

  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'system_content' });
    if (doc) {
      if (doc.seoTitle) title = doc.seoTitle;
      if (doc.seoDescription) description = doc.seoDescription;
      if (doc.seoKeywords) keywordsStr = doc.seoKeywords;
    }
  } catch (error) {
    console.error('Failed to fetch system_content for metadata, using defaults', error);
  }

  const keywords = keywordsStr.split(',').map((k) => k.trim());
  const [avatarUrl, identity] = await Promise.all([getActiveAvatarUrl(), getSiteIdentity()]);

  // Optional geo-targeting tags, only emitted when SEO_GEO_* env vars are set.
  const geo = getGeoMeta();
  const other: Record<string, string> = {};
  if (geo?.region) other['geo.region'] = geo.region;
  if (geo?.placename) other['geo.placename'] = geo.placename;
  if (geo?.latitude !== undefined && geo?.longitude !== undefined) {
    other['geo.position'] = `${geo.latitude};${geo.longitude}`;
    other.ICBM = `${geo.latitude}, ${geo.longitude}`;
  }

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: identity.siteName,
    title: {
      default: title,
      template: `%s | ${identity.siteName}`,
    },
    description,
    alternates: {
      canonical: '/',
    },
    icons: {
      icon: '/icon',
    },
    keywords,
    authors: [{ name: identity.personName, url: SITE_URL }],
    creator: identity.personName,
    robots: 'index, follow',
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: identity.siteName,
      type: 'website',
      locale: 'en_US',
      // The admin-managed active avatar (Media Manager), resolved to its
      // final Cloudinary URL here rather than left as "/api/avatar" - social
      // crawlers vary in whether they follow redirects for og:image, so the
      // real URL is embedded directly. Stays correct automatically if the
      // active avatar is ever changed, with no width/height hint since an
      // admin-uploaded avatar's real dimensions aren't known ahead of time.
      images: [{ url: avatarUrl, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [avatarUrl],
    },
    ...(Object.keys(other).length ? { other } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, identity, avatarUrl] = await Promise.all([
    getTheme(),
    getSiteIdentity(),
    getActiveAvatarUrl(),
  ]);
  const geo = getGeoMeta();

  // === STRUCTURED DATA (JSON-LD) ===
  // Built from CMS content (hero name/title, global brand + socials), never hardcoded.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: identity.siteName,
      alternateName: identity.personName,
      url: SITE_URL,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: identity.personName,
      url: SITE_URL,
      image: avatarUrl.startsWith('/') ? `${SITE_URL}${avatarUrl}` : avatarUrl,
      jobTitle: identity.jobTitle,
      sameAs: identity.sameAs,
      homeLocation: {
        '@type': 'Place',
        name: identity.locationLabel,
        ...(geo?.latitude !== undefined && geo?.longitude !== undefined
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: geo.latitude,
                longitude: geo.longitude,
              },
            }
          : {}),
      },
    },
  ];

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Admin-customizable theme: overrides CSS variables defined in globals.css */}
        <style dangerouslySetInnerHTML={{ __html: themeToCssVars(theme) }} />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-background text-foreground"
      >
        {/* Inject JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />

        {/* === CONTENT WRAPPER === */}
        <div className="relative z-10">
          {children}

          <DotWeave />
        </div>

        <Toaster position="top-center" theme="dark" richColors closeButton duration={3000} />
        <SpeedInsights />

        {/* Google Analytics can go here if needed */}
        {/* <GoogleTagManager gtmId="GTM-XXXXXX" /> */}
      </body>
    </html>
  );
}
