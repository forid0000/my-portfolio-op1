/**
 * Size rules for the note editor's two panes (writing and preview): drag the divider to give one
 * more room, but never so far that the other becomes unusable. Pure functions so the limits are
 * easy to test; the browser part lives in hooks/use-split-pane.ts.
 *
 *   - While dragging, the writing pane keeps between 25% and 75% of the space.
 *   - Dragging past 12% / 88% and letting go folds the editor into one full pane (the other one
 *     comes back with the buttons or by dragging the edge handle again).
 *   - Double-click on the divider restores 50/50. Arrow keys move it in 5% steps.
 */
export const SPLIT = {
  /** Smallest share of the space for the writing pane while both are visible. */
  min: 0.25,
  max: 0.75,
  default: 0.5,
  /** Arrow-key step. */
  step: 0.05,
  /** Letting go beyond these folds the editor into a single full pane. */
  snapBelow: 0.12,
  snapAbove: 0.88,
} as const;

export const SPLIT_STORAGE_KEY = 'notes.split';

export type PaneMode = 'split' | 'write' | 'preview';
export type PaneOrientation = 'columns' | 'rows';

export interface SplitState {
  /** Share of the space taken by the writing pane (0..1) while both are shown. */
  ratio: number;
  mode: PaneMode;
  /** columns: side by side; rows: writing above, preview below. */
  orientation: PaneOrientation;
}

export const SPLIT_DEFAULT: SplitState = {
  ratio: SPLIT.default,
  mode: 'split',
  orientation: 'columns',
};

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return SPLIT.default;
  return Math.round(Math.min(SPLIT.max, Math.max(SPLIT.min, ratio)) * 1000) / 1000;
}

/** Where the pointer is, as a share (0..1) of the container along the divider's axis. */
export function pointerToRatio(pointer: number, start: number, size: number): number {
  if (!(size > 0)) return SPLIT.default;
  return Math.min(1, Math.max(0, (pointer - start) / size));
}

/** What letting go at this position would do: keep both panes, or fold one away. */
export function dragIntent(pointerRatio: number): PaneMode {
  if (pointerRatio < SPLIT.snapBelow) return 'preview';
  if (pointerRatio > SPLIT.snapAbove) return 'write';
  return 'split';
}

/** The state to show while dragging (always both panes, clamped). */
export function dragPreview(pointerRatio: number, previous: SplitState): SplitState {
  return { ...previous, mode: 'split', ratio: clampRatio(pointerRatio) };
}

/** The state when the pointer is released: both panes, or one of them full. */
export function settleDrag(pointerRatio: number, previous: SplitState): SplitState {
  const intent = dragIntent(pointerRatio);
  if (intent === 'split') return { ...previous, mode: 'split', ratio: clampRatio(pointerRatio) };
  return { ...previous, mode: intent };
}

/** Keyboard resizing on the divider. `null` means the key does nothing here. */
export function nudgeSplit(state: SplitState, key: string): SplitState | null {
  const horizontal = state.orientation === 'columns';
  const less = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const more = horizontal ? 'ArrowRight' : 'ArrowDown';
  if (key === less) return { ...state, mode: 'split', ratio: clampRatio(state.ratio - SPLIT.step) };
  if (key === more) return { ...state, mode: 'split', ratio: clampRatio(state.ratio + SPLIT.step) };
  if (key === 'Home') return { ...state, mode: 'split', ratio: SPLIT.min };
  if (key === 'End') return { ...state, mode: 'split', ratio: SPLIT.max };
  return null;
}

export function resetSplit(state: SplitState): SplitState {
  return { ...state, mode: 'split', ratio: SPLIT.default };
}

/** Small screens have no room for two panes: "split" shows the writing pane (with a toggle). */
export function effectiveMode(mode: PaneMode, narrow: boolean): PaneMode {
  return narrow && mode === 'split' ? 'write' : mode;
}

/** Reads a saved value, ignoring anything that is not a valid state. */
export function parseSplitState(raw: string | null | undefined): SplitState {
  if (!raw) return SPLIT_DEFAULT;
  try {
    const value = JSON.parse(raw) as Partial<SplitState> | null;
    const mode: PaneMode =
      value?.mode === 'write' || value?.mode === 'preview' ? value.mode : 'split';
    return {
      ratio: typeof value?.ratio === 'number' ? clampRatio(value.ratio) : SPLIT.default,
      mode,
      orientation: value?.orientation === 'rows' ? 'rows' : 'columns',
    };
  } catch {
    return SPLIT_DEFAULT;
  }
}

/* ------------------------------ editor preferences ------------------------------ */

export const EDITOR_PREFS_KEY = 'notes.editor';

export type EditorFont = 'sans' | 'serif' | 'mono';
export type EditorSize = 'sm' | 'md' | 'lg';

export interface EditorPrefs {
  font: EditorFont;
  size: EditorSize;
  /** Keep the preview at the same place in the text as the writing pane. */
  syncScroll: boolean;
}

export const EDITOR_PREFS_DEFAULT: EditorPrefs = { font: 'sans', size: 'md', syncScroll: true };

export function parseEditorPrefs(raw: string | null | undefined): EditorPrefs {
  if (!raw) return EDITOR_PREFS_DEFAULT;
  try {
    const value = JSON.parse(raw) as Partial<EditorPrefs> | null;
    return {
      font: value?.font === 'serif' || value?.font === 'mono' ? value.font : 'sans',
      size: value?.size === 'sm' || value?.size === 'lg' ? value.size : 'md',
      syncScroll: value?.syncScroll !== false,
    };
  } catch {
    return EDITOR_PREFS_DEFAULT;
  }
}
