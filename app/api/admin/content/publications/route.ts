import { createCollectionHandlers } from '@/lib/api/collection-crud';
import { publicationItemSchema } from '@/lib/validation/section-schemas';

export const { GET, POST, PATCH, DELETE } = createCollectionHandlers(
  'publications',
  publicationItemSchema
);
