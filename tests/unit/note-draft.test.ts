import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  draftFromNote,
  effectiveTitle,
  hasContent,
  needsSave,
  sameDraft,
  toPayload,
  withoutUploadPlaceholders,
  type Draft,
} from '@/lib/note-draft';

const draft = (over: Partial<Draft> = {}): Draft => ({ ...EMPTY_DRAFT, ...over });
const file = { id: 'f'.repeat(24), name: 'a.pdf', type: 'application/pdf', size: 5 };

describe('the note being written', () => {
  it('picks the title: typed, else the first line, else "Untitled note" for files only', () => {
    expect(effectiveTitle(draft({ title: '  Plan  ', content: 'x' }))).toBe('Plan');
    expect(effectiveTitle(draft({ content: '# Big idea\n\nmore text' }))).toBe(
      'Big idea more text'
    );
    expect(effectiveTitle(draft({ attachments: [file] }))).toBe('Untitled note');
    expect(effectiveTitle(draft())).toBe('');
  });

  it('drops the "Uploading…" line before saving', () => {
    const text = 'a\n\n![Uploading cat.png…](#uploading-k3j2)\n\nb';
    expect(withoutUploadPlaceholders(text)).toBe('a\n\nb');
    expect(toPayload(draft({ title: 'T', content: text })).content).toBe('a\n\nb');
  });

  it('knows when there is something worth saving', () => {
    expect(hasContent(draft())).toBe(false);
    expect(hasContent(draft({ content: '![Uploading x…](#uploading-abc)' }))).toBe(false);
    expect(hasContent(draft({ tags: ['a'] }))).toBe(true);
    const saved = draftFromNote({
      _id: '1',
      title: 'T',
      content: 'body',
      tags: [],
      attachments: [],
      createdAt: '',
      updatedAt: '',
    });
    expect(needsSave(saved, saved)).toBe(false);
    expect(needsSave({ ...saved, content: 'body!' }, saved)).toBe(true);
    expect(needsSave({ ...saved, title: ' T ' }, saved)).toBe(false);
    expect(needsSave(draft(), draft())).toBe(false);
    expect(needsSave(draft({ content: 'hello' }), EMPTY_DRAFT)).toBe(true);
  });

  it('compares tags and files too', () => {
    const a = draft({ title: 't', tags: ['x'], attachments: [file] });
    expect(sameDraft(a, { ...a })).toBe(true);
    expect(sameDraft(a, { ...a, tags: ['y'] })).toBe(false);
    expect(sameDraft(a, { ...a, attachments: [] })).toBe(false);
    expect(sameDraft(a, { ...a, attachments: [{ ...file, path: 'F' }] })).toBe(false);
  });

  it('sends only what the server needs for each file', () => {
    const payload = toPayload(draft({ title: 'T', attachments: [{ ...file, path: 'Trip' }] }));
    expect(payload.attachments).toEqual([{ ...file, path: 'Trip' }]);
    expect(payload.title).toBe('T');
  });
});
