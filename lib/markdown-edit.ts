/**
 * Editing operations for the article editor's toolbar. Each takes the text and the selection and
 * returns the new text and the new selection, so they are easy to test and to undo with the
 * browser's own history (the editor writes the result back into the textarea).
 */

export interface EditState {
  value: string;
  start: number;
  end: number;
}

const replace = (
  s: EditState,
  from: number,
  to: number,
  text: string,
  selStart: number,
  selEnd: number
): EditState => ({
  value: s.value.slice(0, from) + text + s.value.slice(to),
  start: selStart,
  end: selEnd,
});

/** Start and end of the lines touched by the selection. */
function lineBounds(s: EditState): { from: number; to: number } {
  const from = s.value.lastIndexOf('\n', s.start - 1) + 1;
  const nl = s.value.indexOf('\n', s.end);
  return { from, to: nl === -1 ? s.value.length : nl };
}

/** **bold**, *italic*, ~~strike~~, `code`: adds the marks, or removes them when already there. */
export function wrapSelection(
  s: EditState,
  mark: string,
  placeholder = 'text',
  closing = mark
): EditState {
  const { value, start, end } = s;
  const selected = value.slice(start, end);
  const before = value.slice(Math.max(0, start - mark.length), start);
  const after = value.slice(end, end + closing.length);
  if (selected && before === mark && after === closing) {
    return replace(
      s,
      start - mark.length,
      end + closing.length,
      selected,
      start - mark.length,
      end - mark.length
    );
  }
  if (
    selected.startsWith(mark) &&
    selected.endsWith(closing) &&
    selected.length >= mark.length + closing.length
  ) {
    const inner = selected.slice(mark.length, selected.length - closing.length);
    return replace(s, start, end, inner, start, start + inner.length);
  }
  const text = selected || placeholder;
  return replace(
    s,
    start,
    end,
    mark + text + closing,
    start + mark.length,
    start + mark.length + text.length
  );
}

