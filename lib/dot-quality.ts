/**
 * How much work the interactive background dots (components/dot-weave.tsx) are allowed to do.
 * Pure, so it is unit-tested: the component measures every frame it draws and steps down a tier
 * when it costs too much, then gives up and leaves the plain CSS dots. It never needs a reload and
 * never speeds back up (no flapping), so a weak phone or an old laptop is protected automatically.
 */
export type Tier = 0 | 1 | 2;

export interface TierSettings {
  /** Highest device-pixel-ratio of the canvas (a sharp canvas costs fill rate). */
  dpr: number;
  /** Minimum time between frames; 32 ms = 30 fps. */
  minFrameMs: number;
  /** A trail of pushes behind the pointer. */
  trail: boolean;
  /** Fine lines between awake dots. */
  lines: boolean;
  /** Halo around awake dots. */
  halo: boolean;
  /** Soft light under the pointer. */
  spotlight: boolean;
  /** JS time per frame (update + draw) this tier may use, in ms. */
  costBudgetMs: number;
  /** Average time between frames above which the tier counts as too slow, in ms. */
  slowIntervalMs: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  0: {
    dpr: 1.5,
    minFrameMs: 0,
    trail: true,
    lines: true,
    halo: true,
    spotlight: true,
    costBudgetMs: 5,
    slowIntervalMs: 26,
  },
  1: {
    dpr: 1.25,
    minFrameMs: 0,
    trail: false,
    lines: true,
    halo: true,
    spotlight: true,
    costBudgetMs: 5,
    slowIntervalMs: 26,
  },
  2: {
    dpr: 1,
    minFrameMs: 32,
    trail: false,
    lines: false,
    halo: false,
    spotlight: false,
    costBudgetMs: 8,
    slowIntervalMs: 46,
  },
};

/** Most dots the full effect is used for; bigger screens start one tier lower. */
export const MAX_DOTS_FULL = 1400;

/** Where to start, from what the device says about itself. */
export function startTier(device: {
  cores?: number;
  memoryGb?: number;
  coarsePointer: boolean;
  dotCount: number;
}): Tier {
  let tier: Tier = 0;
  if (device.coarsePointer || device.dotCount > MAX_DOTS_FULL) tier = 1;
  if (
    (device.cores !== undefined && device.cores <= 2) ||
    (device.memoryGb !== undefined && device.memoryGb <= 2)
  ) {
    tier = 2;
  }
  return tier;
}

/** Frames to watch before judging a tier (the first frames after a wake-up are not representative). */
export const JUDGE_AFTER_FRAMES = 45;

/** True when the tier has been too expensive for long enough. */
export function tooExpensive(
  tier: Tier,
  measured: { costMs: number; intervalMs: number; frames: number }
): boolean {
  if (measured.frames < JUDGE_AFTER_FRAMES) return false;
  const t = TIERS[tier];
  return measured.costMs > t.costBudgetMs || measured.intervalMs > t.slowIntervalMs;
}

/** The next cheaper tier, or 'off' when there is none (the plain CSS dots take over). */
export function cheaper(tier: Tier): Tier | 'off' {
  return tier === 0 ? 1 : tier === 1 ? 2 : 'off';
}

/** Slow or metered connections and the data saver get no animation at all. */
export function networkAllowsAnimation(connection?: {
  saveData?: boolean;
  effectiveType?: string;
}): boolean {
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g';
}
