'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Trash2,
  Lock,
  Unlock,
  Clock,
  Plus,
  X,
  LogOut,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Code2,
  List,
  ListOrdered,
  ListChecks,
  Link2,
  ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Quote,
  Eye,
  HelpCircle,
  Download,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MarkdownRenderer } from './markdown-renderer';
import { PublishPopover } from './publish-popover';
import type { Note } from './types';

// ── Module-level components (stable type identity - no remount on re-render) ──
function ToolbarBtn({
  onActivate,
  title,
  children,
}: {
  onActivate: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // onMouseDown + preventDefault keeps textarea focused and selection intact.
      // onClick fires AFTER blur, which loses the cursor position.
      onMouseDown={(e) => {
        e.preventDefault();
        onActivate();
      }}
      title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
    >
      {children}
    </button>
  );
}
function ToolbarSep() {
  return <span className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}

// ── Simple markdown → HTML for PDF export (no external lib needed) ──
function markdownToHtml(md: string): string {
  const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return escaped
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.slice(3, -3).replace(/^[a-z]*\n/, '');
      return `<pre><code>${code.trim()}</code></pre>`;
    })
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- \[x\] (.+)$/gm, '<li>✓ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>○ $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

const TAG_PALETTE = [
  'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  'text-sky-500 bg-sky-500/10 border-sky-500/20',
  'text-violet-500 bg-violet-500/10 border-violet-500/20',
  'text-amber-500 bg-amber-500/10 border-amber-500/20',
  'text-rose-500 bg-rose-500/10 border-rose-500/20',
  'text-teal-500 bg-teal-500/10 border-teal-500/20',
  'text-pink-500 bg-pink-500/10 border-pink-500/20',
  'text-orange-500 bg-orange-500/10 border-orange-500/20',
];

function tagStyle(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 45)
    .replace(/-$/, '');
  const suffix = Date.now().toString(36).slice(-4);
  return base ? `${base}-${suffix}` : `note-${suffix}`;
}

type FormatType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'codeblock'
  | 'ul'
  | 'ol'
  | 'task'
  | 'quote'
  | 'link'
  | 'image'
  | 'hr';

const DEFAULT_LIMIT = 20;

const SHORTCUTS = [
  { keys: ['Ctrl', 'Enter'], label: 'Save note' },
  { keys: ['Ctrl', 'B'], label: 'Bold' },
  { keys: ['Ctrl', 'I'], label: 'Italic' },
  { keys: ['Ctrl', 'K'], label: 'Insert link' },
  { keys: ['Ctrl', '`'], label: 'Inline code' },
  { keys: ['Tab'], label: 'Indent 2 spaces (in editor)' },
  { keys: ['Space'], label: 'Add tag (in tag field)' },
  { keys: ['Backspace'], label: 'Remove last tag (empty tag field)' },
  { keys: ['Esc'], label: 'Cancel edit / Close note' },
  { keys: ['← →'], label: 'Prev / Next note (when not editing)' },
  { keys: ['E'], label: 'Edit selected note' },
  { keys: ['N'], label: 'New note (when not editing)' },
  { keys: ['L'], label: 'Lock / logout vault' },
  { keys: ['?'], label: 'Show shortcuts' },
];

