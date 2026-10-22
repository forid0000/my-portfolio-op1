import type { CSSProperties } from 'react';
import { Container } from '@/components/site/primitives';
import { Terminal } from 'lucide-react';
import { DynamicLucideIcon } from '@/components/dynamic-lucide-icon';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
/**
 * "Industry Expertise" — dark terminal-styled grid of expertise cards, fully
 * CMS-driven (title, description, lucide icon name, skills) with a static
 * fallback mirroring the API defaults. Server component, zero client JS: the
 * split-border weave, per-card accent and ambient sweep are pure CSS (see the
 * ie-card block in globals.css); hover suspends the sweep so pointer state
 * always wins. Icons resolve from lucide by name (any icon, admin-picked via
 * the IconPicker) so the admin isn't limited to a hardcoded set.
 */

type ExpertiseItem = {
  name: string;
  description?: string;
  icon?: string;
  skills?: string[];
};

const DEFAULT_EXPERTISES: ExpertiseItem[] = [
  {
    name: 'Frontend_Architecture',
    description:
      'Building scalable, accessible, and high-performance user interfaces with modern frameworks and state management.',
    icon: 'Layers',
    skills: ['React/Next.js', 'Vue/Nuxt', 'TypeScript', 'TailwindCSS', 'Redux/Zustand'],
  },
  {
    name: 'Backend_Systems',
    description:
      'Designing robust APIs, microservices, and database architectures optimized for high concurrency and secure data handling.',
    icon: 'Server',
    skills: ['Node.js/Express', 'Python/Django', 'Go (Golang)', 'PostgreSQL', 'MongoDB'],
  },
  {
    name: 'DevOps_&_Cloud',
    description:
      'Automating deployment pipelines, containerizing applications, and orchestrating cloud infrastructure for zero-downtime scalability.',
    icon: 'CloudCog',
    skills: ['Docker', 'Kubernetes', 'AWS (EC2/S3)', 'CI/CD Pipelines', 'Nginx'],
  },
];

/**
 * Split-border patterns cycled across the cards (by index). Each card is framed
 * on only two adjacent sides — an L-bracket — and the bracket's corner rotates
 * card to card, so no two neighbours share the same border and the grid reads
 * as a woven pattern rather than a uniform boxed matrix.
 */
const CORNERS = [
  'border-l border-t rounded-tl-2xl',
  'border-r border-t rounded-tr-2xl',
  'border-r border-b rounded-br-2xl',
  'border-l border-b rounded-bl-2xl',
];

/**
 * Per-card accent colour, indexed to the items. 400-range shades so the
 * spectrum stays legible against the dark background; emerald leads to match
 * the site's primary.
 */
const COLORS = [
  '#34d399', // emerald-400
  '#22d3ee', // cyan-400
  '#a78bfa', // violet-400
  '#fb923c', // orange-400
  '#60a5fa', // blue-400
  '#f472b6', // pink-400
  '#2dd4bf', // teal-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
  '#818cf8', // indigo-400
  '#4ade80', // green-400
  '#facc15', // yellow-400
];

interface IndustryExpertiseProps {
  heading?: string;
  terminalPrefix?: string;
  content?: ExpertiseItem[];
}

export default function IndustryExpertise({
  heading,
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
  content,
}: IndustryExpertiseProps) {
  const data = Array.isArray(content) && content.length > 0 ? content : DEFAULT_EXPERTISES;

  return (
    <section
      id="industry-expertise"
      aria-labelledby="industries-heading"
      className="scroll-mt-20 bg-transparent section-spacing"
    >
      <Container className="flex flex-col gap-10 lg:gap-14 relative z-10">
        <div className="flex flex-col gap-2 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-primary animate-pulse" />
            <h2
              id="industries-heading"
              className="text-xl md:text-2xl font-mono font-bold tracking-tight"
            >
              <span className="text-primary">{terminalPrefix}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-blue-500">~/expertises</span>
              <span className="text-muted-foreground">$</span>
            </h2>
          </div>
          {heading && (
            <p className="pl-9 font-mono text-sm text-muted-foreground/60">
              <span className="select-none">{'// '}</span>
              {heading}
            </p>
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
          {data.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              // --ie-d staggers the ambient sweep so cards light up one after
              // another; --ie-c is this card's accent colour. Both are shared
              // by the border, glyph and underline (keyframes + hover).
              style={
                {
                  '--ie-d': `${index * 0.7}s`,
                  '--ie-c': COLORS[index % COLORS.length],
                } as CSSProperties
              }
              className={`ie-card group flex flex-col gap-3 border-[color-mix(in_srgb,var(--ie-c)_28%,transparent)] bg-card/20 p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:border-(--ie-c) hover:shadow-[0_0_18px_color-mix(in_srgb,var(--ie-c)_22%,transparent)] ${CORNERS[index % CORNERS.length]}`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="ie-glyph text-[color-mix(in_srgb,var(--ie-c)_75%,transparent)] transition-colors duration-300 group-hover:text-(--ie-c) [&_svg]:size-5">
                  <DynamicLucideIcon name={item.icon} />
                </span>
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground/50 transition-colors duration-300 group-hover:text-[color-mix(in_srgb,var(--ie-c)_70%,transparent)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="font-mono text-sm font-semibold leading-snug tracking-tight text-foreground">
                <span className="ie-underline bg-linear-to-r from-(--ie-c) to-(--ie-c) bg-size-[0%_1px] bg-bottom-left bg-no-repeat pb-0.5 transition-[background-size] duration-300 ease-out group-hover:bg-size-[100%_1px]">
                  {item.name}
                </span>
              </h3>

              {item.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              )}

              {Array.isArray(item.skills) && item.skills.length > 0 && (
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {item.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded border border-border/60 bg-background/40 px-1.5 py-1 font-mono text-[10px] leading-none text-muted-foreground transition-colors duration-300 group-hover:border-[color-mix(in_srgb,var(--ie-c)_45%,transparent)] group-hover:text-foreground"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
