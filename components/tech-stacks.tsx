import type React from 'react';
import { Container } from '@/components/site/primitives';
import SectionHeading from '@/components/section-heading';
import {} from 'lucide-react';
import { Marquee } from '@/components/site/marquee';

import { DEFAULT_TERMINAL_PREFIX } from '@/lib/content-defaults';
const TECH_ICONS: Record<string, string> = {
  Laravel: 'laravel',
  React: 'react',
  PHP: 'php',
  Java: 'java',
  Python: 'python',
  'Vue js': 'vuejs',
  Go: 'go',
  'Node js': 'nodejs',
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  'Next js': 'nextjs',
  Angular: 'angular',
  Svelte: 'svelte',
  Ruby: 'ruby',
  Rails: 'rails',
  Django: 'django',
  Flask: 'flask',
  Spring: 'spring',
  Kotlin: 'kotlin',
  Swift: 'swift',
  '.Net': 'dotnet',
  Azure: 'azure',
  Aws: 'aws',
  Flutter: 'flutter',
  Docker: 'docker',
  Kubernetes: 'kubernetes',
  GraphQL: 'graphql',
  PostgreSQL: 'postgresql',
  MySQL: 'mysql',
  MongoDB: 'mongodb',
  Redis: 'redis',
  Rust: 'rust',
  'C++': 'cplusplus',
  'C#': 'csharp',
  Tailwind: 'tailwind',
  Firebase: 'firebase',
  Elixir: 'elixir',
};

const ROW1_TECH: string[] = [
  'React',
  'TypeScript',
  'Node js',
  'Next js',
  'Python',
  'Go',
  'JavaScript',
  'Tailwind',
  'GraphQL',
  'Docker',
];

const ROW2_TECH: string[] = [
  'Kubernetes',
  'Aws',
  'Azure',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'MySQL',
  'Firebase',
  'Rust',
  'C++',
];

const ROW3_TECH: string[] = [
  'PHP',
  'Laravel',
  'Vue js',
  'Angular',
  'Svelte',
  'Ruby',
  'Rails',
  'Django',
  'Flask',
  'Spring',
];

/**
 * Repeats a row until one marquee half is wider than a large screen (the Marquee
 * itself doubles its children for a seamless loop). Enough to look continuous
 * without rendering hundreds of chips, each with its own image.
 */
const MIN_CHIPS_PER_HALF = 20;

function fillRow(items: string[]): string[] {
  if (items.length === 0) return [];
  const copies = Math.ceil(MIN_CHIPS_PER_HALF / items.length);
  return Array.from({ length: copies }, () => items).flat();
}

/** Logos drawn in plain white or light grey: invisible on a light page, so they take the text colour. */
const MONOCHROME_ICONS = new Set(['nextjs', 'flask']);

function TechChip({ name }: { name: string }) {
  const icon = TECH_ICONS[name];
  return (
    <div className="tech-chip">
      {icon && MONOCHROME_ICONS.has(icon) ? (
        <i
          aria-hidden="true"
          className="tech-icon-mono"
          style={{ '--tech-icon': `url(/tech-icons/${icon}.svg)` } as React.CSSProperties}
        />
      ) : icon ? (
        // Plain <img>: these are small local SVGs, so the image optimizer adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/tech-icons/${icon}.svg`}
          alt={name}
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span>{name}</span>
    </div>
  );
}

interface TechStacksProps {
  terminalPrefix?: string;
  heading?: string;
  content?: { row1?: string[]; row2?: string[]; row3?: string[] };
}

export default function TechStacks({
  heading = 'tech_stacks',
  content,
  terminalPrefix = DEFAULT_TERMINAL_PREFIX,
}: TechStacksProps) {
  const row1 = fillRow(content?.row1 ?? ROW1_TECH);
  const row2 = fillRow(content?.row2 ?? ROW2_TECH);
  const row3 = fillRow(content?.row3 ?? ROW3_TECH);

  return (
    <section
      id="tech-stacks"
      aria-labelledby="tech-stacks-heading"
      className="relative overflow-hidden bg-transparent section-spacing"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent pointer-events-none" />

      <Container className="relative z-10">
        <SectionHeading
          title={heading || 'Tools & Technologies'}
          prefix={terminalPrefix}
          path={'tech-stacks'}
        />
      </Container>

      <div className="relative z-10 flex flex-col gap-4 md:gap-5 items-center w-full mt-10 md:mt-14">
        {/* Row 1 */}
        <Marquee
          direction="left"
          speed={160}
          pauseOnHover
          fade
          className="w-full py-2"
          trackClassName="gap-4 sm:gap-5"
        >
          {row1.map((name, idx) => (
            <TechChip key={`${name}-row1-${idx}`} name={name} />
          ))}
        </Marquee>

        {/* Row 2 */}
        <Marquee
          direction="right"
          speed={160}
          pauseOnHover
          fade
          className="w-full py-2"
          trackClassName="gap-4 sm:gap-5"
        >
          {row2.map((name, idx) => (
            <TechChip key={`${name}-row2-${idx}`} name={name} />
          ))}
        </Marquee>

        {/* Row 3 */}
        <Marquee
          direction="left"
          speed={160}
          pauseOnHover
          fade
          className="w-full py-2"
          trackClassName="gap-4 sm:gap-5"
        >
          {row3.map((name, idx) => (
            <TechChip key={`${name}-row3-${idx}`} name={name} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
