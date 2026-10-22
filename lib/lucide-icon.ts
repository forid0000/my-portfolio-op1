import type { ComponentType } from 'react';
import 'server-only';
import * as LucideIcons from 'lucide-react';

type LucideIconMap = Record<string, unknown>;

/**
 * lucide-react exports a handful of non-component utilities alongside the
 * ~1500 icons: `createLucideIcon` (the factory every icon is built from),
 * `Icon` (the shared base primitive), `icons` (a plain data object mapping
 * every name to its raw SVG path metadata - NOT a component), and `default`.
 * None of these render as a usable glyph; `icons` in particular is a
 * same-shaped object as a real icon export (`typeof === 'object'`), so a
 * naive type check alone would wrongly accept it and crash on render.
 */
const NON_ICON_EXPORTS = new Set(['createLucideIcon', 'Icon', 'icons', 'default']);

/** True for an actual lucide icon component (a forwardRef-wrapped functional component). */
function isIconComponent(value: unknown): value is ComponentType<{ className?: string }> {
  if (typeof value === 'function') return true;
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in value &&
    (value as { $$typeof: unknown }).$$typeof === Symbol.for('react.forward_ref')
  );
}

/**
 * Every lucide-react icon name, deduped to one canonical name per icon.
 * lucide-react exports two keys per icon (`Foo` and the `FooIcon` alias) plus
 * legacy rename aliases that point at the same component reference; without
 * dedup by reference, the picker's search would show 2-3x entries for the
 * same glyph. Computed once from whatever version is actually installed
 * (~1500 icons as of lucide-react 0.454) rather than a hand-maintained list,
 * so it never drifts out of sync with a lucide upgrade.
 */
export const ALL_LUCIDE_ICON_NAMES: readonly string[] = (() => {
  const byRef = new Map<unknown, string>();
  for (const key of Object.keys(LucideIcons)) {
    if (!/^[A-Z]/.test(key) || NON_ICON_EXPORTS.has(key)) continue;
    const ref = (LucideIcons as unknown as LucideIconMap)[key];
    if (!isIconComponent(ref)) continue;
    const existing = byRef.get(ref);
    if (!existing) {
      byRef.set(ref, key);
      continue;
    }
    // Prefer the non-"Icon"-suffixed alias, then the shorter name.
    const existingIsSuffixed = existing.endsWith('Icon') && existing.length > 4;
    const currentIsSuffixed = key.endsWith('Icon') && key.length > 4;
    if (existingIsSuffixed && !currentIsSuffixed) byRef.set(ref, key);
    else if (existingIsSuffixed === currentIsSuffixed && key.length < existing.length) {
      byRef.set(ref, key);
    }
  }
  return [...byRef.values()].sort();
})();
