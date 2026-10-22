/**
 * Icons as plain data.
 *
 * CMS content stores icons by name (any lucide or react-icons glyph). Shipping a
 * resolver for ~50,000 icons to every visitor would mean tens of megabytes of
 * JavaScript, so names are resolved on the SERVER (lib/icons/resolve.ts) into
 * this tiny serialisable shape, and the browser only renders the handful of
 * glyphs a page actually uses. Nothing in this file imports an icon library.
 */
import { cloneElement, createElement, type ReactElement } from 'react';

/** `[tag, attributes, children?]` - one SVG element. */
export type IconNode = [tag: string, attrs: Record<string, string | number>, children?: IconNode[]];

export interface IconData {
  /** Attributes of the root <svg> (viewBox, fill, stroke...). */
  attrs: Record<string, string | number>;
  nodes: IconNode[];
}

/** Name -> data, as passed from server components down to client components. */
export type IconMap = Record<string, IconData>;

function renderNodes(nodes: IconNode[]): ReactElement[] {
  return nodes.map(([tag, attrs, children], index) =>
    createElement(tag, { key: index, ...attrs }, children ? renderNodes(children) : undefined)
  );
}

/** Renders icon data as an inline <svg> that inherits the surrounding text colour. */
export function IconSvg({ data, className }: { data: IconData; className?: string }) {
  return createElement(
    'svg',
    {
      ...data.attrs,
      width: '1em',
      height: '1em',
      className,
      'aria-hidden': true,
      focusable: 'false',
    },
    renderNodes(data.nodes)
  );
}

/**
 * Renders `data` if present, otherwise the fallback element (e.g. a lucide icon
 * imported directly) with the same className.
 */
export function renderIcon(
  data: IconData | null | undefined,
  fallback: ReactElement<{ className?: string }>,
  className?: string
): ReactElement {
  return data ? createElement(IconSvg, { data, className }) : cloneElement(fallback, { className });
}