/** Heading level 1-4 for the current line(s); the same level again turns it back into a paragraph. */
export function setHeading(s: EditState, level: 1 | 2 | 3 | 4): EditState {
  const { from, to } = lineBounds(s);
  const lines = s.value.slice(from, to).split('\n');
  const prefix = '#'.repeat(level) + ' ';
  const allSame = lines.every((l) => l.startsWith(prefix));
  const next = lines
    .map((l) => l.replace(/^#{1,6}\s+/, ''))
    .map((l) => (allSame ? l : prefix + l))
    .join('\n');
  return replace(s, from, to, next, from, from + next.length);
}

type ListKind = 'bullet' | 'ordered' | 'task' | 'quote';

const LIST_MARK: Record<ListKind, RegExp> = {
  bullet: /^(\s*)[-*+]\s+(?!\[[ xX]\])/,
  ordered: /^(\s*)\d+\.\s+/,
  task: /^(\s*)[-*+]\s+\[[ xX]\]\s+/,
  quote: /^(\s*)>\s?/,
};

/** Bullet / numbered / task list or quote on the selected lines; applying it twice removes it. */
export function toggleList(s: EditState, kind: ListKind): EditState {
  const { from, to } = lineBounds(s);
  const lines = s.value.slice(from, to).split('\n');
  const marker = LIST_MARK[kind];
  const nonEmpty = lines.filter((l) => l.trim());
  const allOn = nonEmpty.length > 0 && nonEmpty.every((l) => marker.test(l));
  let n = 0;
  const next = lines
    .map((line) => {
      if (!line.trim()) return line;
      if (allOn) return line.replace(marker, '$1');
      const bare = line
        .replace(LIST_MARK.task, '$1')
        .replace(LIST_MARK.bullet, '$1')
        .replace(LIST_MARK.ordered, '$1')
        .replace(LIST_MARK.quote, '$1');
      n += 1;
      const lead = /^\s*/.exec(bare)?.[0] ?? '';
      const rest = bare.slice(lead.length);
      const mark =
        kind === 'bullet' ? '- ' : kind === 'task' ? '- [ ] ' : kind === 'quote' ? '> ' : `${n}. `;
      return lead + mark + rest;
    })
    .join('\n');
  return replace(s, from, to, next, from, from + next.length);
}

/** Inserts text at the cursor (replacing the selection), with the cursor after it. */
export function insertText(s: EditState, text: string): EditState {
  return replace(s, s.start, s.end, text, s.start + text.length, s.start + text.length);
}

/** A block of text on its own lines (blank line before and after), for tables, rules, code, media. */
export function insertBlock(s: EditState, block: string): EditState {
  const before = s.value.slice(0, s.start);
  const after = s.value.slice(s.end);
  const lead =
    before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail =
    after === '' || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const text = lead + block + trail;
  const caret = s.start + (lead + block).length;
  return replace(s, s.start, s.end, text, caret, caret);
}

/** [text](url): uses the selection as the label, or asks the editor to select the placeholder. */
export function insertLink(s: EditState, url = 'https://'): EditState {
  const label = s.value.slice(s.start, s.end) || 'link text';
  const text = `[${label}](${url})`;
  const urlStart = s.start + label.length + 3;
  return replace(s, s.start, s.end, text, urlStart, urlStart + url.length);
}

export function imageMarkdown(src: string, alt = ''): string {
  return `![${alt.replace(/[[\]]/g, '')}](${src})`;
}

export const TABLE_TEMPLATE =
  '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Text | Text | Text |\n| Text | Text | Text |';

/** A `:::` block around the selection (or a placeholder line). */
export function wrapBlock(
  s: EditState,
  kind: 'center' | 'right' | 'note' | 'tip' | 'warning'
): EditState {
  const selected = s.value.slice(s.start, s.end);
  const inner = selected || 'Write here';
  const block = `::: ${kind}\n${inner}\n:::`;
  const result = insertBlock(s, block);
  if (selected) return result;
  const innerStart = result.value.indexOf(inner, Math.max(0, s.start - 1));
  return { ...result, start: innerStart, end: innerStart + inner.length };
}

const LIST_LINE = /^(\s*)((?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?)(.*)$/;

/**
 * Enter inside a list: starts the next item with the same marker (a numbered list counts on, a
 * checklist starts unchecked). Enter on an empty item ends the list. Returns null when the caret
 * is not at the end of a list line, so the editor leaves Enter alone.
 */
export function continueList(s: EditState): EditState | null {
  if (s.start !== s.end) return null;
  const lineStart = s.value.lastIndexOf('\n', s.start - 1) + 1;
  const lineEndIndex = s.value.indexOf('\n', s.start);
  const lineEnd = lineEndIndex === -1 ? s.value.length : lineEndIndex;
  if (s.start !== lineEnd) return null;
  const match = LIST_LINE.exec(s.value.slice(lineStart, lineEnd));
  if (!match) return null;
  const [, indent, marker, text] = match;
  if (!text.trim()) {
    // An empty item: remove the marker and leave the list, with a blank line after it (without
    // one, the next line would be read as part of the last item).
    return replace(s, lineStart, lineEnd, '\n', lineStart + 1, lineStart + 1);
  }
  const number = /^(\d+)\./.exec(marker);
  const next = number
    ? marker.replace(/^\d+/, String(Number(number[1]) + 1))
    : marker.replace(/\[[xX]\]/, '[ ]');
  const insert = `\n${indent}${next}`;
  const caret = s.start + insert.length;
  return replace(s, s.start, s.end, insert, caret, caret);
}

/** Tab / Shift+Tab on list lines: indents or outdents by two spaces. Null on other lines. */
export function indentLines(s: EditState, outdent = false): EditState | null {
  const { from, to } = lineBounds(s);
  const lines = s.value.slice(from, to).split('\n');
  const multi = lines.length > 1;
  if (!multi && !LIST_LINE.test(lines[0])) return null;
  const next = lines
    .map((line) => (outdent ? line.replace(/^ {1,2}/, '') : line ? `  ${line}` : line))
    .join('\n');
  if (!multi) {
    // One list line: keep the caret (or selection) where it was in the line.
    const shift = next.length - (to - from);
    return replace(
      s,
      from,
      to,
      next,
      Math.max(from, s.start + shift),
      Math.max(from, s.end + shift)
    );
  }
  return replace(s, from, to, next, from, from + next.length);
}

/** Turns the selected heading lines back into normal paragraphs. */
export function clearHeading(s: EditState): EditState {
  const { from, to } = lineBounds(s);
  const next = s.value
    .slice(from, to)
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, ''))
    .join('\n');
  return replace(s, from, to, next, from, from + next.length);
}
