import type { Metadata } from 'next';
import SystemClient from './system-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';

const TOOL_KEY = 'system';
const FALLBACK_TITLE = 'What Is My IP - System Info & Network Diagnostics Tool';
const FALLBACK_DESCRIPTION =
  'Check your public IP address, ISP, VPN/proxy detection, device hardware, browser environment, and network latency - all in one free real-time diagnostics tool.';

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
      'what is my ip',
      'my ip address',
      'system info tool',
      'browser fingerprint checker',
      'network diagnostics online',
      'vpn detection test',
    ],
    alternates: { canonical: `${SITE_URL}/kits/system` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/system`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

// Note: system-client.tsx's "System Intelligence" heading has no icon element
// to attach an admin-picked icon/color to (unlike the other 6 wired tools),
// so it intentionally doesn't receive those props.
export default function SystemPage() {
  return <SystemClient />;
}
