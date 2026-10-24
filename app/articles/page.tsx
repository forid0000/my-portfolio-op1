// The list mixes articles written on this site (refreshed on demand whenever one is saved) with an
// optional Dev.to feed, which is external and cannot be purely on-demand, so the page also
// refreshes every 30 minutes. Crawlers then hit cached HTML instead of re-rendering per request.
export const revalidate = 1800;

import { Rss } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FeaturedCarousel from '@/components/blog/featured-carousel';
import ArticlesIndex from '@/components/articles/articles-index';
import { safeJsonLd } from '@/lib/json-ld';
import { ARTICLE_TEXT_DEFAULTS } from '@/lib/content-defaults';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getLayoutSections, isSectionEnabled } from '@/lib/sections-registry';
import { getArticleTexts, getPublishedArticles } from '@/lib/articles';
import { withTransformation } from '@/lib/cloudinary-url';
import type { ArticleCardItem } from '@/lib/articles-model';
import { ByStyle } from '@/components/by-style';

// === Dev.to (optional) ===
interface DevToPost {
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
  user: { name: string; profile_image_90: string };
}

async function getDevToPosts(username: string): Promise<DevToPost[]> {
  // No username configured (Admin -> Section Texts): do not query Dev.to, whose API would return
  // other people's posts for an empty username.
  if (!username) return [];
  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${encodeURIComponent(username)}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error('Failed to reach Dev.to', error);
    return [];
  }
}

async function getItems(devToUsername: string) {
  const [native, devto, identity, avatar] = await Promise.all([
    getPublishedArticles(),
    getDevToPosts(devToUsername),
    getSiteIdentity(),
    getActiveAvatarUrl(),
  ]);
  const author = { name: identity.personName, image: avatar };

  const own: ArticleCardItem[] = native.map((a) => ({
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
    source: 'native',
  }));
  const taken = new Set(native.map((a) => a.slug));
  const external: ArticleCardItem[] = devto
    .filter((p) => !taken.has(p.slug))
    .map((p) => ({
      key: `devto-${p.id}`,
      href: `/articles/${p.slug}`,
      title: p.title,
      description: p.description,
      cover: p.cover_image,
      tags: p.tag_list,
      publishedAt: p.published_at,
      minutes: p.reading_time_minutes,
      reactions: p.public_reactions_count,
      comments: p.comments_count,
      author: { name: p.user.name, image: p.user.profile_image_90 },
      source: 'devto',
    }));

  const items = [...own, ...external].sort(
    (a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '')
  );
  return { items, identity };
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ texts, canonicalTarget }, identity] = await Promise.all([
    getArticleTexts(),
    getSiteIdentity(),
  ]);
  const { items } = await getItems(texts.devToUsername);
  const cover = items.find((i) => i.cover)?.cover ?? null;

  const title = texts.articlesHeading || 'Articles';
  const socialTitle = `${title} | ${identity.siteName}`;
  const description = texts.articlesSubtext || ARTICLE_TEXT_DEFAULTS.articlesSubtext;
  const localUrl = `${SITE_URL}/articles`;
  const onlyDevTo = items.length > 0 && items.every((i) => i.source === 'devto');

  return {
    title,
    description,
    authors: [{ name: identity.personName }],
    alternates: {
      canonical:
        canonicalTarget === 'self' || !onlyDevTo || !texts.devToUsername
          ? localUrl
          : `https://dev.to/${texts.devToUsername}`,
      types: { 'application/rss+xml': `${SITE_URL}/articles/rss.xml` },
    },
    openGraph: {
      title: socialTitle,
      description,
      url: localUrl,
      images: cover ? [{ url: cover, alt: title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: cover ? [cover] : [],
    },
  };
}

export default async function ArticlesPage() {
  const sections = await getLayoutSections();
  if (!isSectionEnabled(sections, 'articles')) notFound();

  const { texts } = await getArticleTexts();
  const { items, identity } = await getItems(texts.devToUsername);
  const featured = items.filter((i) => i.cover).slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/articles`,
        name: `${texts.articlesHeading} | ${identity.siteName}`,
        description: texts.articlesSubtext,
        url: `${SITE_URL}/articles`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        hasPart: items.map((item) => ({
          '@type': 'Article',
          headline: item.title,
          url: `${SITE_URL}${item.href}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: texts.articlesHeading,
            item: `${SITE_URL}/articles`,
          },
        ],
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          {texts.articlesBadge && (
            <div className="chip chip-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium terminal:font-mono">
              {texts.articlesBadge}
            </div>
          )}
          <h1
            dir="auto"
            className="text-4xl md:text-6xl font-bold tracking-tight terminal:font-mono"
          >
            <ByStyle
              clean={texts.articlesHeading}
              terminal={
                <>
                  ~/{texts.articlesHeading.toLowerCase()}
                  <span className="animate-pulse text-primary">_</span>
                </>
              }
            />
          </h1>
          <p dir="auto" className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {texts.articlesSubtext}
          </p>
        </div>
        <a
          href="/articles/rss.xml"
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary md:self-auto"
        >
          <Rss className="h-4 w-4" /> RSS
        </a>
      </header>

      {featured.length > 0 && <FeaturedCarousel posts={featured} />}

      <div className="flex items-center gap-4 mb-8">
        <h2 dir="auto" className="text-2xl font-bold terminal:font-mono">
          {texts.articlesRecentUploads}
        </h2>
        <div className="h-px bg-border/40 flex-1"></div>
        <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
      </div>

      <ArticlesIndex items={items} emptyText={texts.articlesEmptyAPI} />
    </div>
  );
}
