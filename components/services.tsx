import Image from 'next/image';
import SectionHeading from '@/components/section-heading';
import { Rocket, Check } from 'lucide-react';
import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
export interface ServiceItem {
  title: string;
  description?: string;
  category?: string;
  pricing?: string;
  icon?: string;
  banner?: { src: string; public_id: string };
  features?: string[];
  ctaLabel?: string;
  ctaLink?: string;
}

interface ServicesProps {
  content?: ServiceItem[];
  heading?: string;
  terminalPrefix?: string;
}

export default function Services({
  content,
  heading = 'services',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: ServicesProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="services" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <SectionHeading title={heading} prefix={terminalPrefix} path={heading} icon={<Rocket />} />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              className="animate-fade-in-up group bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 rounded-xl overflow-hidden flex flex-col"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {item.banner?.src && (
                <div className="relative w-full h-32">
                  <Image
                    src={item.banner.src}
                    alt={item.title}
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <DynamicLucideIcon name={item.icon} className="w-5 h-5" />
                    <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  </div>
                  {item.category && (
                    <span className="text-[10px] terminal:font-mono uppercase tracking-wide text-muted-foreground/70 bg-secondary/30 px-2 py-1 rounded shrink-0">
                      {item.category}
                    </span>
                  )}
                </div>
                {item.pricing && (
                  <p className="text-sm terminal:font-mono font-semibold text-primary mb-2">
                    {item.pricing}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground/80 leading-relaxed mb-4">
                    {item.description}
                  </p>
                )}
                {item.features && item.features.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {item.features.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs text-muted-foreground/70 flex items-center gap-2"
                      >
                        <Check className="w-3 h-3 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {item.ctaLabel && item.ctaLink && (
                  <a
                    href={item.ctaLink}
                    className="mt-auto inline-flex items-center justify-center text-xs terminal:font-mono font-semibold px-4 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {item.ctaLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
