import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Age Calculator',
  description:
    'Calculate your exact age in years, months, and days. Precise and easy to use age calculator.',
  keywords: ['age calculator', 'calculate age', 'exact age tool', 'DevOps tools'],
};

export default async function AgeLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Age Calculator',
    url: `${SITE_URL}/kits/age`,
    description: 'Calculate your exact age in years, months, and days.',
    applicationCategory: 'UtilityApplication',
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
