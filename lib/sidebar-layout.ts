/**
 * Size rules for the admin's left menu: drag the edge to resize, drag far enough (or double-click)
 * to fold it into a narrow icon rail. Pure functions so the limits are easy to test; the browser
 * part lives in hooks/use-sidebar-layout.ts.
 */
export const SIDEBAR = {
  /** Smallest comfortable width with labels. */
  min: 208,
  /** Largest width; beyond this the menu would only waste space. */
  max: 460,
  /** Width on first use. */
  default: 256,
  /** Width of the icon-only rail. */
  rail: 68,
  /** Dragging narrower than this folds the menu into the rail. */
  collapseBelow: 148,
  /** Arrow-key step. */
  step: 16,
} as const;

export const SIDEBAR_STORAGE_KEY = 'admin.sidebar';

export interface SidebarState {
  /** Width when expanded (remembered while the rail is showing). */
  width: number;
  collapsed: boolean;
}

export const SIDEBAR_DEFAULT: SidebarState = { width: SIDEBAR.default, collapsed: false };

export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return SIDEBAR.default;
  return Math.round(Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, width)));
}

/** The state that results from dragging the edge to `pointerWidth` pixels from the left. */
export function resolveDrag(pointerWidth: number, previous: SidebarState): SidebarState {
  if (pointerWidth < SIDEBAR.collapseBelow) return { ...previous, collapsed: true };
  return { width: clampWidth(pointerWidth), collapsed: false };
}

/** Width actually painted. */
export function effectiveWidth(state: SidebarState): number {
  return state.collapsed ? SIDEBAR.rail : state.width;
}

/** Reads a saved value, ignoring anything that is not a valid state. */
export function parseSidebarState(raw: string | null | undefined): SidebarState {
  if (!raw) return SIDEBAR_DEFAULT;
  try {
    const value = JSON.parse(raw) as Partial<SidebarState> | null;
    return {
      width: typeof value?.width === 'number' ? clampWidth(value.width) : SIDEBAR.default,
      collapsed: value?.collapsed === true,
    };
  } catch {
    return SIDEBAR_DEFAULT;
  }
}

/** Double-click / the collapse button: fold into the rail, or open back to the remembered width. */
export function toggleCollapsed(state: SidebarState): SidebarState {
  return { ...state, collapsed: !state.collapsed };
}

/** Keyboard resizing: arrows change the width, Home/End jump to the limits. */
export function nudge(state: SidebarState, key: string): SidebarState | null {
  const base = state.collapsed ? SIDEBAR.min : state.width;
  switch (key) {
    case 'ArrowRight':
      return { width: clampWidth(base + SIDEBAR.step), collapsed: false };
    case 'ArrowLeft':
      return base - SIDEBAR.step < SIDEBAR.min
        ? { ...state, collapsed: true }
        : { width: clampWidth(base - SIDEBAR.step), collapsed: false };
    case 'Home':
      return { width: SIDEBAR.min, collapsed: false };
    case 'End':
      return { width: SIDEBAR.max, collapsed: false };
    default:
      return null;
  }
}
