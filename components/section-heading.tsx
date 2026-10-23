import type { ReactNode } from 'react';
import { Terminal } from 'lucide-react';

interface SectionHeadingProps {
  /** The visible heading in the clean style, and the text screen readers get in both styles. */
  title: string;
  /** Terminal style only: the prompt reads `prefix:~/path$`. */
  prefix: string;
  path: string;
  /** Shown beside the heading in both styles; the terminal style falls back to a terminal icon. */
  icon?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Section title shared by every section. The look is switched by the site's UI style
 * (Admin -> Appearance), which sets `data-ui` on <html>: the clean style is a plain heading
 * with an accent bar, the terminal style is the developer-prompt look. Both variants are in
 * the server HTML and CSS picks one, so there is no flash and no client JavaScript.
 */
export default function SectionHeading({
  title,
  prefix,
  path,
  icon,
  id,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex items-center gap-3 animate-fade-in-up ${className}`}>
      <span aria-hidden className="h-7 w-1 shrink-0 rounded-full bg-primary terminal:hidden" />
      {icon && (
        <span aria-hidden className="text-primary terminal:animate-pulse [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      )}
      {!icon && (
        <span
          aria-hidden
          className="hidden text-primary terminal:inline-flex terminal:animate-pulse"
        >
          <Terminal className="h-6 w-6" />
        </span>
      )}
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-foreground first-letter:uppercase md:text-3xl terminal:sr-only"
      >
        {title}
      </h2>
      <div
        aria-hidden
        className="hidden font-mono text-xl font-bold tracking-tight md:text-2xl terminal:block"
      >
        <span className="text-primary">{prefix}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-info">~/{path}</span>
        <span className="text-muted-foreground">$</span>
      </div>
    </div>
  );
}
