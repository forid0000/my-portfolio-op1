/**
 * Validation for POST /api/admin/content/chrome (navigation and visibility settings). Built-in
 * links are matched by id and only their label / on-off state is stored; custom links must carry
 * a safe address (https, mailto, tel, or a path on this site), never `javascript:`.
 */
import { z } from 'zod';
import { isSafeHref, normalizeLink } from '@/lib/safe-href';
import { CUSTOM_NAV_PREFIX, NAV_LABEL_MAX, NAV_MAX_ENTRIES } from '@/lib/chrome-model';

const navEntrySchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Invalid link id'),
    label: z.string().trim().min(1, 'Give the link a name').max(NAV_LABEL_MAX),
    enabled: z.boolean(),
    href: z.string().trim().max(500).transform(normalizeLink).optional(),
    newTab: z.boolean().optional(),
  })
  .superRefine((entry, ctx) => {
    if (entry.id.startsWith(CUSTOM_NAV_PREFIX) && !isSafeHref(entry.href)) {
      ctx.addIssue({
        code: 'custom',
        path: ['href'],
        message: 'Enter a full web address such as https://example.com, or a path like /about',
      });
    }
  });

export const chromeContentSchema = z.object({
  nav: z.array(navEntrySchema).max(NAV_MAX_ENTRIES),
  floatingContact: z.boolean(),
  hero: z.object({ resume: z.boolean(), socials: z.boolean() }),
  footer: z.object({
    brand: z.boolean(),
    explore: z.boolean(),
    connect: z.boolean(),
    copyright: z.boolean(),
    location: z.boolean(),
    adminLink: z.boolean(),
  }),
});
