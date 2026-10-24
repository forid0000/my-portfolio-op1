/**
 * Everything about notes that both the server and the browser need: shapes, limits, tags, slugs
 * and the rules for attached files (what kind a file is, whether it can be previewed, and how it
 * may be served). No imports from the server or the DOM, so it is easy to test.
 *
 * A note belongs to the owner's private vault. Only a note the owner publishes (and gives an
 * address) is visible to visitors, at /notes/<slug>; its attachments become public with it.
 */
import { excerptFrom, plainText, readingMinutes, slugify } from '@/lib/articles-model';
import { formatBytes } from '@/lib/media-types';

export { excerptFrom, formatBytes, plainText, readingMinutes };

/* ----------------------------------- shapes ----------------------------------- */

/** One file kept with a note. The bytes live in the database (see lib/note-files.ts). */
export interface NoteAttachment {
  /** Id of the stored file; the address is /api/notes/files/<id>. */
  id: string;
  /** File name without folders. */
  name: string;
  /** Sanitised media type (see resolveFileType). */
  type: string;
  size: number;
  /** Folder the file came from when a whole folder was added ("photos/2026"), if any. */
  path?: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
  published?: boolean;
  slug?: string;
  publishedAt?: string;
}

/** What the public pages show about a published note. */
export interface PublicNoteCard {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  readingMinutes: number;
}

export const NOTE_LIMITS = {
  title: 200,
  content: 200_000,
  tags: 20,
  tag: 40,
  attachments: 100,
  fileName: 200,
  path: 300,
  slug: 80,
} as const;

/** Addresses that are taken by the app itself and cannot be used for a published note. */
export const RESERVED_SLUGS = ['vault', 'new', 'api', 'rss.xml'] as const;

export const NOTE_TEXT_DEFAULTS = {
  publicTitle: 'Notes',
  publicIntro: 'Short write-ups and things worth keeping, shared publicly.',
  vaultButton: 'Private notes',
  vaultTitle: 'Private notes',
  lockTitle: 'This space is private',
} as const;

/* ------------------------------------ tags ------------------------------------ */

/** A tag as people type it: lower case, no `#`, letters and digits of any language, - and _. */
export function normalizeTag(raw: string): string {
  return raw
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}\p{M}_-]/gu, '')
    .slice(0, NOTE_LIMITS.tag);
}

/** Cleans a list of tags: normalised, no empty ones, no duplicates, at most NOTE_LIMITS.tags. */
export function normalizeNoteTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const tag = normalizeTag(raw);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= NOTE_LIMITS.tags) break;
  }
  return out;
}

/* ------------------------------------ slugs ----------------------------------- */

/** The address a title suggests, with a short suffix so two notes with one title do not clash. */
export function suggestSlug(title: string, now = Date.now()): string {
  const base = slugify(title, '').slice(0, 45).replace(/-+$/g, '');
  const suffix = now.toString(36).slice(-4);
  return base ? `${base}-${suffix}` : `note-${suffix}`;
}

/** Turns whatever was typed into a valid address; empty when nothing usable is left. */
export function cleanSlug(input: string): string {
  return slugify(input, '').slice(0, NOTE_LIMITS.slug).replace(/-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

/* ------------------------------ files and previews ---------------------------- */

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other';

const BY_EXTENSION: Record<string, string> = {
  // pictures
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  // video and sound
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  opus: 'audio/ogg',
  // documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  epub: 'application/epub+zip',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
};

/** Files whose content is text: shown as plain text, never executed (even .html and .js). */
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'log',
  'json',
  'jsonl',
  'csv',
  'tsv',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'env',
  'conf',
  'cfg',
  'html',
  'htm',
  'css',
  'scss',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'py',
  'rb',
  'php',
  'go',
  'rs',
  'java',
  'kt',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'swift',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'sql',
  'r',
  'lua',
  'dart',
  'vue',
  'svelte',
  'tex',
  'srt',
  'vtt',
  'diff',
  'patch',
  'gitignore',
  'dockerfile',
]);

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  if (dot === -1) return base.toLowerCase() === 'dockerfile' ? 'dockerfile' : '';
  return base.slice(dot + 1).toLowerCase();
}

const SAFE_TYPES = new Set(Object.values(BY_EXTENSION));

/**
 * The media type a file is stored and served with. The extension wins when it is known; a type
 * sent by the browser is only believed if it is on the safe list; text files are always
 * text/plain, so a stored page or script can never run in this site's origin.
 */
export function resolveFileType(name: string, claimed = ''): string {
  const ext = extensionOf(name);
  if (BY_EXTENSION[ext]) return BY_EXTENSION[ext];
  if (TEXT_EXTENSIONS.has(ext)) return 'text/plain';
  const type = claimed.split(';')[0].trim().toLowerCase();
  if (type === 'text/plain') return 'text/plain';
  if (SAFE_TYPES.has(type)) return type;
  return 'application/octet-stream';
}

export function fileKind(type: string, name = ''): FileKind {
  const t = type.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t === 'application/pdf') return 'pdf';
  if (t === 'text/plain' || TEXT_EXTENSIONS.has(extensionOf(name))) return 'text';
  return 'other';
}

/** Largest text file the viewer reads into the page (bigger ones can still be downloaded). */
export const TEXT_PREVIEW_BYTES = 1024 * 1024;

