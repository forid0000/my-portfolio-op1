/**
 * Central section registry: what sections exist, their default order/labels,
 * and which public component renders each one. Stored as the `layout_content`
 * document in portfolio_cms.homepage (decoupled from `global_content` - see
 * lib/site.ts - so editing brand/socials can never race with reordering
 * sections, and vice versa).
 *
 * Adding a brand new section to the product is: one entry in SECTION_REGISTRY,
 * one entry in SECTION_COMPONENT_MAP, one entry in app/page.tsx's sectionProps
 * lookup. No database migration.
 */
import type { ComponentType } from 'react';
import dynamicImport from 'next/dynamic';
import Hero from '@/components/hero';
import About from '@/components/about';
import Experience from '@/components/experience';
import Skills from '@/components/skills';
import Projects from '@/components/projects';
import IndustryExpertise from '@/components/industry-expertise';
import TechStacks from '@/components/tech-stacks';
import connectToDatabase from '@/lib/db';
import { CACHE_TTL_MS } from '@/lib/cache-ttl';

// Below-the-fold sections: still server-rendered for SEO, but their client JS
// is code-split into separate chunks so the initial bundle stays small.
const AchievementsGallery = dynamicImport(() => import('@/components/achievements-gallery'));
const Roadmap = dynamicImport(() => import('@/components/roadmap'));
const ContactForm = dynamicImport(() => import('@/components/contact-form'));
const Education = dynamicImport(() => import('@/components/education'));
const Certifications = dynamicImport(() => import('@/components/certifications'));
const Testimonials = dynamicImport(() => import('@/components/testimonials'));
const Services = dynamicImport(() => import('@/components/services'));
const Publications = dynamicImport(() => import('@/components/publications'));

/** Persisted/runtime shape - what a stored `layout_content.sections[]` entry looks like. */
export interface PortfolioSectionConfig {
  id: string;
  label: string;
  isEnabled: boolean;
  order: number;
}

/** Compile-time catalog entry. `isSystemConfig` is admin-UI metadata only (a "Core" badge) - not an enforcement mechanism. */
interface SectionRegistryEntry {
  id: string;
  label: string;
  order: number;
  isSystemConfig: boolean;
}

/**
 * The canonical list of built-in sections, in default render order. `kits` is
 * a route-level toggle (nav link + the entire /kits tree), not a section
 * stacked into the homepage flow - it has a registry entry so it's manageable
 * from the same admin board, but has no entry in SECTION_COMPONENT_MAP and is
 * excluded from the render loop by getRenderableSections().
 */
export const SECTION_REGISTRY: SectionRegistryEntry[] = [
  { id: 'hero', label: 'Hero', order: 0, isSystemConfig: true },
  { id: 'about', label: 'About', order: 1, isSystemConfig: true },
  { id: 'education', label: 'Education', order: 2, isSystemConfig: true },
  { id: 'experience', label: 'Experience', order: 3, isSystemConfig: true },
  { id: 'certifications', label: 'Certifications', order: 4, isSystemConfig: true },
  { id: 'skills', label: 'Skills', order: 5, isSystemConfig: true },
  { id: 'expertises', label: 'Industry Expertise', order: 6, isSystemConfig: true },
  { id: 'techStacks', label: 'Tech Stacks', order: 7, isSystemConfig: true },
  { id: 'services', label: 'Services', order: 8, isSystemConfig: true },
  { id: 'projects', label: 'Projects', order: 9, isSystemConfig: true },
  { id: 'publications', label: 'Publications', order: 10, isSystemConfig: true },
  { id: 'testimonials', label: 'Testimonials', order: 11, isSystemConfig: true },
  { id: 'roadmap', label: 'Roadmap', order: 12, isSystemConfig: true },
  { id: 'gallery', label: 'Gallery', order: 13, isSystemConfig: true },
  { id: 'contact', label: 'Contact', order: 14, isSystemConfig: true },
  { id: 'kits', label: 'Kits (/kits)', order: 15, isSystemConfig: true },
];

