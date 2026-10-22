import Image from 'next/image';
import { Quote } from 'lucide-react';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
export interface TestimonialItem {
  name: string;
  title?: string;
  company?: string;
  quote: string;
  avatar?: { src: string; public_id: string };
}

interface TestimonialsProps {
  content?: TestimonialItem[];
  heading?: string;
  terminalPrefix?: string;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Testimonials({
  content,
  heading = 'testimonials',
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: TestimonialsProps) {
  if (!content || content.length === 0) return null;

  return (
    <section id="testimonials" className="section-spacing relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10 space-y-12">
        <div className="flex items-center gap-3 animate-fade-in-up">
          <Quote className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tight">
            <span className="text-primary">{terminalPrefix}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-500">~/{heading}</span>
            <span className="text-muted-foreground">$</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="animate-fade-in-up bg-card/20 border border-border/30 hover:border-primary/40 hover:bg-card/30 transition-all duration-500 rounded-xl p-6 flex flex-col"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <Quote className="w-5 h-5 text-primary/40 mb-3" />
              <p className="text-sm text-muted-foreground/80 leading-relaxed flex-1">
                {item.quote}
              </p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/20">
                {item.avatar?.src ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border/30">
                    <Image
                      src={item.avatar.src}
                      alt={item.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-mono font-bold text-primary">
                    {initials(item.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {[item.title, item.company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
