'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { NOTE_LIMITS, normalizeTag } from '@/lib/notes-model';

/** Tags as chips: type and press Space, Enter or comma; Backspace on an empty box removes the last. */
export default function TagEditor({
  tags,
  suggestions = [],
  onChange,
  onTabOut,
}: {
  tags: string[];
  /** Tags used in other notes, offered as quick picks. */
  suggestions?: string[];
  onChange: (tags: string[]) => void;
  onTabOut?: () => void;
}) {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const tag = normalizeTag(raw);
    setInput('');
    if (tag && !tags.includes(tag) && tags.length < NOTE_LIMITS.tags) onChange([...tags, tag]);
  };

  const quick = suggestions.filter((s) => !tags.includes(s)).slice(0, 6);

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={() => ref.current?.focus()}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 py-0.5 ps-2.5 pe-1.5 text-xs font-medium text-primary"
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(tags.filter((t) => t !== tag));
            }}
            aria-label={`Remove tag ${tag}`}
            className="rounded-full p-0.5 hover:bg-primary/20"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        maxLength={NOTE_LIMITS.tag + 1}
        placeholder={tags.length ? '+ tag' : 'Add tags (Space or Enter)'}
        aria-label="Add a tag"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            if (input.trim()) commit(input);
          } else if (e.key === 'Backspace' && !input && tags.length) {
            onChange(tags.slice(0, -1));
          } else if (e.key === 'Tab' && !e.shiftKey && !input) {
            if (onTabOut) {
              e.preventDefault();
              onTabOut();
            }
          }
        }}
        onBlur={() => input.trim() && commit(input)}
        className="min-w-28 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {quick.length > 0 && !input && (
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          {quick.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                commit(s);
              }}
              className="rounded-full border border-dashed border-border px-2 py-0.5 hover:border-primary/40 hover:text-primary"
            >
              #{s}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
