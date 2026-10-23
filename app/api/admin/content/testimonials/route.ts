import { createCollectionHandlers } from '@/lib/api/collection-crud';
import { testimonialItemSchema } from '@/lib/validation/section-schemas';

export const { GET, POST, PATCH, DELETE } = createCollectionHandlers(
  'testimonials',
  testimonialItemSchema,
  { mediaFields: ['avatar'] }
);
