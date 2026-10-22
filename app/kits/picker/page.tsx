import type { Metadata } from 'next';
import PickerClient from './picker-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';
import { resolveIconData } from '@/lib/icons/resolve';

const TOOL_KEY = 'picker';
const FALLBACK_TITLE = 'Random Picker - Coin Flip, Number Generator & List Randomizer';
const FALLBACK_DESCRIPTION =
  'Free online randomizer suite: flip a coin, generate a random number in any range, or shuffle and pick a winner from your own list. Fast, fair, and free.';

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
      'random picker',
      'coin flip online',
      'random number generator',
      'list randomizer',
      'random name picker',
    ],
    alternates: { canonical: `${SITE_URL}/kits/picker` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/picker`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PickerPage() {
  const tool = await getToolContent(TOOL_KEY);
  return (
    <PickerClient iconData={await resolveIconData(tool?.icon)} accentColor={tool?.accentColor} />
  );
}
