import type { Metadata } from 'next';
import AgeClient from './age-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';

const TOOL_KEY = 'age';
const FALLBACK_TITLE = 'Age Calculator - Calculate Exact Age in Years, Months, Days';
const FALLBACK_DESCRIPTION =
  'Free online age calculator. Find your exact age in years, months, days, and hours instantly from your date of birth. Fast, accurate, and privacy-friendly - nothing leaves your browser.';

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
      'age calculator',
      'calculate age online',
      'date of birth calculator',
      'age in days calculator',
      'exact age in years months days',
    ],
    alternates: { canonical: `${SITE_URL}/kits/age` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/age`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function AgePage() {
  const tool = await getToolContent(TOOL_KEY);
  return <AgeClient icon={tool?.icon} accentColor={tool?.accentColor} />;
}
