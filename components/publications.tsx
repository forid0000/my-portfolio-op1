import { Newspaper, ExternalLink } from 'lucide-react';
import SectionHeading from '@/components/section-heading';
import LinkIcon from '@/components/site/link-icon';
import type React from 'react';
import { toHref } from '@/lib/safe-href';
import { publicationIconName } from '@/lib/publication-types';
import type { IconMap } from '@/lib/icons/icon-data';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';

export interface PublicationItem {
  title: string;
  type?: string;
  platform?: string;
  url?: string;
  /** The owner's icon for this item; empty = the one of its type. */
  icon?: string;
  date?: string;
  description?: string;
}

interface PublicationsProps {
  content?: PublicationItem[];
  heading?: string;
  terminalPrefix?: string;
  /** Drawings of the icons the items use (resolved on the server). */
  icons?: IconMap;
}

export default function Publications({
  content,
  heading = 'publications',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
  icons,
}: PublicationsProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="publications" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <SectionHeading
          title={heading}
          prefix={terminalPrefix}
          path={heading}
          icon={<Newspaper />}
        />

        <div className="space-y-3">
          {content.map((item, idx) => {
            const href = toHref(item.url);
            const Wrapper = (href ? 'a' : 'div') as React.ElementType;
            return (
              <Wrapper
                key={`${item.title}-${idx}`}
                {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="animate-fade-in-up group flex items-center gap-4 bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 rounded-xl p-4"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                  <LinkIcon
                    name={publicationIconName(item.type, item.icon)}
                    icons={icons}
                    className="w-4 h-4"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground/70 terminal:font-mono truncate">
                    {[item.platform, item.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {href && (
                  <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}
