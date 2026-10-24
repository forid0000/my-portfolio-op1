import NoteBody from '@/components/notes/note-body';
import AttachmentList from '@/components/notes/attachment-list';
import type { NoteAttachment } from '@/lib/notes-model';

interface NoteDocumentProps {
  title: string;
  tags: string[];
  content: string;
  attachments: NoteAttachment[];
  /** A line under the title (dates, status). */
  meta?: React.ReactNode;
  onTagClick?: (tag: string) => void;
}

/**
 * A note laid out the way it is saved: title, tags, text, files. The editor's live preview and the
 * vault's reading view are this same component, so what you see while writing is what you get.
 */
export default function NoteDocument({
  title,
  tags,
  content,
  attachments,
  meta,
  onTagClick,
}: NoteDocumentProps) {
  return (
    <div className="min-w-0 max-w-full">
      {title && (
        <h1
          className="text-2xl font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] md:text-3xl"
          dir="auto"
        >
          {title}
        </h1>
      )}
      {meta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) =>
            onTagClick ? (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                title={`Show notes tagged #${tag}`}
                className="chip chip-primary rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:brightness-95"
              >
                #{tag}
              </button>
            ) : (
              <span
                key={tag}
                className="chip chip-primary rounded-full border px-2.5 py-0.5 text-xs font-medium"
              >
                #{tag}
              </span>
            )
          )}
        </div>
      )}
      {(title || tags.length > 0 || meta) && <div className="my-5 h-px w-full bg-border" />}
      {content.trim() ? (
        <NoteBody content={content} attachments={attachments} />
      ) : (
        <p className="text-sm text-muted-foreground">There is no text in this note yet.</p>
      )}
      <AttachmentList
        attachments={attachments}
        content={content}
        hideShownInText
        className="mt-8 border-t border-border pt-6"
      />
    </div>
  );
}