export default function NotesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Auth ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState<'code' | 'password'>('password');
  // True when an authenticator quick unlock is enabled in Admin -> Security (shows its tab).
  const [quickUnlock, setQuickUnlock] = useState(false);
  // Which unlock methods the owner enabled in Admin -> Security (null until loaded).
  const [vaultSetup, setVaultSetup] = useState<{
    passwordSet: boolean;
    quickUnlock: boolean;
  } | null>(null);
  const [clockStr, setClockStr] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [isLowTime, setIsLowTime] = useState(false);

  // ── List ──
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Editor ──
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    note: Note;
    x: number;
    y: number;
    confirm: boolean;
  } | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishSlug, setPublishSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [publishLoading, setPublishLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autosaveInterval, setAutosaveInterval] = useState(30);
  const [notesPerPage, setNotesPerPage] = useState(DEFAULT_LIMIT);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [pageInput, setPageInput] = useState('');
  const [vaultTitle, setVaultTitle] = useState('Notes Vault');
  const [lockTitle, setLockTitle] = useState('VAULT LOCKED');

  const titleRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedRef = useRef<{ title: string; content: string; tags: string[] } | null>(null);
  const autoSaveFnRef = useRef<() => Promise<void>>(async () => {});
  const closeRef = useRef({ mode, editTitle, editContent, editTags, selectedNote });
  const abortCtrlRef = useRef<AbortController>(new AbortController());
  const isMountedRef = useRef(true);

  // ── Logout ──
  const triggerLogout = useCallback(() => {
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
    setIsLowTime(false);
    setTimeLeft('--:--');
    setNotes([]);
    setSelectedNote(null);
    setMode('view');
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/notes/logout', { method: 'POST' }).catch(() => {});
    triggerLogout();
  }, [triggerLogout]);

  // ── Which unlock methods does the server offer? ──
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/notes/auth', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!isMountedRef.current || !d) return;
        const passwordSet = Boolean(d.passwordSet);
        const hasQuick = Boolean(d.quickUnlock);
        setVaultSetup({ passwordSet, quickUnlock: hasQuick });
        setQuickUnlock(hasQuick && passwordSet); // tabs only make sense with both methods
        setAuthMode(hasQuick ? 'code' : 'password');
      })
      .catch(() => {
        /* password-only is a safe default */
      });
    return () => ctrl.abort();
  }, []);

  // ── Live clock on the lock screen (visitor's local time) ──
  useEffect(() => {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const tick = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setClockStr(
        `${DAYS[now.getDay()]} · ${dd} ${MONTHS[now.getMonth()]} ${now.getFullYear()} · ${hh}:${mm}:${ss}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Abort all in-flight requests and mark unmounted on cleanup ──
  useEffect(() => {
    // Create a fresh controller on every mount so re-mounts (e.g. React Strict Mode
    // double-invoke or Fast Refresh) don't inherit an already-aborted signal.
    abortCtrlRef.current = new AbortController();
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortCtrlRef.current.abort();
    };
  }, []);

  // ── Restore session on mount (don't ask for key if JWT cookie is still valid) ──
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/notes/session', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!isMountedRef.current) return;
        if (d.active && d.expiresAt > Date.now()) {
          setIsAuthenticated(true);
          setSessionExpiresAt(d.expiresAt);
          if (typeof d.autosaveInterval === 'number') setAutosaveInterval(d.autosaveInterval);
          if (typeof d.notesPerPage === 'number') setNotesPerPage(d.notesPerPage);
          if (typeof d.vaultTitle === 'string' && d.vaultTitle) setVaultTitle(d.vaultTitle);
          if (typeof d.lockTitle === 'string' && d.lockTitle) setLockTitle(d.lockTitle);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          /* silent */
        }
      });
    return () => ctrl.abort();
  }, []);

  // ── Session timer ──
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return;
    const fmt = (diff: number) => {
      if (diff <= 0) return '00:00';
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
      if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    const tick = () => {
      const diff = sessionExpiresAt - Date.now();
      if (diff <= 0) {
        clearInterval(iv);
        triggerLogout();
        return;
      }
      setTimeLeft(fmt(diff));
      setIsLowTime(diff < 10 * 60 * 1000);
    };
    const iv = setInterval(tick, 1000);
    tick();
    return () => clearInterval(iv);
  }, [isAuthenticated, sessionExpiresAt, triggerLogout]);

  // ── Periodic auto-save (fires every autosaveInterval seconds) ──
  useEffect(() => {
    if (!isAuthenticated || autosaveInterval <= 0) return;
    const iv = setInterval(() => autoSaveFnRef.current(), autosaveInterval * 1000);
    return () => clearInterval(iv);
  }, [isAuthenticated, autosaveInterval]);

  // ── Fetch ──
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(notesPerPage),
        search,
      });
      if (activeTagFilters.length) params.set('tags', activeTagFilters.join(','));
      const res = await fetch(`/api/notes?${params}`, { signal: abortCtrlRef.current.signal });
      if (res.status === 401) {
        triggerLogout();
        return;
      }
      const data = await res.json();
      if (res.ok && isMountedRef.current) {
        setNotes(data.notes ?? []);
        setTotalCount(data.totalCount ?? 0);
        setAllTags(data.allTags ?? []);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      /* silent */
    }
    if (isMountedRef.current) setLoading(false);
  }, [page, search, activeTagFilters, notesPerPage, triggerLogout]);

  useEffect(() => {
    if (isAuthenticated) fetchNotes();
  }, [isAuthenticated, fetchNotes]);

  // ── Deep-link: restore the open note from ?id= on first load (survives a
  // copy-pasted URL into a fresh/private window, once past the vault login) ──
  const initialDeepLinkId = searchParams.get('id');
  const deepLinkIdRef = useRef(initialDeepLinkId);
  const [deepLinkPending, setDeepLinkPending] = useState(!!initialDeepLinkId);
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = deepLinkIdRef.current;
    if (!id) {
      setDeepLinkPending(false);
      return;
    }
    fetch(`/api/notes?id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.note) {
          setSelectedNote(data.note);
          setMode('view');
          setMobileShowEditor(true);
        }
      })
      .catch(() => {})
      .finally(() => setDeepLinkPending(false));
  }, [isAuthenticated]);

  // ── Deep-link: keep ?id= in sync with whichever note is open ──
  useEffect(() => {
    if (!isAuthenticated || deepLinkPending) return;
    const current = searchParams.get('id');
    const next = selectedNote?._id ?? null;
    if (current === next) return;

    // We use router.push so it adds an entry to browser history
    // allowing the back button to work naturally, and the path to clearly change
    router.push(next ? `/notes?id=${next}` : '/notes', { scroll: false });
  }, [isAuthenticated, deepLinkPending, selectedNote?._id, searchParams, router]);

  // ── Global keyboard shortcuts ──
  // Use a ref so the effect closure always reads current state without re-registering.
  const kbState = useRef({
    isAuthenticated,
    mode,
    selectedNote,
    notes,
    showShortcuts,
    showPublish,
    handleLogout,
  });
  useEffect(() => {
    kbState.current = {
      isAuthenticated,
      mode,
      selectedNote,
      notes,
      showShortcuts,
      showPublish,
      handleLogout,
    };
    closeRef.current = { mode, editTitle, editContent, editTags, selectedNote };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const {
        isAuthenticated,
        mode,
        selectedNote,
        notes,
        showShortcuts,
        showPublish,
        handleLogout,
      } = kbState.current;
      if (!isAuthenticated) return;

      // Esc - works everywhere
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (showPublish) {
          setShowPublish(false);
          return;
        }
        setCtxMenu(null);
        setShowExport(false);
        if (mode === 'edit' || mode === 'create') {
          setMode('view');
          if (mode === 'create') setMobileShowEditor(false);
          return;
        }
        if (selectedNote) {
          setSelectedNote(null);
          setMobileShowEditor(false);
        }
        return;
      }

      // Navigation shortcuts - skip when typing
      const active = document.activeElement;
      const isTyping =
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA' ||
        (active as HTMLElement)?.isContentEditable;
      if (isTyping) return;

      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        if (notes.length === 0) return;
        const idx = selectedNote ? notes.findIndex((n) => n._id === selectedNote._id) : -1;
        const next = notes[(idx + 1) % notes.length];
        if (next) {
          autoSaveFnRef.current().then(() => {
            setSelectedNote(next);
            setMode('view');
            setDeleteTarget(null);
            setMobileShowEditor(true);
          });
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        if (notes.length === 0) return;
        const idx = selectedNote ? notes.findIndex((n) => n._id === selectedNote._id) : -1;
        const prev = notes[(idx - 1 + notes.length) % notes.length];
        if (prev) {
          autoSaveFnRef.current().then(() => {
            setSelectedNote(prev);
            setMode('view');
            setDeleteTarget(null);
            setMobileShowEditor(true);
          });
        }
      } else if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (selectedNote && mode === 'view') {
          startEdit(selectedNote);
        }
      } else if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        autoSaveFnRef.current().then(() => {
          savedRef.current = null;
          setSelectedNote(null);
          setEditTitle('');
          setEditContent('');
          setEditTags([]);
          setTagInput('');
          setMode('create');
          setMobileShowEditor(true);
          setTimeout(() => titleRef.current?.focus(), 50);
        });
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleLogout();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // stable - reads from ref

  // ── Silently save on tab close (no warning dialog) ──
  useEffect(() => {
    const handler = () => {
      const { mode, editTitle, editContent, editTags, selectedNote } = closeRef.current;
      if ((mode !== 'edit' && mode !== 'create') || !editTitle.trim()) return;
      if (mode === 'edit' && savedRef.current) {
        const s = savedRef.current;
        if (
          editTitle.trim() === s.title &&
          editContent.trim() === s.content &&
          JSON.stringify(editTags) === JSON.stringify(s.tags)
        )
          return;
      }
      const body =
        mode === 'edit'
          ? JSON.stringify({
              id: selectedNote?._id,
              title: editTitle.trim(),
              content: editContent.trim(),
              tags: editTags,
            })
          : JSON.stringify({
              title: editTitle.trim(),
              content: editContent.trim(),
              tags: editTags,
            });
      fetch('/api/notes', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []); // stable - reads from ref

  // ── Auth ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch('/api/notes/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: abortCtrlRef.current.signal,
      });
      const data = await res.json();
      if (!isMountedRef.current) return;
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setSessionExpiresAt(data.expiresAt);
        if (typeof data.autosaveInterval === 'number') setAutosaveInterval(data.autosaveInterval);
        if (typeof data.notesPerPage === 'number') setNotesPerPage(data.notesPerPage);
        if (typeof data.vaultTitle === 'string' && data.vaultTitle) setVaultTitle(data.vaultTitle);
        if (typeof data.lockTitle === 'string' && data.lockTitle) setLockTitle(data.lockTitle);
      } else {
        setAuthError(data.error || 'Invalid password');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      if (isMountedRef.current) setAuthError('Connection failed');
    }
    if (isMountedRef.current) setLoading(false);
  };

  // ── Note selection ──
  const selectNote = async (note: Note) => {
    await autoSaveFnRef.current();
    setSelectedNote(note);
    setMode('view');
    setDeleteTarget(null);
    setMobileShowEditor(true);
    setShowPublish(false);
    setShowExport(false);
  };

  const startCreate = async () => {
    await autoSaveFnRef.current();
    savedRef.current = null;
    setSelectedNote(null);
    setEditTitle('');
    setEditContent('');
    setEditTags([]);
    setTagInput('');
    setMode('create');
    setMobileShowEditor(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const startEdit = (noteToEdit?: Note) => {
    const note = noteToEdit ?? selectedNote;
    if (!note) return;
    setSelectedNote(note);
    setMobileShowEditor(true);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags ?? []);
    setTagInput('');
    savedRef.current = { title: note.title, content: note.content, tags: note.tags ?? [] };
    setMode('edit');
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  // ── Tags ──
  const commitTag = useCallback((currentInput: string, currentTags: string[]): string[] => {
    const raw = currentInput
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/[^a-z0-9-_]/g, '');
    if (raw && !currentTags.includes(raw)) return [...currentTags, raw];
    return currentTags;
  }, []);

  // ── Markdown toolbar ──
  const applyFormat = useCallback(
    (type: FormatType) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = editContent;
      const selected = value.substring(start, end);

      type Fmt = { before: string; after?: string; placeholder?: string };
      const fmts: Record<FormatType, Fmt> = {
        bold: { before: '**', after: '**', placeholder: 'bold text' },
        italic: { before: '_', after: '_', placeholder: 'italic text' },
        strike: { before: '~~', after: '~~', placeholder: 'strikethrough' },
        code: { before: '`', after: '`', placeholder: 'code' },
        codeblock: { before: '\n```\n', after: '\n```', placeholder: 'code here' },
        h1: { before: '# ', after: '', placeholder: 'Heading 1' },
        h2: { before: '## ', after: '', placeholder: 'Heading 2' },
        h3: { before: '### ', after: '', placeholder: 'Heading 3' },
        ul: { before: '\n- ', after: '', placeholder: 'list item' },
        ol: { before: '\n1. ', after: '', placeholder: 'list item' },
        task: { before: '\n- [ ] ', after: '', placeholder: 'task' },
        quote: { before: '\n> ', after: '', placeholder: 'blockquote' },
        link: { before: '[', after: '](url)', placeholder: 'link text' },
        image: { before: '![', after: '](image-url)', placeholder: 'alt text' },
        hr: { before: '\n\n---\n\n', after: '', placeholder: '' },
      };
      const { before, after = '', placeholder = '' } = fmts[type];
      const text = selected || placeholder;
      const newValue = value.substring(0, start) + before + text + after + value.substring(end);
      setEditContent(newValue);
      const ns = start + before.length;
      const ne = ns + text.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(ns, ne);
      });
    },
    [editContent]
  );

  // ── Save ──
  const handleSave = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!editTitle.trim()) return;
      if (!silent) setSaving(true);
      const finalTags = tagInput.trim() ? commitTag(tagInput, editTags) : editTags;
      if (finalTags !== editTags) {
        setEditTags(finalTags);
        setTagInput('');
      }
      try {
        const payload = { title: editTitle.trim(), content: editContent.trim(), tags: finalTags };
        const res = await fetch('/api/notes', {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:
            mode === 'edit'
              ? JSON.stringify({ id: selectedNote!._id, ...payload })
              : JSON.stringify(payload),
          signal: abortCtrlRef.current.signal,
        });
        if (res.status === 401) {
          triggerLogout();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          await fetchNotes();
          if (!isMountedRef.current) return;
          if (data.note) setSelectedNote(data.note);
          savedRef.current = { title: payload.title, content: payload.content, tags: finalTags };
          if (silent) {
            setLastAutoSaved(new Date());
            if (mode === 'create') setMode('edit'); // promote create→edit after first auto-save
          } else {
            setMode('view');
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        /* silent */
      }
      if (!silent && isMountedRef.current) setSaving(false);
    },
    [
      editTitle,
      editContent,
      editTags,
      tagInput,
      mode,
      selectedNote,
      commitTag,
      fetchNotes,
      triggerLogout,
    ]
  );

  // ── Auto-save if dirty ──
  const autoSaveIfDirty = useCallback(async () => {
    if (mode !== 'edit' && mode !== 'create') return;
    if (!editTitle.trim()) return;
    if (mode === 'edit' && savedRef.current) {
      const s = savedRef.current;
      if (
        editTitle.trim() === s.title &&
        editContent.trim() === s.content &&
        JSON.stringify(editTags) === JSON.stringify(s.tags)
      )
        return;
    }
    await handleSave({ silent: true });
  }, [mode, editTitle, editContent, editTags, handleSave]);

  // Keep ref current so stable effects (keyboard, interval) can call latest version
  useEffect(() => {
    autoSaveFnRef.current = autoSaveIfDirty;
  });

  // ── Delete ──
  const handleDelete = async (id: string) => {
    const res = await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.status === 401) {
      triggerLogout();
      return;
    }
    if (res.ok) {
      setSelectedNote(null);
      setMode('view');
      setDeleteTarget(null);
      setMobileShowEditor(false);
      await fetchNotes();
    }
  };

  // ── Slug availability live check ──
  const selectedNoteId = selectedNote?._id;
  useEffect(() => {
    if (!publishSlug.trim() || !showPublish || !selectedNoteId) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/notes/publish?slug=${encodeURIComponent(publishSlug)}&excludeId=${selectedNoteId}`
        );
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [publishSlug, showPublish, selectedNoteId]);

  // ── Publish helpers ──
  const openPublish = () => {
    if (!selectedNote) return;
    if (showPublish) {
      setShowPublish(false);
      return;
    }
    setPublishSlug(selectedNote.slug || generateSlug(selectedNote.title));
    setSlugStatus('idle');
    setShowExport(false);
    setShowPublish(true);
  };

  const handlePublish = async () => {
    if (!selectedNote || slugStatus !== 'available' || publishLoading) return;
    setPublishLoading(true);
    try {
      const res = await fetch('/api/notes/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedNote._id, published: true, slug: publishSlug }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setSlugStatus('taken');
        return;
      }
      if (res.ok) {
        await fetchNotes();
        if (data.note) setSelectedNote(data.note);
        setShowPublish(false);
      }
    } catch {
      /* silent */
    }
    setPublishLoading(false);
  };

  const handleUnpublish = async () => {
    if (!selectedNote || publishLoading) return;
    setPublishLoading(true);
    try {
      const res = await fetch('/api/notes/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedNote._id, published: false }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchNotes();
        if (data.note) setSelectedNote(data.note);
        setShowPublish(false);
      }
    } catch {
      /* silent */
    }
    setPublishLoading(false);
  };

  // ── Tag filter ──
  const toggleTagFilter = (tag: string) => {
    setActiveTagFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  // ── Export ──
  const exportNote = (format: 'md' | 'txt' | 'pdf') => {
    if (!selectedNote) return;
    setShowExport(false);
    const slug = selectedNote.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'note';

    if (format === 'md') {
      const blob = new Blob([`# ${selectedNote.title}\n\n${selectedNote.content}`], {
        type: 'text/markdown',
      });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${slug}.md`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    }

    if (format === 'txt') {
      const plain = selectedNote.content
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/!\[.+?\]\(.+?\)/g, '')
        .replace(/^[-*]\s+/gm, '• ');
      const blob = new Blob(
        [`${selectedNote.title}\n${'─'.repeat(selectedNote.title.length)}\n\n${plain}`],
        { type: 'text/plain' }
      );
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${slug}.txt`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    }

    if (format === 'pdf') {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) return;
      const meta = [
        selectedNote.tags?.length ? selectedNote.tags.map((t) => `#${t}`).join(' · ') : '',
        new Date(selectedNote.updatedAt).toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(' · ');
      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${selectedNote.title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:750px;margin:3rem auto;padding:0 2rem;color:#1a1a1a;line-height:1.75;font-size:16px}
h1{font-size:2em;margin-top:0;border-bottom:2px solid #10b981;padding-bottom:.4rem}
h2{font-size:1.5em;border-bottom:1px solid #e5e7eb;padding-bottom:.25em;margin-top:1.8em}
h3{font-size:1.2em;margin-top:1.4em}
code{background:#f3f4f6;padding:.15em .4em;border-radius:4px;font-family:monospace;font-size:.88em;color:#10b981}
pre{background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:1.2rem;overflow-x:auto}
pre code{background:none;color:#1a1a1a;padding:0}
blockquote{border-left:4px solid #10b981;background:#f0fdf4;margin:1.5rem 0;padding:1rem 1.5rem;border-radius:0 8px 8px 0;color:#374151}
li{margin-bottom:.35rem}a{color:#10b981}img{max-width:100%;border-radius:8px}
hr{border:none;border-top:1px solid #e5e7eb;margin:2rem 0}del{color:#9ca3af}
.meta{color:#6b7280;font-size:.83em;margin-bottom:2rem}
@media print{body{margin:0}}
</style></head><body>
<h1>${selectedNote.title.replace(/</g, '&lt;')}</h1>
${meta ? `<div class="meta">${meta}</div>` : ''}
<p>${markdownToHtml(selectedNote.content)}</p>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script>
</body></html>`);
      win.document.close();
    }
  };

  // ── Computed ──
  const totalPages = Math.ceil(totalCount / notesPerPage);
  const currentIdx = selectedNote ? notes.findIndex((n) => n._id === selectedNote._id) : -1;

  // ── Lock screen ──
  if (!isAuthenticated) {
    const switchMode = (m: 'code' | 'password') => {
      setAuthMode(m);
      setPassword('');
      setAuthError('');
    };

    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-500">
          {/* Live clock */}
          <div className="text-center mb-8">
            <p className="text-xs font-mono text-muted-foreground/50 tracking-[0.15em]">
              {clockStr}
            </p>
          </div>

          {/* Icon + title */}
          <div className="mb-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-black font-mono text-foreground tracking-[0.12em] uppercase">
              {lockTitle}
            </h2>
          </div>

          {/* Mode tabs (only when the authenticator quick-unlock is enabled) */}
          {quickUnlock && (
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 mb-4 border border-border/40">
              <button
                type="button"
                onClick={() => switchMode('code')}
                aria-label="Unlock with authenticator code"
                className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                  authMode === 'code'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ·· – ····
              </button>
              <button
                type="button"
                onClick={() => switchMode('password')}
                className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                  authMode === 'password'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ••••••••
              </button>
            </div>
          )}

          {vaultSetup && !vaultSetup.passwordSet && !vaultSetup.quickUnlock && (
            <p className="mb-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-center text-xs font-mono text-muted-foreground">
              This vault has no password or authenticator yet. The owner can set one in Admin →
              Security &amp; Keys.
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            {authMode === 'code' ? (
              <input
                key="code-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={7}
                placeholder="··-····"
                value={
                  password.length === 0
                    ? ''
                    : password.length <= 2
                      ? password
                      : `${password.slice(0, 2)}-${password.slice(2)}`
                }
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-input border border-border focus:border-primary/60 rounded-xl px-4 py-4 text-center font-mono tracking-[0.4em] text-2xl text-foreground placeholder:text-muted-foreground/20 placeholder:tracking-widest placeholder:text-base focus:outline-none transition-all"
                autoFocus
                required
              />
            ) : (
              <input
                key="password-input"
                type="password"
                placeholder="- - - - - -"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border focus:border-primary/60 rounded-xl px-4 py-3.5 text-center font-mono tracking-[0.25em] text-lg text-foreground placeholder:text-muted-foreground/40 placeholder:tracking-normal focus:outline-none transition-all"
                autoFocus
                required
              />
            )}

            {authError && (
              <p className="text-destructive text-xs text-center font-mono animate-in fade-in">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !password ||
                (authMode === 'code' && password.length < 6) ||
                (vaultSetup !== null && !vaultSetup.passwordSet && !vaultSetup.quickUnlock)
              }
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold font-mono tracking-[0.15em] uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" /> UNLOCK
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main split UI ──
  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Shortcuts modal ── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground tracking-tight">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {SHORTCUTS.map(({ keys, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground/40 text-xs">+</span>}
                        <kbd className="px-2 py-0.5 bg-muted border border-border rounded-md text-xs font-mono text-foreground">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground/50 text-center font-mono">
              Press Esc or click outside to close
            </p>
          </div>
        </div>
      )}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {ctxMenu.confirm ? (
              <div className="px-3 py-2 space-y-2.5">
                <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Delete this note?
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      await handleDelete(ctxMenu.note._id);
                      setCtxMenu(null);
                    }}
                    className="flex-1 px-2 py-1.5 text-xs bg-destructive/10 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setCtxMenu(null)}
                    className="flex-1 px-2 py-1.5 text-xs border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    startEdit(ctxMenu.note);
                    setCtxMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                </button>
                <div className="mx-2 my-1 h-px bg-border/60" />
                <button
                  onClick={() => setCtxMenu((c) => (c ? { ...c, confirm: true } : null))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ════════ LEFT PANEL ════════ */}
      <div
        className={`
        ${mobileShowEditor ? 'hidden md:flex' : 'flex'}
        w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-border bg-card
      `}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-foreground tracking-[0.2em] uppercase font-mono">
            {vaultTitle}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts"
              className="w-5 h-5 flex items-center justify-center rounded border border-border/50 text-[11px] font-mono font-bold text-muted-foreground/50 hover:text-primary hover:border-primary/40 transition-colors"
            >
              ?
            </button>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono tabular-nums font-semibold transition-colors ${
                isLowTime
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : 'bg-primary/8 border-primary/20 text-primary'
              }`}
            >
              <Clock className={`w-3 h-3 ${isLowTime ? 'animate-pulse' : ''}`} />
              {timeLeft}
            </div>
            <button
              onClick={handleLogout}
              title="Lock vault"
              className="w-5 h-5 flex items-center justify-center rounded border border-border/50 text-muted-foreground/50 hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="p-3 space-y-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-input border border-border focus:border-primary/40 rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-all font-mono ${
                    activeTagFilters.includes(tag)
                      ? tagStyle(tag)
                      : 'text-muted-foreground/50 border-border hover:border-muted-foreground/40 hover:text-muted-foreground'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          {activeTagFilters.length > 0 && (
            <button
              onClick={() => {
                setActiveTagFilters([]);
                setPage(1);
              }}
              className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-0.5"
            >
              <X className="w-2.5 h-2.5" /> clear filters
            </button>
          )}
        </div>

        {/* New Note */}
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <button
            onClick={startCreate}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 text-[11px] font-semibold tracking-[0.15em] uppercase hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {loading && notes.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <FileText className="w-8 h-8 text-muted-foreground/20" />
              <span className="text-[11px] text-muted-foreground/40 tracking-widest font-mono uppercase">
                No notes
              </span>
            </div>
          ) : (
            notes.map((note) => {
              const isActive = selectedNote?._id === note._id;
              return (
                <button
                  key={note._id}
                  onClick={() => selectNote(note)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const x = Math.min(e.clientX, window.innerWidth - 180);
                    const y = Math.min(e.clientY, window.innerHeight - 110);
                    setCtxMenu({ note, x, y, confirm: false });
                  }}
                  className={`w-full text-left px-4 py-3.5 border-b border-border/50 transition-all border-l-2 group ${
                    isActive
                      ? 'bg-primary/6 border-l-primary'
                      : 'border-l-transparent hover:bg-muted/30 hover:border-l-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span
                      className={`text-xs font-semibold leading-snug truncate ${isActive ? 'text-primary' : 'text-foreground group-hover:text-foreground'}`}
                    >
                      {note.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-0.5 tabular-nums font-mono">
                      {timeAgo(note.updatedAt)}
                    </span>
                  </div>
                  {note.content && (
                    <p className="text-[11px] text-muted-foreground/60 line-clamp-1 mt-0.5 leading-relaxed">
                      {note.content
                        .replace(/^#{1,6}\s+/gm, '')
                        .replace(/[*_~`\[\]!]/g, '')
                        .trim()}
                    </p>
                  )}
                  {(note.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[8px] px-1 py-0.5 rounded border font-mono ${tagStyle(tag)}`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-3 py-2 flex items-center justify-between shrink-0">
          {totalPages > 1 ? (
            <>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInput !== '' ? pageInput : String(page)}
                  onFocus={() => setPageInput(String(page))}
                  onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => {
                    const n = parseInt(pageInput);
                    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
                    setPageInput('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = parseInt(pageInput);
                      if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
                      setPageInput('');
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      setPageInput('');
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-7 text-center bg-muted/30 border border-border/50 rounded px-0.5 py-0.5 focus:outline-none focus:border-primary/40 tabular-nums transition-colors"
                />
                <span className="text-muted-foreground/50">/ {totalPages}</span>
                <span className="text-muted-foreground/30 mx-0.5">·</span>
                <span>{totalCount}</span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {totalCount} note{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ════════ RIGHT PANEL ════════ */}
      <div
        className={`
        ${mobileShowEditor ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col overflow-hidden bg-background
      `}
      >
        {/* ── Edit / Create ── */}
        {(mode === 'edit' || mode === 'create') && (
          <>
            {/* Editor header */}
            <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-3 bg-card/40">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => {
                    setMode('view');
                    if (mode === 'create') setMobileShowEditor(false);
                  }}
                  className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-muted-foreground/40 tracking-wider hidden md:block">
                  {mode === 'create' ? 'NEW NOTE' : 'EDITING'}
                </span>
                {lastAutoSaved && (
                  <span className="text-[10px] font-mono text-primary/30 hidden md:block">
                    ✓{' '}
                    {lastAutoSaved.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Shortcut hint */}
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title="Keyboard shortcuts (?)"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setMode('view');
                    if (mode === 'create') setMobileShowEditor(false);
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:border-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave()}
                  disabled={saving || !editTitle.trim()}
                  title="Save (Ctrl+Enter)"
                  className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-40 flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 md:px-8 pt-7 pb-1 shrink-0">
              <input
                ref={titleRef}
                type="text"
                placeholder="Untitled..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    tagInputRef.current?.focus();
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-full bg-transparent text-2xl md:text-3xl font-bold text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
              />
            </div>

            {/* Tag editor */}
            <div className="px-6 md:px-8 py-2.5 shrink-0 flex flex-wrap items-center gap-1.5 min-h-[36px] border-b border-border/50">
              {editTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-mono ${tagStyle(tag)}`}
                >
                  #{tag}
                  <button
                    onClick={() => setEditTags((t) => t.filter((x) => x !== tag))}
                    className="hover:opacity-60 transition-opacity ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                placeholder={editTags.length === 0 ? 'Add tags... (Space or Enter)' : '+ tag'}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                    e.preventDefault();
                    if (tagInput.trim()) {
                      setEditTags(commitTag(tagInput, editTags));
                      setTagInput('');
                    }
                  }
                  if (e.key === 'Backspace' && !tagInput && editTags.length) {
                    setEditTags((t) => t.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (tagInput.trim()) {
                    setEditTags(commitTag(tagInput, editTags));
                    setTagInput('');
                  }
                }}
                className="text-xs text-primary/60 bg-transparent placeholder:text-muted-foreground/40 focus:outline-none min-w-[150px] flex-1 font-mono"
              />
            </div>

            {/* Split: editor (left) + live preview (right) */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left - write */}
              <div className="flex-1 flex flex-col min-h-0 border-r border-border/40">
                {/* Toolbar */}
                <div className="px-2 py-1.5 border-b border-border/30 flex items-center gap-0 flex-wrap shrink-0 bg-card/20 overflow-x-auto">
                  <ToolbarBtn onActivate={() => applyFormat('h1')} title="Heading 1">
                    <Heading1 className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('h2')} title="Heading 2">
                    <Heading2 className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('h3')} title="Heading 3">
                    <Heading3 className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarSep />
                  <ToolbarBtn onActivate={() => applyFormat('bold')} title="Bold (Ctrl+B)">
                    <Bold className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('italic')} title="Italic (Ctrl+I)">
                    <Italic className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('strike')} title="Strikethrough">
                    <Strikethrough className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarSep />
                  <ToolbarBtn onActivate={() => applyFormat('code')} title="Inline code (Ctrl+`)">
                    <Code className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('codeblock')} title="Code block">
                    <Code2 className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarSep />
                  <ToolbarBtn onActivate={() => applyFormat('ul')} title="Bullet list">
                    <List className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('ol')} title="Numbered list">
                    <ListOrdered className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('task')} title="Task list">
                    <ListChecks className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarSep />
                  <ToolbarBtn onActivate={() => applyFormat('quote')} title="Blockquote">
                    <Quote className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('link')} title="Link (Ctrl+K)">
                    <Link2 className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('image')} title="Image">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onActivate={() => applyFormat('hr')} title="Horizontal rule">
                    <Minus className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                </div>

                {/* Write area with hints overlay */}
                <div className="flex-1 relative min-h-0">
                  {!editContent && (
                    <div className="absolute top-0 left-0 right-0 px-6 py-5 pointer-events-none select-none overflow-hidden">
                      <div className="font-mono text-xs leading-7 space-y-1.5">
                        <div className="text-muted-foreground/25">
                          <span className="text-primary/35"># </span>Heading 1
                          <span className="mx-2 text-border/60">·</span>
                          <span className="text-primary/35">## </span>Heading 2
                          <span className="mx-2 text-border/60">·</span>
                          <span className="text-primary/35">### </span>Heading 3
                        </div>
                        <div className="text-muted-foreground/20">
                          <span className="text-emerald-500/30">**bold**</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-sky-500/30">_italic_</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-muted-foreground/20">~~strike~~</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-amber-500/30">`code`</span>
                        </div>
                        <div className="text-muted-foreground/20">
                          <span className="text-primary/30">- item</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-primary/30">1. numbered</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-primary/30">- [ ] task</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-violet-500/30">&gt; blockquote</span>
                        </div>
                        <div className="text-muted-foreground/20">
                          <span className="text-sky-500/30">[text](url)</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-rose-500/30">![alt](img-url)</span>
                          <span className="mx-2 text-border/40">·</span>
                          <span className="text-muted-foreground/18">--- (divider)</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/20 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground/20">
                          {[
                            ['Ctrl+B', 'bold'],
                            ['Ctrl+I', 'italic'],
                            ['Ctrl+K', 'link'],
                            ['Ctrl+`', 'code'],
                            ['Ctrl+Enter', 'save'],
                            ['?', 'shortcuts'],
                          ].map(([k, l]) => (
                            <span key={k}>
                              <span className="font-bold text-muted-foreground/30">{k}</span> {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder=""
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const s = ta.selectionStart;
                        const nv =
                          editContent.substring(0, s) +
                          '  ' +
                          editContent.substring(ta.selectionEnd);
                        setEditContent(nv);
                        requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
                        return;
                      }
                      if (e.ctrlKey || e.metaKey) {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSave();
                        } else if (e.key === 'b') {
                          e.preventDefault();
                          applyFormat('bold');
                        } else if (e.key === 'i') {
                          e.preventDefault();
                          applyFormat('italic');
                        } else if (e.key === 'k') {
                          e.preventDefault();
                          applyFormat('link');
                        } else if (e.key === '`') {
                          e.preventDefault();
                          applyFormat('code');
                        }
                      }
                    }}
                    className="absolute inset-0 w-full h-full px-6 py-5 bg-transparent text-sm text-foreground focus:outline-none resize-none leading-[1.85] font-mono"
                  />
                </div>
              </div>

              {/* Right - live preview (desktop only) */}
              <div className="hidden md:flex flex-col flex-1 min-h-0 bg-background/30">
                <div className="px-4 py-1.5 border-b border-border/30 shrink-0 flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-muted-foreground/30" />
                  <span className="text-[11px] text-muted-foreground/35 font-mono uppercase tracking-widest">
                    Preview
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {editContent ? (
                    <MarkdownRenderer content={editContent} />
                  ) : (
                    <p className="text-muted-foreground/20 italic text-sm select-none mt-2">
                      Start writing to see preview…
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── View mode ── */}
        {mode === 'view' && selectedNote && (
          <>
            <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 bg-card/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileShowEditor(false);
                    setSelectedNote(null);
                  }}
                  className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Prev / Next navigation */}
                {notes.length > 1 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        const idx = notes.findIndex((n) => n._id === selectedNote._id);
                        const prev = notes[(idx - 1 + notes.length) % notes.length];
                        if (prev) selectNote(prev);
                      }}
                      title="Previous note (← or K)"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-muted-foreground/50 font-mono tabular-nums min-w-[32px] text-center">
                      {currentIdx + 1}/{notes.length}
                    </span>
                    <button
                      onClick={() => {
                        const idx = notes.findIndex((n) => n._id === selectedNote._id);
                        const next = notes[(idx + 1) % notes.length];
                        if (next) selectNote(next);
                      }}
                      title="Next note (→ or J)"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <span className="text-[11px] text-muted-foreground/50 font-mono tracking-widest hidden sm:block">
                  {timeAgo(selectedNote.updatedAt)}
                  {selectedNote.updatedAt !== selectedNote.createdAt ? ' · edited' : ''}
                </span>
              </div>

              <div className="relative flex items-center gap-1.5">
                {/* Publish - dropdown anchors to this whole row (see publish-popover.tsx),
                    not its own button, so it can't overflow off-screen on narrow viewports */}
                <PublishPopover
                  note={selectedNote}
                  show={showPublish}
                  onOpen={openPublish}
                  onClose={() => setShowPublish(false)}
                  slug={publishSlug}
                  onSlugChange={setPublishSlug}
                  slugStatus={slugStatus}
                  publishLoading={publishLoading}
                  copied={copied}
                  onCopy={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/notes/${selectedNote.slug}`
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                />

                {/* Export dropdown */}
                <div>
                  <button
                    onClick={() => setShowExport((v) => !v)}
                    title="Export note"
                    className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground border border-transparent hover:border-border rounded-lg transition-all flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {showExport && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-150">
                        {(
                          [
                            ['md', '.md Markdown'],
                            ['txt', '.txt Plain text'],
                            ['pdf', 'PDF (print)'],
                          ] as const
                        ).map(([f, label]) => (
                          <button
                            key={f}
                            onClick={() => exportNote(f)}
                            className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-mono"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Edit / Delete */}
                {deleteTarget === selectedNote._id ? (
                  <>
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Confirm?
                    </span>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:border-muted-foreground/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(selectedNote._id)}
                      className="px-3 py-1.5 text-xs bg-destructive/10 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit()}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(selectedNote._id)}
                      className="p-1.5 border border-destructive/20 rounded-lg text-destructive/50 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 max-w-3xl">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
                {selectedNote.title}
              </h1>

              {/* Dates */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/40 font-mono mb-3">
                <span>
                  Created{' '}
                  {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {new Date(selectedNote.updatedAt).getTime() -
                  new Date(selectedNote.createdAt).getTime() >
                  5000 && (
                  <span>
                    · Edited{' '}
                    {new Date(selectedNote.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {timeAgo(selectedNote.updatedAt)}
                  </span>
                )}
              </div>

              {(selectedNote.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {selectedNote.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      title={`Filter by #${tag}`}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-opacity hover:opacity-70 font-mono ${tagStyle(tag)}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="w-full h-px bg-border mb-6" />
              <MarkdownRenderer content={selectedNote.content} />
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {mode === 'view' && !selectedNote && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="w-16 h-16 rounded-2xl border border-border bg-card/40 flex items-center justify-center">
              <FileText className="w-7 h-7 text-muted-foreground/20" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground/50 tracking-wide mb-1">
                No note selected
              </p>
              <p className="text-xs text-muted-foreground/35">
                Pick from the list or create a new one
              </p>
              <p className="text-[11px] text-muted-foreground/25 mt-1 font-mono">
                Press{' '}
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">
                  N
                </kbd>{' '}
                to create &nbsp;·&nbsp;
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[10px]">
                  ?
                </kbd>{' '}
                for shortcuts
              </p>
            </div>
            <button
              onClick={startCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/20 text-primary/50 text-xs font-semibold hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
