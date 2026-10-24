// Pages are generated on the first visit and then served from the cache until the note changes
// (revalidateNotes). An empty list of static params makes an unknown or unpublished address a
// real 404, which search engines need.
export const revalidate = false;
export function generateStaticParams() {
  return [];
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { safeJsonLd } from '@/lib/json-ld';
import { getSiteIdentity } from '@/lib/identity';
import { SITE_URL } from '@/lib/site-config';
import { getActiveAvatarUrl } from '@/lib/avatar-cache';
import { getPublishedNote, isoOrUndefined } from '@/lib/notes';
import { excerptFrom } from '@/lib/notes-model';
import NoteBody from '@/components/notes/note-body';
import AttachmentList from '@/components/notes/attachment-list';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [note, identity] = await Promise.all([getPublishedNote(slug), getSiteIdentity()]);
  if (!note) return { title: 'Note not found' };

  const description = excerptFrom(note.content, 160);
  const url = `${SITE_URL}/notes/${slug}`;
  return {
    title: note.title,
    description,
    keywords: note.tags,
    authors: [{ name: identity.personName }],
    alternates: { canonical: url },
    openGraph: {
      title: note.title,
      description,
      url,
      siteName: identity.siteName,
      type: 'article',
      publishedTime: isoOrUndefined(note.publishedAt),
      modifiedTime: isoOrUndefined(note.updatedAt),
      authors: [identity.personName],
    },
    twitter: { card: 'summary', title: note.title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1 },
    },
  };
}

export default async function PublicNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [note, identity, avatarUrl] = await Promise.all([
    getPublishedNote(slug),
    getSiteIdentity(),
    getActiveAvatarUrl(),
  ]);
  if (!note) notFound();

  const edited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 5000;
  const url = `${SITE_URL}/notes/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: note.title,
    description: excerptFrom(note.content, 160),
    datePublished: isoOrUndefined(note.publishedAt),
    dateModified: isoOrUndefined(note.updatedAt),
    author: { '@type': 'Person', name: identity.personName, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: identity.siteName,
      logo: {
        '@type': 'ImageObject',
        url: avatarUrl.startsWith('/') ? `${SITE_URL}${avatarUrl}` : avatarUrl,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: note.tags.join(', '),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <Link
        href="/notes"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All notes
      </Link>

      <h1
        className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl"
        dir="auto"
      >
        {note.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <time dateTime={note.publishedAt}>{fmt(note.publishedAt)}</time>
        </span>
        {edited && <span>Updated {fmt(note.updatedAt)}</span>}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" /> {note.readingMinutes} min read
        </span>
      </div>

      {note.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="my-8 h-px w-full bg-border" />

      <NoteBody content={note.content} attachments={note.attachments} />

      <AttachmentList
        attachments={note.attachments}
        content={note.content}
        hideShownInText
        className="mt-12 border-t border-border pt-8"
      />
    </article>
  );
}
