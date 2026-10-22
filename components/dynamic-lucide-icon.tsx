import { Code } from 'lucide-react';
import { IconSvg } from '@/lib/icons/icon-data';
import { resolveIconData } from '@/lib/icons/resolve';

/**
 * Renders a CMS-supplied icon name (any lucide or react-icons glyph) as inline
 * SVG, falling back to a generic Code glyph when it's empty or unrecognized - a
 * bad/typo'd admin entry degrades gracefully instead of crashing the section.
 *
 * A Server Component: the name is resolved on the server, so no icon library
 * is ever sent to the browser.
 */
export async function DynamicLucideIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const data = await resolveIconData(name);
  return data ? <IconSvg data={data} className={className} /> : <Code className={className} />;
}
