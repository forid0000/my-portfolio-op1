'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  TEXT_PREVIEW_BYTES,
  extensionOf,
  fileKind,
  fileUrl,
  formatBytes,
  type NoteAttachment,
} from '@/lib/notes-model';
import NoteBody from '@/components/notes/note-body';

/** Text of a stored file for the preview; JSON is laid out, anything long is cut. */
function useFileText(att: NoteAttachment | null) {
  const [state, setState] = useState<{ id: string; text: string | null; failed: boolean } | null>(
    null
  );
  const wanted = att && fileKind(att.type, att.name) === 'text' ? att : null;

  useEffect(() => {
    if (!wanted) return;
    const controller = new AbortController();
    fetch(fileUrl(wanted.id), { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('failed'))))
      .then((raw) => {
        let text = raw.slice(0, TEXT_PREVIEW_BYTES);
        if (extensionOf(wanted.name) === 'json') {
          try {
            text = JSON.stringify(JSON.parse(raw), null, 2).slice(0, TEXT_PREVIEW_BYTES);
          } catch {
            /* not valid JSON: show it as it is */
          }
        }
        setState({ id: wanted.id, text, failed: false });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setState({ id: wanted.id, text: null, failed: true });
      });
    return () => controller.abort();
  }, [wanted]);

  if (!wanted || state?.id !== wanted.id)
    return { text: null, loading: Boolean(wanted), failed: false };
  return { text: state.text, loading: false, failed: state.failed };
}

function Preview({ att }: { att: NoteAttachment }) {
  const kind = fileKind(att.type, att.name);
  const url = fileUrl(att.id);
  const { text, loading, failed } = useFileText(att);

  if (kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={att.name} className="mx-auto max-h-[70vh] max-w-full object-contain" />
    );
  }
  if (kind === 'video') {
    return <video src={url} controls playsInline className="mx-auto max-h-[70vh] max-w-full" />;
  }
  if (kind === 'audio') {
    return <audio src={url} controls className="w-full" />;
  }
  if (kind === 'pdf') {
    return (
      <iframe
        src={url}
        title={att.name}
        className="h-[70vh] w-full rounded-lg border border-border bg-background"
      />
    );
  }
  if (kind === 'text') {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (failed || text === null) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">Could not read this file.</p>
      );
    }
    if (['md', 'markdown'].includes(extensionOf(att.name))) {
      return (
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-background p-5">
          <NoteBody content={text} />
        </div>
      );
    }
    return (
      <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
        {text || 'This file is empty.'}
      </pre>
    );
  }
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      This kind of file cannot be shown here. Download it to open it.
    </p>
  );
}

/** A file shown in a window: pictures, video, sound, PDFs and text files; the rest are downloads. */
export default function AttachmentPreview({
  attachment,
  onClose,
}: {
  attachment: NoteAttachment | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] gap-3 overflow-hidden p-4 sm:max-w-5xl sm:p-5">
        {attachment && (
          <>
            <div className="min-w-0 pe-8">
              <DialogTitle className="truncate text-base">{attachment.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {formatBytes(attachment.size)}
                {attachment.path ? ` · ${attachment.path}` : ''}
              </DialogDescription>
            </div>
            <div className="min-h-0 min-w-0 overflow-y-auto">
              <Preview att={attachment} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <a
                href={fileUrl(attachment.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <ExternalLink className="h-4 w-4" /> Open in a tab
              </a>
              <a
                href={fileUrl(attachment.id, { download: true })}
                download={attachment.name}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
