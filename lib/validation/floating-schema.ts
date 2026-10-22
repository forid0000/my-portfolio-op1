import { z } from 'zod';

/**
 * Validation schema for POST /api/admin/content/floating, mirroring FloatingContent.
 * `icon` is any lucide-react name plus the brand marks in lib/social-icon.tsx
 * (picked via the admin IconPicker), resolved with a Mail fallback, so it
 * stays a bounded free-text string rather than an enum.
 */
const floatingItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  copyValue: z.string(),
  href: z.string(),
  icon: z.string().max(100),
});

export const floatingContentSchema = z.object({
  heading: z.string(),
  subtext: z.string(),
  buttonLabel: z.string(),
  buttonSubLabel: z.string(),
  footerText: z.string(),
  items: z.array(floatingItemSchema),
});
