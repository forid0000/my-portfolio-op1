'use client';

import ProjectCard from './project-card';
import { Terminal } from 'lucide-react';
import { GithubIcon } from '@/components/icon/github';
import {
  DEFAULT_TERMINAL_PREFIX,
  GLOBAL_CONTENT_DEFAULTS,
  PROJECTS_DEFAULTS,
} from '@/lib/content-defaults';

interface Project {
  title: string;
  description: string;
  tags: string[];
  github: string;
  demo?: string;
  featured?: boolean;
}

interface ProjectsProps {
  terminalPrefix?: string;
  heading?: string;
  content?: Project[];
  githubUrl?: string;
}

export default function Projects({
  content,
  githubUrl,
  heading = 'My Projects',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: ProjectsProps) {
  const allReposUrl = githubUrl || GLOBAL_CONTENT_DEFAULTS.githubProfileUrl;
  const projects = content || PROJECTS_DEFAULTS;

  return (
    <section id="projects" className="section-spacing relative overflow-hidden">
      {/* Left Animated Line */}
      <div className="absolute top-0 bottom-0 left-4 md:left-10 w-[1px] bg-primary/10 hidden md:block">
        <div className="absolute top-0 left-0 w-[2px] h-32 bg-gradient-to-b from-transparent via-primary/50 to-transparent shadow-[0_0_15px_#00ffc8] animate-scan-y" />
      </div>

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        {/* Terminal Header */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <Terminal className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="sr-only">{heading}</h2>
          <div className="text-xl md:text-2xl font-mono font-bold tracking-tight">
            <span className="text-primary">{terminalPrefix}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-500">~/projects</span>
            <span className="text-muted-foreground">$</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {projects.map((project, index) => (
            <div
              key={project.title}
              style={{ animationDelay: `${index * 0.1}s` }}
              className="animate-fade-in-up"
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>

        <div className="text-center pt-12">
          <div className="relative group inline-block">
            {/* Decorative Tech logic: outer brackets */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors duration-500" />

            <a
              href={allReposUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fire-button relative px-8 py-4 flex items-center justify-center gap-3 group !bg-transparent hover:!bg-primary/5 border border-primary/20 hover:border-primary transition-all duration-500 rounded-lg overflow-hidden"
            >
              <span className="text-xs font-black tracking-[0.3em] uppercase text-primary transition-colors duration-500">
                &gt; git checkout all_repositories
              </span>
              <div className="w-8 h-px bg-primary/30 group-hover:w-12 transition-all duration-500" />
              <GithubIcon className="w-5 h-5 text-primary transition-all duration-500 group-hover:scale-110" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
