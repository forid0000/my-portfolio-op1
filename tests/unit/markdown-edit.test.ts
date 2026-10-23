import { describe, expect, it } from 'vitest';
import {
  insertBlock,
  insertLink,
  insertText,
  setHeading,
  toggleList,
  wrapBlock,
  wrapSelection,
  type EditState,
} from '@/lib/markdown-edit';

const at = (value: string, start: number, end = start): EditState => ({ value, start, end });
const sel = (s: EditState) => s.value.slice(s.start, s.end);

describe('markdown editing', () => {
  it('wraps a selection and unwraps it again', () => {
    const bold = wrapSelection(at('make this bold', 5, 9), '**');
    expect(bold.value).toBe('make **this** bold');
    expect(sel(bold)).toBe('this');
    const plain = wrapSelection(bold, '**');
    expect(plain.value).toBe('make this bold');
    expect(sel(plain)).toBe('this');
  });

  it('inserts a placeholder when nothing is selected and selects it', () => {
    const s = wrapSelection(at('', 0), '*', 'italic text');
    expect(s.value).toBe('*italic text*');
    expect(sel(s)).toBe('italic text');
  });

  it('toggles heading levels on the current line', () => {
    const h2 = setHeading(at('Title here', 3), 2);
    expect(h2.value).toBe('## Title here');
    expect(setHeading(h2, 2).value).toBe('Title here');
    expect(setHeading(h2, 3).value).toBe('### Title here');
  });

  it('makes and removes lists across several lines', () => {
    const text = 'one\ntwo\n\nthree';
    const bullets = toggleList(at(text, 0, text.length), 'bullet');
    expect(bullets.value).toBe('- one\n- two\n\n- three');
    expect(toggleList(bullets, 'bullet').value).toBe(text);
    const numbered = toggleList(at(text, 0, text.length), 'ordered');
    expect(numbered.value).toBe('1. one\n2. two\n\n3. three');
    expect(toggleList(at('a', 0), 'task').value).toBe('- [ ] a');
    expect(toggleList(at('a', 0), 'quote').value).toBe('> a');
    // switching kinds replaces the old marker instead of stacking
    expect(toggleList(at('- a', 0), 'ordered').value).toBe('1. a');
  });

  it('puts blocks on their own lines', () => {
    const s = insertBlock(at('before after', 7), '---');
    expect(s.value).toBe('before \n\n---\n\nafter');
    expect(insertBlock(at('', 0), '---').value).toBe('---');
  });

  it('inserts links using the selection as the label', () => {
    const s = insertLink(at('see docs now', 4, 8), 'https://x.test');
    expect(s.value).toBe('see [docs](https://x.test) now');
    expect(sel(s)).toBe('https://x.test');
    expect(insertLink(at('', 0)).value).toBe('[link text](https://)');
  });

  it('inserts text at the cursor and wraps a selection in a block', () => {
    expect(insertText(at('ab', 1), 'XY').value).toBe('aXYb');
    const b = wrapBlock(at('hello', 0, 5), 'center');
    expect(b.value).toBe('::: center\nhello\n:::');
    const empty = wrapBlock(at('', 0), 'note');
    expect(empty.value).toBe('::: note\nWrite here\n:::');
    expect(sel(empty)).toBe('Write here');
  });
});
