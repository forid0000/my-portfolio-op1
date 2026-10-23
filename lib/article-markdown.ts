/**
 * The few things article text needs on top of ordinary Markdown, as pure functions shared by the
 * public renderer, the editor preview and the tests.
 *
 *   ::: center       blocks:  center | right | note | tip | warning
 *   Text in the block
 *   :::
 *
 * Plain Markdown (headings, lists, links, images, tables, code, quotes) works as usual. Raw HTML
 * is never rendered, so article text cannot inject markup or scripts.
 */
import { slugify } from '@/lib/articles-model';

export const BLOCK_KINDS = ['center', 'right', 'note', 'tip', 'warning'] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export interface Segment {
  kind: 'md' | BlockKind;
  text: string;
}

const OPEN = /^:::\s*(center|right|note|tip|warning)\s*$/i;
const CLOSE = /^:::\s*$/;
const FENCE = /^\s{0,3}(```|~~~)/;

/** Splits article text into plain Markdown and `:::` blocks. Blocks do not nest. */
export function splitBlocks(body: string): Segment[] {
  const segments: Segment[] = [];
  let current: Segment = { kind: 'md', text: '' };
  let fence: string | null = null;

  const push = () => {
    if (current.text.trim() || current.kind !== 'md') segments.push(current);
  };

  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fenceMatch[1] === fence) fence = null;
    }
    if (fence === null && current.kind === 'md') {
      const open = OPEN.exec(line);
      if (open) {
        push();
        current = { kind: open[1].toLowerCase() as BlockKind, text: '' };
        continue;
      }
    } else if (fence === null && current.kind !== 'md' && CLOSE.test(line)) {
      push();
      current = { kind: 'md', text: '' };
      continue;
    }
    current.text += (current.text ? '\n' : '') + line;
  }
  push();
  return segments;
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

/** Plain words of one line of inline Markdown (links keep their label). */
function inlineText(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

/** Makes unique, address-friendly ids for headings, in the order they are requested. */
export function createSlugger() {
  const used = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text, 'section');
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

/** Headings of an article in reading order, for the table of contents. */
export function extractHeadings(body: string): HeadingInfo[] {
  const slug = createSlugger();
  const out: HeadingInfo[] = [];
  let fence: string | null = null;
  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fenceMatch[1] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = inlineText(m[2]);
    if (!text) continue;
    out.push({ level: m[1].length, text, id: slug(text) });
  }
  return out;
}

/** Plain text of React children, used to build heading ids at render time. */
export function textOfChildren(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOfChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return textOfChildren((children as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}
