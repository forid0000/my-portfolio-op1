import { describe, expect, it } from 'vitest';
import {
  attachmentMarkdown,
  canPreview,
  cleanSlug,
  effectiveFileLimit,
  excerptFrom,
  exportFileName,
  fileKind,
  fileUrl,
  groupByFolder,
  isReferenced,
  isReservedSlug,
  markdownToText,
  noteToMarkdown,
  noteToText,
  normalizeNoteTags,
  normalizeTag,
  resolveFileType,
  safeFileName,
  safeFolderPath,
  servesInline,
  suggestSlug,
  timeAgo,
  type NoteAttachment,
} from '@/lib/notes-model';

const att = (over: Partial<NoteAttachment> = {}): NoteAttachment => ({
  id: 'a'.repeat(24),
  name: 'file.txt',
  type: 'text/plain',
  size: 10,
  ...over,
});

describe('tags', () => {
  it('cleans a tag the way people type it', () => {
    expect(normalizeTag('  #Hello World! ')).toBe('helloworld');
    expect(normalizeTag('trip-2026_a')).toBe('trip-2026_a');
    expect(normalizeTag('বাংলা')).toBe('বাংলা');
    expect(normalizeTag('x'.repeat(100))).toHaveLength(40);
  });

  it('removes empty and repeated tags and caps the number', () => {
    expect(normalizeNoteTags(['A', 'a', '#a', '', 5, 'b'])).toEqual(['a', 'b']);
    expect(normalizeNoteTags('nope')).toEqual([]);
    expect(normalizeNoteTags(Array.from({ length: 40 }, (_, i) => `t${i}`))).toHaveLength(20);
  });
});

describe('addresses', () => {
  it('turns a title into an address with a suffix, even for other scripts', () => {
    expect(suggestSlug('My First Note!', 1_000_000)).toMatch(/^my-first-note-[a-z0-9]{4}$/);
    expect(suggestSlug('!!!', 1_000_000)).toMatch(/^note-[a-z0-9]{4}$/);
    expect(suggestSlug('আমার নোট', 1_000_000)).toMatch(/^আমার-নোট-[a-z0-9]{4}$/u);
  });

  it('cleans typed addresses and reserves the ones the site uses', () => {
    expect(cleanSlug('  Hello   World ')).toBe('hello-world');
    expect(cleanSlug('---')).toBe('');
    expect(isReservedSlug('vault')).toBe(true);
    expect(isReservedSlug('my-note')).toBe(false);
  });
});

