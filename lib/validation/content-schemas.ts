/**
 * Zod schemas for the admin CMS content routes (app/api/admin/content/**).
 *
 * These mirror the exact fields each route persists to MongoDB. Every schema
 * uses plain `z.object({...})` (default "strip" mode) - NOT `.strict()` -
 * so unknown/extra keys sent by the client (e.g. `_id`, `type`, `updatedAt`
 * echoed back from a GET response into a POST body) are silently dropped
 * rather than causing a parse failure. This is what actually closes the
 * "arbitrary key injection into $set" hole while keeping existing editor
 * pages working unmodified.
 */
import { z } from 'zod';
import { isSafeHref } from '@/lib/safe-href';
import { whatsappHref } from '@/lib/contact-links';
import { mediaListSchema } from '@/lib/validation/media-schemas';
import { KITS_COLOR_MAP } from '@/lib/kits-registry';

/** hero_content - app/api/admin/content/homepage/route.ts */
export const heroContentSchema = z.object({
  greeting: z.string(),
  aiPhrases: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  subtitle: z.string(),
  description: z.string(),
});

/** about_content - app/api/admin/content/about/route.ts */
export const aboutContentSchema = z.object({
  bioText: z.string(),
  quote: z.string(),
  statusTitle: z.string(),
  statusLabel: z.string(),
  kernelValue: z.string(),
  uptimeValue: z.string(),
  whatIDo: z.array(
    z.object({
      title: z.string(),
      desc: z.string(),
    })
  ),
  stats: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      icon: z.string(),
    })
  ),
});

/** experience_content - app/api/admin/content/experience/route.ts */
export const experienceContentSchema = z.object({
  experiences: z.array(
    z.object({
      role: z.string(),
      displayRole: z.string(),
      company: z.string(),
      type: z.string(),
      period: z.string(),
      location: z.string(),
      description: z.string(),
      skills: z.array(z.string()),
    })
  ),
});

/** skills_content - app/api/admin/content/skills/route.ts */
export const skillsContentSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      icon: z.string(),
      skills: z.array(
        z.object({
          name: z.string(),
          progress: z.number().min(0).max(100),
        })
      ),
    })
  ),
});

/** A labelled link on a project card (case study, live site, Behance, repository, ...). */
export const projectLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().max(500).refine(isSafeHref, 'Use a full link such as https://example.com'),
});

/** projects_content - app/api/admin/content/projects/route.ts */
export const projectsContentSchema = z.object({
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      // Legacy single links, kept so documents and clients from before `links` still work.
      github: z.string().default(''),
      demo: z.string().default(''),
      tags: z.array(z.string()),
      featured: z.boolean(),
      links: z.array(projectLinkSchema).max(6).optional(),
      /** Pictures and videos; index 0 is the main cover. */
      media: mediaListSchema('projects').optional(),
    })
  ),
  /** Optional button under the project grid (e.g. "View all work"); hidden when no link is set. */
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || isSafeHref(v), 'Use a full link such as https://example.com')
    .optional(),
});

/** roadmap_content - app/api/admin/content/roadmap/route.ts */
export const roadmapContentSchema = z.object({
  roadmapItems: z.array(
    z.object({
      year: z.string(),
      title: z.string(),
      description: z.string(),
      icon: z.string(),
      tech: z.array(z.string()),
    })
  ),
});

/** contact_content - app/api/admin/content/contact/route.ts */
export const adminContactContentSchema = z.object({
  heading: z.string(),
  highlight: z.string(),
  subtext: z.string(),
  phoneLabel: z.string(),
  // A number (with country code) or a link; clicking the card opens WhatsApp. Optional.
  whatsappLink: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => !v || whatsappHref(v) !== null,
      'Enter your number with the country code (for example +1 555 123 4567) or a wa.me link.'
    ),
  email: z.string().email(),
  // Shown on the card and used for "call". Optional.
  phone: z.string().trim().max(40),
});

/**
 * headings_content - app/api/admin/content/headings/route.ts
 * Mirrors DEFAULTS in app/administrator/(dashboard)/headings/page.tsx.
 * Wrapped in `.partial()` since not every save necessarily includes every key.
 */
export const headingsContentSchema = z
  .object({
    galleryHeading: z.string(),
    galleryHighlight: z.string(),
    gallerySubtext: z.string(),
    roadmapHeading: z.string(),
    roadmapHighlight: z.string(),
    projectsHeading: z.string(),
    skillsHeading: z.string(),
    experienceHeading: z.string(),
    aboutHeading: z.string(),
    expertisesHeading: z.string(),
    techStacksHeading: z.string(),
    educationHeading: z.string(),
    certificationsHeading: z.string(),
    servicesHeading: z.string(),
    publicationsHeading: z.string(),
    testimonialsHeading: z.string(),
    contactHeading: z.string(),
    contactHighlight: z.string(),
    contactSubtext: z.string(),
    articlesBadge: z.string(),
    articlesHeading: z.string(),
    articlesSubtext: z.string(),
    articlesRecentUploads: z.string(),
    articlesEmptyAPI: z.string(),
    articlesGoBack: z.string(),
    articlesAuthor: z.string(),
    articlesReadTime: z.string(),
    articlesEnjoyed: z.string(),
    articlesDiscuss: z.string(),
    articlesDiscussBtn: z.string(),
    articlesEndOfFile: z.string(),
    devToUsername: z.string(),
    articlesCanonicalTarget: z.string(),
  })
  .partial();

/**
 * kits_content - app/api/admin/content/kits/route.ts
 * accentColor is an enum derived from KITS_COLOR_MAP so it can never drift
 * from the fixed Tailwind palette that actually resolves it. icon is any
 * lucide-react name (picked via the admin IconPicker) - kits-registry's
 * renderKitIcon() resolves it dynamically with a per-tool fallback, so an
 * unrecognized name degrades gracefully instead of needing a schema change.
 */
const kitsColorKeys = Object.keys(KITS_COLOR_MAP) as [string, ...string[]];

export const kitsContentSchema = z.object({
  pageHeading: z.string(),
  pageHighlight: z.string(),
  pageSubtext: z.string(),
  exploreHeading: z.string(),
  tools: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      accentColor: z.enum(kitsColorKeys),
    })
  ),
});

/**
 * system_content - app/api/admin/content/system/route.ts
 * Mirrors the SystemData interface in app/administrator/(dashboard)/system/page.tsx.
 */
export const systemContentSchema = z.object({
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.string(),
  notFoundTitle: z.string(),
  notFoundHeading: z.string(),
  notFoundSubtext: z.string(),
  notFoundButton: z.string(),
  errorHeading: z.string(),
  errorTitle: z.string(),
  errorSubtext: z.string(),
  errorButton: z.string(),
  errorEmail: z.string().email(),
});

/** techstacks_content - app/api/admin/content/tech-stacks/route.ts */
export const techStacksContentSchema = z.object({
  content: z.object({
    row1: z.array(z.string()),
    row2: z.array(z.string()),
    row3: z.array(z.string()),
  }),
});

/** expertises_content - app/api/admin/content/expertises/route.ts */
export const expertisesContentSchema = z.object({
  content: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string(),
      skills: z.array(z.string()),
    })
  ),
});
