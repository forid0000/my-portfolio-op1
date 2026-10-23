import { describe, expect, it } from 'vitest';
import { sharedState } from '@/lib/shared-state';

describe('sharedState', () => {
  it('hands every caller of the same name the same object (as separate bundles would see it)', () => {
    const a = sharedState('test-cache', () => ({ cache: null as string | null }));
    const b = sharedState('test-cache', () => ({ cache: 'never used' as string | null }));
    a.cache = 'fresh';
    expect(b).toBe(a);
    expect(b.cache).toBe('fresh');
  });

  it('keeps different names apart', () => {
    const a = sharedState('one', () => ({ n: 1 }));
    const b = sharedState('two', () => ({ n: 2 }));
    expect(a.n).toBe(1);
    expect(b.n).toBe(2);
  });
});
