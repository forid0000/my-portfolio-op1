'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Columns2,
  ExternalLink,
  Eye,
  Film,
  Loader2,
  PenLine,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ArticleBody from '@/components/articles/article-body';
import ArticleToolbar, { type ToolbarAction } from '@/components/admin/article-toolbar';
import ArticleDesignPanel from '@/components/admin/article-design-panel';
import { MediaUploader } from '@/components/admin/media-uploader';
import { Switch } from '@/components/ui/switch';
import { useUnsavedWarning } from '@/hooks/use-unsaved-warning';
import {
  ARTICLE_DESIGN_DEFAULTS,
  ARTICLE_LIMITS,
  excerptFrom,
  normalizeTags,
  readingMinutes,
  slugify,
  type ArticleCover,
  type ArticleDesign,
  type ArticleStatus,
} from '@/lib/articles-model';
import {
  TABLE_TEMPLATE,
  imageMarkdown,
  insertBlock,
  insertLink,
  setHeading,
  toggleList,
  wrapBlock,
  wrapSelection,
  type EditState,
} from '@/lib/markdown-edit';
import { applyEdit } from '@/lib/markdown-edit-dom';
import { withTransformation, videoPosterUrl } from '@/lib/cloudinary-url';
import { formatBytes, isVideoFile, type MediaItem } from '@/lib/media-types';
import { uploadMedia } from '@/lib/media-upload';
import { reportFieldIssues, type FieldIssue } from '@/lib/field-errors';
import { extractApiErrorMessage } from '@/lib/utils';

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: ArticleCover | null;
  media: MediaItem[];
  tags: string[];
  status: ArticleStatus;
  publishedAt: string; // value of a datetime-local input, '' when not set
  design: ArticleDesign;
  footerNote: string;
  allowReactions: boolean;
  allowComments: boolean;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover: null,
  media: [],
  tags: [],
  status: 'draft',
  publishedAt: '',
  design: ARTICLE_DESIGN_DEFAULTS,
  footerNote: '',
  allowReactions: true,
  allowComments: true,
  seoTitle: '',
  seoDescription: '',
};

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const input =
  'w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-emerald-500 transition-all';

type Panel = 'publish' | 'design' | 'seo' | 'files';
type View = 'write' | 'preview' | 'split';

interface Upload {
  id: string;
  name: string;
  progress: number;
  stage: string;
}

