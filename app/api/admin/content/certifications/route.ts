import { createCollectionHandlers } from '@/lib/api/collection-crud';
import { certificationItemSchema } from '@/lib/validation/section-schemas';

export const { GET, POST, PATCH, DELETE } = createCollectionHandlers(
  'certifications',
  certificationItemSchema,
  { getPublicIds: (doc) => [doc.badge?.public_id] }
);
