import { createElement } from 'react';
import { Code } from 'lucide-react';
import { resolveUniversalIcon } from '@/lib/universal-icon';

/**
 * Renders a CMS-supplied lucide icon name, falling back to a generic Code
 * glyph when it's empty or unrecognized - a bad/typo'd admin entry degrades
 * gracefully instead of crashing the section. Works in both server and
 * client components (no hooks, no 'use client').
 */
export function DynamicLucideIcon({ name, className }: { name?: string; className?: string }) {
  return createElement(resolveUniversalIcon(name) ?? Code, { className });
}
