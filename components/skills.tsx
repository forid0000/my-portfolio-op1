import {} from 'lucide-react';
import SectionHeading from '@/components/section-heading';
import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';
import { DEFAULT_TERMINAL_PREFIX, SKILLS_DEFAULTS } from '@/lib/content-defaults';

interface SkillsProps {
  terminalPrefix?: string;
  heading?: string;
  content?: {
    name: string;
    icon: string;
    skills: { name: string; progress: number }[];
  }[];
}

export default function Skills({
  content,
  heading = 'skills',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: SkillsProps) {
  const categories = content || SKILLS_DEFAULTS;

  return (
    <section id="skills" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        {/* Terminal Header */}
        <SectionHeading title={heading || 'Skills'} prefix={terminalPrefix} path={'skills'} />

        {/* Skills Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {categories.map((category, idx) => (
            <div
              key={category.name}
              className="animate-fade-in-up group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="bg-card/20 border border-border/30 rounded-xl overflow-hidden hover:border-primary/40 hover:bg-card/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500 h-full">
                {/* Category Header */}
                <div className="bg-primary/5 border-b border-border/30 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 terminal:font-mono text-primary font-bold tracking-wide">
                    <DynamicLucideIcon name={category.icon} className="w-4 h-4" />
                    {category.name.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Skills List */}
                <div className="p-6 space-y-5">
                  {category.skills.map((skill, sIdx) => (
                    <div key={skill.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm terminal:font-mono">
                        <span className="text-foreground/80 group-hover:text-foreground transition-colors duration-300">
                          {skill.name}
                        </span>
                        <span className="text-muted-foreground/60 text-xs font-bold">
                          {skill.progress}%
                        </span>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="h-1.5 w-full bg-background/50 rounded-full overflow-hidden border border-border/20">
                        {/* Animated Bar */}
                        <div
                          style={{ width: `${skill.progress}%` }}
                          className="h-full bg-primary/80 group-hover:bg-primary relative animate-bar-fill"
                        >
                          {/* Shimmer Effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
