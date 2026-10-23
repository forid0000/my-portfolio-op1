/**
 * Zod schemas for the independent-collection sections (education, certifications,
 * testimonials, services, publications). Unlike the `homepage`-collection schemas
 * in content-schemas.ts (one type-keyed doc per section), each of these backs a
 * collection of many small documents - one per item - mirroring `gallery`.
 */
import { z } from 'zod';
import { mediaListSchema, singleMediaSchema } from '@/lib/validation/media-schemas';

/** education collection - app/api/admin/content/education/route.ts */
export const educationItemSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  current: z.boolean().default(false),
  description: z.string().default(''),
  achievements: z.array(z.string()).default([]),
  order: z.number().default(0),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

/** certifications collection - app/api/admin/content/certifications/route.ts */
export const certificationItemSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: z.string().default(''),
  expiryDate: z.string().default(''),
  credentialId: z.string().default(''),
  credentialUrl: z.string().default(''),
  badge: singleMediaSchema('certifications').optional(),
  /** Certificate scans, photos or videos; index 0 is the cover. */
  media: mediaListSchema('certifications').optional(),
  order: z.number().default(0),
});
export type CertificationItem = z.infer<typeof certificationItemSchema>;

/** testimonials collection - app/api/admin/content/testimonials/route.ts */
export const testimonialItemSchema = z.object({
  name: z.string().min(1),
  title: z.string().default(''),
  company: z.string().default(''),
  quote: z.string().min(1),
  avatar: singleMediaSchema('testimonials').optional(),
  order: z.number().default(0),
});
export type TestimonialItem = z.infer<typeof testimonialItemSchema>;

/** services collection - app/api/admin/content/services/route.ts.
 *  Icon is any lucide-react name (picked via the admin IconPicker, which
 *  searches the full icon set) rather than a closed enum - services.tsx
 *  resolves it dynamically via DynamicLucideIcon with a Code fallback, so an
 *  unrecognized name degrades gracefully instead of needing a schema change. */
export const serviceItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default(''),
  pricing: z.string().default(''),
  icon: z.string().default('Code2'),
  banner: singleMediaSchema('services').optional(),
  features: z.array(z.string()).default([]),
  ctaLabel: z.string().default(''),
  ctaLink: z.string().default(''),
  order: z.number().default(0),
});
export type ServiceItem = z.infer<typeof serviceItemSchema>;

export const PUBLICATION_TYPE_OPTIONS = [
  'article',
  'talk',
  'video',
  'opensource',
  'press',
  'podcast',
] as const;

/** publications collection - app/api/admin/content/publications/route.ts */
export const publicationItemSchema = z.object({
  title: z.string().min(1),
  type: z.enum(PUBLICATION_TYPE_OPTIONS).default('article'),
  platform: z.string().default(''),
  url: z.string().default(''),
  date: z.string().default(''),
  description: z.string().default(''),
  order: z.number().default(0),
});
export type PublicationItem = z.infer<typeof publicationItemSchema>;
