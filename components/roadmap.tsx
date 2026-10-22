import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';
import { ROADMAP_DEFAULTS } from '@/lib/content-defaults';

interface RoadmapItem {
  year: string;
  title: string;
  description: string;
  tech: string[];
  icon: string;
}

interface RoadmapProps {
  heading?: string;
  highlight?: string;
  content?: RoadmapItem[];
}

export default function Roadmap({
  content,
  heading = 'System',
  highlight = 'Evolution_Path',
}: RoadmapProps) {
  const roadmapItems = content || ROADMAP_DEFAULTS;

  return (
    <section id="roadmap" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {heading} <span className="text-primary">{highlight}</span>
          </h2>
        </div>

        <div className="relative">
          {/* CENTRAL WIRE (The Spine) */}
          {/* Mobile: Left aligned / Desktop: Centered */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2">
            {/* Moving signal light */}
            <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-24 bg-gradient-to-b from-transparent via-primary to-transparent shadow-[0_0_15px_#00ffc8] animate-scan-y" />
          </div>

          {/* Reduced gap from space-y-24 to space-y-12 */}
          <div className="space-y-8 md:space-y-12">
            {roadmapItems.map((item, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  className={`relative flex items-center md:justify-between animate-fade-in-up ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* EMPTY SPACE for alignment on desktop */}
                  {/* Widen the content area slightly */}
                  <div className="hidden md:block w-[45%]" />

                  {/* CONNECTION NODE (The Dot on the Wire) */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full border border-primary/50 bg-background z-20 shadow-[0_0_10px_rgba(0,255,200,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>

                  {/* HORIZONTAL TRACE (Wire to Card) */}
                  <div
                    className={`absolute h-px bg-primary/30 top-1/2 hidden md:block w-[5%] ${isEven ? 'right-1/2 translate-x-3' : 'left-1/2 -translate-x-3'}`}
                  />

                  {/* CONTENT CARD */}
                  <div className="w-full md:w-[45%] pl-20 md:pl-0">
                    <div className="group relative bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] p-5 rounded-xl transition-all duration-500">
                      {/* Hover Gradient Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />

                      <div className="relative z-10">
                        {/* Date & Icon Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs text-primary/80 border border-primary/20 px-2 py-0.5 rounded bg-primary/5">
                            {item.year}
                          </span>
                          <span className="text-muted-foreground group-hover:text-primary transition-colors">
                            <DynamicLucideIcon name={item.icon} className="w-5 h-5" />
                          </span>
                        </div>

                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-sm text-muted-foreground/70 leading-relaxed mb-3">
                          {item.description}
                        </p>

                        {/* Tech Tags */}
                        <div className="flex flex-wrap gap-2">
                          {item.tech.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 bg-secondary/30 px-2 py-1 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
