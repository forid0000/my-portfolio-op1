import SectionHeading from '@/components/section-heading';
import ProjectCard, { type ProjectData } from './project-card';
import { ArrowUpRight } from 'lucide-react';
import { DEFAULT_TERMINAL_PREFIX, PROJECTS_DEFAULTS } from '@/lib/content-defaults';
import { toHref } from '@/lib/safe-href';

interface ProjectsProps {
  terminalPrefix?: string;
  heading?: string;
  content?: ProjectData[];
  /** Fallback target for the "see more" button when the owner has not set one. */
  githubUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export default function Projects({
  content,
  githubUrl,
  ctaLabel,
  ctaUrl,
  heading = 'Projects',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: ProjectsProps) {
  // The placeholders only stand in until something is saved; a saved empty list hides the section.
  const projects = content ?? PROJECTS_DEFAULTS;
  if (projects.length === 0) return null;
  // Optional: shown only when there is somewhere to go (the owner's address, else the profile link).
  const moreUrl = toHref(ctaUrl) || toHref(githubUrl);

  return (
    <section id="projects" className="section-spacing relative overflow-hidden">
      {/* Left animated line (terminal style only) */}
      <div className="absolute top-0 bottom-0 left-4 md:left-10 w-[1px] bg-primary/10 hidden terminal:md:block">
        <div className="absolute top-0 left-0 w-[2px] h-32 bg-gradient-to-b from-transparent via-primary/50 to-transparent shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_80%,transparent)] animate-scan-y" />
      </div>

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        <SectionHeading title={heading} prefix={terminalPrefix} path="projects" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {projects.map((project, index) => (
            <div
              key={`${project.title}-${index}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-fade-in-up h-full"
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>

        {moreUrl && (
          <div className="text-center pt-8">
            <a
              href={moreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
            >
              {ctaLabel?.trim() || 'View all work'}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
