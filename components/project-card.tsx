import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/icon/github';
import CardMedia from '@/components/site/card-media';
import DetailCard from '@/components/site/detail-card';
import { mediaSummary, toMediaItems } from '@/lib/media-display';
import { toHref } from '@/lib/safe-href';
import type { MediaItem } from '@/lib/media-types';
import { chipClass } from '@/lib/chip-hue';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectData {
  title: string;
  description: string;
  tags: string[];
  /** Labelled links of any kind (live site, case study, Behance, repository...). */
  links?: ProjectLink[];
  /** Pictures and videos; the first is the main cover. */
  media?: MediaItem[];
  // Legacy single links from before `links` existed; still shown when `links` is absent.
  github?: string;
  demo?: string;
  featured?: boolean;
}

interface ProjectCardProps {
  project: ProjectData;
}

/** The links to show: the new list when present, otherwise the old github/demo pair. */
export function projectLinks(project: ProjectData): ProjectLink[] {
  const raw: ProjectLink[] = Array.isArray(project.links)
    ? project.links
    : [
        ...(project.github ? [{ label: 'Code', url: project.github }] : []),
        ...(project.demo ? [{ label: 'Demo', url: project.demo }] : []),
      ];
  return raw.filter((l) => l.label && toHref(l.url));
}

const isCodeLabel = (label: string) => /code|github|source|repo/i.test(label);

function LinkIcon({ label }: { label: string }) {
  return isCodeLabel(label) ? (
    <GithubIcon className="h-4 w-4" />
  ) : (
    <ExternalLink className="h-4 w-4" />
  );
}

/** Everything about the project, shown in the window that opens when the card is clicked. */
function ProjectDetail({
  project,
  links,
  media,
}: {
  project: ProjectData;
  links: ProjectLink[];
  media: MediaItem[];
}) {
  const tags = project.tags ?? [];
  return (
    <div className="space-y-6">
      <header className="space-y-1.5 pr-10 lg:pr-0">
        <h3 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl" dir="auto">
          {project.title}
        </h3>
        {media.length > 0 && <p className="text-sm text-muted-foreground">{mediaSummary(media)}</p>}
      </header>

      {project.description && (
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/90" dir="auto">
          {project.description}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`${chipClass(tag)} rounded-md border px-2.5 py-1 text-xs font-medium`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          {links.map((link, i) => (
            <a
              key={`${link.label}-${i}`}
              href={toHref(link.url) as string}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                i === 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border text-foreground hover:border-primary/50 hover:text-primary'
              }`}
            >
              <LinkIcon label={link.label} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A project on the landing page: the whole card opens a window with every picture and video,
 * the full text and all links. The pictures and text of the card itself are in the server HTML.
 */
export default function ProjectCard({ project }: ProjectCardProps) {
  const links = projectLinks(project);
  const media = toMediaItems(project.media);
  const tags = project.tags ?? [];

  return (
    <DetailCard
      title={project.title}
      label={`View project: ${project.title}`}
      media={media}
      detail={<ProjectDetail project={project} links={links} media={media} />}
      className="h-full rounded-xl"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 group-hover/detail:-translate-y-1 group-hover/detail:border-primary/50 group-hover/detail:shadow-glow-sm">
        <CardMedia items={media} title={project.title} />

        <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
          <h3
            className="text-lg font-bold text-foreground transition-colors duration-300 group-hover/detail:text-primary sm:text-xl"
            dir="auto"
          >
            {project.title}
          </h3>

          {project.description && (
            <p
              className="line-clamp-4 whitespace-pre-line border-l-2 border-primary/10 pl-3 text-sm leading-relaxed text-muted-foreground sm:text-base"
              dir="auto"
            >
              {project.description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className={`${chipClass(tag)} rounded border px-2.5 py-1 text-xs font-medium`}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 5 && (
                <span className="px-1 py-1 text-xs text-muted-foreground">+{tags.length - 5}</span>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/30 pt-4">
            <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2">
              {links.slice(0, 2).map((link, i) => (
                <a
                  key={`${link.label}-${i}`}
                  href={toHref(link.url) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
                    i === 0
                      ? 'text-primary hover:text-primary/80'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  <LinkIcon label={link.label} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover/detail:text-primary"
            >
              Details <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </article>
    </DetailCard>
  );
}
