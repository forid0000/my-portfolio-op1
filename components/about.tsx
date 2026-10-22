import { Terminal, Cpu, ShieldCheck, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';
import { ABOUT_DEFAULTS, DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';

interface AboutProps {
  terminalPrefix?: string;
  heading?: string;
  content?: {
    bioText: string;
    whatIDo: { title: string; desc: string }[];
    quote: string;
    stats: { value: string; label: string; icon: string }[];
    statusTitle?: string;
    statusLabel?: string;
    kernelValue?: string;
    uptimeValue?: string;
  };
}

export default function About({
  content,
  heading = 'About Me',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: AboutProps) {
  const stats = content?.stats || ABOUT_DEFAULTS.stats;

  const whatIDo = content?.whatIDo || ABOUT_DEFAULTS.whatIDo;
  return (
    <section id="about" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Terminal Header */}
        <div className="flex items-center gap-3 mb-12 animate-fade-in-up">
          <Terminal className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="sr-only">{heading}</h2>
          <div className="text-xl md:text-2xl font-mono font-bold tracking-tight">
            <span className="text-primary">{terminalPrefix}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-500">~/about</span>
            <span className="text-muted-foreground">$</span>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-12">
          {/* LEFT: System Logs (Bio) */}
          <div
            className="md:col-span-7 space-y-10 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            {/* Bio Box with Alive Data Line */}
            <div className="relative pl-8">
              {/* ANIMATED LINE LEFT */}
              <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-primary/10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-transparent via-primary to-transparent shadow-[0_0_10px_#00ffc8] animate-scan-y" />
              </div>

              {/* Decorative Square top-left */}
              <div className="absolute top-0 left-[-4px] w-2 h-2 border border-primary bg-background z-10" />

              <div className="text-lg text-muted-foreground/80 leading-relaxed font-mono relative z-10 prose prose-invert max-w-none">
                <ReactMarkdown>{content?.bioText || ABOUT_DEFAULTS.bioText}</ReactMarkdown>
              </div>
            </div>

            {/* "What I Do" Log */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-mono text-primary/80 uppercase tracking-widest border-b border-border/40 pb-2">
                <Activity className="w-4 h-4 animate-pulse" />[ ACTIVE_PROCESSES ]
              </div>

              <ul className="space-y-4">
                {whatIDo.map(({ title, desc }) => (
                  <li
                    key={title}
                    className="group relative bg-card/20 p-4 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-card/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-500 overflow-hidden"
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-baseline gap-2">
                      <span className="font-mono text-primary text-sm whitespace-nowrap flex items-center gap-2">
                        <span className="font-bold">{title}</span>
                      </span>
                      <span className="hidden sm:inline text-muted-foreground/30">--</span>
                      <span className="text-sm text-muted-foreground/70 group-hover:text-foreground transition-colors duration-500">
                        {desc}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quote Block */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-md font-mono text-sm text-primary/80 flex gap-3 items-start">
              <span className="text-xl leading-none">"</span>
              <span>{content?.quote || ABOUT_DEFAULTS.quote}</span>
            </div>
          </div>

          {/* RIGHT: System Status (Stats) */}
          <div className="md:col-span-5 relative">
            <div
              className="sticky top-24 space-y-6 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              {/* Stats Panel with SCANNER Effect */}
              <div className="bg-card/30 border border-border/30 rounded-xl p-6 relative overflow-hidden group hover:border-primary/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500">
                {/* Removed Scanner Animation */}

                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2 relative z-10">
                  <Cpu className="w-4 h-4" /> System_Diagnostics
                </h3>

                <div className="space-y-6 relative z-10">
                  {stats.map((stat, i) => (
                    <div key={stat.label} className="relative">
                      <div className="flex justify-between items-end mb-2 font-mono text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <DynamicLucideIcon name={stat.icon} className="w-4 h-4" /> {stat.label}
                        </span>
                        <span className="text-primary font-bold text-lg">{stat.value}</span>
                      </div>
                      {/* Progress Bar Visual */}
                      <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: i === 2 ? '100%' : '75%' }}
                          className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] relative animate-bar-fill"
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Decorative Tech Elements */}
                <div className="mt-8 pt-4 border-t border-dashed border-border/40 grid grid-cols-2 gap-4 text-[10px] font-mono text-muted-foreground/60 uppercase relative z-10">
                  <div className="">
                    <span className="block text-primary/40">KERNEL</span>
                    {content?.kernelValue || ABOUT_DEFAULTS.kernelValue}
                  </div>
                  <div className="text-right">
                    <span className="block text-primary/40">UPTIME</span>
                    {content?.uptimeValue || ABOUT_DEFAULTS.uptimeValue}
                  </div>
                </div>
              </div>

              {/* Additional Info / Badge */}
              <div className="flex items-center gap-4 p-4 border border-primary/20 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors cursor-help">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center text-primary relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                  <ShieldCheck className="w-5 h-5 relative z-10" />
                </div>
                <div className="">
                  <div className="text-sm font-bold text-foreground">
                    {content?.statusTitle || ABOUT_DEFAULTS.statusTitle}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    status: {content?.statusLabel || ABOUT_DEFAULTS.statusLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
