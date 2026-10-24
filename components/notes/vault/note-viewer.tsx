'use client';

import { useRef } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Menu, MenuItem } from '@/components/notes/vault/menu';
import PublishMenu from '@/components/notes/vault/publish-menu';
import NoteDocument from '@/components/notes/note-document';
import { Button } from '@/components/ui/button';
import { downloadText, printElement } from '@/lib/note-print';
import { exportFileName, noteToMarkdown, noteToText, timeAgo, type Note } from '@/lib/notes-model';

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

interface NoteViewerProps {
  note: Note;
  position: { index: number; total: number } | null;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: (note: Note) => void;
  onTagClick: (tag: string) => void;
}

/** A note, read-only, with what can be done to it: edit, publish, export, delete. */
export default function NoteViewer({
  note,
  position,
  onPrev,
  onNext,
  onBack,
  onEdit,
  onDelete,
  onChanged,
  onTagClick,
}: NoteViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const edited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 5000;

  const exportAs = async (format: 'md' | 'txt' | 'pdf') => {
    const name = exportFileName(note.title);
    if (format === 'md') downloadText(`${name}.md`, noteToMarkdown(note), 'text/markdown');
    else if (format === 'txt') downloadText(`${name}.txt`, noteToText(note), 'text/plain');
    else if (printRef.current) {
      const opened = await printElement(printRef.current, note.title);
      if (!opened) toast.error('Allow pop-ups for this site to print or save as PDF.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            aria-label="Back to the list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {position && position.total > 1 && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onPrev}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Previous note (K)"
                aria-label="Previous note"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
                {position.index + 1}/{position.total}
              </span>
              <button
                type="button"
                onClick={onNext}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Next note (J)"
                aria-label="Next note"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <span className="hidden truncate ps-1 text-xs text-muted-foreground sm:block">
            Updated {timeAgo(note.updatedAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <PublishMenu note={note} onChanged={onChanged} />
          <Menu
            label="Export this note"
            align="end"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            trigger={
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </>
            }
          >
            <MenuItem icon={<FileDown />} onSelect={() => exportAs('md')} hint=".md">
              Markdown
            </MenuItem>
            <MenuItem icon={<FileText />} onSelect={() => exportAs('txt')} hint=".txt">
              Plain text
            </MenuItem>
            <MenuItem icon={<Printer />} onSelect={() => exportAs('pdf')} hint="PDF">
              Print or save as PDF
            </MenuItem>
          </Menu>
          <Button variant="outline" size="sm" onClick={onEdit} title="Edit (E)">
            <Pencil /> <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            title="Delete this note"
            aria-label="Delete this note"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-8" ref={printRef}>
          <NoteDocument
            title={note.title}
            tags={note.tags}
            content={note.content}
            attachments={note.attachments}
            onTagClick={onTagClick}
            meta={
              <>
                <span>Created {longDate(note.createdAt)}</span>
                {edited && <span>· Edited {longDate(note.updatedAt)}</span>}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
