import type { Metadata } from 'next';
import PrayerClient from './prayer-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';

const TOOL_KEY = 'prayer';
const FALLBACK_TITLE = 'Prayer Times - Accurate Daily Salah Schedule for Your Location';
const FALLBACK_DESCRIPTION =
  'Accurate daily prayer (Salah / Namaz) times for your location, Makkah, Madinah and 30+ Bangladeshi districts - Fajr, Dhuhr, Asr, Maghrib, Isha, plus Hijri date and live weather.';

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
      'prayer times',
      'salah times today',
      'namaz time',
      'fajr time today',
      'iftar time',
      'todays prayer time',
    ],
    alternates: { canonical: `${SITE_URL}/kits/prayer` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/prayer`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// Note: prayer-client.tsx is a bespoke dashboard layout with no single
// "<Icon/> Title" heading element to attach an admin-picked icon/color to
// (unlike the other 7 tools), so it intentionally doesn't receive those props.
export default function PrayerPage() {
  return <PrayerClient />;
}
