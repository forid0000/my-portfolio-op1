import type { Metadata } from 'next';
import SubnetClient from './subnet-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';

const TOOL_KEY = 'subnet';
const FALLBACK_TITLE = 'IP Subnet Calculator - CIDR, Subnet Mask & IP Range Calculator';
const FALLBACK_DESCRIPTION =
  'Free IP subnet calculator for network engineers and students. Calculate subnet masks, CIDR notation, IP ranges, and network addresses instantly.';

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
      'subnet calculator',
      'cidr calculator',
      'ip subnet calculator online',
      'network calculator',
      'subnet mask calculator',
    ],
    alternates: { canonical: `${SITE_URL}/kits/subnet` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/subnet`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function SubnetPage() {
  const tool = await getToolContent(TOOL_KEY);
  return <SubnetClient icon={tool?.icon} accentColor={tool?.accentColor} />;
}
