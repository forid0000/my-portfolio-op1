'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  PenLine,
  Plus,
  Reply,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { withTransformation } from '@/lib/cloudinary-url';
import { formatArticleDate } from '@/lib/articles-model';
import { extractApiErrorMessage } from '@/lib/utils';

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  tags: string[];
  cover: { src: string } | null;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
  commentCount: number;
  pendingComments: number;
  reactionTotal: number;
}

interface CommentRow {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  parentId: string | null;
  name: string;
  email: string;
  body: string;
  status: 'approved' | 'pending' | 'spam';
  byAuthor: boolean;
  createdAt: string;
}

interface Settings {
  moderate: boolean;
  reactions: boolean;
  comments: boolean;
}

type Tab = 'articles' | 'comments' | 'settings';
type CommentFilter = 'pending' | 'approved' | 'spam' | 'all';

const card = 'rounded-xl border border-gray-800 bg-gray-900';

async function json(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractApiErrorMessage(data));
  return data;
}

export default function ArticlesAdminPage() {
  const [tab, setTab] = useState<Tab>('articles');
  const [articles, setArticles] = useState<ArticleRow[] | null>(null);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [filter, setFilter] = useState<CommentFilter>('pending');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      setArticles((await json(await fetch('/api/admin/articles'))).articles);
    } catch (error) {
      toast.error('Could not load articles', {
        description: error instanceof Error ? error.message : undefined,
      });
      setArticles([]);
    }
  }, []);

  const loadComments = useCallback(async (status: CommentFilter) => {
    try {
      setComments(
        (await json(await fetch(`/api/admin/articles/comments?status=${status}`))).comments
      );
    } catch (error) {
      toast.error('Could not load comments', {
        description: error instanceof Error ? error.message : undefined,
      });
      setComments([]);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
    fetch('/api/admin/articles/settings')
      .then(json)
      .then(setSettings)
      .catch(() => undefined);
  }, [loadArticles]);

  useEffect(() => {
    if (tab === 'comments') void loadComments(filter);
  }, [tab, filter, loadComments]);

  const pendingTotal = (articles ?? []).reduce((n, a) => n + a.pendingComments, 0);

  const moderate = async (id: string, status: CommentRow['status']) => {
    setBusy(id);
    try {
      await json(
        await fetch('/api/admin/articles/comments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        })
      );
      toast.success(
        status === 'approved'
          ? 'Comment approved'
          : status === 'spam'
            ? 'Marked as spam'
            : 'Moved to pending'
      );
      await Promise.all([loadComments(filter), loadArticles()]);
    } catch (error) {
      toast.error('Could not update the comment', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm('Delete this comment and any replies under it?')) return;
    setBusy(id);
    try {
      await json(await fetch(`/api/admin/articles/comments?id=${id}`, { method: 'DELETE' }));
      toast.success('Comment deleted');
      await Promise.all([loadComments(filter), loadArticles()]);
    } catch (error) {
      toast.error('Could not delete the comment', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const sendReply = async (comment: CommentRow) => {
    if (!replyText.trim()) {
      toast.error('Write your reply first.');
      return;
    }
    setBusy(comment.id);
    try {
      await json(
        await fetch('/api/admin/articles/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: comment.articleId,
            parentId: comment.parentId ?? comment.id,
            body: replyText.trim(),
          }),
        })
      );
      // A reply is a public statement from the owner; approve the comment it answers too.
      if (comment.status !== 'approved') await moderate(comment.id, 'approved');
      toast.success('Reply posted');
      setReplyFor(null);
      setReplyText('');
      await Promise.all([loadComments(filter), loadArticles()]);
    } catch (error) {
      toast.error('Could not post the reply', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (next: Settings) => {
    setSettings(next);
    try {
      await json(
        await fetch('/api/admin/articles/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
      );
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Could not save the settings', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const removeArticle = async (row: ArticleRow) => {
    if (
      !window.confirm(
        `Delete "${row.title}", its comments, and all the pictures and videos uploaded for it? This cannot be undone.`
      )
    )
      return;
    setBusy(row.id);
    try {
      await json(await fetch(`/api/admin/articles/${row.id}`, { method: 'DELETE' }));
      toast.success('Article deleted');
      await loadArticles();
    } catch (error) {
      toast.error('Could not delete the article', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-950">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 bg-gray-900 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Articles</h1>
          <p className="mt-1 text-sm text-gray-400">
            Write and publish articles right here: your own text, pictures, videos, tags and design.
          </p>
        </div>
        <Link
          href="/administrator/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      <div className="flex gap-1 border-b border-gray-800 bg-gray-900 px-6" role="tablist">
        {(
          [
            ['articles', 'Articles'],
            ['comments', pendingTotal ? `Comments (${pendingTotal} waiting)` : 'Comments'],
            ['settings', 'Settings'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === value
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          {/* ---------------------------------- articles ---------------------------------- */}
          {tab === 'articles' &&
            (articles === null ? (
              <div className="flex justify-center py-20 text-emerald-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className={`${card} flex flex-col items-center gap-4 px-6 py-16 text-center`}>
                <FileText className="h-10 w-10 text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-200">No articles yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Write your first one. It stays private until you publish it.
                  </p>
                </div>
                <Link
                  href="/administrator/articles/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  <PenLine className="h-4 w-4" /> Write an article
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {articles.map((row) => (
                  <li
                    key={row.id}
                    className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}
                  >
                    <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-950 sm:w-32">
                      {row.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={withTransformation(
                            row.cover.src,
                            'c_fill,w_300,h_200,q_auto,f_auto'
                          )}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-700">
                          <FileText className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/administrator/articles/${row.id}`}
                          className="truncate font-semibold text-gray-100 hover:text-emerald-300"
                          dir="auto"
                        >
                          {row.title}
                        </Link>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            row.status === 'published'
                              ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300'
                              : 'border-amber-900/60 bg-amber-950/40 text-amber-300'
                          }`}
                        >
                          {row.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        {row.pendingComments > 0 && (
                          <button
                            type="button"
                            onClick={() => setTab('comments')}
                            className="rounded-full border border-blue-900/60 bg-blue-950/40 px-2 py-0.5 text-[11px] font-medium text-blue-300"
                          >
                            {row.pendingComments} comment{row.pendingComments === 1 ? '' : 's'}{' '}
                            waiting
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        /articles/{row.slug} · {row.readingMinutes} min read ·{' '}
                        {row.publishedAt
                          ? formatArticleDate(row.publishedAt)
                          : `edited ${formatArticleDate(row.updatedAt)}`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" /> {row.reactionTotal}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" /> {row.commentCount}
                        </span>
                        {row.tags.slice(0, 4).map((t) => (
                          <span key={t} className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.status === 'published' && (
                        <a
                          href={`/articles/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View on the site"
                          title="View on the site"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        href={`/administrator/articles/${row.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700"
                      >
                        <PenLine className="h-4 w-4" /> Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeArticle(row)}
                        disabled={busy === row.id}
                        aria-label={`Delete ${row.title}`}
                        title="Delete"
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50"
                      >
                        {busy === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {/* ---------------------------------- comments ---------------------------------- */}
          {tab === 'comments' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['pending', 'approved', 'spam', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`rounded-full border px-3 py-1.5 text-sm capitalize transition-all ${
                      filter === f
                        ? 'border-emerald-500/60 bg-emerald-600/20 text-emerald-300'
                        : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {comments === null ? (
                <div className="flex justify-center py-16 text-emerald-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className={`${card} px-6 py-14 text-center text-sm text-gray-500`}>
                  {filter === 'pending' ? 'Nothing is waiting for approval.' : 'No comments here.'}
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className={`${card} p-4`}>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="text-sm font-semibold text-gray-100" dir="auto">
                          {c.name}
                        </span>
                        {c.byAuthor && (
                          <span className="rounded-full bg-emerald-950/50 px-2 py-0.5 text-emerald-300">
                            You
                          </span>
                        )}
                        {c.email && <span>{c.email}</span>}
                        <span>· {formatArticleDate(c.createdAt)}</span>
                        <span>
                          · on{' '}
                          {c.articleSlug ? (
                            <a
                              href={`/articles/${c.articleSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline"
                            >
                              {c.articleTitle}
                            </a>
                          ) : (
                            c.articleTitle
                          )}
                        </span>
                        <span
                          className={`ml-auto rounded-full border px-2 py-0.5 ${
                            c.status === 'approved'
                              ? 'border-emerald-900/60 text-emerald-300'
                              : c.status === 'pending'
                                ? 'border-amber-900/60 text-amber-300'
                                : 'border-red-900/60 text-red-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-200" dir="auto">
                        {c.body}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {c.status !== 'approved' && !c.byAuthor && (
                          <button
                            type="button"
                            onClick={() => void moderate(c.id, 'approved')}
                            disabled={busy === c.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {c.status !== 'spam' && !c.byAuthor && (
                          <button
                            type="button"
                            onClick={() => void moderate(c.id, 'spam')}
                            disabled={busy === c.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" /> Spam
                          </button>
                        )}
                        {!c.byAuthor && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyFor(replyFor === c.id ? null : c.id);
                              setReplyText('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
                          >
                            <Reply className="h-3.5 w-3.5" /> Reply
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeComment(c.id)}
                          disabled={busy === c.id}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                      {replyFor === c.id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Your public reply"
                            data-field="body"
                            dir="auto"
                            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void sendReply(c)}
                            disabled={busy === c.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Post reply
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------------------------------- settings ---------------------------------- */}
          {tab === 'settings' &&
            (settings === null ? (
              <div className="flex justify-center py-16 text-emerald-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {(
                  [
                    [
                      'reactions',
                      'Reactions',
                      'Visitors can react to articles (like, love, and more).',
                    ],
                    ['comments', 'Comments', 'Visitors can leave comments under articles.'],
                    [
                      'moderate',
                      'Approve comments first',
                      'New comments stay hidden until you approve them. Strongly recommended.',
                    ],
                  ] as const
                ).map(([key, label, hint]) => (
                  <div
                    key={key}
                    className={`${card} flex items-center justify-between gap-4 px-4 py-3`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-200">{label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
                    </div>
                    <Switch
                      checked={settings[key]}
                      onCheckedChange={(checked) =>
                        void saveSettings({ ...settings, [key]: checked })
                      }
                      aria-label={label}
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  These apply to every article. You can also turn reactions or comments off for a
                  single article in its Publish tab. Page wording and the optional Dev.to feed are
                  under{' '}
                  <Link href="/administrator/headings" className="text-emerald-400 hover:underline">
                    Section Texts
                  </Link>
                  .
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
