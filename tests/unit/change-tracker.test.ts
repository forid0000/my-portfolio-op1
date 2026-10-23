import { afterEach, describe, expect, it } from 'vitest';
import {
  diffPaths,
  getChangeSummary,
  reportChanges,
  reportSaved,
  resetChangeTracker,
} from '@/lib/change-tracker';

describe('diffPaths', () => {
  it('lists changed values and ignores identical ones', () => {
    const before = { a: 'x', b: { c: 1, d: [1, 2] }, e: true };
    const after = { a: 'y', b: { c: 1, d: [1, 3] }, e: true };
    expect(diffPaths(before, after)).toEqual([['a'], ['b', 'd', 1]]);
    expect(diffPaths(before, before)).toEqual([]);
  });

  it('counts a list item added or removed once, however big it is', () => {
    expect(
      diffPaths(
        { rows: [{ a: 1, b: 2 }] },
        {
          rows: [
            { a: 1, b: 2 },
            { a: 5, b: 6 },
          ],
        }
      )
    ).toEqual([['rows', 1]]);
    expect(diffPaths({ rows: [1, 2, 3] }, { rows: [1] })).toEqual([
      ['rows', 1],
      ['rows', 2],
    ]);
  });

  it('ignores the keys editors add for drag and drop', () => {
    expect(diffPaths({ rows: [{ _dndId: 'a', n: 1 }] }, { rows: [{ _dndId: 'b', n: 1 }] })).toEqual(
      []
    );
  });

  it('handles fields appearing, disappearing and changing type', () => {
    expect(diffPaths({ a: 1 }, { a: 1, b: 'new' })).toEqual([['b']]);
    expect(diffPaths({ a: { x: 1 } }, { a: 'flat' })).toEqual([['a']]);
    expect(diffPaths('one', 'two')).toEqual([['page']]);
  });
});

describe('change tracker', () => {
  afterEach(() => resetChangeTracker());

  it('adds up the changes of every editor', () => {
    reportChanges('one', [['title'], ['socials', 2, 'href']]);
    reportChanges('two', [['slug']]);
    const summary = getChangeSummary();
    expect(summary.count).toBe(3);
    expect(summary.items).toContain('Title');
    expect(summary.items).toContain('Socials #3 > Href');
  });

  it('forgets an editor that has nothing left, and confirms a save for a moment', () => {
    reportChanges('one', [['title'], ['body']]);
    reportChanges('two', [['slug']]);
    reportSaved('one');
    expect(getChangeSummary().count).toBe(1);
    expect(getChangeSummary().justSaved).toBe(2);
    reportChanges('two', null);
    expect(getChangeSummary().count).toBe(0);
  });

  it('does not announce a save when nothing was pending', () => {
    reportSaved('nobody');
    expect(getChangeSummary().justSaved).toBe(0);
  });
});
