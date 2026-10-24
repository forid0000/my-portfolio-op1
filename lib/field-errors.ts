/**
 * "Which field did I get wrong?" for every form in the app.
 *
 * When a save fails validation the server answers 400 with Zod issues (`details: [{ path,
 * message, code, ... }]`). This module turns those into what a person needs: the exact input is
 * scrolled into view and focused, outlined in red (`aria-invalid`, styled in globals.css), and the
 * reason is written right under it. It also powers the pages' own checks before saving.
 *
 * Finding the input: forms that care add `data-field="projects.2.title"` (or `name`/`id`). For the
 * many admin editors that are plain controlled inputs, the field is found from the payload that
 * was sent (an input currently holding the offending value), its label, and its position among
 * repeated rows. Everything here is browser code with no dependencies (no zod, no toast): the
 * pure parts are unit-tested, the DOM parts are small.
 */

export type PathSegment = string | number;

export interface FieldIssue {
  path: PathSegment[];
  message: string;
  code?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  format?: string;
  origin?: string;
  expected?: string;
}

/* ------------------------------------------------------------------------------------------ */
/* Pure helpers                                                                               */
/* ------------------------------------------------------------------------------------------ */

/** Zod issues out of an API error body (`{ details: [...] }`), ignoring anything else. */
export function parseIssues(body: unknown): FieldIssue[] {
  const details = (body as { details?: unknown } | null)?.details;
  if (!Array.isArray(details)) return [];
  const issues: FieldIssue[] = [];
  for (const item of details) {
    if (!item || typeof item !== 'object') continue;
    const { path, message } = item as { path?: unknown; message?: unknown };
    if (!Array.isArray(path) || typeof message !== 'string') continue;
    issues.push({
      ...(item as object),
      path: path.filter((p): p is PathSegment => typeof p === 'string' || typeof p === 'number'),
      message,
    } as FieldIssue);
  }
  return issues;
}

const ACRONYMS: Record<string, string> = {
  url: 'URL',
  id: 'ID',
  seo: 'SEO',
  cta: 'CTA',
  href: 'address',
};

/** `headerName` / `header_name` -> "Header name". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.toLowerCase());
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Social links, item 3, URL" for `['socials', 2, 'href']`. */
export function describePath(path: PathSegment[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      if (parts.length) parts[parts.length - 1] += ` #${seg + 1}`;
      else parts.push(`Item ${seg + 1}`);
    } else {
      parts.push(humanizeKey(seg));
    }
  }
  return parts.join(' > ') || 'This field';
}

/** Plain-language reason for an issue; messages we wrote ourselves are kept as they are. */
export function friendlyMessage(issue: FieldIssue): string {
  const raw = issue.message || '';
  const min = issue.minimum !== undefined ? Number(issue.minimum) : undefined;
  const max = issue.maximum !== undefined ? Number(issue.maximum) : undefined;
  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string' || issue.origin === undefined) {
        return min !== undefined && min <= 1
          ? 'This field is required.'
          : `Must be at least ${min} characters.`;
      }
      if (issue.origin === 'array') return `Add at least ${min} item${min === 1 ? '' : 's'}.`;
      return `Must be at least ${min}.`;
    case 'too_big':
      if (issue.origin === 'string') return `Too long: keep it under ${max} characters.`;
      if (issue.origin === 'array') return `Too many items (at most ${max}).`;
      return `Must be at most ${max}.`;
    case 'invalid_format':
      if (issue.format === 'url') return 'Enter a full web address, like https://example.com';
      if (issue.format === 'email') return 'Enter a valid email address.';
      return 'This does not look right.';
    case 'invalid_type':
      return /undefined|null/i.test(raw) || /received undefined/i.test(raw)
        ? 'This field is required.'
        : 'This value is not the right type.';
    case 'invalid_value':
      return 'Choose one of the available options.';
    default:
      return raw || 'This value is not valid.';
  }
}

