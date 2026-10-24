import { describe, expect, it } from 'vitest';
import {
  EDITOR_PREFS_DEFAULT,
  SPLIT,
  SPLIT_DEFAULT,
  clampRatio,
  dragIntent,
  dragPreview,
  effectiveMode,
  nudgeSplit,
  parseEditorPrefs,
  parseSplitState,
  pointerToRatio,
  resetSplit,
  settleDrag,
} from '@/lib/split-pane';

describe('split pane limits', () => {
  it('never lets a pane get less than a quarter or more than three quarters', () => {
    expect(clampRatio(0.01)).toBe(SPLIT.min);
    expect(clampRatio(0.99)).toBe(SPLIT.max);
    expect(clampRatio(0.4)).toBe(0.4);
    expect(clampRatio(Number.NaN)).toBe(SPLIT.default);
  });

  it('turns a pointer position into a share of the container', () => {
    expect(pointerToRatio(300, 100, 400)).toBe(0.5);
    expect(pointerToRatio(50, 100, 400)).toBe(0);
    expect(pointerToRatio(900, 100, 400)).toBe(1);
    expect(pointerToRatio(10, 0, 0)).toBe(SPLIT.default);
  });

  it('keeps both panes while dragging, and folds one away when let go far out', () => {
    expect(dragPreview(0.05, SPLIT_DEFAULT).ratio).toBe(SPLIT.min);
    expect(dragPreview(0.05, SPLIT_DEFAULT).mode).toBe('split');
    expect(dragIntent(0.5)).toBe('split');
    expect(dragIntent(0.05)).toBe('preview');
    expect(dragIntent(0.95)).toBe('write');
    expect(settleDrag(0.6, SPLIT_DEFAULT)).toMatchObject({ mode: 'split', ratio: 0.6 });
    expect(settleDrag(0.3, SPLIT_DEFAULT)).toMatchObject({ mode: 'split', ratio: 0.3 });
    expect(settleDrag(0.05, SPLIT_DEFAULT).mode).toBe('preview');
    expect(settleDrag(0.95, SPLIT_DEFAULT).mode).toBe('write');
    // a fold keeps the earlier ratio for when the other pane comes back
    expect(settleDrag(0.95, { ...SPLIT_DEFAULT, ratio: 0.4 }).ratio).toBe(0.4);
  });

  it('moves with the arrow keys that fit the direction, and resets', () => {
    expect(nudgeSplit(SPLIT_DEFAULT, 'ArrowRight')?.ratio).toBe(0.55);
    expect(nudgeSplit(SPLIT_DEFAULT, 'ArrowLeft')?.ratio).toBe(0.45);
    expect(nudgeSplit(SPLIT_DEFAULT, 'ArrowDown')).toBeNull();
    const stacked = { ...SPLIT_DEFAULT, orientation: 'rows' as const };
    expect(nudgeSplit(stacked, 'ArrowDown')?.ratio).toBe(0.55);
    expect(nudgeSplit(stacked, 'ArrowRight')).toBeNull();
    expect(nudgeSplit(SPLIT_DEFAULT, 'Home')?.ratio).toBe(SPLIT.min);
    expect(nudgeSplit(SPLIT_DEFAULT, 'End')?.ratio).toBe(SPLIT.max);
    expect(nudgeSplit({ ...SPLIT_DEFAULT, ratio: 0.75 }, 'ArrowRight')?.ratio).toBe(SPLIT.max);
    expect(resetSplit({ ratio: 0.3, mode: 'write', orientation: 'rows' })).toEqual({
      ratio: 0.5,
      mode: 'split',
      orientation: 'rows',
    });
  });

  it('shows one pane at a time on small screens', () => {
    expect(effectiveMode('split', true)).toBe('write');
    expect(effectiveMode('split', false)).toBe('split');
    expect(effectiveMode('preview', true)).toBe('preview');
  });

  it('reads saved values and ignores anything invalid', () => {
    expect(parseSplitState(null)).toEqual(SPLIT_DEFAULT);
    expect(parseSplitState('not json')).toEqual(SPLIT_DEFAULT);
    expect(parseSplitState('{"ratio":0.9,"mode":"preview","orientation":"rows"}')).toEqual({
      ratio: SPLIT.max,
      mode: 'preview',
      orientation: 'rows',
    });
    expect(parseSplitState('{"ratio":"x","mode":"bogus"}')).toEqual(SPLIT_DEFAULT);
    expect(parseEditorPrefs(null)).toEqual(EDITOR_PREFS_DEFAULT);
    expect(parseEditorPrefs('{"font":"mono","size":"lg","syncScroll":false}')).toEqual({
      font: 'mono',
      size: 'lg',
      syncScroll: false,
    });
    expect(parseEditorPrefs('{"font":"comic"}').font).toBe('sans');
  });
});
