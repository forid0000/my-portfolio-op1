import type { Metadata } from 'next';
import QrClient from './qrcode-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';
import { resolveIconData } from '@/lib/icons/resolve';

const TOOL_KEY = 'qrcode';
const FALLBACK_TITLE = 'Free QR Code Generator & Scanner - Create & Scan QR Codes Online';
const FALLBACK_DESCRIPTION =
  'Generate downloadable QR codes for links, text, Wi-Fi, or email, and scan QR codes instantly using your camera or an uploaded image. Free, fast, no signup required.';

export async function generateMetadata(): Promise<Metadata> {
  const tool = await getToolContent(TOOL_KEY);
  // SEO <title> stays fixed & keyword-optimized - the CMS "name" field is
  // a short nav-bar label ("Age Calc.", "GenPass"), not meant as an SEO title.
  const title = FALLBACK_TITLE;
  const description = tool?.description || FALLBACK_DESCRIPTION;

  return {
    title,
    description,
    keywords: [
      'qr code generator',
      'qr code scanner online',
      'free qr code maker',
      'wifi qr code generator',
      'custom qr code with download',
    ],
    alternates: { canonical: `${SITE_URL}/kits/qrcode` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/qrcode`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function QrPage() {
  const tool = await getToolContent(TOOL_KEY);
  return <QrClient iconData={await resolveIconData(tool?.icon)} accentColor={tool?.accentColor} />;
}
