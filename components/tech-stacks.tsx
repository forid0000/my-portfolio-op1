import Image from 'next/image';
import { Container } from '@/components/site/primitives';
import { Terminal } from 'lucide-react';
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

const ROW1_DUPLICATED = [
  ...ROW1_TECH,
  ...ROW1_TECH,
  ...ROW1_TECH,
  ...ROW1_TECH,
  ...ROW1_TECH,
  ...ROW1_TECH,
];
const ROW2_DUPLICATED = [
  ...ROW2_TECH,
  ...ROW2_TECH,
  ...ROW2_TECH,
  ...ROW2_TECH,
  ...ROW2_TECH,
  ...ROW2_TECH,
];
const ROW3_DUPLICATED = [
  ...ROW3_TECH,
  ...ROW3_TECH,
  ...ROW3_TECH,
  ...ROW3_TECH,
  ...ROW3_TECH,
  ...ROW3_TECH,
];

function TechChip({ name }: { name: string }) {
  const icon = TECH_ICONS[name];
  return (
    <div className="group flex items-center gap-2.5 rounded-full border border-border/50 bg-card/20 backdrop-blur-sm px-5 py-2.5 transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
      {icon ? (
        <Image
          src={`/tech-icons/${icon}.svg`}
          alt={name}
          width={22}
          height={22}
          unoptimized
          className="w-5 h-5 shrink-0 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
        />
      ) : null}
      <span className="text-sm font-semibold tracking-tight text-foreground/80 group-hover:text-primary transition-colors duration-300">
        {name}
      </span>
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
  const row1 = content?.row1 ? Array(6).fill(content.row1).flat() : ROW1_DUPLICATED;
  const row2 = content?.row2 ? Array(6).fill(content.row2).flat() : ROW2_DUPLICATED;
  const row3 = content?.row3 ? Array(6).fill(content.row3).flat() : ROW3_DUPLICATED;

  return (
    <section
      id="tech-stacks"
      aria-labelledby="tech-stacks-heading"
      className="relative overflow-hidden bg-transparent section-spacing"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent pointer-events-none" />

      <Container className="relative z-10">
        <div className="flex items-center gap-3 animate-fade-in-up">
          <Terminal className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tight">
            <span className="text-primary">{terminalPrefix}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-500">~/tech-stacks</span>
            <span className="text-muted-foreground">$</span>
          </h2>
        </div>
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
