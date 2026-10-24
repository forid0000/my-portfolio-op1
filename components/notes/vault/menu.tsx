'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

const CloseContext = createContext<() => void>(() => {});

/**
 * A small dropdown: a button that opens a list of actions. Closes on Escape, on a click outside
 * and after a choice. Colours come from the theme tokens.
 */
export function Menu({
  trigger,
  label,
  align = 'start',
  className = '',
  panelClassName = '',
  children,
}: {
  /** What the button shows (icon and/or text). */
  trigger: React.ReactNode;
  /** Accessible name and tooltip of the button. */
  label: string;
  align?: 'start' | 'end';
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        // Keep the caret in the text box when this sits in the formatting bar.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={className}
      >
        {trigger}
      </button>
      {open && (
        <CloseContext.Provider value={() => setOpen(false)}>
          <div
            role="menu"
            className={`absolute z-30 mt-1.5 min-w-44 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg ${
              align === 'end' ? 'end-0' : 'start-0'
            } ${panelClassName}`}
          >
            {children}
          </div>
        </CloseContext.Provider>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onSelect,
  danger = false,
  hint,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
}) {
  const close = useContext(CloseContext);
  return (
    <button
      type="button"
      role="menuitem"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        close();
        onSelect();
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {icon && (
        <span className="shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      )}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