export function getRegistryEntry(id: string): SectionRegistryEntry | undefined {
  return SECTION_REGISTRY.find((r) => r.id === id);
}

export const SECTION_DEFAULTS: PortfolioSectionConfig[] = SECTION_REGISTRY.map((r) => ({
  id: r.id,
  label: r.label,
  order: r.order,
  isEnabled: true,
}));

/**
 * Canonical id -> public component map. Every id here (except `kits`, which
 * is route-level) must have a matching entry in app/page.tsx's `sectionProps`
 * lookup, since these components take heterogeneous props (Hero needs
 * `global`, Projects needs `githubUrl`, the five collection-backed sections
 * just need `content`) that a single uniform prop shape can't express.
 */
export const SECTION_COMPONENT_MAP: Record<string, ComponentType<any>> = {
  hero: Hero,
  about: About,
  education: Education,
  experience: Experience,
  certifications: Certifications,
  skills: Skills,
  expertises: IndustryExpertise,
  techStacks: TechStacks,
  services: Services,
  projects: Projects,
  publications: Publications,
  testimonials: Testimonials,
  roadmap: Roadmap,
  gallery: AchievementsGallery,
  contact: ContactForm,
};

/**
 * Merge a stored `sections` array over the registry: only `isEnabled`/`order`
 * are trusted from storage (matched by `id`); `label` always comes from code.
 * A registry id missing from storage (new section added after the admin's
 * last save) defaults to enabled at its registry order; a stored id no
 * longer in the registry (section removed from the codebase) is dropped.
 * Returns the list pre-sorted ascending by `order`.
 */
export function mergeLayoutSections(stored: unknown): PortfolioSectionConfig[] {
  const storedById = new Map<string, { isEnabled?: boolean; order?: number }>(
    Array.isArray(stored) ? stored.map((s: any) => [s.id, s]) : []
  );
  return SECTION_REGISTRY.map((def) => {
    const saved = storedById.get(def.id);
    return {
      id: def.id,
      label: def.label,
      isEnabled: typeof saved?.isEnabled === 'boolean' ? saved.isEnabled : true,
      order: typeof saved?.order === 'number' ? saved.order : def.order,
    };
  }).sort((a, b) => a.order - b.order);
}

// Short in-process cache so the public homepage (rendered on every request)
// doesn't hit MongoDB just for the layout doc on top of everything else it
// already fetches. Admin saves invalidate it.
let cache: { value: PortfolioSectionConfig[]; at: number } | null = null;

export function invalidateLayoutCache() {
  cache = null;
}

/**
 * Server-side, TTL-cached, fail-safe read of the layout doc. If the database
 * is unreachable or the doc has never been saved, falls back to
 * SECTION_DEFAULTS - every section present, enabled, in registry order - so
 * the public homepage never renders a blank page because of a DB hiccup.
 */
export async function getLayoutSections(): Promise<PortfolioSectionConfig[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let value = SECTION_DEFAULTS;
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'layout_content' });
    value = mergeLayoutSections(doc?.sections);
  } catch (error) {
    console.error('Failed to fetch layout_content, using defaults', error);
    value = SECTION_DEFAULTS;
  }
  cache = { value, at: Date.now() };
  return value;
}

/**
 * The rendering pipeline: sort ascending by `order` (already true coming out
 * of mergeLayoutSections, re-asserted here defensively), filter out disabled
 * sections, and exclude the route-level `kits` entry - it controls nav/routing,
 * not a position in the vertical page stack.
 */
export function getRenderableSections(
  sections: PortfolioSectionConfig[]
): PortfolioSectionConfig[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.isEnabled && s.id !== 'kits');
}

export function isSectionEnabled(sections: PortfolioSectionConfig[], id: string): boolean {
  return sections.find((s) => s.id === id)?.isEnabled ?? true;
}
