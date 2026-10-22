export type Note = {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  published?: boolean;
  slug?: string;
};
