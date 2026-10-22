import { createCollectionHandlers } from '@/lib/api/collection-crud';
import { serviceItemSchema } from '@/lib/validation/section-schemas';

export const { GET, POST, PATCH, DELETE } = createCollectionHandlers(
  'services',
  serviceItemSchema,
  {
    getPublicIds: (doc) => [doc.banner?.public_id],
  }
);
