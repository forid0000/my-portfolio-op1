import { createElement } from 'react';
import { Mail } from 'lucide-react';
import { IconSvg, type IconMap } from '@/lib/icons/icon-data';
import { DevToIcon } from '@/components/icon/dev.to';
import { MediumIcon } from '@/components/icon/medium';
import { FacebookIcon } from '@/components/icon/facebook';
import { DiscordIcon } from '@/components/icon/discord';
import { GithubIcon } from '@/components/icon/github';

/**
 * Hand-drawn brand marks that ship with the page (small inline SVG components).
 * Every other icon name - any lucide or react-icons glyph - is resolved on the
 * server (lib/icons/resolve.ts) and arrives as plain SVG data in `icons`, so the
 * browser never downloads an icon library.
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

/** Extra names (beyond the icon catalog) worth surfacing in a social icon picker. */
export const SOCIAL_BRAND_ICON_NAMES = Object.keys(BRAND_ICONS);

/** The bundled brand mark for `name`, if there is one. */
export function resolveBrandIcon(
  name: string | undefined
): React.ComponentType<{ className?: string }> | null {
  return (name && BRAND_ICONS[name]) || null;
}

/**
 * Renders a social/contact icon by name: a bundled brand mark, else the
 * server-resolved glyph from `icons`, else a Mail icon.
 */
export function SocialIcon({
  name,
  className,
  icons,
}: {
  name?: string;
  className?: string;
  icons?: IconMap;
}) {
  const Brand = resolveBrandIcon(name);
  if (Brand) return createElement(Brand, { className });
  const data = name ? icons?.[name] : undefined;
  return data ? createElement(IconSvg, { data, className }) : createElement(Mail, { className });
}
