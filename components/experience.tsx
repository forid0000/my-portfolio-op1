'use client';

import SectionHeading from '@/components/section-heading';
import { Briefcase, Calendar, MapPin } from 'lucide-react';
import { DEFAULT_TERMINAL_PREFIX, EXPERIENCE_DEFAULTS } from '@/lib/content-defaults';
import { chipClass } from '@/lib/chip-hue';
import { ByStyle } from '@/components/by-style';

interface ExperienceProps {
  terminalPrefix?: string;
  heading?: string;
  content?: {
    role: string;
    displayRole: string;
    company: string;
    type: string;
    period: string;
    location: string;
    description: string;
    skills: string[];
  }[];
}

export default function Experience({
  content,
  heading = 'Experience',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: ExperienceProps) {
  const experiencesData = content ?? EXPERIENCE_DEFAULTS;
  if (experiencesData.length === 0) return null;

  return (
    <section id="experience" className="section-spacing relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        {/* Terminal Header */}
        <SectionHeading title={heading} prefix={terminalPrefix} path={'experience'} />

        {/* Timeline Container */}
        <div className="relative ml-3 md:ml-6 space-y-12 py-4">
          {/* THE ANIMATED LINE (Replaces the border-l-2) */}
          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-border/40 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-primary to-transparent shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_60%,transparent)] animate-scan-y" />
          </div>

          {experiencesData.map((exp, idx) => (
            <div
              key={idx}
              className="relative pl-8 md:pl-12 group animate-fade-in-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Timeline Node (The Dot) - Adjusted position to sit on the new line */}
              <div className="absolute -left-[7px] top-6 w-4 h-4 rounded-full bg-background border-2 border-muted-foreground group-hover:border-primary group-hover:bg-primary/20 transition-all duration-300 shadow-[0_0_0_4px_var(--background)] z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="relative bg-card/20 border border-border/30 p-6 rounded-lg transition-all duration-500 hover:border-border/50 hover:bg-card/30 overflow-hidden">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs terminal:font-mono text-muted-foreground mb-1">
                      <span className="text-primary tracking-wider">// {exp.type}</span>
                    </div>
                    <h3 className="text-xl font-bold terminal:font-mono text-foreground group-hover:text-primary transition-colors">
                      {exp.displayRole}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground terminal:font-mono">
                      <Briefcase className="w-3 h-3" />
                      <span className="text-foreground/80 font-semibold">@{exp.company}</span>
                    </div>
                  </div>

                  {/* Metadata Right Side */}
                  <div className="text-right flex flex-col items-start md:items-end gap-2 terminal:font-mono text-xs text-muted-foreground mt-2 md:mt-0">
                    <div className="flex items-center gap-2 bg-background/40 px-2 py-1 rounded border border-border/30 group-hover:border-primary/30 transition-colors">
                      <Calendar className="w-3 h-3 text-primary/70" />
                      {exp.period}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <MapPin className="w-3 h-3 text-primary/70" />
                      {exp.location}
                    </div>
                  </div>
                </div>

                {/* Description Log */}
                <div className="terminal:font-mono text-sm leading-relaxed mb-6 pl-4 border-l-2 border-primary/20 text-muted-foreground/70 group-hover:text-muted-foreground/90 transition-colors">
                  <span className="text-primary mr-2 opacity-50 select-none">&gt;</span>
                  {exp.description}
                </div>

                {/* Skills/Modules */}
                <div className="flex flex-wrap gap-2">
                  {exp.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`${chipClass(skill)} select-none rounded border px-2 py-1 text-xs font-medium terminal:font-mono`}
                    >
                      <ByStyle clean={skill} terminal={`[${skill}]`} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Timeline End Node */}
          <div className="absolute -left-[3px] bottom-0 w-2 h-2 rounded-full bg-border/60" />
        </div>
      </div>
    </section>
  );
}
