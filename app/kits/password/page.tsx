import type { Metadata } from 'next';
import PasswordClient from './password-client';
import { getToolContent } from '../get-tool-content';
import { SITE_URL } from '@/lib/site-config';
import { resolveIconData } from '@/lib/icons/resolve';

const TOOL_KEY = 'password';
const FALLBACK_TITLE = 'Free Password Generator - Strong, Secure & Random Passwords';
const FALLBACK_DESCRIPTION =
  'Generate strong, secure random passwords and passphrases instantly, or analyze password strength online. 100% client-side - nothing is ever stored or transmitted.';

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
      'password generator',
      'strong password generator',
      'random password generator online',
      'secure passphrase generator',
      'password strength checker',
    ],
    alternates: { canonical: `${SITE_URL}/kits/password` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/kits/password`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PasswordPage() {
  const tool = await getToolContent(TOOL_KEY);
  return (
    <PasswordClient iconData={await resolveIconData(tool?.icon)} accentColor={tool?.accentColor} />
  );
}