export function canPreview(att: Pick<NoteAttachment, 'type' | 'name' | 'size'>): boolean {
  const kind = fileKind(att.type, att.name);
  if (kind === 'other') return false;
  if (kind === 'text') return att.size <= TEXT_PREVIEW_BYTES;
  return true;
}

/** Whether the browser may show the stored file itself (inline) or must download it. */
export function servesInline(type: string): boolean {
  const kind = fileKind(type);
  return (
    kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf' || kind === 'text'
  );
}

export function fileUrl(id: string, options: { download?: boolean } = {}): string {
  return `/api/notes/files/${id}${options.download ? '?download=1' : ''}`;
}

/** The Markdown that puts an attachment into the note text: a picture for images, else a link. */
export function attachmentMarkdown(att: Pick<NoteAttachment, 'id' | 'name' | 'type'>): string {
  const label = att.name.replace(/\.[^.]+$/, '').replace(/[[\]()]/g, '');
  if (fileKind(att.type, att.name) === 'image') return `![${label}](${fileUrl(att.id)})`;
  return `[${att.name.replace(/[[\]()]/g, '')}](${fileUrl(att.id, { download: true })})`;
}

/** True when the text of the note already shows this attachment (so the file list can skip it). */
export function isReferenced(content: string, att: Pick<NoteAttachment, 'id'>): boolean {
  return content.includes(`/api/notes/files/${att.id}`);
}

/** Files grouped by the folder they came from; loose files come first. */
export function groupByFolder(
  attachments: NoteAttachment[]
): { path: string; files: NoteAttachment[] }[] {
  const groups = new Map<string, NoteAttachment[]>();
  for (const att of attachments) {
    const key = att.path ?? '';
    groups.set(key, [...(groups.get(key) ?? []), att]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
    .map(([path, files]) => ({ path, files }));
}

/** Removes what must never be in a name: control characters and the characters `" < > | : * ?`. */
function cleanName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '_')
    .trim()
    .slice(0, NOTE_LIMITS.fileName);
}

/** A file name safe to use in a header or on disk: no folders, no control characters. */
export function safeFileName(name: string): string {
  return cleanName(name.split(/[\\/]/).pop() ?? '') || 'file';
}

/** A folder path cleaned for display: no leading slashes, no `..`, no control characters. */
export function safeFolderPath(path: string): string {
  return path
    .split(/[\\/]+/)
    .map(cleanName)
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/')
    .slice(0, NOTE_LIMITS.path);
}

/** Largest file a server will accept: the platform's request limit on Vercel, more elsewhere. */
export const PLATFORM_FILE_LIMIT = {
  serverless: 4 * 1024 * 1024,
  selfHosted: 100 * 1024 * 1024,
} as const;

export const DEFAULT_FILE_LIMIT_MB = 10;

export function effectiveFileLimit(configuredMb: number | null | undefined, serverless: boolean) {
  const platform = serverless ? PLATFORM_FILE_LIMIT.serverless : PLATFORM_FILE_LIMIT.selfHosted;
  const wanted =
    (configuredMb && configuredMb > 0 ? configuredMb : DEFAULT_FILE_LIMIT_MB) * 1024 * 1024;
  return Math.min(platform, Math.round(wanted));
}

/* ---------------------------------- display ---------------------------------- */

/** "just now", "5m ago", "3d ago" or a date; takes the current time so it can be tested. */
export function timeAgo(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const s = Math.floor((now - time) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** One row of the vault's list: a summary, never the whole text. */
export interface NoteListItem {
  _id: string;
  title: string;
  excerpt: string;
  tags: string[];
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  slug?: string;
}

/* ---------------------------------- export ---------------------------------- */

/** A file name made from the note's title. */
export function exportFileName(title: string): string {
  const base = title
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase();
  return base || 'note';
}

/** The note as a Markdown file: its title, then the text; attached files are listed at the end. */
export function noteToMarkdown(
  note: Pick<Note, 'title' | 'content' | 'tags' | 'attachments'>
): string {
  const lines = [`# ${note.title}`, ''];
  if (note.tags.length) lines.push(note.tags.map((t) => `#${t}`).join(' '), '');
  lines.push(note.content.trim());
  if (note.attachments.length) {
    lines.push('', '---', '', 'Attached files:', ...note.attachments.map((a) => `- ${a.name}`));
  }
  return `${lines.join('\n')}\n`;
}

/** Markdown without its marks, keeping the line breaks, lists and code as they are. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/^:::.*$/gm, '')
    .replace(/^\s{0,3}(```|~~~).*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt: string) =>
      alt ? `[picture: ${alt}]` : '[picture]'
    )
    .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, text: string, url: string) =>
      /^https?:/i.test(url) && text !== url ? `${text} (${url})` : text
    )
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/gm, (_m, indent: string) => `${indent}• `)
    .replace(/^(\s*)[-*+]\s+/gm, (_m, indent: string) => `${indent}• `)
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function noteToText(note: Pick<Note, 'title' | 'content' | 'tags'>): string {
  const head = [note.title, '─'.repeat(Math.min(note.title.length, 60))];
  if (note.tags.length) head.push(note.tags.map((t) => `#${t}`).join(' '));
  return `${head.join('\n')}\n\n${markdownToText(note.content)}\n`;
}
