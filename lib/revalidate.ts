import { revalidatePath } from 'next/cache';

/**
 * On-demand revalidation helpers for the "static + on-demand" architecture.
 *
 * Public pages are built fully static (`export const revalidate = false`) so
 * they never regenerate on a timer — which is what previously burned the Vercel
 * free-tier ISR-Write budget. The admin save routes call these after a
 * successful write, so a page refreshes only when its content actually changes:
 * roughly one ISR write per real edit instead of hundreds of timer writes/day.
 */

/**
 * Refresh the homepage. Almost every CMS collection (hero, about, projects,
 * gallery, the independent entity sections, theme, SEO, brand, the active
 * avatar) is rendered on `/`, so a content edit revalidates it.
 *
 * Deliberately scoped to the homepage — NOT a site-wide `revalidatePath('/',
 * 'layout')`. That would regenerate all ~40 pages on every save, a write burst
 * that defeats the whole free-tier fix. Secondary pages (/articles, /notes,
 * /kits) that happen to reuse a value refresh on their own ISR cycle or on the
 * next deploy; that eventual-consistency is an acceptable trade for near-zero
 * writes on a personal site.
 */
export function revalidatePublicContent() {
  revalidatePath('/');
}

/**
 * Refresh the kits subtree. Kit tools live under `/kits` and read their content
 * from a layout-level `kits_content` doc (`app/kits/layout.tsx`), which the
 * homepage does not render — so kit edits revalidate that subtree only.
 */
export function revalidateKitsContent() {
  revalidatePath('/kits', 'layout');
}

/**
 * Refresh every statically generated page that renders the shared site chrome:
 * the header (brand, avatar, nav toggles), the footer (socials, location), and the
 * theme variables in the root layout. That is the homepage plus the /kits, /articles
 * and public /notes trees. Used by the few admin routes whose data appears on all of them
 * (global settings, section layout, avatar, theme); content that only the homepage
 * shows keeps using the cheaper revalidatePublicContent().
 */
export function revalidateSiteChrome() {
  revalidatePath('/');
  revalidatePath('/kits', 'layout');
  revalidatePath('/articles', 'layout');
  revalidatePath('/notes', 'layout');
}

/**
 * Refresh the article index and one article page after a write. `slug` is the article's current
 * address; pass the previous one too when it changed so the old page stops being served.
 */
export function revalidateArticleIndex(...slugs: (string | null | undefined)[]) {
  revalidatePath('/articles');
  revalidatePath('/articles/rss.xml');
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/articles/${slug}`);
  }
}

/**
 * Refresh the public notes page and the pages that list published notes. `slugs` are the
 * addresses whose own page changed (pass the old one too when a note was renamed or unpublished).
 */
export function revalidateNotes(...slugs: (string | null | undefined)[]) {
  revalidatePath('/notes');
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/notes/${slug}`);
  }
}
