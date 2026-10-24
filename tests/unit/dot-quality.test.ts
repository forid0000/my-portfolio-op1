import { describe, expect, it } from 'vitest';
import {
  JUDGE_AFTER_FRAMES,
  MAX_DOTS_FULL,
  TIERS,
  cheaper,
  networkAllowsAnimation,
  startTier,
  tooExpensive,
} from '@/lib/dot-quality';

describe('background dots: quality', () => {
  it('starts with everything on a capable desktop, lighter on phones and big screens', () => {
    expect(startTier({ cores: 8, memoryGb: 8, coarsePointer: false, dotCount: 700 })).toBe(0);
    expect(startTier({ coarsePointer: false, dotCount: 700 })).toBe(0);
    expect(startTier({ cores: 8, memoryGb: 4, coarsePointer: true, dotCount: 200 })).toBe(1);
    expect(startTier({ cores: 8, coarsePointer: false, dotCount: MAX_DOTS_FULL + 1 })).toBe(1);
  });

  it('starts at the simplest tier on weak devices', () => {
    expect(startTier({ cores: 2, coarsePointer: false, dotCount: 500 })).toBe(2);
    expect(startTier({ cores: 4, memoryGb: 2, coarsePointer: true, dotCount: 150 })).toBe(2);
    expect(startTier({ cores: 1, memoryGb: 1, coarsePointer: true, dotCount: 150 })).toBe(2);
  });

  it('every tier is cheaper than the one before it', () => {
    expect(TIERS[1].dpr).toBeLessThanOrEqual(TIERS[0].dpr);
    expect(TIERS[2].dpr).toBeLessThanOrEqual(TIERS[1].dpr);
    expect(TIERS[2].minFrameMs).toBeGreaterThan(TIERS[1].minFrameMs);
    expect(TIERS[0].trail && !TIERS[1].trail && !TIERS[2].trail).toBe(true);
    expect(TIERS[1].lines && !TIERS[2].lines).toBe(true);
    expect(TIERS[1].halo && !TIERS[2].halo).toBe(true);
    expect(TIERS[2].spotlight).toBe(false);
  });

  it('judges a tier only after enough frames, then by cost or by speed', () => {
    const fine = { costMs: 1.5, intervalMs: 16.7, frames: JUDGE_AFTER_FRAMES };
    expect(tooExpensive(0, fine)).toBe(false);
    expect(tooExpensive(0, { ...fine, frames: JUDGE_AFTER_FRAMES - 1, costMs: 50 })).toBe(false);
    expect(tooExpensive(0, { ...fine, costMs: 6 })).toBe(true);
    expect(tooExpensive(1, { ...fine, intervalMs: 30 })).toBe(true);
    // the simplest tier runs at 30 fps on purpose, so 33 ms between frames is fine there
    expect(tooExpensive(2, { ...fine, intervalMs: 33 })).toBe(false);
    expect(tooExpensive(2, { ...fine, intervalMs: 60 })).toBe(true);
  });

  it('steps down one tier at a time and then switches off', () => {
    expect(cheaper(0)).toBe(1);
    expect(cheaper(1)).toBe(2);
    expect(cheaper(2)).toBe('off');
  });

  it('no animation on a data saver or a very slow connection', () => {
    expect(networkAllowsAnimation(undefined)).toBe(true);
    expect(networkAllowsAnimation({ effectiveType: '4g' })).toBe(true);
    expect(networkAllowsAnimation({ saveData: true, effectiveType: '4g' })).toBe(false);
    expect(networkAllowsAnimation({ effectiveType: '2g' })).toBe(false);
    expect(networkAllowsAnimation({ effectiveType: 'slow-2g' })).toBe(false);
  });
});
