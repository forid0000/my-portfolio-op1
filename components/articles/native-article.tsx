import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import ArticleBody from '@/components/articles/article-body';
import ArticleEngagement from '@/components/articles/article-engagement';
import ArticleCard from '@/components/articles/article-card';
import ShareButton from '@/components/share-button';
import { extractHeadings } from '@/lib/article-markdown';
import { formatArticleDate, type ArticleCardItem, type PublicComment } from '@/lib/articles-model';
import type { ArticleView } from '@/lib/articles';
import { withTransformation } from '@/lib/cloudinary-url';
import { safeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site-config';
import type { ArticleSettings } from '@/lib/validation/article-schemas';
import { ARTICLE_TEXT_DEFAULTS } from '@/lib/content-defaults';

interface Props {
  article: ArticleView;
  author: { name: string; image: string | null };
  comments: PublicComment[];
  settings: ArticleSettings;
  related: ArticleCardItem[];
  texts?: Partial<typeof ARTICLE_TEXT_DEFAULTS>;
}

function Meta({ article, author }: Pick<Props, 'article' | 'author'>) {
  const d = article.design;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="flex items-center gap-2 font-medium">
        {author.image && (
          <span className="relative h-7 w-7 overflow-hidden rounded-full border border-current/20">
            <Image src={author.image} alt="" fill sizes="28px" className="object-cover" />
          </span>
        )}
        {author.name}
      </span>
      {d.showDate && article.publishedAt && (
        <span className="flex items-center gap-1.5 opacity-80">
          <Calendar className="h-4 w-4" />
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
        </span>
      )}
      {d.showReadingTime && (
        <span className="flex items-center gap-1.5 opacity-80">
          <Clock className="h-4 w-4" />
          {article.readingMinutes} min read
        </span>
      )}
    </div>
  );
}

/** An article written on this site, laid out the way its writer chose (Admin -> Articles). */
export default function NativeArticle({
  article,
  author,
  comments,
  settings,
  related,
  texts = {},
}: Props) {
  const t = { ...ARTICLE_TEXT_DEFAULTS, ...texts };
  const d = article.design;
  const cover = article.cover;
  const coverUrl = cover ? withTransformation(cover.src, 'c_limit,w_1800,q_auto,f_auto') : null;
  const headings = d.showToc
    ? extractHeadings(article.body).filter((h) => h.level >= 2 && h.level <= 3)
    : [];
  const url = `${SITE_URL}/articles/${article.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    url,
    mainEntityOfPage: url,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    image: cover ? [withTransformation(cover.src, 'c_limit,w_1200,q_auto,f_jpg')] : undefined,
    keywords: article.tags.join(', ') || undefined,
    author: { '@type': 'Person', name: author.name, url: SITE_URL },
    inLanguage: undefined,
  };

  const title = (
    <h1
      dir="auto"
      className={`font-bold leading-tight tracking-tight ${
        d.header === 'overlay' ? 'text-3xl md:text-5xl' : 'text-3xl md:text-5xl'
      }`}
    >
      {article.title}
    </h1>
  );

  const lead = article.excerpt ? (
    <p dir="auto" className="mt-4 text-lg leading-relaxed opacity-85 md:text-xl">
      {article.excerpt}
    </p>
  ) : null;

  const coverBlock =
    coverUrl && d.header !== 'minimal' && d.header !== 'overlay' ? (
      <div className="article-column mt-8 px-4 sm:px-0" style={{ maxWidth: 'min(72rem, 100%)' }}>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-card shadow-glow-sm">
          <Image
            src={coverUrl}
            alt={cover?.alt || article.title}
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
        </div>
      </div>
    ) : null;

  return (
    <article
      className="article pb-16"
      data-font={d.font}
      data-size={d.size}
      data-width={d.width}
      data-align={d.align}
      style={d.accent ? ({ '--article-accent': d.accent } as React.CSSProperties) : undefined}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {/* ---------------------------------- header ---------------------------------- */}
      {d.header === 'overlay' && coverUrl ? (
        <header className="relative -mt-4 mb-10 flex min-h-[22rem] items-end overflow-hidden md:min-h-[28rem]">
          <Image
            src={coverUrl}
            alt={cover?.alt || article.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/65 to-scrim/10" />
          <div className="article-column relative z-10 px-4 pb-8 text-on-scrim md:pb-12">
            <Link
              href="/articles"
              className="mb-6 inline-flex items-center gap-2 text-sm text-on-scrim/80 transition-colors hover:text-on-scrim"
            >
              <ArrowLeft className="h-4 w-4" /> {t.articlesGoBack}
            </Link>
            {title}
            {article.excerpt && (
              <p dir="auto" className="mt-3 text-lg leading-relaxed text-on-scrim/85">
                {article.excerpt}
              </p>
            )}
            <div className="mt-5 text-on-scrim/90">
              <Meta article={article} author={author} />
            </div>
          </div>
        </header>
      ) : (
        <header
          className={`article-column px-4 pt-4 ${d.header === 'centered' ? 'text-center' : ''}`}
        >
          <Link
            href="/articles"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {t.articlesGoBack}
          </Link>
          {title}
          {lead}
          <div
            className={`mt-5 text-muted-foreground ${d.header === 'centered' ? 'flex justify-center' : ''}`}
          >
            <Meta article={article} author={author} />
          </div>
        </header>
      )}

      {coverBlock}

      {/* ---------------------------------- content ---------------------------------- */}
      <div className="article-column mt-10 px-4">
        {headings.length >= 2 && (
          <nav
            aria-label="Table of contents"
            className="mb-10 rounded-xl border border-border bg-card p-5"
          >
            <p className="mb-3 text-sm font-semibold text-card-foreground">In this article</p>
            <ol className="space-y-1.5 text-sm">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'ps-4' : ''}>
                  <a
                    href={`#${h.id}`}
                    dir="auto"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <ArticleBody body={article.body} media={article.media} />

        {article.footerNote.trim() && (
          <aside className="mt-12 rounded-2xl border border-border bg-card p-6 text-card-foreground">
            <ArticleBody body={article.footerNote} />
          </aside>
        )}

        {/* ---------------------------------- footer ---------------------------------- */}
        <footer className="mt-12 space-y-8 border-t border-border pt-8">
          {d.showTags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="chip chip-primary rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {(d.showAuthor || d.showShare) && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              {d.showAuthor && (
                <div className="flex items-center gap-3">
                  {author.image && (
                    <span className="relative h-12 w-12 overflow-hidden rounded-full border border-border">
                      <Image src={author.image} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{t.articlesAuthor}</p>
                    <p className="font-semibold" dir="auto">
                      {author.name}
                    </p>
                  </div>
                </div>
              )}
              {d.showShare && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{t.articlesDiscussBtn}</span>
                  <ShareButton slug={article.slug} />
                </div>
              )}
            </div>
          )}
        </footer>

        <ArticleEngagement
          slug={article.slug}
          initialCounts={article.reactionTotals}
          reactionsEnabled={settings.reactions && article.allowReactions}
          commentsEnabled={settings.comments && article.allowComments}
          moderated={settings.moderate}
          comments={comments}
        />
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold">More to read</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
