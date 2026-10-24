'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Columns2,
  Eye,
  HelpCircle,
  Loader2,
  PenLine,
  Paperclip,
  Rows2,
  Save,
  Settings2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import EditorToolbar, { type EditorAction } from '@/components/notes/vault/editor-toolbar';
import SplitView from '@/components/notes/vault/split-view';
import TagEditor from '@/components/notes/vault/tag-editor';
import { Menu, MenuItem, MenuSeparator } from '@/components/notes/vault/menu';
import NoteDocument from '@/components/notes/note-document';
import AttachmentList from '@/components/notes/attachment-list';
import { Button } from '@/components/ui/button';
import { useAttachmentUpload } from '@/hooks/use-attachment-upload';
import { useEditorPrefs } from '@/hooks/use-editor-prefs';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useScrollSync } from '@/hooks/use-scroll-sync';
import { useSplitPane } from '@/hooks/use-split-pane';
import type { SaveResult, SaveStatus } from '@/hooks/use-note-draft';
import { fromDataTransfer, fromFileList, type PickedFile } from '@/lib/dropped-files';
import {
  TABLE_TEMPLATE,
  clearHeading,
  continueList,
  indentLines,
  insertBlock,
  insertLink,
  setHeading,
  toggleList,
  wrapBlock,
  wrapSelection,
  type EditState,
} from '@/lib/markdown-edit';
import { applyEdit } from '@/lib/markdown-edit-dom';
import { effectiveTitle, type Draft } from '@/lib/note-draft';
import {
  NOTE_LIMITS,
  attachmentMarkdown,
  fileUrl,
  plainText,
  readingMinutes,
  type NoteAttachment,
} from '@/lib/notes-model';
import type { EditorFont, EditorSize } from '@/lib/split-pane';

const FONTS: Record<EditorFont, { label: string; family: string }> = {
  sans: { label: 'Clean', family: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)' },
  serif: { label: 'Book', family: "Georgia, 'Times New Roman', ui-serif, serif" },
  mono: { label: 'Code', family: 'var(--font-mono, ui-monospace, monospace)' },
};
const SIZES: Record<EditorSize, { label: string; size: string }> = {
  sm: { label: 'Small', size: '0.875rem' },
  md: { label: 'Medium', size: '1rem' },
  lg: { label: 'Large', size: '1.125rem' },
};

const isImage = (file: File) => file.type.startsWith('image/');
/** Pictures put straight into the text when added by paste, drop on the text, or the picture button. */
const MAX_INLINE_IMAGES = 8;

function SaveState({
  status,
  error,
  savedAt,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  savedAt: Date | null;
  onRetry: () => void;
}) {
  if (status === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="inline-flex min-w-0 items-center gap-1.5 text-xs text-destructive"
        role="alert"
      >
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate" title={error ?? undefined}>
          {error ?? 'Not saved'}
        </span>
        <button type="button" onClick={onRetry} className="shrink-0 font-medium underline">
          Retry
        </button>
      </span>
    );
  }
  if (status === 'dirty') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
      >
        <span className="h-2 w-2 rounded-full bg-warning" /> Unsaved changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <Check className="h-3.5 w-3.5 text-success" />
      {savedAt
        ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'All changes saved'}
    </span>
  );
}

interface NoteEditorProps {
  draft: Draft;
  update: (changes: Partial<Draft> | ((d: Draft) => Draft)) => void;
  status: SaveStatus;
  error: string | null;
  savedAt: Date | null;
  maxFileBytes: number;
  knownTags: string[];
  titleRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => Promise<SaveResult>;
  /** Save, then leave the editor. */
  onDone: () => void;
  onBack: () => void;
  onUnauthorized: () => void;
  onShortcuts: () => void;
}

