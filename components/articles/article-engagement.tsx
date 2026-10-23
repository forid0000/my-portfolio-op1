'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  REACTIONS,
  emptyReactionCounts,
  type PublicComment,
  type ReactionCounts,
  type ReactionKind,
} from '@/lib/articles-model';
import { parseIssues, reportFieldIssues, type FieldIssue } from '@/lib/field-errors';

interface Props {
  slug: string;
  initialCounts: ReactionCounts;
  reactionsEnabled: boolean;
  commentsEnabled: boolean;
  moderated: boolean;
  comments: PublicComment[];
}

const STORAGE_KEY = 'comment-author';

function formatDate(iso: string) {
  // Fixed locale and zone so the server and the browser print the same text.
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function readSaved(): { name: string; email: string } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { name: String(parsed?.name ?? ''), email: String(parsed?.email ?? '') };
  } catch {
    return { name: '', email: '' };
  }
}

/**
 * Reactions and comments under an article. The page itself is static, so the numbers shown first
 * are the ones from when the page was built; a small request then brings them up to date and
 * tells us which reactions this browser already gave.
 */
export default function ArticleEngagement({
  slug,
  initialCounts,
  reactionsEnabled,
  commentsEnabled,
  moderated,
  comments: initialComments,
}: Props) {
  const [counts, setCounts] = useState<ReactionCounts>({
    ...emptyReactionCounts(),
    ...initialCounts,
  });
  const [mine, setMine] = useState<ReactionKind[]>([]);
  const [busy, setBusy] = useState<ReactionKind | null>(null);
  const [comments, setComments] = useState(initialComments);

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ name: '', email: '', body: '', hp: '' });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<'pending' | 'approved' | null>(null);

  useEffect(() => {
    let active = true;
    setForm((f) => ({ ...f, ...readSaved() }));
    if (reactionsEnabled) {
      fetch(`/api/articles/${encodeURIComponent(slug)}/engagement`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data) return;
          setCounts({ ...emptyReactionCounts(), ...data.counts });
          setMine(Array.isArray(data.mine) ? data.mine : []);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [slug, reactionsEnabled]);

  const react = async (kind: ReactionKind) => {
    if (busy) return;
    setBusy(kind);
    const had = mine.includes(kind);
    // Show the change at once, then settle on what the server says.
    setMine((m) => (had ? m.filter((k) => k !== kind) : [...m, kind]));
    setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (had ? -1 : 1)) }));
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your reaction.');
      setCounts({ ...emptyReactionCounts(), ...data.counts });
      setMine(Array.isArray(data.mine) ? data.mine : []);
    } catch (error) {
      setMine((m) => (had ? [...m, kind] : m.filter((k) => k !== kind)));
      setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (had ? 1 : -1)) }));
      toast.error(error instanceof Error ? error.message : 'Could not save your reaction.');
    } finally {
      setBusy(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const issues: FieldIssue[] = [];
    if (!form.name.trim()) {
      issues.push({ path: ['name'], message: 'Please tell us your name.', code: 'custom' });
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      issues.push({ path: ['email'], message: 'Enter a valid email address.', code: 'custom' });
    }
    if (form.body.trim().length < 2) {
      issues.push({ path: ['body'], message: 'Write a few words first.', code: 'custom' });
    }
    if (issues.length) {
      reportFieldIssues(issues, form, formRef.current ?? document);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const found = parseIssues(data);
        if (found.length) {
          reportFieldIssues(found, form, formRef.current ?? document);
          return;
        }
        throw new Error(data.error || 'Could not send your comment.');
      }
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: form.name.trim(), email: form.email.trim() })
        );
      } catch {
        /* private mode: the form just will not be pre-filled next time */
      }
      setForm((f) => ({ ...f, body: '' }));
      setNotice(data.status === 'approved' ? 'approved' : 'pending');
      if (data.comment) setComments((list) => [...list, data.comment]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your comment.');
    } finally {
      setSending(false);
    }
  };

  const threads = useMemo(() => {
    const top = comments.filter((c) => !c.parentId);
    const replies = new Map<string, PublicComment[]>();
    for (const c of comments) {
      if (c.parentId) replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c]);
    }
    return top.map((c) => ({ comment: c, replies: replies.get(c.id) ?? [] }));
  }, [comments]);

  if (!reactionsEnabled && !commentsEnabled) return null;

  const field =
    'w-full rounded-xl border border-border bg-input px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/30';

  return (
    <section aria-label="Reactions and comments" className="mt-12 space-y-10">
      {reactionsEnabled && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Did you enjoy this?</p>
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map((r) => {
              const active = mine.includes(r.kind);
              return (
                <button
                  key={r.kind}
                  type="button"
                  onClick={() => react(r.kind)}
                  aria-pressed={active}
                  aria-label={`${r.label} (${counts[r.kind]})`}
                  disabled={busy === r.kind}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                    active
                      ? 'border-primary bg-primary/10 text-primary shadow-glow-sm'
                      : 'border-border bg-card text-card-foreground hover:border-primary/50'
                  }`}
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  <span className="font-medium tabular-nums">{counts[r.kind]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {commentsEnabled && (
        <div>
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
            <MessageCircle className="h-5 w-5 text-primary" />
            Comments{threads.length ? ` (${comments.length})` : ''}
          </h2>

          {threads.length === 0 ? (
            <p className="mb-6 text-sm text-muted-foreground">
              No comments yet. Be the first to share your thoughts.
            </p>
          ) : (
            <ul className="mb-8 space-y-4">
              {threads.map(({ comment, replies }) => (
                <li key={comment.id} className="rounded-xl border border-border bg-card p-4">
                  <CommentView comment={comment} />
                  {replies.length > 0 && (
                    <ul className="mt-3 space-y-3 border-s-2 border-primary/30 ps-4">
                      {replies.map((r) => (
                        <li key={r.id}>
                          <CommentView comment={r} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          {notice ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Thank you!</p>
                <p className="mt-0.5 text-success/90">
                  {notice === 'pending'
                    ? 'Your comment was received and will appear once it has been approved.'
                    : 'Your comment has been posted.'}
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="mt-2 text-xs font-medium underline underline-offset-2"
                >
                  Write another comment
                </button>
              </div>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={submit}
              noValidate
              className="space-y-4 rounded-2xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold">Leave a comment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="comment-name" className="mb-1.5 block text-sm font-medium">
                    Name *
                  </label>
                  <input
                    id="comment-name"
                    data-field="name"
                    value={form.name}
                    maxLength={60}
                    autoComplete="name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={field}
                    dir="auto"
                  />
                </div>
                <div>
                  <label htmlFor="comment-email" className="mb-1.5 block text-sm font-medium">
                    Email{' '}
                    <span className="font-normal text-muted-foreground">
                      (optional, never shown)
                    </span>
                  </label>
                  <input
                    id="comment-email"
                    data-field="email"
                    type="email"
                    value={form.email}
                    maxLength={120}
                    autoComplete="email"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={field}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="comment-body" className="mb-1.5 block text-sm font-medium">
                  Comment *
                </label>
                <textarea
                  id="comment-body"
                  data-field="body"
                  rows={4}
                  value={form.body}
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className={`${field} min-h-28 resize-y`}
                  dir="auto"
                />
              </div>
              {/* Honeypot: invisible to people, tempting to bots. */}
              <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Leave this empty
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.hp}
                    onChange={(e) => setForm({ ...form, hp: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {moderated
                    ? 'Comments appear after they are approved.'
                    : 'Please be kind and keep it on topic.'}
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Post comment
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

function CommentView({ comment }: { comment: PublicComment }) {
  return (
    <article>
      <header className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold" dir="auto">
          {comment.name}
        </span>
        {comment.byAuthor && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Author
          </span>
        )}
        <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
          {formatDate(comment.createdAt)}
        </time>
      </header>
      <p
        className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-card-foreground"
        dir="auto"
      >
        {comment.body}
      </p>
    </article>
  );
}
