'use client';

import { ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/icon/github';
import MediaGallery from '@/components/media-gallery';
import TargetCard from './target-card';
import { toHref } from '@/lib/safe-href';
import type { MediaItem } from '@/lib/media-types';

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

export default function ProjectCard({ project }: ProjectCardProps) {
  const links = projectLinks(project);
  const media = project.media ?? [];

  return (
    <div className="group h-full transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02]">
      <TargetCard className="rounded-xl bg-card border border-border/50 h-full overflow-hidden relative">
        <div className="relative h-full bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,200,0.15)]">
          {/* Neon gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {media.length > 0 && <MediaGallery items={media} title={project.title} />}

          {/* Content */}
          <div className="relative z-10 flex flex-col gap-4 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {project.title}
            </h3>

            {project.description && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-grow border-l-2 border-primary/10 pl-3 whitespace-pre-line">
                {project.description}
              </p>
            )}

            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 bg-primary/5 text-primary/80 rounded border border-primary/20 group-hover:border-primary/50 transition-colors duration-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {links.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-border/30">
                {links.map((link, i) => (
                  <a
                    key={`${link.label}-${i}`}
                    href={toHref(link.url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 text-sm transition-colors duration-300 font-medium group/link ${
                      i === 0
                        ? 'text-primary hover:text-primary/80'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {isCodeLabel(link.label) ? (
                      <GithubIcon className="w-4 h-4" />
                    ) : (
                      <ExternalLink className="w-4 h-4 group-hover/link:scale-110 transition-transform" />
                    )}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </TargetCard>
    </div>
  );
}
