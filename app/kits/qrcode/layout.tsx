import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'QR Code Generator',
  description:
    'Generate fast, customized QR codes for URLs, text, and data. Download in high resolution.',
  keywords: ['qr code generator', 'create qr code', 'custom qr', 'utility tool'],
};

export default async function QRCodeLayout({ children }: { children: React.ReactNode }) {
  const identity = await getSiteIdentity();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'QR Code Generator',
    url: `${SITE_URL}/kits/qrcode`,
    description: 'Generate fast, customized QR codes for URLs, text, and data.',
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