describe('what a file is allowed to be', () => {
  it('trusts the extension, then a short list of types, never a page or script', () => {
    expect(resolveFileType('Photo.JPG', '')).toBe('image/jpeg');
    expect(resolveFileType('page.html', 'text/html')).toBe('text/plain');
    expect(resolveFileType('run.js', 'application/javascript')).toBe('text/plain');
    expect(resolveFileType('evil.png', 'text/html')).toBe('image/png');
    expect(resolveFileType('data.bin', 'text/html')).toBe('application/octet-stream');
    expect(resolveFileType('data.bin', 'application/pdf')).toBe('application/pdf');
    expect(resolveFileType('noext', '')).toBe('application/octet-stream');
  });

  it('sorts files into kinds and decides what can be shown', () => {
    expect(fileKind('image/png', 'a.png')).toBe('image');
    expect(fileKind('video/mp4', 'a.mp4')).toBe('video');
    expect(fileKind('audio/mpeg', 'a.mp3')).toBe('audio');
    expect(fileKind('application/pdf', 'a.pdf')).toBe('pdf');
    expect(fileKind('text/plain', 'a.md')).toBe('text');
    expect(fileKind('application/zip', 'a.zip')).toBe('other');
    expect(canPreview(att({ size: 100 }))).toBe(true);
    expect(canPreview(att({ size: 5 * 1024 * 1024 }))).toBe(false);
    expect(canPreview(att({ name: 'a.zip', type: 'application/zip' }))).toBe(false);
    expect(servesInline('application/zip')).toBe(false);
    expect(servesInline('application/octet-stream')).toBe(false);
    expect(servesInline('image/svg+xml')).toBe(true);
  });

  it('builds the text that puts a file into a note', () => {
    const id = 'b'.repeat(24);
    expect(attachmentMarkdown(att({ id, name: 'My photo.png', type: 'image/png' }))).toBe(
      `![My photo](/api/notes/files/${id})`
    );
    expect(attachmentMarkdown(att({ id, name: 'report[1].pdf', type: 'application/pdf' }))).toBe(
      `[report1.pdf](/api/notes/files/${id}?download=1)`
    );
    expect(fileUrl(id, { download: true })).toBe(`/api/notes/files/${id}?download=1`);
    expect(isReferenced(`text ![x](/api/notes/files/${id}) more`, { id })).toBe(true);
    expect(isReferenced('nothing', { id })).toBe(false);
  });

  it('groups files by folder, loose files first', () => {
    const groups = groupByFolder([
      att({ id: '1'.repeat(24), path: 'Trip/2026' }),
      att({ id: '2'.repeat(24) }),
      att({ id: '3'.repeat(24), path: 'Another' }),
    ]);
    expect(groups.map((g) => g.path)).toEqual(['', 'Another', 'Trip/2026']);
  });

  it('keeps names and folders harmless', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('a"b<c>.txt')).toBe('a_b_c_.txt');
    expect(safeFileName('')).toBe('file');
    expect(safeFolderPath('../../secret/./x')).toBe('secret/x');
    expect(safeFolderPath('/abs//path/')).toBe('abs/path');
  });
});

describe('file size limit', () => {
  it('uses the owner setting, capped by what the host accepts', () => {
    const mb = 1024 * 1024;
    expect(effectiveFileLimit(10, false)).toBe(10 * mb);
    expect(effectiveFileLimit(10, true)).toBe(4 * mb);
    expect(effectiveFileLimit(null, false)).toBe(10 * mb);
    expect(effectiveFileLimit(500, false)).toBe(100 * mb);
  });
});

describe('export and display', () => {
  it('names export files and writes Markdown and text', () => {
    expect(exportFileName('My Trip: Day 1!')).toBe('my-trip-day-1');
    expect(exportFileName('???')).toBe('note');
    const note = {
      title: 'Plan',
      content: '## Goals\n\n- **one**\n- [x] done\n\nsee [docs](https://x.test) ![pic](/a.png)',
      tags: ['work'],
      attachments: [att({ name: 'plan.pdf' })],
    };
    const md = noteToMarkdown(note);
    expect(md.startsWith('# Plan\n\n#work\n\n## Goals')).toBe(true);
    expect(md).toContain('- plan.pdf');
    const text = noteToText(note);
    expect(text).toContain('Goals');
    expect(text).not.toContain('##');
    expect(text).toContain('• one');
    expect(text).toContain('• done');
    expect(text).toContain('docs (https://x.test)');
    expect(text).toContain('[picture: pic]');
  });

  it('writes summaries without checklist or table markup', () => {
    const text =
      '- [x] Buy groceries\n- [ ] Prep lunch\n\n| Day | Dinner |\n| --- | --- |\n| Mon | Pasta |\n\n---\n\nDone';
    expect(excerptFrom(text, 200)).toBe('Buy groceries Prep lunch Day Dinner Mon Pasta Done');
  });

  it('keeps line breaks when removing Markdown marks', () => {
    expect(markdownToText('a **b**\n\n```js\ncode\n```\n> quote')).toBe('a b\n\ncode\nquote');
  });

  it('says how long ago something happened', () => {
    const now = Date.parse('2026-01-10T12:00:00Z');
    expect(timeAgo('2026-01-10T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-01-10T11:30:00Z', now)).toBe('30m ago');
    expect(timeAgo('2026-01-10T07:00:00Z', now)).toBe('5h ago');
    expect(timeAgo('2026-01-08T12:00:00Z', now)).toBe('2d ago');
    expect(timeAgo('nonsense', now)).toBe('');
  });
});
