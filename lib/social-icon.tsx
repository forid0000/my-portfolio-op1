import { createElement } from 'react';
import { Mail } from 'lucide-react';
import { resolveUniversalIcon } from '@/lib/universal-icon';
import { DevToIcon } from '@/components/icon/dev.to';
import { MediumIcon } from '@/components/icon/medium';
import { FacebookIcon } from '@/components/icon/facebook';
import { DiscordIcon } from '@/components/icon/discord';
import { GithubIcon } from '@/components/icon/github';

/**
 * Social/contact icons that aren't in lucide-react - hand-drawn brand marks
 * for platforms lucide doesn't cover. Everything else resolves through the
 * full lucide catalog via resolveUniversalIcon, so any of ~1500 icons works for
 * a social link, not just this short brand list.
 */
const BRAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DevToIcon,
  MediumIcon,
  FacebookIcon,
  DiscordIcon,
  // 'Github' is the name used across the socials config; keep the alias too.
  Github: GithubIcon,
  GithubIcon,
};

/** Extra names (beyond ALL_LUCIDE_ICON_NAMES) worth surfacing in a social icon picker. */
export const SOCIAL_BRAND_ICON_NAMES = Object.keys(BRAND_ICONS);

export function resolveSocialIcon(
  name: string | undefined
): React.ComponentType<{ className?: string }> | null {
  if (!name) return null;
  return BRAND_ICONS[name] ?? resolveUniversalIcon(name);
}

/** Renders a social/contact icon by name, falling back to Mail when unresolved. */
export function SocialIcon({ name, className }: { name?: string; className?: string }) {
  return createElement(resolveSocialIcon(name) ?? Mail, { className });
}
