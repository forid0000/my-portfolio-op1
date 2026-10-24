import { createElement } from 'react';
import { ExternalLink } from 'lucide-react';
import { IconSvg, type IconMap } from '@/lib/icons/icon-data';
import { resolveBrandIcon } from '@/lib/social-icon';

/**
 * The small icon in front of a link or button. `name` is the owner's pick or the automatic guess
 * (lib/link-icon.ts); the drawing arrives as plain SVG data in `icons` (resolved on the server for
 * the names the page uses), so no icon library reaches the browser. Unknown names show a plain
 * "external link" arrow.
 */
export default function LinkIcon({
  name,
  icons,
  className,
}: {
  name: string;
  icons?: IconMap;
  className?: string;
}) {
  const Brand = resolveBrandIcon(name);
  if (Brand) return createElement(Brand, { className });
  const data = icons?.[name];
  return data ? (
    createElement(IconSvg, { data, className })
  ) : (
    <ExternalLink className={className} />
  );
}
