import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Prayer Times',
  description: 'Accurate Islamic prayer times based on your location. Reliable and real-time.',
  keywords: ['prayer times', 'Islamic prayer', 'namaz timing', 'Muslim tools'],
};

export default async function PrayerLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Prayer Times',
    url: `${SITE_URL}/kits/prayer`,
    description: 'Accurate Islamic prayer times based on your location.',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    author: {
      '@type': 'Person',
      name: identity.personName,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {children}
    </>
  );
}
