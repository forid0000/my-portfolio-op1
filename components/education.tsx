import { GraduationCap } from 'lucide-react';
import CardMedia from '@/components/site/card-media';
import DetailCard from '@/components/site/detail-card';
import SectionHeading from '@/components/section-heading';
import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
import { mediaSummary, toMediaItems } from '@/lib/media-display';
import type { MediaItem } from '@/lib/media-types';

export interface EducationItem {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  achievements?: string[];
  /** Diploma scans, campus photos or videos; the first is the cover. */
  media?: MediaItem[];
}

interface EducationProps {
  content?: EducationItem[];
  heading?: string;
  terminalPrefix?: string;
}

function period(item: EducationItem): string {
  return `${item.startDate ?? ''}${item.startDate && (item.endDate || item.current) ? ' - ' : ''}${
    item.current ? 'Present' : (item.endDate ?? '')
  }`;
}

function Achievements({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((a, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground/80">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span dir="auto">{a}</span>
        </li>
      ))}
    </ul>
  );
}

/** Everything about the entry, shown in the window that opens when its picture is clicked. */
function EducationDetail({ item, media }: { item: EducationItem; media: MediaItem[] }) {
  return (
    <div className="space-y-4">
      <header className="space-y-1.5 pr-10 lg:pr-0">
        <h3 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl" dir="auto">
          {item.degree}
        </h3>
        <p className="text-base font-medium text-primary" dir="auto">
          {item.institution}
          {item.field ? ` - ${item.field}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          {[period(item), media.length ? mediaSummary(media) : ''].filter(Boolean).join(' · ')}
        </p>
      </header>
      {item.description && (
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90" dir="auto">
          {item.description}
        </p>
      )}
      {item.achievements && item.achievements.length > 0 && (
        <Achievements items={item.achievements} />
      )}
    </div>
  );
}

// No hardcoded fallback data - unlike the core sections, an admin who hasn't
// populated any education records simply doesn't get this section rendered.
export default function Education({
  content,
  heading = 'education',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: EducationProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="education" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <SectionHeading
          title={heading}
          prefix={terminalPrefix}
          path={heading}
          icon={<GraduationCap />}
        />

        <div className="space-y-4">
          {content.map((item, idx) => {
            const media = toMediaItems(item.media);
            return (
              <div
                key={`${item.institution}-${idx}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <DetailCard
                  title={item.degree}
                  label={`View pictures and details: ${item.degree}, ${item.institution}`}
                  media={media}
                  detail={media.length > 0 ? <EducationDetail item={item} media={media} /> : null}
                  interactive={media.length > 0}
                  className="rounded-xl"
                >
                  <article className="flex flex-col gap-5 rounded-xl border border-border/30 bg-card/20 p-6 transition-all duration-500 group-hover/detail:border-primary/40 group-hover/detail:bg-card/30 sm:flex-row">
                    {media.length > 0 && (
                      <div className="w-full shrink-0 self-start overflow-hidden rounded-lg border border-border/30 sm:w-40">
                        <CardMedia
                          items={media}
                          title={item.degree}
                          aspect="aspect-[4/3]"
                          sizes="160px"
                          thumbs={false}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold text-foreground" dir="auto">
                            {item.degree}
                          </h3>
                          <p className="text-sm text-primary terminal:font-mono" dir="auto">
                            {item.institution}
                            {item.field ? ` - ${item.field}` : ''}
                          </p>
                        </div>
                        {period(item) && (
                          <span className="chip whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium terminal:font-mono">
                            {period(item)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p
                          className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground/80"
                          dir="auto"
                        >
                          {item.description}
                        </p>
                      )}
                      {item.achievements && item.achievements.length > 0 && (
                        <Achievements items={item.achievements} />
                      )}
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
