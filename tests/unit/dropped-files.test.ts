import { describe, expect, it } from 'vitest';
import { MAX_PICKED_FILES, folderOf, fromFileList, isIgnoredFile } from '@/lib/dropped-files';

const withPath = (name: string, relative: string) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: relative });
  return file;
};

describe('picked files', () => {
  it('ignores system files', () => {
    expect(isIgnoredFile('.DS_Store')).toBe(true);
    expect(isIgnoredFile('Thumbs.db')).toBe(true);
    expect(isIgnoredFile('~$draft.docx')).toBe(true);
    expect(isIgnoredFile('photo.jpg')).toBe(false);
  });

  it('finds the folder a file came from', () => {
    expect(folderOf('Trip/2026/a.jpg')).toBe('Trip/2026');
    expect(folderOf('a.jpg')).toBe('');
    expect(folderOf('')).toBe('');
  });

  it('reads a folder pick and a plain pick', () => {
    const picked = fromFileList([
      withPath('a.jpg', 'Trip/2026/a.jpg'),
      withPath('.DS_Store', 'Trip/.DS_Store'),
      new File(['y'], 'loose.txt'),
    ]);
    expect(picked.map((p) => [p.file.name, p.path])).toEqual([
      ['a.jpg', 'Trip/2026'],
      ['loose.txt', ''],
    ]);
  });

  it('stops at the limit', () => {
    const many = Array.from(
      { length: MAX_PICKED_FILES + 20 },
      (_, i) => new File(['x'], `f${i}.txt`)
    );
    expect(fromFileList(many)).toHaveLength(MAX_PICKED_FILES);
  });
});
