'use client';

import { use } from 'react';
import ArticleEditor from '@/components/admin/article-editor';

/** /administrator/articles/new writes a new article; any other id edits that article. */
export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ArticleEditor key={id} id={id} />;
}
