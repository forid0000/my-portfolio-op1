'use client';

import { useState } from 'react';
import {
  Download,
  Eye,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  Link2,
  X,
} from 'lucide-react';
import AttachmentPreview from '@/components/notes/attachment-preview';
import {
  canPreview,
  extensionOf,
  fileKind,
  fileUrl,
  formatBytes,
  groupByFolder,
  isReferenced,
  type NoteAttachment,
} from '@/lib/notes-model';

const ARCHIVES = new Set(['zip', 'gz', 'tar', '7z', 'rar']);
const SHEETS = new Set(['xls', 'xlsx', 'ods', 'csv', 'tsv']);

function Icon({ att }: { att: NoteAttachment }) {
  const kind = fileKind(att.type, att.name);
  const ext = extensionOf(att.name);
  const cls = 'h-5 w-5';
  if (kind === 'image') return <FileImage className={cls} />;
  if (kind === 'video') return <FileVideo className={cls} />;
  if (kind === 'audio') return <FileAudio className={cls} />;
  if (ARCHIVES.has(ext)) return <FileArchive className={cls} />;
  if (SHEETS.has(ext)) return <FileSpreadsheet className={cls} />;
  if (kind === 'pdf' || kind === 'text') return <FileText className={cls} />;
  return <FileIcon className={cls} />;
}

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface AttachmentListProps {
  attachments: NoteAttachment[];
  /** The note's text, so pictures already shown in it are not listed twice. */
  content?: string;
  hideShownInText?: boolean;
  /** Vault only: put the file into the text / take it away from the note. */
  onInsert?: (attachment: NoteAttachment) => void;
  onRemove?: (attachment: NoteAttachment) => void;
  heading?: string;
  className?: string;
}

/**
 * The files kept with a note: a picture gets a thumbnail, everything else an icon. Pictures,
 * video, sound, PDFs and text open in a window; anything else is a download. Used by the vault
 * (with insert / remove) and on the public note page (read only).
 */
export default function AttachmentList({
  attachments,
  content = '',
  hideShownInText = false,
  onInsert,
  onRemove,
  heading = 'Files',
  className = '',
}: AttachmentListProps) {
  const [open, setOpen] = useState<NoteAttachment | null>(null);
  const shown = hideShownInText
    ? attachments.filter((a) => !(fileKind(a.type, a.name) === 'image' && isReferenced(content, a)))
    : attachments;
  if (!shown.length) return null;

  return (
    <section className={className} aria-label={heading} data-print-skip>
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        {heading} <span className="font-normal text-muted-foreground">({shown.length})</span>
      </h2>
      <div className="space-y-4">
        {groupByFolder(shown).map(({ path, files }) => (
          <div key={path || 'root'}>
            {path && (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Folder className="h-3.5 w-3.5" /> {path}
              </p>
            )}
            <ul className="grid gap-2 sm:grid-cols-2">
              {files.map((att) => {
                const kind = fileKind(att.type, att.name);
                const previewable = canPreview(att);
                return (
                  <li
                    key={att.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-2"
                  >
                    <button
                      type="button"
                      onClick={() => previewable && setOpen(att)}
                      disabled={!previewable}
                      aria-label={previewable ? `Preview ${att.name}` : att.name}
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground enabled:cursor-pointer enabled:hover:text-foreground"
                    >
                      {kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl(att.id)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icon att={att} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={att.name}>
                        {att.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(extensionOf(att.name) || 'file').toUpperCase()} · {formatBytes(att.size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {previewable && (
                        <button
                          type="button"
                          onClick={() => setOpen(att)}
                          className={iconButton}
                          title="Preview"
                          aria-label={`Preview ${att.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <a
                        href={fileUrl(att.id, { download: true })}
                        download={att.name}
                        className={iconButton}
                        title="Download"
                        aria-label={`Download ${att.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {onInsert && (
                        <button
                          type="button"
                          onClick={() => onInsert(att)}
                          className={iconButton}
                          title="Put it in the text"
                          aria-label={`Insert ${att.name} into the text`}
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(att)}
                          className={`${iconButton} hover:text-destructive`}
                          title="Remove from the note"
                          aria-label={`Remove ${att.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <AttachmentPreview attachment={open} onClose={() => setOpen(null)} />
    </section>
  );
}