export default function NoteEditor({
  draft,
  update,
  status,
  error,
  savedAt,
  maxFileBytes,
  knownTags,
  titleRef,
  onSave,
  onDone,
  onBack,
  onUnauthorized,
  onShortcuts,
}: NoteEditorProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const picturesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const placeholders = useRef(new Map<string, string>());
  /** True once the text box has been focused: only then does its caret mean something. */
  const touched = useRef(false);

  const split = useSplitPane();
  const narrow = useMediaQuery('(max-width: 767px)');
  const [prefs, setPrefs] = useEditorPrefs();
  const [dragDepth, setDragDepth] = useState(0);
  const [filesOpen, setFilesOpen] = useState(false);
  const { jobs, upload, dismiss } = useAttachmentUpload({ maxBytes: maxFileBytes, onUnauthorized });

  const deferred = useDeferredValue(draft);
  const mode = narrow && split.state.mode === 'split' ? 'write' : split.state.mode;
  useScrollSync(textRef, previewRef, prefs.syncScroll && mode === 'split');

  const words = plainText(draft.content).split(/\s+/).filter(Boolean).length;
  const title = effectiveTitle(deferred);

  /* ------------------------------- editing text ------------------------------- */

  const run = (compute: (s: EditState) => EditState) => {
    const el = textRef.current;
    if (!el) return;
    // Until the text box has been used, its caret sits at the very start; things added from the
    // bar (a picture, a table) then belong at the end, not in front of everything.
    if (!touched.current) el.setSelectionRange(el.value.length, el.value.length);
    applyEdit(el, compute({ value: el.value, start: el.selectionStart, end: el.selectionEnd }));
  };

  /** Swaps one piece of text for another without losing the caret or the browser's Undo. */
  const replaceInText = (find: string, replacement: string) => {
    const el = textRef.current;
    if (el && document.activeElement === el && el.value.includes(find)) {
      const at = el.value.indexOf(find);
      const delta = replacement.length - find.length;
      const move = (pos: number) =>
        pos <= at ? pos : pos >= at + find.length ? pos + delta : at + replacement.length;
      applyEdit(el, {
        value: el.value.replace(find, () => replacement),
        start: move(el.selectionStart),
        end: move(el.selectionEnd),
      });
      return;
    }
    update((d) => ({
      ...d,
      content: d.content.includes(find)
        ? d.content.replace(find, () => replacement)
        : replacement
          ? `${d.content}${d.content && !d.content.endsWith('\n') ? '\n\n' : ''}${replacement}`
          : d.content,
    }));
  };

  const askForLink = () => {
    const url = window.prompt('Link address', 'https://');
    if (url?.trim()) run((s) => insertLink(s, url.trim()));
  };

  /* --------------------------------- uploads ---------------------------------- */

  const startUpload = async (picked: PickedFile[], inlineImages: boolean) => {
    if (!picked.length) return;
    const room = NOTE_LIMITS.attachments - draft.attachments.length;
    if (room <= 0) {
      toast.error(`A note can keep up to ${NOTE_LIMITS.attachments} files.`);
      return;
    }
    let files = picked;
    if (files.length > room) {
      toast.warning(
        `Only the first ${room} files were added (a note keeps up to ${NOTE_LIMITS.attachments}).`
      );
      files = files.slice(0, room);
    }
    const inline = inlineImages && files.filter((p) => isImage(p.file)).length <= MAX_INLINE_IMAGES;
    setFilesOpen(true);
    await upload(files, {
      onStart: (job, p) => {
        if (inline && isImage(p.file)) {
          const placeholder = `![Uploading ${p.file.name.replace(/[[\]()]/g, '')}…](#uploading-${job.id})`;
          placeholders.current.set(job.id, placeholder);
          run((s) => insertBlock(s, placeholder));
        }
      },
      onDone: (job, _p, att) => {
        const placeholder = placeholders.current.get(job.id);
        placeholders.current.delete(job.id);
        if (placeholder) replaceInText(placeholder, attachmentMarkdown(att));
        update((d) => ({ ...d, attachments: [...d.attachments, att] }));
      },
      onFail: (job, p, message) => {
        const placeholder = placeholders.current.get(job.id);
        placeholders.current.delete(job.id);
        if (placeholder) replaceInText(placeholder, '');
        if (message !== 'Cancelled') toast.error(message, { description: p.file.name });
      },
    });
  };

  const removeAttachment = (att: NoteAttachment) => {
    const url = fileUrl(att.id);
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const references = new RegExp(`\\n*!?\\[[^\\]]*\\]\\(${escaped}(?:\\?download=1)?\\)\\n*`, 'g');
    update((d) => ({
      ...d,
      content: d.content.replace(references, '\n\n').replace(/^\n+/, ''),
      attachments: d.attachments.filter((a) => a.id !== att.id),
    }));
    // A file that was never saved with a note is deleted now; a saved one when the note is saved.
    fetch(`/api/notes/files/${att.id}`, { method: 'DELETE' }).catch(() => {});
  };

  /* --------------------------------- actions ---------------------------------- */

  const onAction = (action: EditorAction) => {
    switch (action) {
      case 'bold':
        return run((s) => wrapSelection(s, '**', 'bold text'));
      case 'italic':
        return run((s) => wrapSelection(s, '*', 'italic text'));
      case 'strike':
        return run((s) => wrapSelection(s, '~~', 'struck text'));
      case 'code':
        return run((s) => wrapSelection(s, '`', 'code'));
      case 'paragraph':
        return run(clearHeading);
      case 'h1':
        return run((s) => setHeading(s, 1));
      case 'h2':
        return run((s) => setHeading(s, 2));
      case 'h3':
        return run((s) => setHeading(s, 3));
      case 'h4':
        return run((s) => setHeading(s, 4));
      case 'bullets':
        return run((s) => toggleList(s, 'bullet'));
      case 'numbers':
        return run((s) => toggleList(s, 'ordered'));
      case 'tasks':
        return run((s) => toggleList(s, 'task'));
      case 'quote':
        return run((s) => toggleList(s, 'quote'));
      case 'link':
        return askForLink();
      case 'table':
        return run((s) => insertBlock(s, TABLE_TEMPLATE));
      case 'divider':
        return run((s) => insertBlock(s, '---'));
      case 'codeblock':
        return run((s) => insertBlock(s, '```\ncode here\n```'));
      case 'center':
      case 'right':
      case 'note':
      case 'tip':
      case 'warning':
        return run((s) => wrapBlock(s, action));
      case 'undo':
        textRef.current?.focus();
        return void document.execCommand('undo');
      case 'redo':
        textRef.current?.focus();
        return void document.execCommand('redo');
      case 'picture':
        return picturesInput.current?.click();
      case 'files':
        return filesInput.current?.click();
      case 'folder':
        return folderInput.current?.click();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && !event.altKey) {
      const shortcuts: Record<string, () => void> = {
        b: () => onAction('bold'),
        i: () => onAction('italic'),
        e: () => onAction('code'),
        k: askForLink,
        s: () => void onSave(),
        enter: onDone,
      };
      if (shortcuts[key] && !event.shiftKey) {
        event.preventDefault();
        shortcuts[key]();
      }
      return;
    }
    const el = event.currentTarget;
    const state: EditState = { value: el.value, start: el.selectionStart, end: el.selectionEnd };
    if (event.key === 'Enter' && !event.shiftKey) {
      const next = continueList(state);
      if (next) {
        event.preventDefault();
        applyEdit(el, next);
      }
    } else if (event.key === 'Tab') {
      // Tab indents list lines; anywhere else it keeps its normal job (moving to the next control).
      const next = indentLines(state, event.shiftKey);
      if (next) {
        event.preventDefault();
        applyEdit(el, next);
      }
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files ?? []);
    if (!files.length) return;
    event.preventDefault();
    // A screenshot arrives as "image.png": give it a name that tells pastes apart.
    const named = files.map((f) =>
      /^image\.\w+$/i.test(f.name)
        ? new File([f], `pasted-${Date.now().toString(36)}.${f.name.split('.').pop()}`, {
            type: f.type,
          })
        : f
    );
    void startUpload(fromFileList(named), true);
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const pickFiles = (event: React.ChangeEvent<HTMLInputElement>, inlineImages: boolean) => {
    const picked = fromFileList(event.target.files ?? []);
    event.target.value = '';
    void startUpload(picked, inlineImages);
  };

  // The file list opens by itself when an upload starts, so its progress is visible.
  useEffect(() => {
    if (!filesOpen && jobs.length) setFilesOpen(true);
  }, [jobs.length, filesOpen]);

  /* ---------------------------------- layout ---------------------------------- */

  const textStyle = {
    fontFamily: FONTS[prefs.font].family,
    fontSize: SIZES[prefs.size].size,
    lineHeight: 1.75,
  } as const;

  const writePane = (
    <div className="relative h-full min-h-0">
      <textarea
        ref={textRef}
        value={draft.content}
        onChange={(e) => update({ content: e.target.value })}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => {
          touched.current = true;
        }}
        wrap="soft"
        spellCheck
        dir="auto"
        aria-label="Note text"
        placeholder={
          'Start writing…\n\nUse the bar above for bold, headings, lists and tables, or type Markdown.\nPaste or drop pictures and files right here.'
        }
        style={textStyle}
        className="block h-full w-full resize-none whitespace-pre-wrap bg-background px-4 py-3 text-foreground [overflow-wrap:anywhere] placeholder:text-muted-foreground/70 focus:outline-none md:px-6 md:py-4"
      />
    </div>
  );

  const previewPane = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-1.5 text-xs text-muted-foreground md:px-6">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Eye className="h-3.5 w-3.5" /> Preview
        </span>
        <span>
          {words} {words === 1 ? 'word' : 'words'} · {readingMinutes(draft.content)} min read
        </span>
      </div>
      <div
        ref={previewRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6"
      >
        <NoteDocument
          title={title}
          tags={deferred.tags}
          content={deferred.content}
          attachments={deferred.attachments}
        />
      </div>
    </div>
  );

  const activeJobs = jobs.filter((j) => j.stage !== 'error');

  const viewControls = (
    <div className="flex shrink-0 items-center gap-1">
      <div
        role="tablist"
        aria-label="View"
        className="inline-flex overflow-hidden rounded-md border border-border"
      >
        {(
          [
            ['write', 'Write', PenLine],
            ['split', 'Both', Columns2],
            ['preview', 'Preview', Eye],
          ] as const
        )
          .filter(([value]) => !(narrow && value === 'split'))
          .map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => split.setMode(value)}
              title={label === 'Both' ? 'Write and preview side by side' : label}
              className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors ${
                mode === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
      </div>
      {!narrow && mode === 'split' && (
        <button
          type="button"
          onClick={() =>
            split.setOrientation(split.state.orientation === 'columns' ? 'rows' : 'columns')
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={
            split.state.orientation === 'columns'
              ? 'Put the preview below the text'
              : 'Put the preview beside the text'
          }
          aria-label="Switch between side by side and stacked"
        >
          {split.state.orientation === 'columns' ? (
            <Rows2 className="h-4 w-4" />
          ) : (
            <Columns2 className="h-4 w-4" />
          )}
        </button>
      )}
      <Menu
        label="Editor settings"
        align="end"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        trigger={<Settings2 className="h-4 w-4" />}
        panelClassName="w-56"
      >
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Text font</p>
        {(Object.keys(FONTS) as EditorFont[]).map((key) => (
          <MenuItem
            key={key}
            icon={prefs.font === key ? <Check /> : <span className="w-4" />}
            onSelect={() => setPrefs({ font: key })}
          >
            {FONTS[key].label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Text size</p>
        {(Object.keys(SIZES) as EditorSize[]).map((key) => (
          <MenuItem
            key={key}
            icon={prefs.size === key ? <Check /> : <span className="w-4" />}
            onSelect={() => setPrefs({ size: key })}
          >
            {SIZES[key].label}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem
          icon={prefs.syncScroll ? <Check /> : <span className="w-4" />}
          onSelect={() => setPrefs({ syncScroll: !prefs.syncScroll })}
        >
          Scroll both together
        </MenuItem>
      </Menu>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      {/* header: save state, view, save buttons */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border bg-card px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            aria-label="Back to the list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <SaveState
            status={status}
            error={error}
            savedAt={savedAt}
            onRetry={() => void onSave()}
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          {viewControls}
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={onShortcuts}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onSave()}
            disabled={status === 'saving' || status === 'clean' || status === 'saved'}
            title="Save now (Ctrl+S)"
          >
            <Save /> Save
          </Button>
          <Button size="sm" onClick={onDone} title="Save and close (Ctrl+Enter)">
            Done
          </Button>
        </div>
      </div>

      {/* title and tags */}
      <div className="shrink-0 space-y-2 border-b border-border px-4 pb-3 pt-4 md:px-6">
        <input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              textRef.current?.focus();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              onDone();
            }
          }}
          maxLength={NOTE_LIMITS.title}
          placeholder="Title"
          aria-label="Note title"
          dir="auto"
          className="w-full bg-transparent text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none md:text-3xl"
        />
        <TagEditor
          tags={draft.tags}
          suggestions={knownTags}
          onChange={(tags) => update({ tags })}
          onTabOut={() => textRef.current?.focus()}
        />
      </div>

      {/* formatting bar */}
      <div className="shrink-0 border-b border-border bg-card">
        <EditorToolbar onAction={onAction} disabled={mode === 'preview'} />
      </div>

      {/* the two panes (also the drop area for files) */}
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onDragEnter={(e) => {
          if (hasFiles(e)) setDragDepth((n) => n + 1);
        }}
        onDragOver={(e) => {
          if (hasFiles(e)) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (hasFiles(e)) setDragDepth((n) => Math.max(0, n - 1));
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragDepth(0);
          // Pictures dropped on the writing area go into the text; elsewhere they are attached.
          const onText = (e.target as HTMLElement).closest('[data-pane="write"]') !== null;
          void fromDataTransfer(e.dataTransfer).then((picked) => startUpload(picked, onText));
        }}
      >
        <SplitView
          split={split}
          narrow={narrow}
          first={writePane}
          second={previewPane}
          firstName="the text"
          secondName="preview"
        />
        {dragDepth > 0 && (
          <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/85 text-center">
            <div>
              <Upload className="mx-auto mb-2 h-7 w-7 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Drop files or folders to add them
              </p>
              <p className="text-xs text-muted-foreground">
                Pictures dropped on the text are placed in it
              </p>
            </div>
          </div>
        )}
      </div>

      {/* files */}
      <div className="shrink-0 border-t border-border bg-card">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 md:px-4">
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            aria-expanded={filesOpen}
            className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            Files
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {draft.attachments.length}
            </span>
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> uploading {activeJobs.length}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${filesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => filesInput.current?.click()}>
              <Paperclip /> Add files
            </Button>
          </div>
        </div>
        {filesOpen && (
          <div className="max-h-56 space-y-3 overflow-y-auto border-t border-border px-3 py-3 md:px-4">
            {jobs.length > 0 && (
              <ul className="space-y-2" aria-live="polite">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      job.stage === 'error'
                        ? 'border-destructive/40 bg-destructive/5 text-destructive'
                        : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {job.path ? `${job.path}/` : ''}
                        {job.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        {job.stage === 'error'
                          ? 'Failed'
                          : job.stage === 'uploading'
                            ? `${Math.round(job.progress * 100)}%`
                            : job.stage === 'preparing'
                              ? 'Optimizing…'
                              : 'Waiting…'}
                        <button
                          type="button"
                          onClick={() => dismiss(job.id)}
                          aria-label={job.stage === 'error' ? 'Dismiss' : 'Cancel upload'}
                          className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                    {job.stage === 'error' ? (
                      <p className="mt-1">{job.error}</p>
                    ) : (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.round(job.progress * 100)}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {draft.attachments.length > 0 ? (
              <AttachmentList
                attachments={draft.attachments}
                heading="Kept with this note"
                onInsert={(att) => run((s) => insertBlock(s, attachmentMarkdown(att)))}
                onRemove={removeAttachment}
              />
            ) : (
              jobs.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  Drop files or whole folders here, paste a picture, or use Attach. They stay with
                  this note, privately, until you publish it.
                </p>
              )
            )}
          </div>
        )}
      </div>

      <input ref={filesInput} type="file" multiple hidden onChange={(e) => pickFiles(e, false)} />
      <input
        ref={picturesInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pickFiles(e, true)}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        onChange={(e) => pickFiles(e, false)}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />
    </div>
  );
}
