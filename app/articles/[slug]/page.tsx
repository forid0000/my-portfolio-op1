// ISR instead of force-dynamic: Dev.to content is external, so cache each post
// and refresh every 30 min. New slugs generate on first hit then serve cached,
// so repeat crawler traffic costs near-zero Fluid Active CPU.
export const revalidate = 1800;

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageCircle,
  Heart,
  Terminal,
  User,
  Hash,
  Share2,
} from 'lucide-react';
import type { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import { safeJsonLd } from '@/lib/json-ld';
import { ARTICLE_TEXT_DEFAULTS, DEFAULT_DEVTO_USERNAME } from '@/lib/content-defaults';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';
import {
  getApprovedComments,
  getArticleSettings,
  getArticleTexts,
  getPublishedArticle,
  getPublishedArticles,
  type ArticleView,
} from '@/lib/articles';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { withTransformation } from '@/lib/cloudinary-url';
import type { ArticleCardItem } from '@/lib/articles-model';
import NativeArticle from '@/components/articles/native-article';
// import ShareButton from "@/components/share-button";

// Declaring (an empty list of) static params makes every article page a cached, fully rendered
// page generated on first visit instead of a streamed one. That is what lets an unknown or
// unpublished address answer with a real 404 status, which search engines need.
export function generateStaticParams() {
  return [];
}

// === TYPES ===
interface BlogPost {
  id: number;
  title: string;
  description: string;
  slug: string;
  published_at: string;
  reading_time_minutes: number;
  public_reactions_count: number;
  comments_count: number; // Added
  cover_image: string | null;
  tags: string[]; // Note: In single post API, 'tags' is the array, 'tag_list' is a string
  url: string;
  canonical_url: string;
  body_html: string;

  user: {
    name: string;
    username: string;
    profile_image_90: string;
  };
}

// === API FETCH ===
async function getPost(username: string, slug: string): Promise<BlogPost | null> {
  // No Dev.to username configured -> no articles to show.
  if (!username) return null;

  try {
    const res = await fetch(
      `https://dev.to/api/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// === ARTICLES WRITTEN ON THIS SITE ===
async function nativeMetadata(article: ArticleView): Promise<Metadata> {
  const identity = await getSiteIdentity();
  const url = `${SITE_URL}/articles/${article.slug}`;
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const image = article.cover
    ? withTransformation(article.cover.src, 'c_fill,g_auto,w_1200,h_630,q_auto,f_jpg')
    : null;
  return {
    title,
    description,
    keywords: article.tags.length ? article.tags.join(', ') : undefined,
    authors: [{ name: identity.personName }],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: identity.siteName,
      type: 'article',
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: [identity.personName],
      tags: article.tags,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: article.cover?.alt || title }]
        : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : [],
    },
    robots: { index: true, follow: true },
  };
}

async function renderNative(article: ArticleView) {
  const [identity, avatar, comments, settings, all, { texts }] = await Promise.all([
    getSiteIdentity(),
    getActiveAvatarUrl(),
    getApprovedComments(article.id),
    getArticleSettings(),
    getPublishedArticles(40),
    getArticleTexts(),
  ]);
  const author = { name: identity.personName, image: avatar };

  // Other articles that share a tag come first, then the newest ones.
  const others = all.filter((a) => a.id !== article.id);
  const shared = others.filter((a) => a.tags.some((t) => article.tags.includes(t)));
  const related: ArticleCardItem[] = [...shared, ...others.filter((a) => !shared.includes(a))]
    .slice(0, 3)
    .map((a) => ({
      key: `own-${a.id}`,
      href: `/articles/${a.slug}`,
      title: a.title,
      description: a.excerpt,
      cover: a.cover
        ? withTransformation(a.cover.src, 'c_fill,g_auto,w_1200,h_675,q_auto,f_auto')
        : null,
      tags: a.tags,
      publishedAt: a.publishedAt,
      minutes: a.readingMinutes,
      reactions: Object.values(a.reactionTotals).reduce((x, y) => x + y, 0),
      comments: a.commentCount,
      author,
      source: 'native' as const,
    }));

  return (
    <NativeArticle
      article={article}
      author={author}
      comments={comments}
      settings={settings}
      related={related}
      texts={texts}
    />
  );
}

// === DYNAMIC METADATA ===
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const native = await getPublishedArticle(slug);
  if (native) return nativeMetadata(native);

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

  const [post, identity] = await Promise.all([getPost(devToUsername, slug), getSiteIdentity()]);

  // An address that matches nothing is a real 404 (search engines get the status code, not
  // just a "not found" page with a 200).
  if (!post) notFound();

  const localUrl = `${SITE_URL}/articles/${slug}`;

  return {
    // The root layout's title template appends the site name.
    title: post.title,
    description: post.description,
    keywords: post.tags.join(', '),
    authors: [{ name: post.user.name }],
    alternates: { canonical: canonicalTarget === 'self' ? localUrl : post.canonical_url },
    openGraph: {
      title: post.title,
      description: post.description,
      url: localUrl,
      siteName: identity.siteName,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.published_at, // Assuming no edits
      authors: [post.user.name],
      images: post.cover_image ? [{ url: post.cover_image, alt: post.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.cover_image ? [post.cover_image] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// === PAGE COMPONENT ===
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const native = await getPublishedArticle(slug);
  if (native) return renderNative(native);

  const textContent = {
    ...ARTICLE_TEXT_DEFAULTS,
    devToUsername: DEFAULT_DEVTO_USERNAME as string,
    articlesCanonicalTarget: 'devto' as 'devto' | 'self',
  };

  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'headings_content' });
    if (doc) {
      if (doc.articlesGoBack) textContent.articlesGoBack = doc.articlesGoBack;
      if (doc.articlesAuthor) textContent.articlesAuthor = doc.articlesAuthor;
      if (doc.articlesReadTime) textContent.articlesReadTime = doc.articlesReadTime;
      if (doc.articlesEnjoyed) textContent.articlesEnjoyed = doc.articlesEnjoyed;
      if (doc.articlesDiscuss) textContent.articlesDiscuss = doc.articlesDiscuss;
      if (doc.articlesDiscussBtn) textContent.articlesDiscussBtn = doc.articlesDiscussBtn;
      if (doc.articlesEndOfFile) textContent.articlesEndOfFile = doc.articlesEndOfFile;
      if (doc.devToUsername) textContent.devToUsername = doc.devToUsername;
      if (doc.articlesCanonicalTarget === 'self') textContent.articlesCanonicalTarget = 'self';
    }
  } catch (error) {}

  const [post, identity] = await Promise.all([
    getPost(textContent.devToUsername, slug),
    getSiteIdentity(),
  ]);

  if (!post) {
    notFound();
  }

  // The Dev.to body is a large raw HTML blob with many inline <img> tags that
  // otherwise all load eagerly. Mark them lazy + async-decoding so only the
  // images near the viewport fetch on load — the cover above stays priority.
  const bodyHtml = post.body_html.replace(/<img\s/gi, '<img loading="lazy" decoding="async" ');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 py-12">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-sm terminal:font-mono text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {textContent.articlesGoBack}
        </Link>
        <div className="hidden sm:terminal:flex items-center gap-2 text-xs font-mono text-muted-foreground/50">
          <Terminal className="w-3 h-3" />
          <span>/articles/{slug.substring(0, 20)}...</span>
        </div>
      </div>

      <article>
        {/* === HEADER STATS === */}
        <div className="space-y-6 mb-10">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/5 border border-primary/20 rounded terminal:font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Author & Meta Grid */}
          <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm shadow-xl shadow-black/20 text-sm">
            {/* Author */}
            <a
              href={`https://dev.to/${post.user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 pr-6 sm:border-r border-border/40 hover:opacity-75 transition-opacity"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/20">
                <Image
                  src={post.user.profile_image_90}
                  alt={post.user.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col leading-none gap-1">
                <span className="font-bold text-foreground hover:text-primary transition-colors">
                  {post.user.name}
                </span>
                <span className="text-[10px] text-muted-foreground terminal:font-mono">
                  {textContent.articlesAuthor}
                </span>
              </div>
            </a>

            {/* Date */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
              </span>
            </div>

            {/* Read Time */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {post.reading_time_minutes} {textContent.articlesReadTime}
              </span>
            </div>

            {/* Stats Badge */}
            <div className="ml-auto flex items-center gap-4">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-destructive terminal:font-mono text-xs bg-destructive/5 px-2 py-1 rounded-full border border-destructive/10 hover:bg-destructive/10 hover:scale-105 transition-all"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{post.public_reactions_count}</span>
              </a>
              <a
                href={`${post.url}#comments`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-info terminal:font-mono text-xs bg-info/5 px-2 py-1 rounded-full border border-info/10 hover:bg-info/10 hover:scale-105 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{post.comments_count}</span>
              </a>
              {/* <ShareButton slug={post.slug} /> */}
            </div>
          </div>
        </div>
        {/*SEO content*/}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.description,
              image: post.cover_image ? [post.cover_image] : [],
              datePublished: post.published_at,
              dateModified: post.published_at,
              author: {
                '@type': 'Person',
                name: post.user.name,
                image: post.user.profile_image_90,
              },
              publisher: {
                '@type': 'Organization',
                name: identity.siteName,
                logo: {
                  '@type': 'ImageObject',
                  url: post.user.profile_image_90,
                },
              },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id':
                  textContent.articlesCanonicalTarget === 'self'
                    ? `${SITE_URL}/articles/${post.slug}`
                    : post.url,
              },
              wordCount: Math.ceil(post.reading_time_minutes * 200), // Approximate
              keywords: post.tags.join(', '),
            }),
          }}
        />

        {/* === COVER IMAGE === */}
        {post.cover_image && (
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_40px_-15px_color-mix(in_srgb,var(--primary)_30%,transparent)] mb-12 group">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Scanline Effect Overlay (Optional aesthetic) */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 border border-foreground/5 rounded-2xl mix-blend-overlay pointer-events-none" />
          </div>
        )}

        {/* === CONTENT BODY === */}
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:scroll-mt-24
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4
            prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-sm
            prose-pre:bg-scrim/80 prose-pre:backdrop-blur-xl prose-pre:border prose-pre:border-border/50 prose-pre:shadow-2xl prose-pre:shadow-black/50 prose-pre:rounded-xl
            prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-muted-foreground
            [&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none
            [&_.highlight__panel]:hidden [&_.highlight-action]:hidden [&_.clipboard-button]:hidden [&_button]:hidden
            prose-img:rounded-2xl prose-img:border prose-img:border-border/50 prose-img:shadow-2xl
            [&_hr]:w-64 [&_hr]:mx-auto [&_hr]:border-t-2 [&_hr]:border-primary/50 [&_hr]:my-12 [&_hr]:rounded-full
            marker:text-primary"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {/* === FOOTER === */}
        <div className="mt-16 pt-8 border-t border-border/40">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/30 p-6 rounded-xl border border-border/50">
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-lg">{textContent.articlesEnjoyed}</h3>
              <p className="text-sm text-muted-foreground">{textContent.articlesDiscuss}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Discuss Button (Keeps pointing to Dev.to) */}
              <Link
                href={post.url}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" />
                {textContent.articlesDiscussBtn}
              </Link>

              {/* NEW Share Button (Copies YOUR local blog URL) */}
              {/* <ShareButton slug={post.slug} /> */}
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground terminal:font-mono opacity-50">
            {textContent.articlesEndOfFile}
          </div>
        </div>
      </article>
    </div>
  );
}
