'use client';

import { ExternalLink, Activity } from 'lucide-react';
import { GithubIcon } from '@/components/icon/github';
import TargetCard from './target-card';

interface ProjectCardProps {
  project: {
    title: string;
    description: string;
    tags: string[];
    github: string;
    demo?: string;
    featured?: boolean;
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="group h-full transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02]">
      <TargetCard className="rounded-xl bg-card border border-border/50 h-full overflow-hidden relative">
        <div className="relative h-full p-6 sm:p-8 bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,200,0.15)]">
          {/* SCANNER EFFECT ON HOVER */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_15px_rgba(0,255,200,0.8)] z-20 group-hover:animate-[scan_2s_linear_infinite]" />

          {/* Neon gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full gap-4">
            {/* Header: Title */}
            <div className="flex justify-between items-start">
              <h3 className="text-lg sm:text-xl font-bold font-mono text-foreground group-hover:text-primary transition-colors duration-300">
                {project.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-grow font-mono border-l-2 border-primary/10 pl-3">
              {project.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 bg-primary/5 text-primary/80 rounded border border-primary/20 group-hover:border-primary/50 transition-colors duration-300 font-mono"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 pt-4 border-t border-border/30">
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors duration-300 font-medium group/link"
              >
                <GithubIcon className="w-4 h-4 group-hover/link:animate-bounce" />
                <span className="font-mono">Code</span>
              </a>

              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 font-medium group/link"
                >
                  <ExternalLink className="w-4 h-4 group-hover/link:scale-110 transition-transform" />
                  <span className="font-mono">Demo</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </TargetCard>
    </div>
  );
}