/** The value at `path` inside a payload, or undefined. */
export function valueAt(payload: unknown, path: PathSegment[]): unknown {
  let cur: unknown = payload;
  for (const seg of path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

/** `socials.2.href` -> `socials.#.href`: the same field in every row. */
export function templateOf(path: PathSegment[]): string {
  return path.map((p) => (typeof p === 'number' ? '#' : p)).join('.');
}

/**
 * How many leaves shaped like `path` (same field in another row) come before it, in document
 * order. With rows that repeat, this is the position of the row: 0 for the first, 1 for the next.
 */
export function rowOrdinal(payload: unknown, path: PathSegment[]): number {
  const target = templateOf(path);
  const targetKey = path.join('.');
  let ordinal = 0;
  let found = false;
  const walk = (node: unknown, trail: PathSegment[]) => {
    if (found) return;
    if (node !== null && typeof node === 'object') {
      const entries = Array.isArray(node)
        ? node.map((v, i) => [i, v] as const)
        : Object.entries(node as Record<string, unknown>);
      for (const [k, v] of entries) walk(v, [...trail, k]);
      return;
    }
    if (templateOf(trail) !== target) return;
    if (trail.join('.') === targetKey) found = true;
    else ordinal += 1;
  };
  walk(payload, []);
  return found ? ordinal : 0;
}

const normalise = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** True when a label/placeholder plausibly names the field called `key` (headerName ~ "Header Name"). */
export function labelMatchesKey(label: string, key: string): boolean {
  const l = normalise(label);
  const k = normalise(key);
  if (!l || !k) return false;
  if (l.includes(k) || k.includes(l)) return true;
  // "href" is the URL field of a link, "src" the address of a picture, and so on.
  const synonyms: Record<string, string[]> = {
    href: ['url', 'link', 'address'],
    src: ['url', 'image', 'picture'],
    url: ['link', 'address'],
    label: ['name', 'title', 'text'],
    title: ['name', 'heading'],
    copyvalue: ['copy'],
    description: ['about', 'summary'],
  };
  return (synonyms[k] ?? []).some((s) => l.includes(s));
}

/* ------------------------------------------------------------------------------------------ */
/* DOM                                                                                        */
/* ------------------------------------------------------------------------------------------ */

const CONTROL_SELECTOR =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=file]):not([type=range]), textarea, select, [data-field][contenteditable="true"]';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;

function isVisible(el: Element): boolean {
  const e = el as HTMLElement;
  return (
    !e.hasAttribute('disabled') && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)
  );
}

function valueOf(el: Control): string {
  if ('value' in el && typeof (el as HTMLInputElement).value === 'string') {
    return (el as HTMLInputElement).value;
  }
  return el.textContent ?? '';
}

/** The text that names a control: its <label>, the label just before it, aria-label, placeholder. */
function labelOf(el: Control): string {
  const input = el as HTMLInputElement;
  const fromLabels = input.labels ? Array.from(input.labels).map((l) => l.textContent ?? '') : [];
  if (fromLabels.length) return fromLabels.join(' ');
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') return prev.textContent ?? '';
    prev = prev.previousElementSibling;
  }
  const parentLabel = el.parentElement?.querySelector(':scope > label');
  if (parentLabel) return parentLabel.textContent ?? '';
  return (
    el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || ''
  );
}

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

/** The control for one issue, or null when it cannot be told apart from the page. */
export function findControl(
  issue: FieldIssue,
  payload: unknown,
  root: ParentNode = document
): Control | null {
  const dotted = issue.path.join('.');
  const key = [...issue.path].reverse().find((p): p is string => typeof p === 'string') ?? '';

  // 1. The form said exactly which field this is.
  for (const attr of ['data-field', 'name', 'id']) {
    const exact = root.querySelector<Control>(`[${attr}="${escapeAttr(dotted)}"]`);
    if (exact && isVisible(exact)) return exact;
  }

  // 2. Work it out from the page.
  const controls = Array.from(root.querySelectorAll<Control>(CONTROL_SELECTOR)).filter(isVisible);
  if (!controls.length) return null;

  const leaf = valueAt(payload, issue.path);
  const wanted = typeof leaf === 'string' || typeof leaf === 'number' ? String(leaf).trim() : '';
  const named = (c: Control) =>
    labelMatchesKey(labelOf(c), key) || labelMatchesKey(c.getAttribute('placeholder') ?? '', key);

  let pool: Control[];
  if (wanted) {
    // The offending value is still in the box: it is the best clue, the label breaks ties.
    pool = controls.filter((c) => valueOf(c).trim() === wanted);
    const byLabel = pool.filter(named);
    if (byLabel.length) pool = byLabel;
    else if (!pool.length) pool = controls.filter(named); // edited since submitting
  } else {
    // An empty value says nothing by itself, so the label has to agree (or it is the only empty box).
    const empty = controls.filter((c) => valueOf(c).trim() === '');
    pool = empty.filter(named);
    if (!pool.length && empty.length === 1) pool = empty;
  }
  if (!pool.length) return null;

  const ordinal = issue.path.some((p) => typeof p === 'number')
    ? rowOrdinal(payload, issue.path)
    : 0;
  return pool[Math.min(ordinal, pool.length - 1)] ?? null;
}

const MESSAGE_ATTR = 'data-field-error-for';

/**
 * True when a container lays its children out side by side. A message written next to a field in
 * such a row would become one more column and squeeze the inputs, so it goes under the row.
 */
export function isSideBySide(display: string, flexDirection: string): boolean {
  return display.includes('flex') && flexDirection.startsWith('row');
}