export default function ArticleEditor({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === 'new';
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null);
  const [deleting, setDeleting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [view, setView] = useState<View>('write');
  const [panel, setPanel] = useState<Panel>('publish');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [articleSlug, setArticleSlug] = useState('');

  const { isDirty, markClean } = useUnsavedWarning(form, loading);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionUploads = useRef(new Set<string>());

  const patch = useCallback(
    (changes: Partial<FormState>) => setForm((f) => ({ ...f, ...changes })),
    []
  );

  /* ---------------------------------- loading ---------------------------------- */

  useEffect(() => {
    let active = true;
    fetch('/api/admin/articles')
      .then((r) => r.json())
      .then((data) => {
        if (!active || !Array.isArray(data.articles)) return;
        const all = new Set<string>();
        for (const a of data.articles) for (const t of a.tags ?? []) all.add(t);
        setKnownTags([...all]);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    fetch(`/api/admin/articles/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(extractApiErrorMessage(data, 'Article not found'));
        if (!active) return;
        setForm({
          title: data.title ?? '',
          slug: data.slug ?? '',
          excerpt: data.excerpt ?? '',
          body: data.body ?? '',
          cover: data.cover ?? null,
          media: data.media ?? [],
          tags: data.tags ?? [],
          status: data.status === 'published' ? 'published' : 'draft',
          publishedAt: toLocalInput(data.publishedAt),
          design: { ...ARTICLE_DESIGN_DEFAULTS, ...(data.design ?? {}) },
          footerNote: data.footerNote ?? '',
          allowReactions: data.allowReactions !== false,
          allowComments: data.allowComments !== false,
          seoTitle: data.seoTitle ?? '',
          seoDescription: data.seoDescription ?? '',
        });
        setArticleSlug(data.slug ?? '');
        setSlugTouched(true);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not load the article');
        router.replace('/administrator/articles');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew, router]);

  /* ---------------------------------- editing ---------------------------------- */

  const run = (compute: (s: EditState) => EditState) => {
    const el = textRef.current;
    if (!el) return;
    applyEdit(el, compute({ value: el.value, start: el.selectionStart, end: el.selectionEnd }));
  };

  const insertAtCursor = (markdown: string) => run((s) => insertBlock(s, markdown));

  const askForLink = () => {
    const url = window.prompt('Link address', 'https://');
    if (!url) return;
    run((s) => insertLink(s, url.trim()));
  };

  const onAction = (action: ToolbarAction) => {
    switch (action) {
      case 'bold':
        return run((s) => wrapSelection(s, '**', 'bold text'));
      case 'italic':
        return run((s) => wrapSelection(s, '*', 'italic text'));
      case 'strike':
        return run((s) => wrapSelection(s, '~~', 'struck text'));
      case 'code':
        return run((s) => wrapSelection(s, '`', 'code'));
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
      case 'media':
        return fileRef.current?.click();
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
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      onAction('bold');
    } else if (key === 'i') {
      event.preventDefault();
      onAction('italic');
    } else if (key === 'k') {
      event.preventDefault();
      askForLink();
    } else if (key === 's') {
      event.preventDefault();
      void save();
    }
  };

  /* ---------------------------------- uploads ---------------------------------- */

  const uploadFiles = async (files: File[]) => {
    const usable = files.filter((f) => f.type.startsWith('image/') || isVideoFile(f));
    if (!usable.length) {
      toast.error('Only pictures and videos can be added.');
      return;
    }
    for (const file of usable) {
      const uploadId = Math.random().toString(36).slice(2);
      const placeholder = `![Uploading ${file.name.replace(/[[\]()]/g, '')}…](#uploading-${uploadId})`;
      insertAtCursor(placeholder);
      setUploads((u) => [...u, { id: uploadId, name: file.name, progress: 0, stage: 'Preparing' }]);
      try {
        const { item, optimized } = await uploadMedia(file, {
          scope: 'articles',
          onStage: (stage) =>
            setUploads((u) =>
              u.map((x) =>
                x.id === uploadId
                  ? { ...x, stage: stage === 'optimizing' ? 'Optimizing' : 'Uploading' }
                  : x
              )
            ),
          onProgress: (fraction) =>
            setUploads((u) => u.map((x) => (x.id === uploadId ? { ...x, progress: fraction } : x))),
        });
        sessionUploads.current.add(item.public_id);
        const alt = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        const markdown = imageMarkdown(item.src, item.kind === 'video' ? '' : alt);
        setForm((f) => ({
          ...f,
          body: f.body.includes(placeholder)
            ? f.body.replace(placeholder, markdown)
            : `${f.body}\n\n${markdown}`,
          media: [...f.media, item],
        }));
        if (optimized) {
          toast.success(`Optimized ${formatBytes(optimized.from)} → ${formatBytes(optimized.to)}`);
        }
      } catch (error) {
        setForm((f) => ({
          ...f,
          body: f.body.replace(`\n\n${placeholder}`, '').replace(placeholder, ''),
        }));
        toast.error(error instanceof Error ? error.message : 'Upload failed', {
          description: file.name,
        });
      } finally {
        setUploads((u) => u.filter((x) => x.id !== uploadId));
      }
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files ?? []);
    if (!files.length) return;
    event.preventDefault();
    void uploadFiles(files);
  };

  /** Takes a file out of the article: its markdown goes, and the file is deleted when saved. */
  const removeFile = async (item: MediaItem) => {
    const escaped = item.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refs = new RegExp(`\\n*!\\[[^\\]]*\\]\\(${escaped}\\)\\n*`, 'g');
    setForm((f) => ({
      ...f,
      body: f.body.replace(refs, '\n\n').trim() + (f.body.endsWith('\n') ? '\n' : ''),
      media: f.media.filter((m) => m.public_id !== item.public_id),
      cover: f.cover?.public_id === item.public_id ? null : f.cover,
    }));
    // Uploaded in this session and never saved: delete it right away; otherwise saving does it.
    if (sessionUploads.current.has(item.public_id)) {
      sessionUploads.current.delete(item.public_id);
      await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: item.public_id, kind: item.kind ?? 'image' }),
      }).catch(() => undefined);
    }
  };

  /* ------------------------------------ save ------------------------------------ */

  const save = async (intent?: 'draft' | 'publish') => {
    if (saving) return;
    const status: ArticleStatus =
      intent === 'publish' ? 'published' : intent === 'draft' ? 'draft' : form.status;

    const issues: FieldIssue[] = [];
    if (!form.title.trim()) {
      issues.push({
        path: ['title'],
        code: 'too_small',
        origin: 'string',
        minimum: 1,
        message: 'Give your article a title.',
      });
    }
    if (
      form.slug.trim() &&
      !/^[\p{L}\p{N}\p{M}]+(?:-[\p{L}\p{N}\p{M}]+)*$/u.test(form.slug.trim())
    ) {
      issues.push({ path: ['slug'], message: 'Use letters, numbers and single hyphens only.' });
    }
    if (issues.length) {
      const { summary } = reportFieldIssues(issues, form);
      toast.error('Please fix the highlighted fields', { description: summary });
      return;
    }

    setSaving(intent === 'publish' ? 'publish' : 'draft');
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      body: form.body,
      cover: form.cover,
      media: form.media,
      tags: form.tags,
      status,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      design: form.design,
      footerNote: form.footerNote,
      allowReactions: form.allowReactions,
      allowComments: form.allowComments,
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
    };
    try {
      const res = await fetch(isNew ? '/api/admin/articles' : `/api/admin/articles/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(extractApiErrorMessage(data));

      sessionUploads.current.clear();
      const saved: FormState = { ...form, status, slug: data.slug ?? form.slug };
      setForm(saved);
      markClean(saved);
      setArticleSlug(data.slug ?? form.slug);
      toast.success(status === 'published' ? 'Published' : 'Saved', {
        description:
          status === 'published'
            ? 'Your article is live.'
            : 'Saved as a draft. Visitors cannot see it yet.',
      });
      if (isNew && data.id) router.replace(`/administrator/articles/${data.id}`);
    } catch (error) {
      // Field-level problems (like a taken address) are outlined by the admin error bridge.
      toast.error('Could not save', {
        description:
          error instanceof Error ? error.message : 'Please check your connection and try again.',
      });
    } finally {
      setSaving(null);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (
      !window.confirm(
        'Delete this article, its comments, and all the pictures and videos you uploaded for it? This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(extractApiErrorMessage(await res.json().catch(() => ({}))));
      markClean(form);
      toast.success('Article deleted');
      router.replace('/administrator/articles');
    } catch (error) {
      toast.error('Could not delete', {
        description: error instanceof Error ? error.message : undefined,
      });
      setDeleting(false);
    }
  };

  /* ------------------------------------ tags ------------------------------------ */

  const addTags = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    patch({ tags: normalizeTags([...form.tags, ...parts]) });
    setTagDraft('');
  };

  /* ---------------------------------- derived ---------------------------------- */

  const suggestedSlug = useMemo(() => slugify(form.title, ''), [form.title]);
  const words = useMemo(() => form.body.trim().split(/\s+/).filter(Boolean).length, [form.body]);
  const minutes = useMemo(() => readingMinutes(form.body), [form.body]);
  const autoExcerpt = useMemo(() => excerptFrom(form.body, 160), [form.body]);
  const coverAsMedia: MediaItem[] = form.cover
    ? [
        {
          kind: 'image',
          src: form.cover.src,
          public_id: form.cover.public_id,
          width: form.cover.width,
          height: form.cover.height,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-emerald-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const showWrite = view === 'write' || view === 'split';
  const showPreview = view === 'preview' || view === 'split';
  const design = form.design;

  return (
    <div className="flex h-full flex-col bg-gray-950">
      {/* ---------------------------------- top bar ---------------------------------- */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/administrator/articles"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            aria-label="Back to all articles"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-100">
              {isNew ? 'New article' : 'Edit article'}
            </h1>
            <p className="text-xs text-gray-500">
              {words} words · {minutes} min read ·{' '}
              <span className={form.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}>
                {form.status === 'published' ? 'Published' : 'Draft'}
              </span>
              {isDirty && <span className="ml-2 text-amber-400">· unsaved changes</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.status === 'published' && articleSlug && (
            <a
              href={`/articles/${articleSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              <ExternalLink className="h-4 w-4" /> View
            </a>
          )}
          <button
            type="button"
            onClick={() => void save(form.status === 'published' ? undefined : 'draft')}
            disabled={!!saving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700 disabled:opacity-50"
          >
            {saving === 'draft' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {form.status === 'published' ? 'Save changes' : 'Save draft'}
          </button>
          {form.status === 'published' ? (
            <button
              type="button"
              onClick={() => void save('draft')}
              disabled={!!saving}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-gray-100 disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void save('publish')}
              disabled={!!saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving === 'publish' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ----------------------------------- main ----------------------------------- */}
        <div className="min-w-0 space-y-5">
          <div>
            <input
              type="text"
              value={form.title}
              data-field="title"
              maxLength={ARTICLE_LIMITS.title}
              onChange={(e) => {
                const title = e.target.value;
                patch({
                  title,
                  ...(isNew && !slugTouched ? { slug: slugify(title, '') } : {}),
                });
              }}
              placeholder="Article title"
              aria-label="Article title"
              dir="auto"
              className="w-full bg-transparent text-3xl font-bold text-gray-100 placeholder:text-gray-600 focus:outline-none md:text-4xl"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>/articles/</span>
              <input
                type="text"
                value={form.slug}
                data-field="slug"
                maxLength={ARTICLE_LIMITS.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                }}
                placeholder={suggestedSlug || 'address-of-this-article'}
                aria-label="Article address"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-gray-900 px-2 py-1 font-mono text-gray-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Summary{' '}
              <span className="font-normal text-gray-600">(shown in lists and link previews)</span>
            </label>
            <textarea
              value={form.excerpt}
              data-field="excerpt"
              maxLength={ARTICLE_LIMITS.excerpt}
              rows={2}
              onChange={(e) => patch({ excerpt: e.target.value })}
              placeholder={autoExcerpt || 'A sentence or two that makes people want to read on'}
              dir="auto"
              className={`${input} resize-y`}
            />
          </div>

          <MediaUploader
            scope="articles"
            label="Cover picture"
            max={1}
            imagesOnly
            hint="shown at the top of the article and in lists"
            value={coverAsMedia}
            onChange={(next) => {
              const first = next[0];
              patch({
                cover: first
                  ? {
                      src: first.src,
                      public_id: first.public_id,
                      width: first.width,
                      height: first.height,
                    }
                  : null,
                // The cover also lives in the file list so removing it deletes the file.
                media: first
                  ? [...form.media.filter((m) => m.public_id !== first.public_id), first]
                  : form.media.filter((m) => m.public_id !== form.cover?.public_id),
              });
            }}
          />

          {/* editor */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-300">Article text</label>
              <div
                className="inline-flex overflow-hidden rounded-lg border border-gray-800"
                role="tablist"
              >
                {(
                  [
                    ['write', 'Write', PenLine],
                    ['split', 'Side by side', Columns2],
                    ['preview', 'Preview', Eye],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      value === 'split' ? 'hidden lg:inline-flex' : ''
                    } ${view === value ? 'bg-emerald-600/20 text-emerald-300' : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid gap-4 ${view === 'split' ? 'lg:grid-cols-2' : ''}`}>
              {showWrite && (
                <div className="min-w-0">
                  <ArticleToolbar onAction={onAction} />
                  <div
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('Files')) {
                        e.preventDefault();
                        setDragOver(true);
                      }
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      setDragOver(false);
                      if (e.dataTransfer.files.length) {
                        e.preventDefault();
                        void uploadFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                    className="relative"
                  >
                    <textarea
                      ref={textRef}
                      value={form.body}
                      data-field="body"
                      onChange={(e) => patch({ body: e.target.value })}
                      onKeyDown={onKeyDown}
                      onPaste={onPaste}
                      rows={view === 'split' ? 28 : 24}
                      placeholder={
                        'Start writing…\n\nTip: paste or drop a picture right here to add it.'
                      }
                      spellCheck
                      dir="auto"
                      aria-label="Article text"
                      className="min-h-[28rem] w-full resize-y rounded-b-xl border border-gray-800 bg-gray-950 p-4 font-mono text-[0.95rem] leading-relaxed text-gray-100 focus:border-emerald-500 focus:outline-none"
                    />
                    {dragOver && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-b-xl border-2 border-dashed border-emerald-500 bg-emerald-950/60 text-sm font-medium text-emerald-200">
                        Drop to upload
                      </div>
                    )}
                  </div>
                  {uploads.length > 0 && (
                    <ul className="mt-2 space-y-1.5" aria-live="polite">
                      {uploads.map((u) => (
                        <li
                          key={u.id}
                          className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-300"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="truncate">{u.name}</span>
                            <span className="shrink-0 text-gray-500">
                              {u.stage}
                              {u.stage === 'Uploading' ? ` ${Math.round(u.progress * 100)}%` : '…'}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-800">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.round(u.progress * 100)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-gray-600">
                    Markdown: <code>**bold**</code> · <code>*italic*</code> · <code># heading</code>{' '}
                    · <code>[link](https://…)</code>. Boxes and alignment use{' '}
                    <code>::: center</code>…<code>:::</code> (also <code>right</code>,{' '}
                    <code>note</code>, <code>tip</code>, <code>warning</code>).
                  </p>
                </div>
              )}

              {showPreview && (
                <div
                  className="article min-w-0 rounded-xl border border-border bg-background p-5 text-foreground md:p-8"
                  data-font={design.font}
                  data-size={design.size}
                  data-width={design.width}
                  data-align={design.align}
                  style={
                    design.accent
                      ? ({ '--article-accent': design.accent } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="article-column">
                    {form.title && (
                      <h1
                        dir="auto"
                        className="mb-6 text-3xl font-bold leading-tight tracking-tight md:text-4xl"
                      >
                        {form.title}
                      </h1>
                    )}
                    {form.body.trim() ? (
                      <ArticleBody body={form.body} media={form.media} />
                    ) : (
                      <p className="text-muted-foreground">
                        Nothing to preview yet. Write something first.
                      </p>
                    )}
                    {form.footerNote.trim() && (
                      <aside className="mt-10 rounded-2xl border border-border bg-card p-5 text-card-foreground">
                        <ArticleBody body={form.footerNote} />
                      </aside>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Closing note{' '}
              <span className="font-normal text-gray-600">
                (shown under the article; Markdown works)
              </span>
            </label>
            <textarea
              value={form.footerNote}
              data-field="footerNote"
              maxLength={ARTICLE_LIMITS.footerNote}
              rows={3}
              onChange={(e) => patch({ footerNote: e.target.value })}
              placeholder="Thanks for reading! Say hello, or follow along for more."
              dir="auto"
              className={`${input} resize-y`}
            />
          </div>
        </div>

        {/* ---------------------------------- sidebar ---------------------------------- */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            <div className="flex border-b border-gray-800" role="tablist">
              {(
                [
                  ['publish', 'Publish'],
                  ['design', 'Design'],
                  ['seo', 'Search'],
                  ['files', `Files${form.media.length ? ` (${form.media.length})` : ''}`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={panel === value}
                  onClick={() => setPanel(value)}
                  className={`flex-1 px-2 py-3 text-xs font-semibold transition-colors ${
                    panel === value
                      ? 'border-b-2 border-emerald-500 text-emerald-300'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-4">
              {panel === 'publish' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['draft', 'published'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => patch({ status: s })}
                          aria-pressed={form.status === s}
                          className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                            form.status === s
                              ? 'border-emerald-500/70 bg-emerald-600/15 text-emerald-200'
                              : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {s === 'draft' ? 'Draft' : 'Published'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Drafts are private. Remember to press Save after changing this.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">
                      Publish date
                    </label>
                    <input
                      type="datetime-local"
                      value={form.publishedAt}
                      data-field="publishedAt"
                      onChange={(e) => patch({ publishedAt: e.target.value })}
                      className={input}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use the moment you publish.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">Tags</label>
                    <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-800 bg-gray-950 p-2 focus-within:border-emerald-500">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2.5 py-1 text-xs text-emerald-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => patch({ tags: form.tags.filter((t) => t !== tag) })}
                            aria-label={`Remove tag ${tag}`}
                            className="text-emerald-300/70 hover:text-emerald-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagDraft}
                        list="known-tags"
                        onChange={(e) => {
                          if (e.target.value.includes(',')) addTags(e.target.value);
                          else setTagDraft(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTags(tagDraft);
                          } else if (e.key === 'Backspace' && !tagDraft && form.tags.length) {
                            patch({ tags: form.tags.slice(0, -1) });
                          }
                        }}
                        onBlur={() => addTags(tagDraft)}
                        placeholder={form.tags.length ? '' : 'Type a tag, press Enter'}
                        aria-label="Add a tag"
                        dir="auto"
                        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm text-gray-200 focus:outline-none"
                      />
                      <datalist id="known-tags">
                        {knownTags
                          .filter((t) => !form.tags.includes(t))
                          .map((t) => (
                            <option key={t} value={t} />
                          ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-300">Allow reactions</span>
                      <Switch
                        checked={form.allowReactions}
                        onCheckedChange={(v) => patch({ allowReactions: v })}
                        aria-label="Allow reactions"
                      />
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-300">Allow comments</span>
                      <Switch
                        checked={form.allowComments}
                        onCheckedChange={(v) => patch({ allowComments: v })}
                        aria-label="Allow comments"
                      />
                    </div>
                  </div>

                  {!isNew && (
                    <button
                      type="button"
                      onClick={() => void remove()}
                      disabled={deleting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete article
                    </button>
                  )}
                </>
              )}

              {panel === 'design' && (
                <ArticleDesignPanel
                  design={form.design}
                  onChange={(next) => patch({ design: next })}
                />
              )}

              {panel === 'seo' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">
                      Search title
                    </label>
                    <input
                      type="text"
                      value={form.seoTitle}
                      data-field="seoTitle"
                      maxLength={ARTICLE_LIMITS.seoTitle}
                      onChange={(e) => patch({ seoTitle: e.target.value })}
                      placeholder={form.title || 'Defaults to the article title'}
                      dir="auto"
                      className={input}
                    />
                    <p className="mt-1 text-right text-xs text-gray-600">
                      {form.seoTitle.length}/{ARTICLE_LIMITS.seoTitle}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">
                      Search description
                    </label>
                    <textarea
                      value={form.seoDescription}
                      data-field="seoDescription"
                      maxLength={ARTICLE_LIMITS.seoDescription}
                      rows={3}
                      onChange={(e) => patch({ seoDescription: e.target.value })}
                      placeholder={form.excerpt || autoExcerpt || 'Defaults to the summary'}
                      dir="auto"
                      className={`${input} resize-y`}
                    />
                    <p className="mt-1 text-right text-xs text-gray-600">
                      {form.seoDescription.length}/{ARTICLE_LIMITS.seoDescription}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                    <p className="text-xs text-gray-500">How it may look in search results</p>
                    <p className="mt-1 truncate text-sm text-blue-400" dir="auto">
                      {form.seoTitle || form.title || 'Article title'}
                    </p>
                    <p className="truncate text-xs text-emerald-500">
                      /articles/{form.slug || suggestedSlug || '…'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-400" dir="auto">
                      {form.seoDescription ||
                        form.excerpt ||
                        autoExcerpt ||
                        'The summary appears here.'}
                    </p>
                  </div>
                </>
              )}

              {panel === 'files' && (
                <>
                  <p className="text-xs text-gray-500">
                    Everything you uploaded for this article. Removing a file takes it out of the
                    text and deletes it from Cloudinary.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-lg border border-dashed border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-emerald-500 hover:text-emerald-300"
                  >
                    Add pictures or videos
                  </button>
                  {form.media.length === 0 ? (
                    <p className="text-sm text-gray-500">No files yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {form.media.map((item) => {
                        const isVideo = item.kind === 'video';
                        const thumb = isVideo
                          ? videoPosterUrl(item.src, 200)
                          : withTransformation(item.src, 'c_fill,w_200,h_150,q_auto,f_auto');
                        const isCover = form.cover?.public_id === item.public_id;
                        return (
                          <li
                            key={item.public_id}
                            className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-2"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1 truncate text-xs text-gray-300">
                                {isVideo && <Film className="h-3 w-3 shrink-0" />}
                                {isCover ? 'Cover' : item.public_id.split('/').pop()}
                              </p>
                              {item.bytes ? (
                                <p className="text-[11px] text-gray-600">
                                  {formatBytes(item.bytes)}
                                </p>
                              ) : null}
                            </div>
                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => insertAtCursor(imageMarkdown(item.src, ''))}
                                className="rounded px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950/50"
                              >
                                Insert
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void removeFile(item)}
                              aria-label="Remove file"
                              title="Remove from the article and delete the file"
                              className="rounded p-1.5 text-gray-500 hover:bg-red-950/40 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) void uploadFiles(files);
        }}
      />
    </div>
  );
}
