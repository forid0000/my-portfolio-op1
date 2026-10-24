/**
 * The note being written, as plain data and pure functions (no React): what a draft is, when it
 * counts as changed, which title it is saved under and what exactly is sent to the server.
 */
import { plainText, type Note, type NoteAttachment } from '@/lib/notes-model';

export interface Draft {
  title: string;
  content: string;
  tags: string[];
  attachments: NoteAttachment[];
}

export const EMPTY_DRAFT: Draft = { title: '', content: '', tags: [], attachments: [] };

export function draftFromNote(note: Note | null): Draft {
  if (!note) return EMPTY_DRAFT;
  return {
    title: note.title,
    content: note.content,
    tags: note.tags ?? [],
    attachments: note.attachments ?? [],
  };
}

/** The "Uploading…" line left in the text while a picture is on its way. */
const UPLOADING_LINE = /!\[Uploading[^\]\n]*\]\(#uploading-[a-z0-9]+\)\n*/gi;

export function withoutUploadPlaceholders(content: string): string {
  return content.replace(UPLOADING_LINE, '');
}

/**
 * The title a draft is saved under: what was typed, else the first line of the text, else
 * "Untitled note" when it only has files. Empty means there is nothing worth saving yet.
 */
export function effectiveTitle(draft: Draft, max = 80): string {
  const typed = draft.title.trim();
  if (typed) return typed;
  const first = plainText(withoutUploadPlaceholders(draft.content)).slice(0, max).trim();
  if (first) return first;
  return draft.attachments.length ? 'Untitled note' : '';
}

/** True when there is anything at all in the draft. */
export function hasContent(draft: Draft): boolean {
  return (
    draft.title.trim() !== '' ||
    withoutUploadPlaceholders(draft.content).trim() !== '' ||
    draft.tags.length > 0 ||
    draft.attachments.length > 0
  );
}

/** What is sent to the server for this draft. */
export function toPayload(draft: Draft) {
  return {
    title: effectiveTitle(draft),
    content: withoutUploadPlaceholders(draft.content),
    tags: draft.tags,
    attachments: draft.attachments.map(({ id, name, type, size, path }) => ({
      id,
      name,
      type,
      size,
      ...(path ? { path } : {}),
    })),
  };
}

/** Same title, text, tags and files (cheap: string equality, no serialising of long text). */
export function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    a.content === b.content &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, i) => tag === b.tags[i]) &&
    a.attachments.length === b.attachments.length &&
    a.attachments.every(
      (att, i) => att.id === b.attachments[i].id && att.path === b.attachments[i].path
    )
  );
}

/** Should the draft be written to the server? Only when it changed and has something in it. */
export function needsSave(draft: Draft, saved: Draft): boolean {
  return !sameDraft(draft, saved) && hasContent(draft) && effectiveTitle(draft) !== '';
}
