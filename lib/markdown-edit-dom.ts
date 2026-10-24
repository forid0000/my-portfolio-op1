import type { EditState } from '@/lib/markdown-edit';

/**
 * Writes the result of an editing operation (lib/markdown-edit.ts) into a text box. It looks at the
 * text before and after and replaces only what changed, through the browser's own editing command,
 * so Undo and Redo keep working. Browser only.
 */
export function applyEdit(el: HTMLTextAreaElement, next: EditState) {
  const old = el.value;
  let prefix = 0;
  const max = Math.min(old.length, next.value.length);
  while (prefix < max && old[prefix] === next.value[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < max - prefix &&
    old[old.length - 1 - suffix] === next.value[next.value.length - 1 - suffix]
  ) {
    suffix++;
  }
  const replacement = next.value.slice(prefix, next.value.length - suffix);
  el.focus();
  el.setSelectionRange(prefix, old.length - suffix);
  let done = false;
  try {
    done =
      replacement === ''
        ? document.execCommand('delete')
        : document.execCommand('insertText', false, replacement);
  } catch {
    done = false;
  }
  if (!done || el.value !== next.value) {
    // Browser without execCommand for text boxes: set the value directly (Undo is lost).
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(el, next.value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.setSelectionRange(next.start, next.end);
}