/** The element the message is written after: the field, or its row when the field sits in one. */
function messageAnchor(el: Element): Element {
  const parent = el.parentElement;
  if (!parent || typeof getComputedStyle !== 'function') return el;
  const style = getComputedStyle(parent);
  return isSideBySide(style.display, style.flexDirection) ? parent : el;
}

/** Removes the red box and the message from one field (or from all of them). */
export function clearFieldErrors(root: ParentNode = document, only?: Element) {
  const marked = only
    ? [only]
    : Array.from(root.querySelectorAll('[aria-invalid="true"][data-field-flagged]'));
  for (const el of marked) {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('data-field-flagged');
    el.removeAttribute('aria-describedby');
    el.classList.remove('field-shake');
    const id = el.getAttribute('data-field-error-id');
    if (id) {
      document.getElementById(id)?.remove();
      el.removeAttribute('data-field-error-id');
    }
  }
  if (!only) root.querySelectorAll(`[${MESSAGE_ATTR}]`).forEach((n) => n.remove());
}

let counter = 0;

/** Outlines one field in red and writes the reason under it. */
export function markFieldInvalid(el: Control, message: string) {
  clearFieldErrors(document, el);
  const id = `field-error-${++counter}`;
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('data-field-flagged', 'true');
  el.setAttribute('data-field-error-id', id);
  el.setAttribute('aria-describedby', id);
  const note = document.createElement('p');
  note.id = id;
  note.className = 'field-error';
  note.setAttribute('role', 'alert');
  note.setAttribute(MESSAGE_ATTR, id);
  note.textContent = message;
  messageAnchor(el).insertAdjacentElement('afterend', note);
  // Restart the shake each time.
  el.classList.remove('field-shake');
  void el.offsetWidth;
  el.classList.add('field-shake');
}

let listening = false;

/** The red box goes away as soon as the person edits the field. */
function ensureClearOnInput() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  const clear = (event: Event) => {
    const target = event.target as Element | null;
    if (target?.getAttribute?.('data-field-flagged')) clearFieldErrors(document, target);
  };
  document.addEventListener('input', clear, true);
  document.addEventListener('change', clear, true);
}

function scrollAndFocus(el: Control) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  // preventScroll: the smooth scroll above is already under way.
  (el as HTMLElement).focus?.({ preventScroll: true });
}

export interface ReportResult {
  /** Issues whose field was found and highlighted. */
  highlighted: number;
  /** Issues that could not be matched to a field on the page. */
  unmatched: FieldIssue[];
  /** One line for a toast: "Header name: This field is required." */
  summary: string;
}

/**
 * Highlights the fields named by `issues`, scrolls to the first one (top to bottom on the page)
 * and focuses it. `payload` is what was sent, so the field can be recognised by its value.
 */
export function reportFieldIssues(
  issues: FieldIssue[],
  payload?: unknown,
  root: ParentNode = document
): ReportResult {
  ensureClearOnInput();
  clearFieldErrors(root);
  const found: { el: Control; issue: FieldIssue }[] = [];
  const unmatched: FieldIssue[] = [];
  const taken = new Set<Element>();
  for (const issue of issues) {
    const el = findControl(issue, payload, root);
    if (el && !taken.has(el)) {
      taken.add(el);
      found.push({ el, issue });
    } else {
      unmatched.push(issue);
    }
  }
  found.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  for (const { el, issue } of found) markFieldInvalid(el, friendlyMessage(issue));
  if (found[0]) scrollAndFocus(found[0].el);

  const first = issues[0];
  const summary = first
    ? `${describePath(first.path)}: ${friendlyMessage(first)}` +
      (issues.length > 1 ? ` (and ${issues.length - 1} more)` : '')
    : '';
  return { highlighted: found.length, unmatched, summary };
}

/**
 * Makes every `fetch` that comes back "400 + Zod issues" highlight the offending fields
 * automatically, so each editor gets this without being rewritten. Returns an undo function.
 * `shouldHandle` limits it to our own API.
 */
export function installFieldErrorFetch(
  shouldHandle: (url: string) => boolean = () => true
): () => void {
  const original = window.fetch;
  const patched: typeof window.fetch = async (input, init) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const relevant = method !== 'GET' && method !== 'HEAD' && shouldHandle(url);
    if (relevant) clearFieldErrors();
    const response = await original.call(window, input, init);
    if (relevant && response.status === 400) {
      try {
        const issues = parseIssues(await response.clone().json());
        if (issues.length) {
          let payload: unknown;
          if (typeof init?.body === 'string') {
            try {
              payload = JSON.parse(init.body);
            } catch {
              payload = undefined;
            }
          }
          // After the page's own error handling has re-rendered.
          setTimeout(() => reportFieldIssues(issues, payload), 60);
        }
      } catch {
        /* not JSON: nothing to highlight */
      }
    }
    return response;
  };
  window.fetch = patched;
  return () => {
    if (window.fetch === patched) window.fetch = original;
  };
}
