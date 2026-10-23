import type { CSSProperties } from 'react';
import SectionHeading from '@/components/section-heading';
import { Container } from '@/components/site/primitives';
import {} from 'lucide-react';
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
 * Per-card accent colour, indexed to the items: the theme's chart palette (twelve hues spread
 * around the wheel, starting at the brand colour), so cards follow whatever palette is chosen
 * in Admin -> Appearance.
 */
const COLORS = Array.from({ length: 12 }, (_, i) => `var(--chart-${i + 1})`);

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
          <SectionHeading
            title={heading || 'Expertise'}
            prefix={terminalPrefix}
            path={'expertises'}
            id="industries-heading"
          />
          {heading && (
            <p className="pl-9 terminal:font-mono text-sm text-muted-foreground/60">
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
                <span className="terminal:font-mono text-[10px] tracking-widest text-muted-foreground/50 transition-colors duration-300 group-hover:text-[color-mix(in_srgb,var(--ie-c)_70%,transparent)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="terminal:font-mono text-sm font-semibold leading-snug tracking-tight text-foreground">
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
                      className="rounded border border-border/60 bg-background/40 px-1.5 py-1 terminal:font-mono text-[10px] leading-none text-muted-foreground transition-colors duration-300 group-hover:border-[color-mix(in_srgb,var(--ie-c)_45%,transparent)] group-hover:text-foreground"
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
