import { createCollectionHandlers } from '@/lib/api/collection-crud';
import { educationItemSchema } from '@/lib/validation/section-schemas';

export const { GET, POST, PATCH, DELETE } = createCollectionHandlers(
  'education',
  educationItemSchema
);
