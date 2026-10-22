import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImagePlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}
    >
      <span className="flex flex-col items-center gap-2">
        <ImageIcon className="size-8" />
        {label ? <span className="text-xs font-medium">{label}</span> : null}
      </span>
    </div>
  );
}

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  );
}

export function WideContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  );
}

export function Section({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn('py-16 sm:py-20 lg:py-24', className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-3xl text-center', className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1>
      {description ? (
        <p className="mt-4 text-lg text-muted-foreground text-pretty">{description}</p>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : '', className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description ? <p className="mt-3 text-muted-foreground text-pretty">{description}</p> : null}
    </div>
  );
}
