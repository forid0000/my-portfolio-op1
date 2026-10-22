import { GraduationCap } from 'lucide-react';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
export interface EducationItem {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  achievements?: string[];
}

interface EducationProps {
  content?: EducationItem[];
  heading?: string;
  terminalPrefix?: string;
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
        <div className="flex items-center gap-3 animate-fade-in-up">
          <GraduationCap className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tight">
            <span className="text-primary">{terminalPrefix}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-500">~/{heading}</span>
            <span className="text-muted-foreground">$</span>
          </h2>
        </div>

        <div className="space-y-4">
          {content.map((item, idx) => (
            <div
              key={`${item.institution}-${idx}`}
              className="animate-fade-in-up bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 rounded-xl p-6"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{item.degree}</h3>
                  <p className="text-sm text-primary font-mono">
                    {item.institution}
                    {item.field ? ` - ${item.field}` : ''}
                  </p>
                </div>
                <span className="text-xs font-mono text-muted-foreground/70 border border-border/30 px-2 py-0.5 rounded bg-secondary/20 whitespace-nowrap">
                  {item.startDate}
                  {item.startDate && (item.endDate || item.current) ? ' - ' : ''}
                  {item.current ? 'Present' : item.endDate}
                </span>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground/80 leading-relaxed mt-2">
                  {item.description}
                </p>
              )}
              {item.achievements && item.achievements.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {item.achievements.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
