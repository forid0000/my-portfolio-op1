import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'System Diagnostics',
  description: 'Real-time system intelligence, hardware diagnostics, and network analysis tool.',
  keywords: ['system diagnostics', 'network analysis', 'hardware info', 'DevOps tools'],
};

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'System Diagnostics Tool',
    url: `${SITE_URL}/kits/system`,
    description: 'Real-time system intelligence, hardware diagnostics, and network analysis.',
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
