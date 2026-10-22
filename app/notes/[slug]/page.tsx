import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import { safeJsonLd } from '@/lib/json-ld';
import { MarkdownRenderer } from '../markdown-renderer';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_HOST, SITE_URL } from '@/lib/site-config';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';

async function getPublicNote(slug: string) {
  try {
    const db = await connectToDatabase();
    const collection = db.connection.client.db('portfolio_cms').collection('notes');
    return await collection.findOne({ slug, published: true });
  } catch {
    return null;
  }
}

function fmt(iso: string | Date) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** toISOString() that returns undefined instead of throwing on a missing/invalid
 *  date — legacy notes may lack createdAt/updatedAt, which would otherwise 500
 *  the whole page from generateMetadata / JSON-LD. */
function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [note, identity] = await Promise.all([getPublicNote(slug), getSiteIdentity()]);
  if (!note) return { title: 'Note Not Found' };

  const title = note.title as string;
  const description = (note.content as string)?.replace(/[#*`_~\[\]!]/g, '').slice(0, 160) || '';
  const localUrl = `${SITE_URL}/notes/${slug}`;
  const tags = (note.tags as string[]) || [];

  return {
    title,
    description,
    keywords: tags,
    authors: [{ name: identity.personName }],
    alternates: { canonical: localUrl },
    openGraph: {
      title,
      description,
      url: localUrl,
      siteName: identity.siteName,
      type: 'article',
      publishedTime: toIso(note.createdAt),
      modifiedTime: toIso(note.updatedAt),
      authors: [identity.personName],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
      },
    },
  };
}

export default async function PublicNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [note, identity, avatarUrl] = await Promise.all([
    getPublicNote(slug),
    getSiteIdentity(),
    getActiveAvatarUrl(),
  ]);
  if (!note) notFound();

  const isEdited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 5000;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: note.title as string,
    description: (note.content as string)?.replace(/[#*`_~\[\]!]/g, '').slice(0, 160) || '',
    datePublished: toIso(note.createdAt),
    dateModified: toIso(note.updatedAt),
    author: {
      '@type': 'Person',
      name: identity.personName,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: identity.siteName,
      logo: {
        '@type': 'ImageObject',
        url: avatarUrl.startsWith('/') ? `${SITE_URL}${avatarUrl}` : avatarUrl,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/notes/${slug}`,
    },
    keywords: ((note.tags as string[]) || []).join(', '),
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors mb-10 font-mono tracking-widest uppercase"
        >
          ← portfolio
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
          {note.title as string}
        </h1>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/50 font-mono mb-4">
          <span>Created {fmt(note.createdAt)}</span>
          {isEdited && <span>· Last edited {fmt(note.updatedAt)}</span>}
        </div>

        {/* Tags */}
        {(note.tags as string[])?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {(note.tags as string[]).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-0.5 rounded-full border border-primary/20 text-primary/60 font-mono bg-primary/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="w-full h-px bg-border mb-8" />

        {/* Content */}
        <MarkdownRenderer content={(note.content as string) || ''} />

        {/* Footer */}
        <div className="mt-20 pt-5 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/25 font-mono tracking-widest">
            {SITE_HOST} · notes
          </span>
        </div>
      </article>
    </div>
  );
}
