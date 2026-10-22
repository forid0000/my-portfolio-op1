import { cache } from 'react';
import connectToDatabase from '@/lib/db';
import type { KitTool } from '@/lib/kits-registry';

/**
 * Server-only: read one tool's admin-edited identity (name/description/icon/color) by key.
 * Wrapped in React.cache so generateMetadata() and the page component (which both call this
 * for the same tool within one request) share a single DB query instead of two.
 */
export const getToolContent = cache(async function getToolContent(
  key: string
): Promise<KitTool | null> {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'kits_content' });
    const tools: any[] = Array.isArray(doc?.tools) ? doc.tools : [];
    const tool = tools.find((t) => t?.key === key);
    if (!tool) return null;
    return {
      key,
      name: typeof tool.name === 'string' ? tool.name : '',
      description: typeof tool.description === 'string' ? tool.description : '',
      icon: typeof tool.icon === 'string' ? tool.icon : '',
      accentColor: typeof tool.accentColor === 'string' ? tool.accentColor : '',
    };
  } catch {
    return null;
  }
});
