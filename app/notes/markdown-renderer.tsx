'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-foreground mt-7 mb-3 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-foreground mt-6 mb-2.5 pb-1.5 border-b border-border leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-foreground mt-4 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => <p className="text-foreground/85 leading-[1.85] mb-3.5">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/75">{children}</em>,
  del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
  // code inside pre = block; code standalone = inline
  pre: ({ children }) => (
    <pre className="bg-card border border-border rounded-xl overflow-hidden my-4 shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed">
        {children}
      </div>
    </pre>
  ),
  code: ({ children, className }) => {
    // If className has a language- prefix it's inside a pre (block)
    if (className?.startsWith('language-')) {
      return <code className={`${className} block`}>{children}</code>;
    }
    return (
      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-primary/15 wrap-break-word">
        {children}
      </code>
    );
  },
  ul: ({ children, className }) => {
    const isTaskList = className?.includes('contains-task-list');
    if (isTaskList) return <ul className="my-3 space-y-1.5 pl-0 list-none">{children}</ul>;
    return <ul className="my-3 space-y-1.5 pl-5 list-none">{children}</ul>;
  },
  ol: ({ children }) => <ol className="my-3 space-y-1.5 pl-5 list-decimal">{children}</ol>,
  li: ({ children, className }) => {
    const isTask = className?.includes('task-list-item');
    if (isTask) {
      return (
        <li className="flex items-start gap-2 text-foreground/85 text-sm leading-relaxed">
          {children}
        </li>
      );
    }
    return (
      <li className="text-foreground/85 text-sm leading-relaxed marker:text-primary">{children}</li>
    );
  },
  input: ({ type, checked }) =>
    type === 'checkbox' ? (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-1.5 mt-0.5 accent-primary cursor-default"
      />
    ) : null,
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-primary/60 pl-4 py-0.5 my-4 bg-primary/5 rounded-r-lg text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    const safe = href && /^(https?:|mailto:|\/|#)/.test(href) ? href : '#';
    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-colors wrap-break-word"
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-6 border-border" />,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || ''}
      alt={alt || ''}
      className="rounded-xl border border-border max-h-80 max-w-full h-auto my-4 shadow-sm"
    />
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-5 rounded-xl border border-border shadow-sm">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-semibold text-foreground text-xs uppercase tracking-wider border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-muted-foreground border-b border-border/50 last:border-0">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="transition-colors hover:bg-primary/5">{children}</tr>,
};

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return <span className="text-muted-foreground italic text-sm">No content.</span>;

  return (
    <div className="min-w-0 wrap-break-word">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
