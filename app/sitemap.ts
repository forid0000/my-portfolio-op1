import type { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/db';
import { DEFAULT_DEVTO_USERNAME } from '@/lib/content-defaults';
import { SITE_URL } from '@/lib/site-config';

// Sitemap generation calls the Dev.to API - cache it so crawler traffic
// (which hits /sitemap.xml far more often than a human ever would) doesn't
// re-fetch Dev.to on every request.
export const revalidate = 1800;

interface BlogPost {
  id: number;
  slug: string;
  published_at: string;
}

interface PublicNote {
  slug: string;
  updatedAt: Date | string;
  createdAt: Date | string;
}

/** Dev.to account configured in Admin -> Section Texts (empty = articles disabled). */
async function getDevToUsername(): Promise<string> {
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'headings_content' });
    return ((doc?.devToUsername as string) || DEFAULT_DEVTO_USERNAME).trim();
  } catch {
    return DEFAULT_DEVTO_USERNAME;
  }
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const username = await getDevToUsername();
  // With no username Dev.to would return other people's posts - skip entirely.
  if (!username) return [];
  try {
    const res = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(username)}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getPublicNotes(): Promise<PublicNote[]> {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');
    const docs = await collection
      .find({ published: true }, { projection: { slug: 1, updatedAt: 1, createdAt: 1 } })
      .toArray();
    return docs as unknown as PublicNote[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const buildDate = new Date();

  // Static routes
  const staticRoutes = [
    '',
    '/kits',
    '/kits/age',
    '/kits/currency',
    '/kits/password',
    '/kits/picker',
    '/kits/prayer',
    '/kits/qrcode',
    '/kits/subnet',
    '/kits/system',
    '/articles', // Include articles index
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: buildDate,
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : route === '/articles' ? 0.9 : 0.8,
  }));

  // Dynamic blog posts
  const posts = await getBlogPosts();
  const blogRoutes = posts.map((post) => ({
    url: `${baseUrl}/articles/${post.slug}`,
    lastModified: new Date(post.published_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic public notes
  const notes = await getPublicNotes();
  const noteRoutes = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    lastModified: new Date(note.updatedAt || note.createdAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes, ...noteRoutes];
}
