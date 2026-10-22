import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Currency Converter',
  description:
    'Real-time currency converter with live exchange rates. Fast and accurate conversions.',
  keywords: ['currency converter', 'exchange rates', 'live currency', 'finance tool'],
};

export default async function CurrencyLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Currency Converter',
    url: `${SITE_URL}/kits/currency`,
    description: 'Real-time currency converter with live exchange rates.',
    applicationCategory: 'FinanceApplication',
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
