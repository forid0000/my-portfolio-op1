import type { Metadata } from 'next';
import CurrencyClient from './currency-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';

const TOOL_KEY = 'currency';
const FALLBACK_TITLE = 'Currency Converter - Live Exchange Rates for 160+ Currencies';
const FALLBACK_DESCRIPTION =
  'Convert currencies instantly with real-time exchange rates for 160+ world currencies. Free, fast, and accurate online currency converter.';

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
      'currency converter',
      'live exchange rates',
      'exchange rate calculator',
      'usd to eur',
      'forex converter',
    ],
    alternates: { canonical: `${SITE_URL}/kits/currency` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/currency`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function CurrencyPage() {
  const tool = await getToolContent(TOOL_KEY);
  return <CurrencyClient icon={tool?.icon} accentColor={tool?.accentColor} />;
}
