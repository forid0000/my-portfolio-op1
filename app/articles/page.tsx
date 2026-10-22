// /app/blog/page.tsx

// ISR instead of force-dynamic: Dev.to content is external (can't be purely
// on-demand), so cache the rendered page and refresh every 30 min. Crawlers then
// hit cached HTML instead of re-rendering per request (Fluid Active CPU win).
export const revalidate = 1800;

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Terminal, Calendar, Clock, Heart, MessageCircle, Hash } from 'lucide-react';
import type { Metadata } from 'next';
import FeaturedCarousel from '@/components/blog/featured-carousel'; // <--- IMPORT THIS
import connectToDatabase from '@/lib/db';
import { safeJsonLd } from '@/lib/json-ld';
import { DEFAULT_DEVTO_USERNAME } from '@/lib/content-defaults';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';

// === TYPES ===
interface User {
  name: string;
  username: string;
  profile_image_90: string;
}

interface BlogPost {
  id: number;
  title: string;
  description: string;
  slug: string;
  published_at: string;
  tag_list: string[];
  reading_time_minutes: number;
  cover_image: string | null;
  public_reactions_count: number;
  comments_count: number;
  user: User;
  url: string;
}

// === API FETCH ===
async function getBlogPosts(username: string): Promise<BlogPost[]> {
  // No username configured (Admin -> Section Texts): show the empty state
  // instead of querying Dev.to, whose API would return other people's posts.
  if (!username) return [];

  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${encodeURIComponent(username)}`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) {
      console.error('Failed to fetch Dev.to posts');
      return [];
    }

    return res.json();
  } catch (error) {
    console.error('Failed to reach Dev.to', error);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  let devToUsername: string = DEFAULT_DEVTO_USERNAME;
  let canonicalTarget: 'devto' | 'self' = 'devto';
  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'headings_content' });
    if (doc?.devToUsername) devToUsername = doc.devToUsername;
    if (doc?.articlesCanonicalTarget === 'self') canonicalTarget = 'self';
  } catch (error) {}

  const [posts, identity] = await Promise.all([getBlogPosts(devToUsername), getSiteIdentity()]);

  // The root layout's title template appends the site name to `title`.
  const title = 'Articles';
  const socialTitle = `Articles | ${identity.siteName}`;
  const description =
    'Technical articles, tutorials, and insights on Full-Stack Development & DevOps.';
  const localUrl = `${SITE_URL}/articles`;
  const devToProfile = `https://dev.to/${devToUsername}`;

  return {
    title,
    description,
    keywords: ['blog', 'full-stack development', 'devops', 'coding'],
    authors: [{ name: identity.personName }],
    alternates: {
      canonical: canonicalTarget === 'self' || !devToUsername ? localUrl : devToProfile,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: localUrl,
      images: posts[0]?.cover_image ? [{ url: posts[0].cover_image, alt: posts[0].title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: posts[0]?.cover_image ? [posts[0].cover_image] : [],
    },
  };
}

// === MAIN PAGE COMPONENT ===
export default async function BlogPage() {
  let textContent = {
    articlesBadge: 'Fetching Articles From Online...',
    articlesHeading: 'articles',
    articlesSubtext: 'Documenting my journey through code, infrastructure, and bugs.',
    articlesRecentUploads: 'Recent Uploads',
    articlesEmptyAPI: 'No packets received. API might be down.',
    devToUsername: DEFAULT_DEVTO_USERNAME as string,
  };

  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'headings_content' });
    if (doc) {
      if (doc.articlesBadge) textContent.articlesBadge = doc.articlesBadge;
      if (doc.articlesHeading) textContent.articlesHeading = doc.articlesHeading;
      if (doc.articlesSubtext) textContent.articlesSubtext = doc.articlesSubtext;
      if (doc.articlesRecentUploads) textContent.articlesRecentUploads = doc.articlesRecentUploads;
      if (doc.articlesEmptyAPI) textContent.articlesEmptyAPI = doc.articlesEmptyAPI;
      if (doc.devToUsername) textContent.devToUsername = doc.devToUsername;
    }
  } catch (error) {
    console.error('Failed to fetch dynamic text', error);
  }

  const [posts, identity] = await Promise.all([
    getBlogPosts(textContent.devToUsername),
    getSiteIdentity(),
  ]);

  // Get top 5 posts for the slider
  const featuredPosts = posts.slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/articles`,
        name: `Articles | ${identity.siteName}`,
        description:
          'Technical articles, tutorials, and insights on Full-Stack Development & DevOps.',
        url: `${SITE_URL}/articles`,
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        hasPart: posts.map((post) => ({
          '@type': 'Article',
          headline: post.title,
          url: `${SITE_URL}/articles/${post.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Articles',
            item: `${SITE_URL}/articles`,
          },
        ],
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {/* === HEADER SECTION === */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-2">
              {textContent.articlesBadge}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-mono">
              ~/{textContent.articlesHeading}
              <span className="animate-pulse text-primary">_</span>
            </h1>

            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              <span className="text-primary font-mono mr-2">&gt;</span>
              {textContent.articlesSubtext}
            </p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-2 text-sm font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span>Total Posts: {posts.length}</span>
            </div>
            <div className="h-px w-24 bg-border/50" />
            <div className="">
              Latest:{' '}
              {posts[0]?.published_at ? format(new Date(posts[0].published_at), 'MMM d') : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* === FEATURED SLIDER === */}
      {/* Pass the top 5 posts to the slider */}
      {featuredPosts.length > 0 && <FeaturedCarousel posts={featuredPosts} />}

      {/* Separator */}
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-2xl font-bold font-mono">{textContent.articlesRecentUploads}</h3>
        <div className="h-px bg-border/40 flex-1"></div>
      </div>

      {/* === POSTS GRID === */}
      {posts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/50 rounded-xl">
          <Terminal className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">{textContent.articlesEmptyAPI}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              href={`/articles/${post.slug}`}
              key={post.id}
              className="group flex flex-col h-full bg-card md:bg-card/30 md:backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden hover:border-primary/50 hover:bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
            >
              {/* === COVER IMAGE === */}
              <div className="aspect-video relative w-full bg-muted/20 overflow-hidden">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    // Priority only for the very first item if needed, but slider handles LCP now
                    priority={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    <Terminal className="w-12 h-12 text-primary/20" />
                  </div>
                )}

                {/* Tags Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
                  {post.tag_list.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-black/60 backdrop-blur-md border border-white/10 rounded text-white/90 shadow-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* === CARD CONTENT === */}
              <div className="flex flex-col flex-1 p-6">
                {/* Meta Row: Date & Time */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/50 text-secondary-foreground">
                    <Clock className="w-3 h-3" />
                    {post.reading_time_minutes} min
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed">
                  {post.description}
                </p>

                {/* === FOOTER: Author & Stats === */}
                <div className="pt-5 mt-auto border-t border-border/40 flex items-center justify-between">
                  {/* Author Info */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border/50">
                      <Image
                        src={post.user.profile_image_90}
                        alt={post.user.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground/80 font-mono group-hover:text-foreground transition-colors">
                      {post.user.name.slice(0, 25)}{' '}
                    </span>
                  </div>

                  {/* Reactions & Comments */}
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{post.public_reactions_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
