import { ArrowUpRight, Check, Rocket } from 'lucide-react';
import CardMedia from '@/components/site/card-media';
import DetailCard from '@/components/site/detail-card';
import SectionHeading from '@/components/section-heading';
import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';
import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
import { mediaSummary, toMediaItems } from '@/lib/media-display';
import { toHref } from '@/lib/safe-href';
import type { MediaItem } from '@/lib/media-types';

export interface ServiceItem {
  title: string;
  description?: string;
  category?: string;
  pricing?: string;
  icon?: string;
  /** The older single picture; shown as the cover when there is no `media` list. */
  banner?: { src: string; public_id: string };
  /** Pictures and videos; the first is the cover. */
  media?: MediaItem[];
  features?: string[];
  ctaLabel?: string;
  ctaLink?: string;
}

interface ServicesProps {
  content?: ServiceItem[];
  heading?: string;
  terminalPrefix?: string;
}

/** The call-to-action button: opens in a new tab for another site, in place for a page anchor. */
function CtaLink({ item, className }: { item: ServiceItem; className: string }) {
  const href = toHref(item.ctaLink);
  if (!item.ctaLabel || !href) return null;
  const external = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
    >
      {item.ctaLabel}
    </a>
  );
}

/** Everything about the service, shown in the window that opens when the card is clicked. */
function ServiceDetail({ item, media }: { item: ServiceItem; media: MediaItem[] }) {
  const features = item.features ?? [];
  return (
    <div className="space-y-5">
      <header className="space-y-2 pr-10 lg:pr-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-primary">
            <DynamicLucideIcon name={item.icon} className="h-6 w-6" />
          </span>
          <h3 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl" dir="auto">
            {item.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {item.category && (
            <span className="rounded bg-secondary/30 px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {item.category}
            </span>
          )}
          {item.pricing && <span className="font-semibold text-primary">{item.pricing}</span>}
          {media.length > 0 && <span className="text-muted-foreground">{mediaSummary(media)}</span>}
        </div>
      </header>

      {item.description && (
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90" dir="auto">
          {item.description}
        </p>
      )}

      {features.length > 0 && (
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span dir="auto">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-5">
        <CtaLink
          item={item}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        />
      </div>
    </div>
  );
}

const MAX_FEATURES_ON_CARD = 4;

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
          {content.map((item, idx) => {
            const media = toMediaItems(item.media, item.banner);
            const features = item.features ?? [];
            const hasCta = !!item.ctaLabel && !!toHref(item.ctaLink);

            return (
              <div
                key={`${item.title}-${idx}`}
                className="animate-fade-in-up h-full"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <DetailCard
                  title={item.title}
                  label={`View service: ${item.title}`}
                  media={media}
                  detail={<ServiceDetail item={item} media={media} />}
                  className="h-full rounded-xl"
                >
                  <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/30 bg-card/20 transition-all duration-500 group-hover/detail:border-primary/40 group-hover/detail:bg-card/30">
                    <CardMedia
                      items={media}
                      title={item.title}
                      aspect="aspect-[16/9]"
                      thumbs={false}
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-primary">
                          <DynamicLucideIcon name={item.icon} className="h-5 w-5 shrink-0" />
                          <h3 className="text-base font-bold text-foreground" dir="auto">
                            {item.title}
                          </h3>
                        </div>
                        {item.category && (
                          <span className="shrink-0 rounded bg-secondary/30 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 terminal:font-mono">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.pricing && (
                        <p className="mb-2 text-sm font-semibold text-primary terminal:font-mono">
                          {item.pricing}
                        </p>
                      )}
                      {item.description && (
                        <p
                          className="mb-4 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground/80"
                          dir="auto"
                        >
                          {item.description}
                        </p>
                      )}
                      {features.length > 0 && (
                        <ul className="mb-4 space-y-1.5">
                          {features.slice(0, MAX_FEATURES_ON_CARD).map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-xs text-muted-foreground/70"
                            >
                              <Check className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate">{feature}</span>
                            </li>
                          ))}
                          {features.length > MAX_FEATURES_ON_CARD && (
                            <li className="pl-5 text-xs text-muted-foreground/60">
                              +{features.length - MAX_FEATURES_ON_CARD} more
                            </li>
                          )}
                        </ul>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                        {hasCta ? (
                          <CtaLink
                            item={item}
                            className="relative z-10 inline-flex items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 terminal:font-mono"
                          />
                        ) : (
                          <span />
                        )}
                        <span
                          aria-hidden="true"
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover/detail:text-primary"
                        >
                          Details <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </DetailCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
