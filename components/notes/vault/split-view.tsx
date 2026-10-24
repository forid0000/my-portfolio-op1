'use client';

import { PanelLeftOpen, PanelRightOpen, PanelTopOpen } from 'lucide-react';
import type { useSplitPane } from '@/hooks/use-split-pane';
import { SPLIT, effectiveMode } from '@/lib/split-pane';

interface SplitViewProps {
  split: ReturnType<typeof useSplitPane>;
  /** True on small screens, where two panes never fit: one is shown at a time. */
  narrow: boolean;
  first: React.ReactNode;
  second: React.ReactNode;
  firstName: string;
  secondName: string;
}

/**
 * Two panes with a divider you can drag. The first pane never gets less than a quarter or more
 * than three quarters of the space while both are visible; drag further and let go to give the
 * other pane the whole area (the buttons, or dragging the edge tab, bring it back). Double-click
 * the divider to go back to half and half; arrow keys move it in small steps.
 */
export default function SplitView({
  split,
  narrow,
  first,
  second,
  firstName,
  secondName,
}: SplitViewProps) {
  const { state, dragging, intent, containerRef } = split;
  const mode = effectiveMode(state.mode, narrow);
  const horizontal = state.orientation === 'columns';
  const percent = Math.round(state.ratio * 100);

  return (
    <div
      ref={containerRef}
      className={`relative flex min-h-0 min-w-0 flex-1 ${horizontal ? 'flex-row' : 'flex-col'} ${
        dragging ? 'select-none' : ''
      }`}
    >
      {mode !== 'preview' && (
        <div
          className="min-h-0 min-w-0 overflow-hidden"
          style={
            mode === 'split'
              ? { flex: `0 0 calc(${state.ratio * 100}% - 5px)` }
              : { flex: '1 1 0%' }
          }
          data-pane="write"
        >
          {first}
        </div>
      )}

      {mode === 'split' && (
        <div
          role="separator"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuemin={Math.round(SPLIT.min * 100)}
          aria-valuemax={Math.round(SPLIT.max * 100)}
          aria-valuenow={percent}
          aria-valuetext={`${firstName} ${percent}%, ${secondName} ${100 - percent}%`}
          aria-label={`Resize ${firstName} and ${secondName}`}
          tabIndex={0}
          onPointerDown={split.onPointerDown}
          onKeyDown={split.onKeyDown}
          onDoubleClick={split.reset}
          title="Drag to resize · double-click to reset"
          style={{ touchAction: 'none' }}
          className={`group relative z-10 flex shrink-0 items-center justify-center bg-border/40 outline-none transition-colors hover:bg-primary/20 focus-visible:bg-primary/30 ${
            horizontal ? 'w-2.5 cursor-col-resize' : 'h-2.5 cursor-row-resize'
          } ${dragging ? 'bg-primary/30' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary ${
              horizontal ? 'h-10 w-1' : 'h-1 w-10'
            } ${dragging ? 'bg-primary' : ''}`}
          />
          {dragging && intent !== 'split' && (
            <span className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow-lg">
              {intent === 'preview'
                ? `Release to show only the ${secondName}`
                : `Release to show only ${firstName}`}
            </span>
          )}
        </div>
      )}

      {mode !== 'write' && (
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden" data-pane="preview">
          {second}
        </div>
      )}

      {/* One pane is full: a tab on the edge brings the other one back. */}
      {!narrow && mode !== 'split' && (
        <button
          type="button"
          onClick={() => split.setMode('split')}
          title={mode === 'write' ? `Show the ${secondName} again` : `Show ${firstName} again`}
          aria-label={mode === 'write' ? `Show the ${secondName}` : `Show ${firstName}`}
          className={`absolute z-20 flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary ${
            horizontal
              ? `top-1/2 h-14 w-6 -translate-y-1/2 ${mode === 'write' ? 'right-0 rounded-e-none' : 'left-0 rounded-s-none'}`
              : `left-1/2 h-6 w-14 -translate-x-1/2 ${mode === 'write' ? 'bottom-0 rounded-b-none' : 'top-0 rounded-t-none'}`
          }`}
        >
          {horizontal ? (
            mode === 'write' ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )
          ) : (
            <PanelTopOpen className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
