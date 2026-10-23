import { describe, expect, it } from 'vitest';
import {
  SIDEBAR,
  SIDEBAR_DEFAULT,
  clampWidth,
  effectiveWidth,
  nudge,
  parseSidebarState,
  resolveDrag,
  toggleCollapsed,
} from '@/lib/sidebar-layout';

describe('sidebar layout', () => {
  it('keeps the width between the minimum and maximum', () => {
    expect(clampWidth(100)).toBe(SIDEBAR.min);
    expect(clampWidth(9999)).toBe(SIDEBAR.max);
    expect(clampWidth(300.4)).toBe(300);
    expect(clampWidth(Number.NaN)).toBe(SIDEBAR.default);
  });

  it('folds into the rail when dragged narrow, and remembers the open width', () => {
    const open = { width: 320, collapsed: false };
    const dragged = resolveDrag(100, open);
    expect(dragged).toEqual({ width: 320, collapsed: true });
    expect(effectiveWidth(dragged)).toBe(SIDEBAR.rail);
    expect(resolveDrag(400, dragged)).toEqual({ width: 400, collapsed: false });
    // between the collapse point and the minimum it simply stops at the minimum
    expect(resolveDrag(170, open)).toEqual({ width: SIDEBAR.min, collapsed: false });
  });

  it('double-click toggles between the rail and the remembered width', () => {
    const open = { width: 300, collapsed: false };
    const closed = toggleCollapsed(open);
    expect(closed.collapsed).toBe(true);
    expect(toggleCollapsed(closed)).toEqual(open);
  });

  it('reads saved values safely', () => {
    expect(parseSidebarState(null)).toEqual(SIDEBAR_DEFAULT);
    expect(parseSidebarState('not json')).toEqual(SIDEBAR_DEFAULT);
    expect(parseSidebarState('{"width":9000,"collapsed":true}')).toEqual({
      width: SIDEBAR.max,
      collapsed: true,
    });
    expect(parseSidebarState('{"width":"wide","collapsed":"yes"}')).toEqual(SIDEBAR_DEFAULT);
  });

  it('resizes with the keyboard', () => {
    const s = { width: 256, collapsed: false };
    expect(nudge(s, 'ArrowRight')).toEqual({ width: 256 + SIDEBAR.step, collapsed: false });
    expect(nudge({ width: SIDEBAR.min, collapsed: false }, 'ArrowLeft')?.collapsed).toBe(true);
    expect(nudge({ width: 256, collapsed: true }, 'ArrowRight')).toEqual({
      width: SIDEBAR.min + SIDEBAR.step,
      collapsed: false,
    });
    expect(nudge(s, 'Home')?.width).toBe(SIDEBAR.min);
    expect(nudge(s, 'End')?.width).toBe(SIDEBAR.max);
    expect(nudge(s, 'a')).toBeNull();
  });
});
