import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Password Generator',
  description:
    'Generate secure, random, and strong passwords instantly. Customize length and complexity.',
  keywords: ['password generator', 'secure password', 'random password', 'security tool'],
};

export default async function PasswordLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Password Generator',
    url: `${SITE_URL}/kits/password`,
    description: 'Generate secure, random, and strong passwords instantly.',
    applicationCategory: 'SecurityApplication',
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
