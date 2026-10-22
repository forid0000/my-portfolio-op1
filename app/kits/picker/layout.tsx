import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Color Picker',
  description:
    'Advanced color picker tool for developers and designers. Extract HEX, RGB, and HSL values.',
  keywords: ['color picker', 'HEX to RGB', 'color tool', 'design utility'],
};

export default async function PickerLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Color Picker Tool',
    url: `${SITE_URL}/kits/picker`,
    description: 'Advanced color picker tool for developers and designers.',
    applicationCategory: 'DesignApplication',
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
