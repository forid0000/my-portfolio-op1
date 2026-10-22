import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'IP Subnet Calculator',
  description:
    'Advanced IP Subnet Calculator. Calculate network address, broadcast address, subnet mask, and usable host ranges dynamically.',
  keywords: [
    'subnet calculator',
    'IP calculator',
    'CIDR calculator',
    'networking tool',
    'DevOps tools',
  ],
};

export default async function SubnetLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'IP Subnet Calculator',
    url: `${SITE_URL}/kits/subnet`,
    description:
      'Calculate network address, broadcast address, subnet mask, and usable host ranges.',
    applicationCategory: 'DeveloperApplication',
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
