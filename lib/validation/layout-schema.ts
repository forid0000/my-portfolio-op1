/**
 * Validation schema for POST /api/admin/content/layout. Only `id`/`isEnabled`/
 * `order` are ever accepted - `label` is always re-derived from
 * SECTION_REGISTRY by mergeLayoutSections() (default "strip" mode drops
 * anything else a client sends), so the registry in code stays the single
 * source of truth for section identity. `isEnabled` defaults to `true` at
 * the schema level too, so even a malformed/partial payload can never
 * persist a hidden section as a side effect of validation.
 */
import { z } from 'zod';

export const portfolioSectionSchema = z.object({
  id: z.string().min(1),
  isEnabled: z.boolean().default(true),
  order: z.number().default(0),
});

export const layoutContentSchema = z.object({
  sections: z.array(portfolioSectionSchema).default([]),
});
